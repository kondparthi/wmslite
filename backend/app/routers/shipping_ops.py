"""
Shipping Execution's 6 tabs. See app/models/shipping_ops.py for why this
module reuses Outbound's Shipment row and Master Data's Carrier row instead
of forking new tables for them. Bespoke pieces:

  Manifest.assign / close   moves shipments into a carrier pickup batch and
                            locks it, same "roll real activity into a
                            header" idea as Outbound's Wave.
  print-label               marks a shipment's label printed and generates
                            a tracking number if it doesn't have one yet.
  rate-shop                 computes real quotes from CarrierRate rows
                            (base_rate + per_kg_rate * weight) rather than
                            returning fabricated numbers.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import outbound_ops as ob
from app.models import shipping_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import outbound_ops as obs
from app.schemas import shipping_ops as s

router = APIRouter()

# ---- Generic CRUD: Carrier Rates ----
router.include_router(make_crud_router(
    model=m.CarrierRate, create_schema=s.CarrierRateCreate, update_schema=s.CarrierRateUpdate,
    read_schema=s.CarrierRateRead, prefix="/shipping-carrier-rates", tag="Carrier Rate",
))


def _next_number(db: Session, model_cls, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _manifest_totals(db: Session, manifest_id: int):
    row = (
        db.query(func.count(ob.Shipment.id), func.coalesce(func.sum(ob.Shipment.pkgs), 0), func.coalesce(func.sum(ob.Shipment.weight), 0))
        .filter(ob.Shipment.manifest_id == manifest_id)
        .first()
    )
    return row[0] or 0, row[1] or 0, row[2] or 0


def _to_manifest_read(db: Session, manifest: m.Manifest) -> s.ManifestRead:
    count, pkgs, weight = _manifest_totals(db, manifest.id)
    return s.ManifestRead(
        id=manifest.id, manifest_number=manifest.manifest_number, carrier_id=manifest.carrier_id,
        status=manifest.status, created_at=manifest.created_at, closed_at=manifest.closed_at,
        shipment_count=count, total_packages=pkgs, total_weight=weight,
    )


# ================= Manifests =================
manifest_router = APIRouter(prefix="/shipping-manifests", tags=["Manifest"])


@manifest_router.get("/", response_model=list[s.ManifestRead])
def list_manifests(db: Session = Depends(get_db)):
    manifests = db.query(m.Manifest).order_by(m.Manifest.id.desc()).limit(200).all()
    return [_to_manifest_read(db, mf) for mf in manifests]


@manifest_router.post("/", response_model=s.ManifestRead, status_code=201)
def create_manifest(payload: s.ManifestCreate, db: Session = Depends(get_db)):
    carrier = db.get(md.Carrier, payload.carrier_id)
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    manifest_number = _next_number(db, m.Manifest, "MFT-2026")
    manifest = m.Manifest(manifest_number=manifest_number, carrier_id=payload.carrier_id, status="Open")
    db.add(manifest)
    db.commit()
    db.refresh(manifest)
    return _to_manifest_read(db, manifest)


@manifest_router.post("/{manifest_id}/assign", response_model=s.ManifestRead)
def assign_to_manifest(manifest_id: int, payload: s.AssignToManifestRequest, db: Session = Depends(get_db)):
    manifest = db.get(m.Manifest, manifest_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest not found")
    if manifest.status == "Closed":
        raise HTTPException(status_code=400, detail="Can't assign shipments to a Closed manifest.")
    shipments = db.query(ob.Shipment).filter(ob.Shipment.id.in_(payload.shipment_ids)).all()
    for sh in shipments:
        sh.manifest_id = manifest.id
        sh.manifest_number = manifest.manifest_number
    db.commit()
    return _to_manifest_read(db, manifest)


@manifest_router.patch("/{manifest_id}/close", response_model=s.ManifestRead)
def close_manifest(manifest_id: int, db: Session = Depends(get_db)):
    manifest = db.get(m.Manifest, manifest_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest not found")
    if manifest.status == "Closed":
        raise HTTPException(status_code=400, detail="Already closed.")
    count, _, _ = _manifest_totals(db, manifest.id)
    if count == 0:
        raise HTTPException(status_code=400, detail="Can't close an empty manifest — assign at least one shipment first.")
    manifest.status = "Closed"
    manifest.closed_at = datetime.utcnow()
    db.commit()
    return _to_manifest_read(db, manifest)


@manifest_router.delete("/{manifest_id}", status_code=204)
def delete_manifest(manifest_id: int, db: Session = Depends(get_db)):
    manifest = db.get(m.Manifest, manifest_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest not found")
    count, _, _ = _manifest_totals(db, manifest.id)
    if count > 0:
        raise HTTPException(status_code=400, detail="Unassign its shipments before deleting a manifest.")
    db.delete(manifest)
    db.commit()
    return None


# ================= Shipment Execution (same row as Outbound's Shipment) =================
execution_router = APIRouter(prefix="/shipment-execution", tags=["Shipment Execution"])


@execution_router.get("/", response_model=list[obs.ShipmentRead])
def list_execution_shipments(
    status: str | None = Query(None),
    label_printed: bool | None = Query(None),
    manifest_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ob.Shipment)
    if status:
        q = q.filter(ob.Shipment.status == status)
    if label_printed is not None:
        q = q.filter(ob.Shipment.label_printed == label_printed)
    if manifest_id is not None:
        q = q.filter(ob.Shipment.manifest_id == manifest_id)
    return q.order_by(ob.Shipment.id.desc()).limit(300).all()


def _generate_tracking_no(carrier: md.Carrier | None, shipment_id: int) -> str:
    prefix = (carrier.code if carrier else "TRK").upper().replace(" ", "")
    return f"{prefix}{str(1000000000 + shipment_id)[-10:]}"


@execution_router.patch("/{shipment_id}/print-label", response_model=obs.ShipmentRead)
def print_label(shipment_id: int, payload: s.PrintLabelRequest, db: Session = Depends(get_db)):
    shipment = db.get(ob.Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    carrier = db.get(md.Carrier, shipment.carrier_id) if shipment.carrier_id else None
    if not shipment.tracking_no:
        shipment.tracking_no = _generate_tracking_no(carrier, shipment.id)
    if payload.service:
        shipment.service = payload.service
    if payload.pkgs:
        shipment.pkgs = payload.pkgs
    shipment.label_printed = True
    db.commit()
    db.refresh(shipment)
    return shipment


@execution_router.post("/{shipment_id}/assign-manifest", response_model=obs.ShipmentRead)
def assign_manifest(shipment_id: int, payload: s.AssignManifestRequest, db: Session = Depends(get_db)):
    shipment = db.get(ob.Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    manifest = db.get(m.Manifest, payload.manifest_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest not found")
    if manifest.status == "Closed":
        raise HTTPException(status_code=400, detail="Can't assign to a Closed manifest.")
    shipment.manifest_id = manifest.id
    shipment.manifest_number = manifest.manifest_number
    db.commit()
    db.refresh(shipment)
    return shipment


@execution_router.post("/rate-shop", response_model=list[s.RateQuoteResult])
def rate_shop(payload: s.RateQuoteRequest, db: Session = Depends(get_db)):
    """Computes base_rate + per_kg_rate * weight from real CarrierRate rows
    for active carriers, rather than returning fabricated quotes."""
    q = db.query(m.CarrierRate).filter(m.CarrierRate.active.is_(True))
    if payload.service:
        q = q.filter(m.CarrierRate.service == payload.service)
    if payload.carrier_id:
        q = q.filter(m.CarrierRate.carrier_id == payload.carrier_id)
    rates = q.all()

    results = []
    for r in rates:
        carrier = db.get(md.Carrier, r.carrier_id)
        if not carrier or not carrier.active:
            continue
        quote = r.base_rate + r.per_kg_rate * payload.weight
        results.append(s.RateQuoteResult(
            carrier_id=r.carrier_id, carrier_name=carrier.name, service=r.service,
            transit_days=r.transit_days, rate=round(quote, 2), recommended=False,
        ))

    results.sort(key=lambda x: x.rate)
    if results:
        results[0].recommended = True
    return results
