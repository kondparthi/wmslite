"""
Inbound's remaining tabs: Putaway Strategy (generic CRUD), Inbound Receipt +
Putaway Task (bespoke — confirming a putaway task applies the quantity to
InventoryBalance and writes a ledger InventoryTransaction, same as an
Inventory-side Receipt), Inbound Appointment and Inbound Task (generic CRUD).
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import inbound_ops as m
from app.models import master_data as md
from app.models import operations as ops
from app.routers.generic_crud import make_crud_router
from app.schemas import inbound_ops as s

router = APIRouter()

router.include_router(make_crud_router(
    model=m.PutawayStrategy, create_schema=s.PutawayStrategyCreate, update_schema=s.PutawayStrategyUpdate,
    read_schema=s.PutawayStrategyRead, prefix="/putaway-strategies", tag="Putaway Strategy",
))

router.include_router(make_crud_router(
    model=m.InboundAppointment, create_schema=s.InboundAppointmentCreate, update_schema=s.InboundAppointmentUpdate,
    read_schema=s.InboundAppointmentRead, prefix="/inbound-appointments", tag="Inbound Appointment",
))

router.include_router(make_crud_router(
    model=m.InboundTask, create_schema=s.InboundTaskCreate, update_schema=s.InboundTaskUpdate,
    read_schema=s.InboundTaskRead, prefix="/inbound-tasks", tag="Inbound Task",
))


def _suggest_location(db: Session, material_id: int) -> int | None:
    """Simple heuristic: use the material's Assigned Location if Master
    Data has one, otherwise fall back to the first Active location. Not a
    real slotting engine — deliberately out of scope for this phase."""
    assigned = (
        db.query(md.AssignedLocation)
        .filter(md.AssignedLocation.material_id == material_id, md.AssignedLocation.status == "Active")
        .first()
    )
    if assigned:
        return assigned.location_id
    loc = db.query(md.Location).filter(md.Location.status == "Active").order_by(md.Location.id).first()
    return loc.id if loc else None


receipt_router = APIRouter(prefix="/inbound-receipts", tags=["Inbound Receipt"])


@receipt_router.get("/", response_model=list[s.InboundReceiptRead])
def list_receipts(asn_id: int | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.InboundReceipt)
    if asn_id is not None:
        q = q.filter(m.InboundReceipt.asn_id == asn_id)
    return q.order_by(m.InboundReceipt.id.desc()).limit(200).all()


@receipt_router.post("/", response_model=s.InboundReceiptRead, status_code=201)
def create_receipt(payload: s.InboundReceiptCreate, db: Session = Depends(get_db)):
    if payload.qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
    receipt = m.InboundReceipt(**payload.model_dump())
    db.add(receipt)
    db.flush()

    # Auto-create the putaway task that follows every receipt.
    task = m.PutawayTask(
        receipt_id=receipt.id,
        material_id=receipt.material_id,
        qty=receipt.qty,
        suggested_location_id=_suggest_location(db, receipt.material_id),
        priority="High" if receipt.condition != "Good" else "Medium",
        status="Pending",
    )
    db.add(task)
    db.commit()
    db.refresh(receipt)
    return receipt


@receipt_router.delete("/{receipt_id}", status_code=204)
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.get(m.InboundReceipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    db.delete(receipt)
    db.commit()
    return None


task_router = APIRouter(prefix="/putaway-tasks", tags=["Putaway Task"])


@task_router.get("/", response_model=list[s.PutawayTaskRead])
def list_putaway_tasks(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.PutawayTask)
    if status:
        q = q.filter(m.PutawayTask.status == status)
    return q.order_by(m.PutawayTask.id.desc()).limit(200).all()


@task_router.patch("/{task_id}/start", response_model=s.PutawayTaskRead)
def start_putaway_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.PutawayTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Putaway task not found")
    if task.status != "Pending":
        raise HTTPException(status_code=400, detail="Only a Pending task can be started.")
    task.status = "In Progress"
    db.commit()
    db.refresh(task)
    return task


@task_router.patch("/{task_id}/confirm", response_model=s.PutawayTaskRead)
def confirm_putaway_task(task_id: int, payload: s.ConfirmPutawayRequest, db: Session = Depends(get_db)):
    task = db.get(m.PutawayTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Putaway task not found")
    if task.status == "Completed":
        raise HTTPException(status_code=400, detail="This task is already completed.")
    location = db.get(md.Location, payload.location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Apply the receipt to on-hand inventory at the confirmed location.
    balance = (
        db.query(ops.InventoryBalance)
        .filter_by(material_id=task.material_id, location_id=payload.location_id)
        .first()
    )
    if not balance:
        balance = ops.InventoryBalance(material_id=task.material_id, location_id=payload.location_id, on_hand=0, allocated=0, on_hold=0)
        db.add(balance)
        db.flush()
    balance.on_hand = (balance.on_hand or 0) + task.qty

    # Ledger entry — shows up in Inventory's Transactions tab too.
    db.add(ops.InventoryTransaction(
        txn_type="Receipt",
        material_id=task.material_id,
        location_id=payload.location_id,
        qty=task.qty,
        reference=f"PUT-{task.id}",
        status="Completed",
    ))

    task.confirmed_location_id = payload.location_id
    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task
