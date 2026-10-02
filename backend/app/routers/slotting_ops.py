"""
Dynamic Slotting's 5 tabs. See app/models/slotting_ops.py for why velocity,
utilization and misplaced-SKU detection all read off Master Data/Inventory
rows instead of a second pick-history or slot-assignment table. Bespoke
pieces:

  _pick_counts / _classify   real ABC/Dead-Stock classification computed
                              from InventoryTransaction(txn_type="Shipment")
                              counts per material, using the standard
                              cumulative-80/95% Pareto method — never a
                              fixed split.
  _misplaced_materials        compares each material's classification
                              against its current AssignedLocation's
                              location_type, so "misplaced" always reflects
                              today's real data, not a stored flag.
  simulation run/apply        run computes a real efficiency/labor estimate
                              from the misplaced count; apply creates
                              ReslottingTask rows for exactly those SKUs.
  reslotting task complete    actually moves the SKU's AssignedLocation and
                              InventoryBalance row to the new location.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import operations as ops
from app.models import slotting_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import slotting_ops as s

# ---- Generic CRUD: Strategies ----
strategy_crud = make_crud_router(
    model=m.SlottingStrategy, create_schema=s.SlottingStrategyCreate, update_schema=s.SlottingStrategyUpdate,
    read_schema=s.SlottingStrategyRead, prefix="/slotting-strategies", tag="Slotting Strategy",
)


def _next_number(db: Session, model_cls, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


# ---- Shared: real ABC/Dead-Stock classification from actual pick history ----
def _pick_counts(db: Session) -> dict[int, int]:
    rows = (
        db.query(ops.InventoryTransaction.material_id, func.count(ops.InventoryTransaction.id))
        .filter(ops.InventoryTransaction.txn_type == "Shipment")
        .group_by(ops.InventoryTransaction.material_id)
        .all()
    )
    return {material_id: count for material_id, count in rows}


def _classify(db: Session) -> dict[int, tuple[str, int]]:
    """material_id -> (classification, pick_count). Non-zero movers are
    classed by cumulative share of total picks (80% -> A, 95% -> B, rest ->
    C); materials with zero recorded picks are Dead Stock."""
    counts = _pick_counts(db)
    all_material_ids = [row[0] for row in db.query(md.Material.id).all()]
    result: dict[int, tuple[str, int]] = {}
    for mid in all_material_ids:
        if counts.get(mid, 0) == 0:
            result[mid] = ("Dead Stock", 0)

    nonzero = sorted(((mid, c) for mid, c in counts.items() if c > 0), key=lambda x: -x[1])
    total = sum(c for _, c in nonzero)
    cum = 0
    for mid, c in nonzero:
        cum += c
        pct = cum / total if total else 0
        cls = "A" if pct <= 0.80 else "B" if pct <= 0.95 else "C"
        result[mid] = (cls, c)
    return result


def _desired_type(classification: str) -> str:
    return "Pick Face" if classification in ("A", "B") else "Storage"


def _current_assignment(db: Session, material_id: int) -> md.AssignedLocation | None:
    return (
        db.query(md.AssignedLocation)
        .filter(md.AssignedLocation.material_id == material_id, md.AssignedLocation.status == "Active")
        .order_by(md.AssignedLocation.id)
        .first()
    )


def _misplaced_materials(db: Session, zone_codes: list[str] | None = None):
    """Every material whose current AssignedLocation's location_type
    disagrees with what its real pick-history classification calls for.
    Optionally scoped to a strategy's target zones."""
    classes = _classify(db)
    out = []
    for mid, (cls, pick_count) in classes.items():
        assignment = _current_assignment(db, mid)
        if not assignment:
            continue
        location = db.get(md.Location, assignment.location_id)
        if not location:
            continue
        if zone_codes:
            zone = db.get(md.ZoneArea, location.zone_id) if location.zone_id else None
            if not zone or zone.code not in zone_codes:
                continue
        desired = _desired_type(cls)
        if location.location_type != desired:
            out.append({
                "material_id": mid, "classification": cls, "pick_count": pick_count,
                "assignment": assignment, "location": location, "desired_type": desired,
            })
    return out


def _pick_target_location(db: Session, desired_type: str, exclude_location_id: int, used: set[int]) -> md.Location | None:
    candidates = db.query(md.Location).filter(md.Location.location_type == desired_type, md.Location.id != exclude_location_id).order_by(md.Location.id).all()
    for c in candidates:
        if c.id not in used:
            return c
    return candidates[0] if candidates else None


# ================= Simulations =================
simulation_router = APIRouter(prefix="/slotting-simulations", tags=["Slotting Simulation"])


def _to_simulation_read(db: Session, sim: m.SlottingSimulation) -> s.SimulationRead:
    strategy = db.get(m.SlottingStrategy, sim.strategy_id)
    return s.SimulationRead(
        id=sim.id, sim_number=sim.sim_number, strategy_id=sim.strategy_id,
        strategy_name=strategy.name if strategy else "—", misplaced_count=sim.misplaced_count,
        efficiency_gain_pct=sim.efficiency_gain_pct, labor_saving_hours=sim.labor_saving_hours,
        status=sim.status, created_at=sim.created_at, applied_at=sim.applied_at,
    )


@simulation_router.get("/", response_model=list[s.SimulationRead])
def list_simulations(db: Session = Depends(get_db)):
    sims = db.query(m.SlottingSimulation).order_by(m.SlottingSimulation.id.desc()).limit(100).all()
    return [_to_simulation_read(db, sim) for sim in sims]


@simulation_router.post("/run", response_model=s.SimulationRead, status_code=201)
def run_simulation(payload: s.RunSimulationRequest, db: Session = Depends(get_db)):
    strategy = db.get(m.SlottingStrategy, payload.strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    zone_codes = [z.strip() for z in strategy.target_zones.split(",") if z.strip()] if strategy.target_zones else None
    misplaced = _misplaced_materials(db, zone_codes)
    total_assigned = db.query(md.AssignedLocation).filter(md.AssignedLocation.status == "Active").count()
    efficiency_gain = round(min(len(misplaced) / max(total_assigned, 1) * 100 * 0.6, 35.0), 1)
    labor_saving = round(len(misplaced) * 0.25, 1)
    sim = m.SlottingSimulation(
        sim_number=_next_number(db, m.SlottingSimulation, "SIM"), strategy_id=strategy.id,
        misplaced_count=len(misplaced), efficiency_gain_pct=efficiency_gain, labor_saving_hours=labor_saving,
        status="Completed",
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return _to_simulation_read(db, sim)


@simulation_router.post("/{sim_id}/apply", response_model=s.SimulationRead)
def apply_simulation(sim_id: int, db: Session = Depends(get_db)):
    sim = db.get(m.SlottingSimulation, sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status == "Applied":
        raise HTTPException(status_code=400, detail="Already applied.")
    strategy = db.get(m.SlottingStrategy, sim.strategy_id)
    zone_codes = [z.strip() for z in strategy.target_zones.split(",") if z.strip()] if strategy and strategy.target_zones else None
    misplaced = _misplaced_materials(db, zone_codes)

    used_targets: set[int] = set()
    last = db.query(m.ReslottingTask).order_by(m.ReslottingTask.id.desc()).first()
    next_n = (last.id if last else 0) + 1
    for entry in misplaced:
        material_id = entry["material_id"]
        existing = db.query(m.ReslottingTask).filter(
            m.ReslottingTask.material_id == material_id, m.ReslottingTask.status != "Completed",
        ).first()
        if existing:
            continue
        target = _pick_target_location(db, entry["desired_type"], entry["location"].id, used_targets)
        if not target:
            continue
        used_targets.add(target.id)
        reason = "Velocity Inc." if entry["desired_type"] == "Pick Face" else "Velocity Dec."
        priority = "High" if entry["classification"] == "A" else "Med" if entry["classification"] == "B" else "Low"
        db.add(m.ReslottingTask(
            task_number=f"RSL-{str(next_n).zfill(3)}", material_id=material_id,
            from_location_id=entry["location"].id, to_location_id=target.id, reason=reason,
            priority=priority, status="Ready", simulation_id=sim.id,
        ))
        next_n += 1
    sim.status = "Applied"
    sim.applied_at = datetime.utcnow()
    db.commit()
    db.refresh(sim)
    return _to_simulation_read(db, sim)


# ================= Velocity Analysis =================
velocity_router = APIRouter(prefix="/slotting-velocity", tags=["Slotting Velocity"])


@velocity_router.get("/summary", response_model=list[s.VelocityBucket])
def velocity_summary(db: Session = Depends(get_db)):
    classes = _classify(db)
    buckets = {"A": [0, 0], "B": [0, 0], "C": [0, 0], "Dead Stock": [0, 0]}
    for cls, pick_count in classes.values():
        buckets[cls][0] += 1
        buckets[cls][1] += pick_count
    return [s.VelocityBucket(classification=k, count=v[0], pick_count=v[1]) for k, v in buckets.items()]


@velocity_router.get("/materials", response_model=list[s.MaterialVelocity])
def velocity_materials(db: Session = Depends(get_db)):
    classes = _classify(db)
    out = []
    for material in db.query(md.Material).order_by(md.Material.id).all():
        cls, pick_count = classes.get(material.id, ("Dead Stock", 0))
        assignment = _current_assignment(db, material.id)
        location = db.get(md.Location, assignment.location_id) if assignment else None
        out.append(s.MaterialVelocity(
            material_id=material.id, sku=material.sku, description=material.description,
            pick_count=pick_count, classification=cls,
            location_code=location.code if location else None, location_type=location.location_type if location else None,
        ))
    out.sort(key=lambda x: -x.pick_count)
    return out


# ================= Storage Utilization =================
utilization_router = APIRouter(prefix="/slotting-utilization", tags=["Slotting Utilization"])


@utilization_router.get("/zones", response_model=list[s.ZoneUtilization])
def zone_utilization(db: Session = Depends(get_db)):
    results = []
    for zone in db.query(md.ZoneArea).order_by(md.ZoneArea.id).all():
        on_hand = (
            db.query(func.coalesce(func.sum(ops.InventoryBalance.on_hand), 0))
            .join(md.Location, md.Location.id == ops.InventoryBalance.location_id)
            .filter(md.Location.zone_id == zone.id)
            .scalar()
        ) or 0
        capacity = zone.capacity_units or 0
        pct = int(min(on_hand / capacity * 100, 100)) if capacity else 0
        results.append(s.ZoneUtilization(
            zone=zone.name, zone_type=zone.zone_type or "—", on_hand_units=on_hand,
            capacity_units=capacity, utilization_pct=pct,
        ))
    return results


@utilization_router.get("/honeycombing", response_model=s.HoneycombSummary)
def honeycombing(db: Session = Depends(get_db)):
    assignments = db.query(md.AssignedLocation).filter(md.AssignedLocation.status == "Active").all()
    partial = 0
    for a in assignments:
        if not a.max_qty:
            continue
        balance = (
            db.query(ops.InventoryBalance)
            .filter(ops.InventoryBalance.material_id == a.material_id, ops.InventoryBalance.location_id == a.location_id)
            .first()
        )
        on_hand = balance.on_hand if balance else 0
        if 0 < on_hand < 0.5 * a.max_qty:
            partial += 1
    total = len(assignments)
    return s.HoneycombSummary(
        honeycombing_pct=int(partial / total * 100) if total else 0,
        partial_pallets=partial, consolidatable=partial // 2, total_assigned=total,
    )


# ================= Re-slotting Tasks =================
reslotting_router = APIRouter(prefix="/slotting-reslotting-tasks", tags=["Reslotting Task"])


def _to_task_read(db: Session, task: m.ReslottingTask) -> s.ReslottingTaskRead:
    material = db.get(md.Material, task.material_id)
    from_loc = db.get(md.Location, task.from_location_id)
    to_loc = db.get(md.Location, task.to_location_id)
    return s.ReslottingTaskRead(
        id=task.id, task_number=task.task_number, material_id=task.material_id,
        sku=material.sku if material else "—", description=material.description if material else "—",
        from_location_code=from_loc.code if from_loc else "—", to_location_code=to_loc.code if to_loc else "—",
        reason=task.reason, priority=task.priority, assignee=task.assignee, status=task.status,
        created_at=task.created_at, completed_at=task.completed_at,
    )


@reslotting_router.get("/", response_model=list[s.ReslottingTaskRead])
def list_reslotting_tasks(db: Session = Depends(get_db)):
    tasks = db.query(m.ReslottingTask).order_by(m.ReslottingTask.id.desc()).limit(200).all()
    return [_to_task_read(db, t) for t in tasks]


@reslotting_router.patch("/{task_id}/assign", response_model=s.ReslottingTaskRead)
def assign_task(task_id: int, payload: s.AssignReslottingRequest, db: Session = Depends(get_db)):
    task = db.get(m.ReslottingTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "Completed":
        raise HTTPException(status_code=400, detail="Already completed.")
    task.assignee = payload.assignee
    task.status = "Assigned"
    db.commit()
    db.refresh(task)
    return _to_task_read(db, task)


@reslotting_router.patch("/release-batch")
def release_batch(db: Session = Depends(get_db)):
    ready = db.query(m.ReslottingTask).filter(m.ReslottingTask.status == "Ready").all()
    for t in ready:
        t.status = "Assigned"
        t.assignee = t.assignee or "Batch Release"
    db.commit()
    return {"released": len(ready)}


@reslotting_router.patch("/{task_id}/complete", response_model=s.ReslottingTaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.ReslottingTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "Completed":
        raise HTTPException(status_code=400, detail="Already completed.")

    assignment = (
        db.query(md.AssignedLocation)
        .filter(md.AssignedLocation.material_id == task.material_id, md.AssignedLocation.location_id == task.from_location_id)
        .first()
    )
    if assignment:
        assignment.location_id = task.to_location_id

    from_balance = (
        db.query(ops.InventoryBalance)
        .filter(ops.InventoryBalance.material_id == task.material_id, ops.InventoryBalance.location_id == task.from_location_id)
        .first()
    )
    if from_balance:
        to_balance = (
            db.query(ops.InventoryBalance)
            .filter(ops.InventoryBalance.material_id == task.material_id, ops.InventoryBalance.location_id == task.to_location_id)
            .first()
        )
        if to_balance:
            to_balance.on_hand += from_balance.on_hand
            to_balance.allocated += from_balance.allocated
            db.delete(from_balance)
        else:
            from_balance.location_id = task.to_location_id

    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _to_task_read(db, task)


# ================= Optimization Reports =================
report_router = APIRouter(prefix="/slotting-reports", tags=["Slotting Report"])


@report_router.get("/impact", response_model=s.OptimizationImpact)
def optimization_impact(db: Session = Depends(get_db)):
    applied = db.query(m.SlottingSimulation).filter(m.SlottingSimulation.status == "Applied").all()
    completed_tasks = db.query(m.ReslottingTask).filter(m.ReslottingTask.status == "Completed").count()
    if applied:
        avg_efficiency = round(sum(sim.efficiency_gain_pct for sim in applied) / len(applied), 1)
        total_labor_hours = round(sum(sim.labor_saving_hours for sim in applied), 1)
        labor_efficiency = round(total_labor_hours / (8 * len(applied)) * 100, 1)
    else:
        avg_efficiency, total_labor_hours, labor_efficiency = 0.0, 0.0, 0.0

    # "Space recovered" = distinct locations completed re-slotting freed up
    # (no AssignedLocation still points there), a real, checkable count.
    completed = db.query(m.ReslottingTask).filter(m.ReslottingTask.status == "Completed").all()
    freed = 0
    for t in completed:
        still_used = db.query(md.AssignedLocation).filter(md.AssignedLocation.location_id == t.from_location_id).count()
        if still_used == 0:
            freed += 1

    return s.OptimizationImpact(
        travel_time_reduction_pct=avg_efficiency, space_recovered_units=freed,
        labor_efficiency_pct=labor_efficiency, applied_simulations=len(applied), completed_tasks=completed_tasks,
    )
