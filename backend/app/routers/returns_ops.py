"""
Returns / RMA's 6 tabs. See app/models/returns_ops.py for why RMARequest,
InspectionRecord and Disposition are new entities while the Inventory
Adjustment tab reuses Inventory's InventoryTransaction ledger directly.

Workflow (mirrors the mock's status timeline):
  RMA created (Pending Approval) -> approve -> mark in-transit -> mark
  received  ->  an Inspection record is opened against it, graded, then
  approved (approving an inspection auto-creates its linked Disposition
  row)  ->  the Disposition is completed (a real business-process
  completion — moves the RMA to Closed)  ->  a separate "post" action on
  the Inventory Adjustment tab is what actually writes the
  InventoryTransaction and mutates InventoryBalance, decoupling physical
  completion from book-keeping posting, exactly matching the mock's two
  distinct actions ("Complete" on Disposition vs. "Post" on the ledger row).
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import operations as ops
from app.models import outbound_ops as ob
from app.models import returns_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import returns_ops as s

REASON_BUCKETS = ["Defective", "Wrong Item", "Damaged", "Not Described", "Expired", "Other"]

rma_router = APIRouter(prefix="/returns-rma", tags=["RMA Request"])
inspection_router = APIRouter(prefix="/returns-inspections", tags=["Inspection & Grading"])
disposition_router = APIRouter(prefix="/returns-dispositions", tags=["Disposition"])
adjustment_router = APIRouter(prefix="/returns-adjustments", tags=["Returns Inventory Adjustment"])
report_router = APIRouter(prefix="/returns-reports", tags=["Returns Reports"])


def _next_number(db: Session, model_cls, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _rma_out(rma: m.RMARequest) -> s.RMARequestRead:
    out = s.RMARequestRead.model_validate(rma)
    if rma.material:
        out.sku = rma.material.sku
        out.description = rma.material.description
    return out


def _inspection_out(rec: m.InspectionRecord) -> s.InspectionRecordRead:
    out = s.InspectionRecordRead.model_validate(rec)
    if rec.rma:
        out.rma_number = rec.rma.rma_number
        if rec.rma.material:
            out.sku = rec.rma.material.sku
            out.description = rec.rma.material.description
    return out


def _disposition_out(d: m.Disposition) -> s.DispositionRead:
    out = s.DispositionRead.model_validate(d)
    if d.rma:
        out.rma_number = d.rma.rma_number
    if d.material:
        out.sku = d.material.sku
        out.description = d.material.description
    if d.target_location:
        out.target_location_code = d.target_location.code
    return out


# ==================== RMA Requests ====================
@rma_router.get("/", response_model=list[s.RMARequestRead])
def list_rmas(skip: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500), db: Session = Depends(get_db)):
    rows = db.query(m.RMARequest).order_by(m.RMARequest.id.desc()).offset(skip).limit(limit).all()
    return [_rma_out(r) for r in rows]


@rma_router.get("/{rma_id}", response_model=s.RMARequestRead)
def get_rma(rma_id: int, db: Session = Depends(get_db)):
    rma = db.get(m.RMARequest, rma_id)
    if not rma:
        raise HTTPException(status_code=404, detail=f"RMA {rma_id} not found")
    return _rma_out(rma)


@rma_router.post("/", response_model=s.RMARequestRead, status_code=201)
def create_rma(payload: s.RMARequestCreate, db: Session = Depends(get_db)):
    material = db.get(md.Material, payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail=f"Material {payload.material_id} not found")
    rma = m.RMARequest(rma_number=_next_number(db, m.RMARequest, "RMA-2026"), **payload.model_dump())
    db.add(rma)
    db.commit()
    db.refresh(rma)
    return _rma_out(rma)


@rma_router.patch("/{rma_id}", response_model=s.RMARequestRead)
def update_rma(rma_id: int, payload: s.RMARequestUpdate, db: Session = Depends(get_db)):
    rma = db.get(m.RMARequest, rma_id)
    if not rma:
        raise HTTPException(status_code=404, detail=f"RMA {rma_id} not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rma, field, value)
    db.commit()
    db.refresh(rma)
    return _rma_out(rma)


_RMA_TRANSITIONS = {
    "approve": ("Pending Approval", "Approved"),
    "ship": ("Approved", "In Transit"),
    "receive": ("In Transit", "Received"),
}


@rma_router.patch("/{rma_id}/{action}", response_model=s.RMARequestRead)
def transition_rma(rma_id: int, action: str, db: Session = Depends(get_db)):
    if action not in _RMA_TRANSITIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action {action}")
    rma = db.get(m.RMARequest, rma_id)
    if not rma:
        raise HTTPException(status_code=404, detail=f"RMA {rma_id} not found")
    required_status, next_status = _RMA_TRANSITIONS[action]
    if rma.status != required_status:
        raise HTTPException(status_code=400, detail=f"RMA must be {required_status} to {action} (currently {rma.status})")
    rma.status = next_status
    if action == "receive":
        rma.received_at = datetime.utcnow()
    db.commit()
    db.refresh(rma)
    return _rma_out(rma)


# ==================== Inspection & Grading ====================
@inspection_router.get("/", response_model=list[s.InspectionRecordRead])
def list_inspections(db: Session = Depends(get_db)):
    rows = db.query(m.InspectionRecord).order_by(m.InspectionRecord.id.desc()).all()
    return [_inspection_out(r) for r in rows]


@inspection_router.post("/", response_model=s.InspectionRecordRead, status_code=201)
def create_inspection(payload: s.InspectionCreateRequest, db: Session = Depends(get_db)):
    rma = db.get(m.RMARequest, payload.rma_id)
    if not rma:
        raise HTTPException(status_code=404, detail=f"RMA {payload.rma_id} not found")
    if rma.status != "Received":
        raise HTTPException(status_code=400, detail="RMA must be Received before inspection can start")
    rec = m.InspectionRecord(
        inspection_number=_next_number(db, m.InspectionRecord, "INSP"),
        rma_id=payload.rma_id,
        qty_received=payload.qty_received,
        inspector=payload.inspector,
    )
    rma.status = "Inspection"
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _inspection_out(rec)


@inspection_router.patch("/{inspection_id}/grade", response_model=s.InspectionRecordRead)
def grade_inspection(inspection_id: int, payload: s.InspectionGradeRequest, db: Session = Depends(get_db)):
    rec = db.get(m.InspectionRecord, inspection_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Inspection {inspection_id} not found")
    rec.qty_inspected = payload.qty_inspected
    rec.grade = payload.grade
    rec.notes = payload.notes
    if payload.inspector:
        rec.inspector = payload.inspector
    rec.status = "Graded"
    rec.inspected_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _inspection_out(rec)


_GRADE_ACTION = {
    "A - Resellable": "Return to Stock",
    "B - Refurbishable": "Repair & Relist",
    "C - Scrap": "Dispose / Destroy",
}


@inspection_router.patch("/{inspection_id}/approve", response_model=s.InspectionRecordRead)
def approve_inspection(inspection_id: int, db: Session = Depends(get_db)):
    rec = db.get(m.InspectionRecord, inspection_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Inspection {inspection_id} not found")
    if rec.status != "Graded":
        raise HTTPException(status_code=400, detail="Inspection must be graded before it can be approved")
    rec.status = "Approved"
    rma = rec.rma
    action = _GRADE_ACTION.get(rec.grade, "Return to Stock")
    disp = m.Disposition(
        disposition_number=_next_number(db, m.Disposition, "DISP"),
        rma_id=rma.id,
        inspection_id=rec.id,
        material_id=rma.material_id,
        qty=rec.qty_inspected or rma.qty,
        action=action,
    )
    db.add(disp)
    db.commit()
    db.refresh(rec)
    return _inspection_out(rec)


# ==================== Disposition ====================
_ACTION_LOCATION_TYPE = {
    "Return to Stock": "Storage",
    "Repair & Relist": "Refurb",
    "Dispose / Destroy": "Disposal",
    "Vendor Return": "Staging",
}


def _pick_target_location(db: Session, action: str):
    loc_type = _ACTION_LOCATION_TYPE.get(action)
    if not loc_type:
        return None
    return db.query(md.Location).filter(md.Location.location_type == loc_type, md.Location.status == "Active").first()


@disposition_router.get("/", response_model=list[s.DispositionRead])
def list_dispositions(db: Session = Depends(get_db)):
    rows = db.query(m.Disposition).order_by(m.Disposition.id.desc()).all()
    return [_disposition_out(d) for d in rows]


@disposition_router.patch("/{disposition_id}/action", response_model=s.DispositionRead)
def set_disposition_action(disposition_id: int, payload: s.DispositionActionRequest, db: Session = Depends(get_db)):
    disp = db.get(m.Disposition, disposition_id)
    if not disp:
        raise HTTPException(status_code=404, detail=f"Disposition {disposition_id} not found")
    disp.action = payload.action
    disp.status = "In Progress"
    db.commit()
    db.refresh(disp)
    return _disposition_out(disp)


@disposition_router.patch("/{disposition_id}/complete", response_model=s.DispositionRead)
def complete_disposition(disposition_id: int, db: Session = Depends(get_db)):
    disp = db.get(m.Disposition, disposition_id)
    if not disp:
        raise HTTPException(status_code=404, detail=f"Disposition {disposition_id} not found")
    if disp.status == "Completed":
        raise HTTPException(status_code=400, detail="Disposition already completed")
    target = _pick_target_location(db, disp.action)
    if target:
        disp.target_location_id = target.id
    disp.status = "Completed"
    disp.completed_at = datetime.utcnow()
    rma = disp.rma
    if rma:
        rma.status = "Closed"
        rma.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(disp)
    return _disposition_out(disp)


# ==================== Inventory Adjustment (reuses InventoryTransaction) ====================
_ACTION_TXN_TYPE = {
    "Return to Stock": ("Receipt", 1),
    "Repair & Relist": ("Transfer", 1),
    "Vendor Return": ("Transfer", 1),
    "Dispose / Destroy": ("Adjustment", -1),
}


@adjustment_router.get("/", response_model=list[s.DispositionRead])
def list_pending_adjustments(db: Session = Depends(get_db)):
    """Rows on the Inventory Adjustment tab are completed Dispositions —
    same underlying row as the Disposition tab, filtered to the ones ready
    (or already posted) for the ledger, matching the mock's ADJ-R-* list."""
    rows = (
        db.query(m.Disposition)
        .filter(m.Disposition.status == "Completed")
        .order_by(m.Disposition.id.desc())
        .all()
    )
    return [_disposition_out(d) for d in rows]


@adjustment_router.patch("/{disposition_id}/post", response_model=s.DispositionRead)
def post_adjustment(disposition_id: int, db: Session = Depends(get_db)):
    disp = db.get(m.Disposition, disposition_id)
    if not disp:
        raise HTTPException(status_code=404, detail=f"Disposition {disposition_id} not found")
    if disp.posted_txn_id:
        raise HTTPException(status_code=400, detail="Already posted")
    if disp.status != "Completed":
        raise HTTPException(status_code=400, detail="Disposition must be completed before posting")
    if not disp.target_location_id:
        raise HTTPException(status_code=400, detail="Disposition has no target location to post against")

    txn_type, sign = _ACTION_TXN_TYPE.get(disp.action, ("Adjustment", 1))
    txn = ops.InventoryTransaction(
        txn_type=txn_type,
        material_id=disp.material_id,
        location_id=disp.target_location_id,
        qty=disp.qty,
        reason=f"Returns disposition {disp.disposition_number} ({disp.action})",
        reference=disp.disposition_number,
        status="Completed",
    )
    db.add(txn)
    db.flush()
    disp.posted_txn_id = txn.id

    # Real inventory effect: Receipt/Transfer-in add stock at the target
    # location; a Dispose/Destroy Adjustment removes it (write-off), never
    # touching any location's balance for a stock increase.
    balance = (
        db.query(ops.InventoryBalance)
        .filter(ops.InventoryBalance.material_id == disp.material_id, ops.InventoryBalance.location_id == disp.target_location_id)
        .first()
    )
    if sign > 0:
        if balance:
            balance.on_hand += disp.qty
        else:
            balance = ops.InventoryBalance(material_id=disp.material_id, location_id=disp.target_location_id, on_hand=disp.qty)
            db.add(balance)
    else:
        if balance:
            balance.on_hand = max(0, balance.on_hand - disp.qty)

    db.commit()
    db.refresh(disp)
    return _disposition_out(disp)


# ==================== Reports & Analytics ====================
@report_router.get("/summary", response_model=s.ReturnsReportSummary)
def returns_report_summary(db: Session = Depends(get_db)):
    all_rmas = db.query(m.RMARequest).all()
    total_orders = db.query(func.count(ob.ShipmentOrder.id)).scalar() or 0
    returns_rate = round((len(all_rmas) / total_orders) * 100, 1) if total_orders else 0.0

    closed = [r for r in all_rmas if r.status == "Closed" and r.closed_at and r.created_at]
    if closed:
        avg_hours = sum((r.closed_at - r.created_at).total_seconds() / 3600 for r in closed) / len(closed)
    else:
        avg_hours = 0.0

    completed_dispositions = db.query(m.Disposition).filter(m.Disposition.status == "Completed").all()
    total_qty = sum(d.qty for d in completed_dispositions)
    recovered_qty = sum(d.qty for d in completed_dispositions if d.action in ("Return to Stock", "Repair & Relist"))
    recovery_rate = round((recovered_qty / total_qty) * 100, 1) if total_qty else 0.0

    reason_counts = {r: 0 for r in REASON_BUCKETS}
    for rma in all_rmas:
        reason_counts[rma.reason if rma.reason in reason_counts else "Other"] = reason_counts.get(
            rma.reason if rma.reason in reason_counts else "Other", 0
        ) + 1
    reason_breakdown = [s.ReturnsReasonBucket(reason=k, count=v) for k, v in reason_counts.items()]

    monthly: dict[str, dict[str, int]] = {}
    for rma in all_rmas:
        key = rma.created_at.strftime("%b %Y")
        bucket = monthly.setdefault(key, {"returns": 0, "processed": 0})
        bucket["returns"] += 1
        if rma.status == "Closed":
            bucket["processed"] += 1
    monthly_trend = [s.ReturnsMonthlyTrend(month=k, returns=v["returns"], processed=v["processed"]) for k, v in sorted(monthly.items(), key=lambda kv: kv[0])]

    return s.ReturnsReportSummary(
        returns_rate_pct=returns_rate,
        avg_processing_hours=round(avg_hours, 1),
        recovery_rate_pct=recovery_rate,
        open_rmas=len([r for r in all_rmas if r.status != "Closed"]),
        closed_rmas=len(closed),
        reason_breakdown=reason_breakdown,
        monthly_trend=monthly_trend,
    )
