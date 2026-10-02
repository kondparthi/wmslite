"""
Replenishment's 5 tabs. See app/models/replenishment_ops.py for why
ReplenishmentTask is the only new table — Rules stay on Master Data's
existing ReplenishmentRule (min/max/reorder-point only, per client scope),
and Trigger Monitor is computed live against real InventoryBalance rows,
never stored.

_current_qty sums every InventoryBalance row for a material+location pair
(a location can carry more than one row for the same material — seen live
in this dataset — so a naive "the balance row" lookup would silently drop
stock). A trigger fires when current_qty is below the rule's reorder point
(falling back to min_qty if no reorder point is set). Auto-generating a
task picks the real location, other than the rule's own, holding the most
available (on_hand - allocated - on_hold) stock of that material, and caps
the task at whatever is actually available there rather than inventing
supply — if nothing is available anywhere, no task is created and the
trigger is surfaced as "No Source Available" instead.

Completing a task is the one real side effect: it moves the qty out of
the source location's on_hand and into the target's, and writes a
Transfer InventoryTransaction — the same ledger every other module's
transfers post to.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import operations as ops
from app.models import replenishment_ops as m
from app.schemas import replenishment_ops as s

task_router = APIRouter(prefix="/replenishment-tasks", tags=["Replenishment Tasks"])
trigger_router = APIRouter(prefix="/replenishment-triggers", tags=["Trigger Monitor"])
report_router = APIRouter(prefix="/replenishment-reports", tags=["Replenishment Reports"])

OPEN_STATUSES = ("Pending", "Ready", "In Progress", "On Hold")


def _next_number(db: Session, model_cls, prefix: str, pad: int = 4) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _current_qty(db: Session, material_id: int, location_id: int) -> float:
    rows = db.query(ops.InventoryBalance).filter(
        ops.InventoryBalance.material_id == material_id,
        ops.InventoryBalance.location_id == location_id,
    ).all()
    return sum(r.on_hand for r in rows)


def _available_qty(db: Session, material_id: int, location_id: int) -> float:
    rows = db.query(ops.InventoryBalance).filter(
        ops.InventoryBalance.material_id == material_id,
        ops.InventoryBalance.location_id == location_id,
    ).all()
    return sum(r.on_hand - r.allocated - r.on_hold for r in rows)


def _best_source(db: Session, material_id: int, exclude_location_id: int):
    """Real location, other than the rule's own, with the most available
    stock of this material. Returns (location, available_qty) or (None, 0)."""
    candidates = db.query(ops.InventoryBalance.location_id).filter(
        ops.InventoryBalance.material_id == material_id,
        ops.InventoryBalance.location_id != exclude_location_id,
    ).distinct().all()
    best_loc, best_avail = None, 0.0
    for (loc_id,) in candidates:
        avail = _available_qty(db, material_id, loc_id)
        if avail > best_avail:
            best_loc, best_avail = loc_id, avail
    if best_loc is None:
        return None, 0.0
    return db.get(md.Location, best_loc), best_avail


def _severity(current_qty: float, threshold: float) -> str:
    if threshold <= 0:
        return "Medium"
    ratio = current_qty / threshold
    if ratio <= 0.3:
        return "Critical"
    if ratio <= 0.7:
        return "High"
    return "Medium"


def _task_out(db: Session, t: m.ReplenishmentTask) -> s.ReplenishmentTaskRead:
    out = s.ReplenishmentTaskRead.model_validate(t)
    mat = db.get(md.Material, t.material_id)
    if mat:
        out.sku, out.description = mat.sku, mat.description
    from_loc = db.get(md.Location, t.from_location_id)
    to_loc = db.get(md.Location, t.to_location_id)
    out.from_location_code = from_loc.code if from_loc else ""
    out.to_location_code = to_loc.code if to_loc else ""
    return out


def _active_open_task_for_rule(db: Session, rule_id: int):
    return db.query(m.ReplenishmentTask).filter(
        m.ReplenishmentTask.rule_id == rule_id,
        m.ReplenishmentTask.status.in_(OPEN_STATUSES),
    ).first()


# ─────────────────────────────── Tasks ────────────────────────────────
@task_router.get("/", response_model=list[s.ReplenishmentTaskRead])
def list_tasks(db: Session = Depends(get_db)):
    rows = db.query(m.ReplenishmentTask).order_by(m.ReplenishmentTask.id.desc()).all()
    return [_task_out(db, t) for t in rows]


@task_router.post("/", response_model=s.ReplenishmentTaskRead)
def create_task(payload: s.ReplenishmentTaskCreate, db: Session = Depends(get_db)):
    if not db.get(md.Material, payload.material_id):
        raise HTTPException(404, "Material not found")
    if not db.get(md.Location, payload.from_location_id):
        raise HTTPException(404, "From location not found")
    if not db.get(md.Location, payload.to_location_id):
        raise HTTPException(404, "To location not found")
    task = m.ReplenishmentTask(
        task_number=_next_number(db, m.ReplenishmentTask, "RPL-2026"),
        material_id=payload.material_id,
        from_location_id=payload.from_location_id,
        to_location_id=payload.to_location_id,
        qty_required=payload.qty_required,
        qty_assigned=payload.qty_required,
        priority=payload.priority,
        assignee=payload.assignee,
        status="Ready" if payload.assignee else "Pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.post("/auto-generate", response_model=list[s.ReplenishmentTaskRead])
def auto_generate_tasks(db: Session = Depends(get_db)):
    rules = db.query(md.ReplenishmentRule).filter(
        md.ReplenishmentRule.status == "Active",
        md.ReplenishmentRule.location_id.isnot(None),
    ).all()
    created = []
    for rule in rules:
        if _active_open_task_for_rule(db, rule.id):
            continue  # already has an open task working this deficit
        threshold = rule.reorder_point if rule.reorder_point is not None else rule.min_qty
        current = _current_qty(db, rule.material_id, rule.location_id)
        if current >= threshold:
            continue  # healthy, nothing to do
        source_loc, available = _best_source(db, rule.material_id, rule.location_id)
        if not source_loc or available <= 0:
            continue  # no real source stock anywhere — do not fabricate a task
        qty = min(rule.max_qty - current, available)
        if qty <= 0:
            continue
        task = m.ReplenishmentTask(
            task_number=_next_number(db, m.ReplenishmentTask, "RPL-2026"),
            rule_id=rule.id,
            material_id=rule.material_id,
            from_location_id=source_loc.id,
            to_location_id=rule.location_id,
            qty_required=qty,
            qty_assigned=qty,
            priority=_severity(current, threshold),
            status="Ready",
        )
        db.add(task)
        db.flush()
        created.append(task)
    db.commit()
    return [_task_out(db, t) for t in created]


@task_router.patch("/{task_id}/start", response_model=s.ReplenishmentTaskRead)
def start_task(task_id: int, payload: s.ReassignRequest | None = None, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status not in ("Pending", "Ready"):
        raise HTTPException(400, f"Cannot start a task in status {task.status}")
    if payload and payload.assignee:
        task.assignee = payload.assignee
    task.status = "In Progress"
    task.started_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.patch("/{task_id}/hold", response_model=s.ReplenishmentTaskRead)
def hold_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status in ("Completed", "Cancelled"):
        raise HTTPException(400, f"Cannot hold a task in status {task.status}")
    task.status = "On Hold"
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.patch("/{task_id}/resume", response_model=s.ReplenishmentTaskRead)
def resume_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status != "On Hold":
        raise HTTPException(400, "Only an On Hold task can be resumed")
    task.status = "Ready" if task.assignee else "Pending"
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.patch("/{task_id}/reassign", response_model=s.ReplenishmentTaskRead)
def reassign_task(task_id: int, payload: s.ReassignRequest, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status in ("Completed", "Cancelled"):
        raise HTTPException(400, f"Cannot reassign a task in status {task.status}")
    task.assignee = payload.assignee
    if task.status == "Pending":
        task.status = "Ready"
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.patch("/{task_id}/cancel", response_model=s.ReplenishmentTaskRead)
def cancel_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status == "Completed":
        raise HTTPException(400, "Cannot cancel a completed task")
    task.status = "Cancelled"
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@task_router.patch("/{task_id}/complete", response_model=s.ReplenishmentTaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.ReplenishmentTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status != "In Progress":
        raise HTTPException(400, "Only an In Progress task can be completed")

    qty = task.qty_assigned
    from_bal = db.query(ops.InventoryBalance).filter(
        ops.InventoryBalance.material_id == task.material_id,
        ops.InventoryBalance.location_id == task.from_location_id,
    ).order_by(ops.InventoryBalance.on_hand.desc()).first()
    if not from_bal or from_bal.on_hand < qty:
        raise HTTPException(400, "Source location no longer has enough stock to complete this move")
    from_bal.on_hand -= qty

    to_bal = db.query(ops.InventoryBalance).filter(
        ops.InventoryBalance.material_id == task.material_id,
        ops.InventoryBalance.location_id == task.to_location_id,
    ).first()
    if to_bal:
        to_bal.on_hand += qty
    else:
        to_bal = ops.InventoryBalance(
            material_id=task.material_id, location_id=task.to_location_id,
            on_hand=qty, allocated=0, on_hold=0,
            uom=db.get(md.Material, task.material_id).uom or "EA",
        )
        db.add(to_bal)

    db.add(ops.InventoryTransaction(
        txn_type="Transfer", material_id=task.material_id,
        location_id=task.from_location_id, to_location_id=task.to_location_id,
        qty=qty, reference=task.task_number, reason="Replenishment", status="Completed",
    ))

    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


# ─────────────────────────────── Triggers ─────────────────────────────
@trigger_router.get("/", response_model=list[s.TriggerRow])
def list_triggers(db: Session = Depends(get_db)):
    rules = db.query(md.ReplenishmentRule).filter(
        md.ReplenishmentRule.status == "Active",
        md.ReplenishmentRule.location_id.isnot(None),
    ).all()
    now = datetime.utcnow()
    out = []
    for rule in rules:
        threshold = rule.reorder_point if rule.reorder_point is not None else rule.min_qty
        current = _current_qty(db, rule.material_id, rule.location_id)
        if current >= threshold:
            continue
        mat = db.get(md.Material, rule.material_id)
        loc = db.get(md.Location, rule.location_id)
        open_task = _active_open_task_for_rule(db, rule.id)
        if open_task:
            status = "Task Created"
        else:
            source_loc, available = _best_source(db, rule.material_id, rule.location_id)
            status = "Pending Review" if source_loc and available > 0 else "No Source Available"
        out.append(s.TriggerRow(
            rule_id=rule.id, sku=mat.sku if mat else "", description=mat.description if mat else "",
            location_id=rule.location_id, location_code=loc.code if loc else "",
            current_qty=current, min_qty=rule.min_qty, max_qty=rule.max_qty, reorder_point=rule.reorder_point,
            deficit=round(threshold - current, 2), severity=_severity(current, threshold),
            open_task_id=open_task.id if open_task else None,
            open_task_number=open_task.task_number if open_task else None,
            status=status, checked_at=now,
        ))
    out.sort(key=lambda r: {"Critical": 0, "High": 1, "Medium": 2}.get(r.severity, 3))
    return out


@trigger_router.post("/{rule_id}/create-task", response_model=s.ReplenishmentTaskRead)
def create_task_from_trigger(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(md.ReplenishmentRule, rule_id)
    if not rule or not rule.location_id:
        raise HTTPException(404, "Rule not found")
    if _active_open_task_for_rule(db, rule.id):
        raise HTTPException(400, "This rule already has an open replenishment task")
    threshold = rule.reorder_point if rule.reorder_point is not None else rule.min_qty
    current = _current_qty(db, rule.material_id, rule.location_id)
    if current >= threshold:
        raise HTTPException(400, "This rule is not currently below its threshold")
    source_loc, available = _best_source(db, rule.material_id, rule.location_id)
    if not source_loc or available <= 0:
        raise HTTPException(400, "No location currently has available stock of this material to source from")
    qty = min(rule.max_qty - current, available)
    task = m.ReplenishmentTask(
        task_number=_next_number(db, m.ReplenishmentTask, "RPL-2026"),
        rule_id=rule.id, material_id=rule.material_id,
        from_location_id=source_loc.id, to_location_id=rule.location_id,
        qty_required=qty, qty_assigned=qty,
        priority=_severity(current, threshold), status="Ready",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


# ─────────────────────────────── Reports ──────────────────────────────
@report_router.get("/summary", response_model=s.ReplenishmentReportSummary)
def report_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    all_tasks = db.query(m.ReplenishmentTask).all()
    completed = [t for t in all_tasks if t.status == "Completed" and t.completed_at]

    mtd = [t for t in completed if t.completed_at.year == now.year and t.completed_at.month == now.month]

    if completed:
        avg_minutes = sum((t.completed_at - t.created_at).total_seconds() / 60 for t in completed) / len(completed)
    else:
        avg_minutes = 0.0

    total_relevant = [t for t in all_tasks if t.status not in ("Cancelled",)]
    auto_pct = (sum(1 for t in total_relevant if t.rule_id) / len(total_relevant) * 100) if total_relevant else 0.0

    rule_checked = [t for t in completed if t.rule_id]
    if rule_checked:
        accurate = 0
        for t in rule_checked:
            rule = db.get(md.ReplenishmentRule, t.rule_id)
            if not rule:
                continue
            current = _current_qty(db, t.material_id, t.to_location_id)
            if current <= rule.max_qty:
                accurate += 1
        rule_accuracy = (accurate / len(rule_checked) * 100)
    else:
        rule_accuracy = 100.0

    # build the last 6 month buckets robustly (avoids day-31 edge cases)
    buckets = []
    y, mo = now.year, now.month
    for _ in range(6):
        buckets.append((y, mo))
        mo -= 1
        if mo == 0:
            mo, y = 12, y - 1
    buckets.reverse()
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    volume = []
    for (yy, mm) in buckets:
        count = sum(1 for t in completed if t.completed_at.year == yy and t.completed_at.month == mm)
        volume.append(s.MonthlyVolumePoint(month=month_names[mm - 1], tasks=count))

    sku_totals: dict[str, float] = {}
    for t in completed:
        mat = db.get(md.Material, t.material_id)
        sku = mat.sku if mat else f"#{t.material_id}"
        sku_totals[sku] = sku_totals.get(sku, 0) + t.qty_assigned
    top_skus = [s.TopSkuPoint(sku=k, qty=v) for k, v in sorted(sku_totals.items(), key=lambda kv: -kv[1])[:5]]

    return s.ReplenishmentReportSummary(
        tasks_completed_mtd=len(mtd),
        avg_task_duration_minutes=round(avg_minutes, 1),
        auto_triggered_pct=round(auto_pct, 1),
        rule_accuracy_pct=round(rule_accuracy, 1),
        monthly_volume=volume,
        top_skus=top_skus,
    )
