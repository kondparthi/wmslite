"""
Inventory Transactions / Movement / Adjustment / Update / Hold / Cycle Count
/ Kitting — the remaining Inventory tabs.

Transactions and Holds get bespoke routes (not the generic CRUD factory)
because creating one has a real side effect on InventoryBalance — an
adjustment changes on_hand, a transfer moves qty between two locations, a
hold reserves qty out of what's available. Cycle Count Plans and Kitting
Orders are plain flat records, so they reuse the same generic CRUD factory
Master Data uses.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import operations as ops
from app.routers.generic_crud import make_crud_router
from app.schemas import inventory_ops as s

router = APIRouter()


def _get_or_create_balance(db: Session, material_id: int, location_id: int) -> ops.InventoryBalance:
    bal = (
        db.query(ops.InventoryBalance)
        .filter_by(material_id=material_id, location_id=location_id)
        .first()
    )
    if not bal:
        bal = ops.InventoryBalance(material_id=material_id, location_id=location_id, on_hand=0, allocated=0, on_hold=0)
        db.add(bal)
        db.flush()
    return bal


# ---- Transactions (Transactions / Movement / Adjustment / Update tabs) ----
txn_router = APIRouter(prefix="/inventory-transactions", tags=["Inventory Transactions"])


@txn_router.get("/", response_model=list[s.InventoryTransactionRead])
def list_transactions(txn_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(ops.InventoryTransaction)
    if txn_type:
        q = q.filter(ops.InventoryTransaction.txn_type == txn_type)
    return q.order_by(ops.InventoryTransaction.id.desc()).limit(200).all()


@txn_router.post("/adjust", response_model=s.InventoryTransactionRead, status_code=201)
def adjust_inventory(payload: s.InventoryAdjustmentRequest, db: Session = Depends(get_db)):
    """Powers the Adjustment tab — qty is a signed delta (negative reduces
    on_hand, e.g. damage or a cycle-count correction; positive adds, e.g.
    found stock)."""
    bal = _get_or_create_balance(db, payload.material_id, payload.location_id)
    new_on_hand = (bal.on_hand or 0) + payload.qty
    if new_on_hand < 0:
        raise HTTPException(status_code=400, detail="Adjustment would make on-hand quantity negative.")
    bal.on_hand = new_on_hand
    txn = ops.InventoryTransaction(
        txn_type="Adjustment", material_id=payload.material_id, location_id=payload.location_id,
        qty=payload.qty, reason=payload.reason, reference=payload.reference, status="Completed",
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@txn_router.post("/transfer", response_model=s.InventoryTransactionRead, status_code=201)
def transfer_inventory(payload: s.InventoryTransferRequest, db: Session = Depends(get_db)):
    """Powers the Movement tab (immediate=False → queued, "In Transit"
    until /complete is called) and the Update tab (immediate=True →
    applied right away)."""
    if payload.qty <= 0:
        raise HTTPException(status_code=400, detail="Transfer quantity must be positive.")

    from_bal = _get_or_create_balance(db, payload.material_id, payload.from_location_id)
    available = (from_bal.on_hand or 0) - (from_bal.allocated or 0) - (from_bal.on_hold or 0)
    if payload.immediate and available < payload.qty:
        raise HTTPException(status_code=400, detail="Not enough available quantity at the source location.")

    status = "Completed" if payload.immediate else "In Transit"
    if payload.immediate:
        from_bal.on_hand = (from_bal.on_hand or 0) - payload.qty
        to_bal = _get_or_create_balance(db, payload.material_id, payload.to_location_id)
        to_bal.on_hand = (to_bal.on_hand or 0) + payload.qty

    txn = ops.InventoryTransaction(
        txn_type="Transfer", material_id=payload.material_id, location_id=payload.from_location_id,
        to_location_id=payload.to_location_id, qty=payload.qty, reference=payload.reference, status=status,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@txn_router.patch("/{txn_id}/complete", response_model=s.InventoryTransactionRead)
def complete_transfer(txn_id: int, db: Session = Depends(get_db)):
    """Marks a queued Movement (In Transit) as delivered, applying the
    balance change at that point."""
    txn = db.get(ops.InventoryTransaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.txn_type != "Transfer" or txn.status != "In Transit":
        raise HTTPException(status_code=400, detail="Only an in-transit transfer can be completed.")

    from_bal = _get_or_create_balance(db, txn.material_id, txn.location_id)
    to_bal = _get_or_create_balance(db, txn.material_id, txn.to_location_id)
    from_bal.on_hand = (from_bal.on_hand or 0) - txn.qty
    to_bal.on_hand = (to_bal.on_hand or 0) + txn.qty
    txn.status = "Completed"
    db.commit()
    db.refresh(txn)
    return txn


@txn_router.delete("/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.get(ops.InventoryTransaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return None


router.include_router(txn_router)


# ---- Holds ----
hold_router = APIRouter(prefix="/inventory-holds", tags=["Inventory Holds"])


@hold_router.get("/", response_model=list[s.InventoryHoldRead])
def list_holds(db: Session = Depends(get_db)):
    return db.query(ops.InventoryHold).order_by(ops.InventoryHold.id.desc()).all()


@hold_router.post("/", response_model=s.InventoryHoldRead, status_code=201)
def place_hold(payload: s.InventoryHoldCreate, db: Session = Depends(get_db)):
    bal = _get_or_create_balance(db, payload.material_id, payload.location_id)
    available = (bal.on_hand or 0) - (bal.allocated or 0) - (bal.on_hold or 0)
    if available < payload.qty:
        raise HTTPException(status_code=400, detail="Not enough available quantity to place on hold.")
    bal.on_hold = (bal.on_hold or 0) + payload.qty
    hold = ops.InventoryHold(
        material_id=payload.material_id, location_id=payload.location_id,
        qty=payload.qty, reason=payload.reason, status="Active",
    )
    db.add(hold)
    db.commit()
    db.refresh(hold)
    return hold


@hold_router.patch("/{hold_id}/release", response_model=s.InventoryHoldRead)
def release_hold(hold_id: int, db: Session = Depends(get_db)):
    hold = db.get(ops.InventoryHold, hold_id)
    if not hold:
        raise HTTPException(status_code=404, detail="Hold not found")
    if hold.status != "Active":
        raise HTTPException(status_code=400, detail="Hold is already released.")
    bal = _get_or_create_balance(db, hold.material_id, hold.location_id)
    bal.on_hold = max(0.0, (bal.on_hold or 0) - hold.qty)
    hold.status = "Released"
    hold.released_at = datetime.utcnow()
    db.commit()
    db.refresh(hold)
    return hold


@hold_router.delete("/{hold_id}", status_code=204)
def delete_hold(hold_id: int, db: Session = Depends(get_db)):
    hold = db.get(ops.InventoryHold, hold_id)
    if not hold:
        raise HTTPException(status_code=404, detail="Hold not found")
    db.delete(hold)
    db.commit()
    return None


router.include_router(hold_router)


# ---- Cycle Count Plans (plain generic CRUD) ----
router.include_router(make_crud_router(
    model=ops.CycleCountPlan, create_schema=s.CycleCountPlanCreate, update_schema=s.CycleCountPlanUpdate,
    read_schema=s.CycleCountPlanRead, prefix="/cycle-count-plans", tag="Cycle Count Plan",
))

# ---- Kitting Orders (plain generic CRUD) ----
router.include_router(make_crud_router(
    model=ops.KittingOrder, create_schema=s.KittingOrderCreate, update_schema=s.KittingOrderUpdate,
    read_schema=s.KittingOrderRead, prefix="/kitting-orders", tag="Kitting Order",
))
