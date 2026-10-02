"""
Cross Docking's 5 tabs. See app/models/crossdock_ops.py for why
CrossDockPlan/CrossDockTask are the only new entities, staging locations
are new rows on Master Data's ZoneArea/Location, and door references read
Yard Management's YardDoor rows without mutating them.

Match Engine  looks for InboundReceipt qty not yet consumed by a putaway
              task or another plan, against ShipmentOrderLine qty not yet
              allocated or already claimed by another plan — real leftover
              quantity on both sides, never a fabricated pairing.
Opportunistic looks for the same leftover receipt quantity, but triggered
              by a real backorder condition (zero on-hand stock, or an
              Urgent/High order priority) instead of a plain SKU match.
Completing a task advances ShipmentOrderLine.qty_allocated/qty_picked and
              creates an OutboundAllocation(status="Picked") exactly the
              way Outbound's own allocate-then-pick flow would, since
              cross-docked freight satisfies both steps at once.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import crossdock_ops as m
from app.models import inbound_ops as ib
from app.models import master_data as md
from app.models import operations as ops
from app.models import outbound_ops as ob
from app.models import yard_ops as yd
from app.schemas import crossdock_ops as s

plan_router = APIRouter(prefix="/crossdock-plans", tags=["CD Planning"])
task_router = APIRouter(prefix="/crossdock-tasks", tags=["CD Execution"])
rule_router = APIRouter(prefix="/crossdock-opportunistic", tags=["Opportunistic CD"])
staging_router = APIRouter(prefix="/crossdock-staging", tags=["Staging & Sorting"])
report_router = APIRouter(prefix="/crossdock-reports", tags=["CD Analytics"])

COST_PER_UNIT_USD = 3.5  # avoided putaway + pick labor, same "documented flat rate" approach as Slotting's efficiency formula


def _next_number(db: Session, model_cls, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _receipt_available_qty(db: Session, receipt: ib.InboundReceipt) -> float:
    consumed = sum(t.qty for t in db.query(ib.PutawayTask).filter(ib.PutawayTask.receipt_id == receipt.id).all())
    consumed += sum(
        p.qty for p in db.query(m.CrossDockPlan).filter(m.CrossDockPlan.receipt_id == receipt.id, m.CrossDockPlan.status != "Cancelled").all()
    )
    return receipt.qty - consumed


def _line_open_qty(db: Session, line: ob.ShipmentOrderLine) -> float:
    reserved = sum(
        p.qty for p in db.query(m.CrossDockPlan).filter(m.CrossDockPlan.order_line_id == line.id, m.CrossDockPlan.status != "Cancelled").all()
    )
    return line.qty_ordered - line.qty_allocated - reserved


def _plan_out(db: Session, plan: m.CrossDockPlan) -> s.CrossDockPlanRead:
    out = s.CrossDockPlanRead.model_validate(plan)
    if plan.material:
        out.sku = plan.material.sku
        out.description = plan.material.description
    if plan.receipt and plan.receipt.asn_id:
        asn = db.get(ops.ASN, plan.receipt.asn_id)
        if asn:
            out.asn_number = asn.asn_number
    if plan.order_line and plan.order_line.order:
        out.order_number = plan.order_line.order.order_number
    return out


def _task_out(task: m.CrossDockTask) -> s.CrossDockTaskRead:
    out = s.CrossDockTaskRead.model_validate(task)
    if task.plan:
        out.plan_number = task.plan.plan_number
    if task.material:
        out.sku = task.material.sku
        out.description = task.material.description
    if task.from_door:
        out.from_door_code = task.from_door.door_code
    if task.to_door:
        out.to_door_code = task.to_door.door_code
    if task.current_location:
        out.current_location_code = task.current_location.code
    return out


# ==================== CD Planning ====================
@plan_router.get("/", response_model=list[s.CrossDockPlanRead])
def list_plans(db: Session = Depends(get_db)):
    rows = db.query(m.CrossDockPlan).order_by(m.CrossDockPlan.id.desc()).all()
    return [_plan_out(db, p) for p in rows]


@plan_router.get("/candidates", response_model=list[s.MatchCandidate])
def list_open_candidates(db: Session = Depends(get_db)):
    """Open receipts and open order lines, for the New Plan picker."""
    out = []
    receipts = db.query(ib.InboundReceipt).filter(ib.InboundReceipt.condition == "Good").all()
    for r in receipts:
        if _receipt_available_qty(db, r) <= 0:
            continue
        lines = db.query(ob.ShipmentOrderLine).filter(ob.ShipmentOrderLine.material_id == r.material_id).all()
        for line in lines:
            if _line_open_qty(db, line) <= 0:
                continue
            asn = db.get(ops.ASN, r.asn_id) if r.asn_id else None
            out.append(s.MatchCandidate(
                receipt_id=r.id, order_line_id=line.id, sku=r.material.sku, description=r.material.description,
                asn_number=asn.asn_number if asn else "", order_number=line.order.order_number,
                qty=min(_receipt_available_qty(db, r), _line_open_qty(db, line)),
            ))
    return out


@plan_router.post("/", response_model=s.CrossDockPlanRead, status_code=201)
def create_plan(payload: s.CrossDockPlanCreate, db: Session = Depends(get_db)):
    receipt = db.get(ib.InboundReceipt, payload.receipt_id)
    line = db.get(ob.ShipmentOrderLine, payload.order_line_id)
    if not receipt or not line:
        raise HTTPException(status_code=404, detail="Receipt or order line not found")
    if receipt.condition != "Good":
        raise HTTPException(status_code=400, detail=f"Receipt is on {receipt.condition} — only Good-condition receipts can be cross-docked")
    if receipt.material_id != line.material_id:
        raise HTTPException(status_code=400, detail="Receipt and order line are for different materials")
    if payload.qty > _receipt_available_qty(db, receipt):
        raise HTTPException(status_code=400, detail="Not enough unconsumed receipt quantity for this plan")
    if payload.qty > _line_open_qty(db, line):
        raise HTTPException(status_code=400, detail="Not enough open order-line quantity for this plan")
    plan = m.CrossDockPlan(
        plan_number=_next_number(db, m.CrossDockPlan, "CD"),
        receipt_id=receipt.id, order_line_id=line.id, material_id=receipt.material_id,
        qty=payload.qty, transfer_type=payload.transfer_type, match_level=payload.match_level, priority=payload.priority,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_out(db, plan)


@plan_router.post("/match", response_model=list[s.CrossDockPlanRead])
def run_match_engine(db: Session = Depends(get_db)):
    """Exact-SKU auto-match: pairs leftover receipt qty with leftover open
    order-line qty for the same material, skipping any pair that already
    has a live (non-cancelled) plan between them."""
    existing_pairs = {
        (p.receipt_id, p.order_line_id)
        for p in db.query(m.CrossDockPlan).filter(m.CrossDockPlan.status != "Cancelled").all()
    }
    created = []
    receipts = db.query(ib.InboundReceipt).filter(ib.InboundReceipt.condition == "Good").all()
    for r in receipts:
        avail = _receipt_available_qty(db, r)
        if avail <= 0:
            continue
        lines = db.query(ob.ShipmentOrderLine).filter(ob.ShipmentOrderLine.material_id == r.material_id).all()
        for line in lines:
            if avail <= 0:
                break
            if (r.id, line.id) in existing_pairs:
                continue
            open_qty = _line_open_qty(db, line)
            if open_qty <= 0:
                continue
            take = min(avail, open_qty)
            order_priority_map = {"Urgent": "Urgent", "High": "High", "Normal": "Medium", "Low": "Low"}
            plan = m.CrossDockPlan(
                plan_number=_next_number(db, m.CrossDockPlan, "CD"),
                receipt_id=r.id, order_line_id=line.id, material_id=r.material_id, qty=take,
                match_level="Exact SKU Match", transfer_type="Pure Cross Dock",
                priority=order_priority_map.get(line.order.priority, "Medium"),
            )
            db.add(plan)
            db.flush()
            created.append(plan)
            existing_pairs.add((r.id, line.id))
            avail -= take
    db.commit()
    return [_plan_out(db, p) for p in created]


@plan_router.patch("/{plan_id}/confirm", response_model=s.CrossDockPlanRead)
def confirm_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(m.CrossDockPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")
    if plan.status != "Proposed":
        raise HTTPException(status_code=400, detail=f"Plan must be Proposed to confirm (currently {plan.status})")
    plan.status = "Confirmed"
    plan.confirmed_at = datetime.utcnow()
    task = m.CrossDockTask(
        task_number=_next_number(db, m.CrossDockTask, "CDT"),
        plan_id=plan.id, material_id=plan.material_id, qty=plan.qty, lpn=plan.receipt.lpn,
    )
    db.add(task)
    db.commit()
    db.refresh(plan)
    return _plan_out(db, plan)


@plan_router.patch("/{plan_id}/cancel", response_model=s.CrossDockPlanRead)
def cancel_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(m.CrossDockPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")
    if plan.status == "Confirmed":
        raise HTTPException(status_code=400, detail="A confirmed plan already has an execution task — cancel the task instead")
    plan.status = "Cancelled"
    db.commit()
    db.refresh(plan)
    return _plan_out(db, plan)


# ==================== CD Execution ====================
def _pick_staging_location(db: Session) -> md.Location | None:
    """Least-occupied Staging zone's first Location, computed live from
    currently-Staged tasks — same live-occupancy idea as Dynamic Slotting's
    zone utilization, never a stored/stale field."""
    zones = db.query(md.ZoneArea).filter(md.ZoneArea.zone_type == "Staging").all()
    if not zones:
        return None
    best_zone, best_pct = None, None
    for z in zones:
        loc_ids = [l.id for l in z.locations]
        occupied = db.query(m.CrossDockTask).filter(m.CrossDockTask.status == "Staged", m.CrossDockTask.current_location_id.in_(loc_ids)).count() if loc_ids else 0
        pct = occupied / z.capacity_units if z.capacity_units else 1.0
        if best_pct is None or pct < best_pct:
            best_zone, best_pct = z, pct
    if not best_zone or not best_zone.locations:
        return None
    return best_zone.locations[0]


def _pick_doors(db: Session, index: int) -> tuple[md.Location | None, ...]:
    doors = db.query(yd.YardDoor).order_by(yd.YardDoor.id).all()
    if not doors:
        return None, None
    from_door = doors[index % len(doors)]
    to_door = doors[(index + len(doors) // 2) % len(doors)] if len(doors) > 1 else from_door
    return from_door, to_door


@task_router.get("/", response_model=list[s.CrossDockTaskRead])
def list_tasks(db: Session = Depends(get_db)):
    rows = db.query(m.CrossDockTask).order_by(m.CrossDockTask.id.desc()).all()
    return [_task_out(t) for t in rows]


@task_router.patch("/{task_id}/stage", response_model=s.CrossDockTaskRead)
def stage_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.CrossDockTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    if task.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Task must be Pending to stage (currently {task.status})")
    from_door, to_door = _pick_doors(db, task.id)
    task.from_door_id = from_door.id if from_door else None
    task.to_door_id = to_door.id if to_door else None
    loc = _pick_staging_location(db)
    task.current_location_id = loc.id if loc else None
    task.status = "Staged"
    task.staged_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _task_out(task)


@task_router.patch("/{task_id}/start", response_model=s.CrossDockTaskRead)
def start_task(task_id: int, payload: s.AssignTaskRequest | None = None, db: Session = Depends(get_db)):
    task = db.get(m.CrossDockTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    if task.status != "Staged":
        raise HTTPException(status_code=400, detail=f"Task must be Staged to start (currently {task.status})")
    task.status = "In Progress"
    if payload and payload.assignee:
        task.assignee = payload.assignee
    db.commit()
    db.refresh(task)
    return _task_out(task)


@task_router.patch("/{task_id}/assign", response_model=s.CrossDockTaskRead)
def assign_task(task_id: int, payload: s.AssignTaskRequest, db: Session = Depends(get_db)):
    task = db.get(m.CrossDockTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    task.assignee = payload.assignee
    db.commit()
    db.refresh(task)
    return _task_out(task)


@task_router.patch("/{task_id}/complete", response_model=s.CrossDockTaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.CrossDockTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    if task.status != "In Progress":
        raise HTTPException(status_code=400, detail=f"Task must be In Progress to complete (currently {task.status})")

    plan = task.plan
    line = plan.order_line
    loc_id = task.current_location_id or (line.material.assigned_locations[0].location_id if line.material.assigned_locations else None)
    if loc_id:
        db.add(ops.InventoryTransaction(
            txn_type="Shipment", material_id=task.material_id, location_id=loc_id, qty=task.qty,
            reason="Cross-dock direct transfer", reference=task.task_number, status="Completed",
        ))
        db.add(ob.OutboundAllocation(order_line_id=line.id, material_id=task.material_id, location_id=loc_id, qty=task.qty, status="Picked"))
    line.qty_allocated += task.qty
    line.qty_picked += task.qty

    order = line.order
    all_lines = db.query(ob.ShipmentOrderLine).filter(ob.ShipmentOrderLine.order_id == order.id).all()
    if all(l.qty_picked >= l.qty_ordered for l in all_lines):
        order.status = "Picking"
    elif all(l.qty_allocated >= l.qty_ordered for l in all_lines) and order.status == "Pending":
        order.status = "Allocated"

    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _task_out(task)


# ==================== Opportunistic CD ====================
@rule_router.get("/rules", response_model=list[s.OpportunisticRuleRead])
def list_rules(db: Session = Depends(get_db)):
    return db.query(m.OpportunisticRule).order_by(m.OpportunisticRule.id).all()


@rule_router.patch("/rules/{rule_id}", response_model=s.OpportunisticRuleRead)
def update_rule(rule_id: int, payload: s.OpportunisticRuleUpdate, db: Session = Depends(get_db)):
    rule = db.get(m.OpportunisticRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")
    rule.status = payload.status
    db.commit()
    db.refresh(rule)
    return rule


@rule_router.get("/detected", response_model=list[s.CrossDockPlanRead])
def list_detected_opportunities(db: Session = Depends(get_db)):
    rows = db.query(m.CrossDockPlan).filter(m.CrossDockPlan.transfer_type == "Opportunistic").order_by(m.CrossDockPlan.id.desc()).all()
    return [_plan_out(db, p) for p in rows]


@rule_router.post("/detect", response_model=list[s.CrossDockPlanRead])
def run_opportunistic_detection(db: Session = Depends(get_db)):
    active_rules = {r.rule_type for r in db.query(m.OpportunisticRule).filter(m.OpportunisticRule.status == "Active").all()}
    existing_pairs = {
        (p.receipt_id, p.order_line_id)
        for p in db.query(m.CrossDockPlan).filter(m.CrossDockPlan.status != "Cancelled").all()
    }
    created = []
    receipts = db.query(ib.InboundReceipt).filter(ib.InboundReceipt.condition == "Good").all()

    def on_hand_for(material_id: int) -> float:
        return sum(b.on_hand for b in db.query(ops.InventoryBalance).filter(ops.InventoryBalance.material_id == material_id).all())

    for r in receipts:
        avail = _receipt_available_qty(db, r)
        if avail <= 0:
            continue
        lines = db.query(ob.ShipmentOrderLine).filter(ob.ShipmentOrderLine.material_id == r.material_id).all()
        for line in lines:
            if avail <= 0:
                break
            if (r.id, line.id) in existing_pairs:
                continue
            open_qty = _line_open_qty(db, line)
            if open_qty <= 0:
                continue
            rule_hit = None
            if "Zero Stock Item" in active_rules and on_hand_for(r.material_id) <= 0:
                rule_hit = "Zero Stock Item"
            elif "High Priority Backorder" in active_rules and line.order.priority in ("Urgent", "High"):
                rule_hit = "High Priority Backorder"
            if not rule_hit:
                continue
            take = min(avail, open_qty)
            plan = m.CrossDockPlan(
                plan_number=_next_number(db, m.CrossDockPlan, "CD"),
                receipt_id=r.id, order_line_id=line.id, material_id=r.material_id, qty=take,
                match_level="Exact SKU Match", transfer_type="Opportunistic",
                priority="High" if rule_hit == "High Priority Backorder" else "Medium",
                rule_applied=rule_hit,
            )
            db.add(plan)
            db.flush()
            created.append(plan)
            existing_pairs.add((r.id, line.id))
            avail -= take
    db.commit()
    return [_plan_out(db, p) for p in created]


# ==================== Staging & Sorting ====================
@staging_router.get("/zones", response_model=list[s.StagingZoneRead])
def staging_zones(db: Session = Depends(get_db)):
    zones = db.query(md.ZoneArea).filter(md.ZoneArea.zone_type == "Staging").order_by(md.ZoneArea.id).all()
    out = []
    for z in zones:
        loc_ids = [l.id for l in z.locations]
        staged_tasks = (
            db.query(m.CrossDockTask)
            .filter(m.CrossDockTask.status == "Staged", m.CrossDockTask.current_location_id.in_(loc_ids))
            .order_by(m.CrossDockTask.staged_at)
            .all()
            if loc_ids else []
        )
        next_priority = ""
        if staged_tasks:
            oldest = staged_tasks[0]
            next_priority = oldest.plan.order_line.order.order_number if oldest.plan and oldest.plan.order_line else ""
        out.append(s.StagingZoneRead(
            zone=z.code, zone_name=z.name, capacity=int(z.capacity_units or 0),
            occupied=len(staged_tasks), next_priority=next_priority or "—",
        ))
    return out


# ==================== CD Analytics ====================
@report_router.get("/summary", response_model=s.CrossDockReportSummary)
def report_summary(db: Session = Depends(get_db)):
    completed = db.query(m.CrossDockTask).filter(m.CrossDockTask.status == "Completed").all()
    active = db.query(m.CrossDockTask).filter(m.CrossDockTask.status.in_(["Pending", "Staged", "In Progress"])).count()

    completed_qty = sum(t.qty for t in completed)
    total_savings = round(completed_qty * COST_PER_UNIT_USD, 2)

    cycle_times = [(t.completed_at - t.created_at).total_seconds() / 60 for t in completed if t.completed_at]
    avg_cycle = round(sum(cycle_times) / len(cycle_times), 1) if cycle_times else 0.0

    now = datetime.utcnow()
    all_plan_receipt_ids = {p.receipt_id for p in db.query(m.CrossDockPlan).filter(m.CrossDockPlan.status != "Cancelled").all()}
    trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        cd_count = db.query(m.CrossDockTask).filter(m.CrossDockTask.created_at >= day_start, m.CrossDockTask.created_at < day_end).count()
        std_count = (
            db.query(ib.InboundReceipt)
            .filter(ib.InboundReceipt.created_at >= day_start, ib.InboundReceipt.created_at < day_end)
            .all()
        )
        std_count = len([r for r in std_count if r.id not in all_plan_receipt_ids])
        trend.append(s.VolumeTrendPoint(day=day_start.strftime("%a"), cd=cd_count, std=std_count))

    return s.CrossDockReportSummary(
        total_savings_usd=total_savings, avg_cycle_minutes=avg_cycle, storage_avoided_units=completed_qty,
        active_tasks=active, completed_tasks=len(completed), volume_trend=trend,
    )
