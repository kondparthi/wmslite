"""
Inbound's Label Generation tab (10th tab) — print/reprint receiving and
putaway labels from real InboundReceipt / PutawayTask rows.

The label payload's symbology/fields_included are read live from the active
Admin Config BarcodeConfig row for module="Inbound" + the matching
label_type ("Receiving Label" / "Putaway Label") — editing that config in
Admin Configuration changes what a reprint here actually returns, not just
a cosmetic label on the settings screen. If no active config exists yet
(e.g. a fresh admin wiped it), falls back to a sane Code128 default rather
than erroring, since Label Generation must not depend on Admin Config
having been visited first.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import admin_config as ac
from app.models import inbound_ops as m
from app.models import master_data as md
from app.schemas import inbound_ops as s

receiving_labels_router = APIRouter(prefix="/receiving-labels", tags=["Label Generation"])
putaway_labels_router = APIRouter(prefix="/putaway-labels", tags=["Label Generation"])

_DEFAULT_FIELDS = "LPN,Material,Qty,Condition"


def _active_config(db: Session, label_type: str) -> ac.BarcodeConfig | None:
    return (
        db.query(ac.BarcodeConfig)
        .filter(ac.BarcodeConfig.module == "Inbound", ac.BarcodeConfig.label_type == label_type, ac.BarcodeConfig.active == True)  # noqa: E712
        .order_by(ac.BarcodeConfig.id.desc())
        .first()
    )


@receiving_labels_router.get("/", response_model=list[s.ReceivingLabelListItem])
def list_receiving_labels(db: Session = Depends(get_db)):
    rows = db.query(m.InboundReceipt).order_by(m.InboundReceipt.id.desc()).limit(200).all()
    out = []
    for r in rows:
        material = db.get(md.Material, r.material_id)
        out.append(s.ReceivingLabelListItem(
            id=r.id, lpn=r.lpn, material_id=r.material_id,
            material_code=material.sku if material else "—",
            material_name=material.description if material else "Unknown material",
            qty=r.qty, uom=material.uom if material else "EA",
            condition=r.condition, received_by=r.received_by, created_at=r.created_at,
            label_printed=bool(r.label_printed), print_count=r.print_count or 0,
        ))
    return out


@receiving_labels_router.post("/{receipt_id}/print", response_model=s.LabelPrintResponse)
def print_receiving_label(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.get(m.InboundReceipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Inbound receipt not found")

    if not receipt.lpn:
        receipt.lpn = f"RCV-{receipt.id:06d}"

    receipt.print_count = (receipt.print_count or 0) + 1
    receipt.label_printed = True

    material = db.get(md.Material, receipt.material_id)
    config = _active_config(db, "Receiving Label")
    fields_included = [f.strip() for f in (config.fields_included if config else _DEFAULT_FIELDS).split(",") if f.strip()]

    fields = {
        "LPN": receipt.lpn,
        "Material": f"{material.sku if material else '—'} — {material.description if material else 'Unknown material'}",
        "Qty": f"{receipt.qty} {material.uom if material else 'EA'}",
        "Condition": receipt.condition,
        "Received By": receipt.received_by or "—",
        "Received At": receipt.created_at.isoformat() if receipt.created_at else None,
    }

    db.commit()
    return s.LabelPrintResponse(
        barcode_value=receipt.lpn,
        symbology=config.symbology if config else "Code128",
        fields_included=fields_included,
        label_width_mm=config.label_width_mm if config else 100,
        label_height_mm=config.label_height_mm if config else 50,
        print_count=receipt.print_count,
        fields=fields,
    )


@putaway_labels_router.get("/", response_model=list[s.PutawayLabelListItem])
def list_putaway_labels(db: Session = Depends(get_db)):
    rows = db.query(m.PutawayTask).order_by(m.PutawayTask.id.desc()).limit(200).all()
    out = []
    for t in rows:
        material = db.get(md.Material, t.material_id)
        loc_id = t.confirmed_location_id or t.suggested_location_id
        location = db.get(md.Location, loc_id) if loc_id else None
        out.append(s.PutawayLabelListItem(
            id=t.id, receipt_id=t.receipt_id, material_id=t.material_id,
            material_code=material.sku if material else "—",
            material_name=material.description if material else "Unknown material",
            qty=t.qty, uom=material.uom if material else "EA",
            destination_location_code=location.code if location else None,
            status=t.status, created_at=t.created_at,
            label_printed=bool(t.label_printed), print_count=t.print_count or 0,
        ))
    return out


@putaway_labels_router.post("/{task_id}/print", response_model=s.LabelPrintResponse)
def print_putaway_label(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.PutawayTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Putaway task not found")

    task_code = f"PUT-{task.id:06d}"
    task.print_count = (task.print_count or 0) + 1
    task.label_printed = True

    material = db.get(md.Material, task.material_id)
    loc_id = task.confirmed_location_id or task.suggested_location_id
    location = db.get(md.Location, loc_id) if loc_id else None
    config = _active_config(db, "Putaway Label")
    fields_included = [f.strip() for f in (config.fields_included if config else _DEFAULT_FIELDS).split(",") if f.strip()]

    fields = {
        "LPN": task_code,
        "Material": f"{material.sku if material else '—'} — {material.description if material else 'Unknown material'}",
        "Qty": f"{task.qty} {material.uom if material else 'EA'}",
        "Destination": location.code if location else "Unassigned",
        "Status": task.status,
        "Created At": task.created_at.isoformat() if task.created_at else None,
    }

    db.commit()
    return s.LabelPrintResponse(
        barcode_value=task_code,
        symbology=config.symbology if config else "Code128",
        fields_included=fields_included,
        label_width_mm=config.label_width_mm if config else 100,
        label_height_mm=config.label_height_mm if config else 50,
        print_count=task.print_count,
        fields=fields,
    )
