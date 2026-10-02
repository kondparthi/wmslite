"""
Inventory + Inbound API — CRUD routers (same generic factory used for
Master Data) plus a Dashboard summary endpoint that aggregates real counts
across Master Data, Inventory and Inbound instead of hardcoded numbers.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import operations as m
from app.models import outbound_ops as ob
from app.routers.generic_crud import make_crud_router
from app.schemas import operations as s

router = APIRouter()

router.include_router(make_crud_router(
    model=m.InventoryBalance, create_schema=s.InventoryBalanceCreate, update_schema=s.InventoryBalanceUpdate,
    read_schema=s.InventoryBalanceRead, prefix="/inventory-balances", tag="Inventory Balance",
))

router.include_router(make_crud_router(
    model=m.PurchaseOrder, create_schema=s.PurchaseOrderCreate, update_schema=s.PurchaseOrderUpdate,
    read_schema=s.PurchaseOrderRead, prefix="/purchase-orders", tag="Purchase Order",
))

router.include_router(make_crud_router(
    model=m.ASN, create_schema=s.ASNCreate, update_schema=s.ASNUpdate,
    read_schema=s.ASNRead, prefix="/asns", tag="ASN",
))


dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@dashboard_router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """Real numbers for the Dashboard's KPI cards — replaces the page's
    original hardcoded mock values. Fields not yet backed by a built module
    (Labor, 3PL Billing, Outbound) are intentionally left out here; the
    Dashboard frontend keeps those as clearly-labeled placeholders until
    those modules exist."""
    total_locations = db.query(func.count(md.Location.id)).scalar() or 0
    occupied_locations = (
        db.query(func.count(func.distinct(m.InventoryBalance.location_id)))
        .filter(m.InventoryBalance.on_hand > 0)
        .scalar() or 0
    )
    utilization_pct = round((occupied_locations / total_locations) * 100) if total_locations else 0

    total_receipts = (
        db.query(func.count(m.ASN.id))
        .filter(m.ASN.status.in_(["Received", "Closed"]))
        .scalar() or 0
    )
    pending_putaway = db.query(func.count(m.ASN.id)).filter(m.ASN.status == "Received").scalar() or 0
    open_purchase_orders = (
        db.query(func.count(m.PurchaseOrder.id))
        .filter(m.PurchaseOrder.status.in_(["Open", "Partial"]))
        .scalar() or 0
    )
    total_skus = db.query(func.count(md.Material.id)).scalar() or 0
    total_units_on_hand = db.query(func.sum(m.InventoryBalance.on_hand)).scalar() or 0

    low_stock_count = (
        db.query(func.count(func.distinct(md.Material.id)))
        .join(m.InventoryBalance, m.InventoryBalance.material_id == md.Material.id)
        .filter(md.Material.reorder_point.isnot(None))
        .filter(m.InventoryBalance.on_hand <= md.Material.reorder_point)
        .scalar() or 0
    )

    return {
        "total_receipts": total_receipts,
        "pending_putaway": pending_putaway,
        "open_purchase_orders": open_purchase_orders,
        "warehouse_utilization_pct": utilization_pct,
        "occupied_locations": occupied_locations,
        "total_locations": total_locations,
        "total_skus": total_skus,
        "total_units_on_hand": total_units_on_hand,
        "low_stock_count": low_stock_count,
    }


digital_twin_router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])


@digital_twin_router.get("/floor-plan", response_model=list[s.FloorPlanLocation])
def digital_twin_floor_plan(db: Session = Depends(get_db)):
    """2D heatmap floor plan data — scoped down from the client's original
    '3D warehouse' ask (client-agreed; see the Dashboard's Digital Twin
    panel). Only real Locations that carry real x/y coordinates are
    plotted; on_hand_qty and pending_picks are computed live from
    InventoryBalance and PickTask/OutboundAllocation, never fabricated."""
    locations = (
        db.query(md.Location)
        .filter(md.Location.x_coordinate.isnot(None), md.Location.y_coordinate.isnot(None))
        .all()
    )
    if not locations:
        return []

    on_hand_by_loc = dict(
        db.query(m.InventoryBalance.location_id, func.sum(m.InventoryBalance.on_hand))
        .group_by(m.InventoryBalance.location_id)
        .all()
    )
    pending_picks_by_loc = dict(
        db.query(ob.OutboundAllocation.location_id, func.count(ob.PickTask.id))
        .join(ob.PickTask, ob.PickTask.allocation_id == ob.OutboundAllocation.id)
        .filter(ob.PickTask.status.in_(["Ready", "In Progress"]))
        .group_by(ob.OutboundAllocation.location_id)
        .all()
    )
    zone_by_id = {z.id: z for z in db.query(md.ZoneArea).all()}

    max_on_hand = max([on_hand_by_loc.get(loc.id, 0) or 0 for loc in locations], default=0) or 1

    out = []
    for loc in locations:
        on_hand = on_hand_by_loc.get(loc.id, 0) or 0
        zone = zone_by_id.get(loc.zone_id) if loc.zone_id else None
        out.append(s.FloorPlanLocation(
            location_id=loc.id,
            code=loc.code,
            zone_code=zone.code if zone else None,
            zone_type=zone.zone_type if zone else None,
            x=loc.x_coordinate,
            y=loc.y_coordinate,
            on_hand_qty=on_hand,
            pending_picks=pending_picks_by_loc.get(loc.id, 0) or 0,
            occupancy_ratio=round(on_hand / max_on_hand, 4),
        ))
    return out
