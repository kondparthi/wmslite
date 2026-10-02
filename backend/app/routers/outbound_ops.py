"""
Outbound's 12 tabs. Generic CRUD covers Allocation Strategies, Waves,
Outbound Tasks and Outbound Appointments (same pattern as Inbound's
PutawayStrategy/InboundTask/InboundAppointment). Everything that actually
moves stock or advances the order lifecycle is bespoke, mirroring the
Inbound receive→putaway chain:

  Order + lines (header, no stock effect)
    -> Allocate            reserves stock: InventoryBalance.allocated += qty
    -> Wave -> Pick Task   picking removes stock: on_hand -= qty, allocated -= qty,
                           writes an InventoryTransaction (txn_type="Shipment")
    -> Pack                paperwork only (carton status)
    -> Ship / Dispatch     paperwork only (order + shipment status)

Picking is where inventory actually leaves the shelf — Pack and Ship don't
touch InventoryBalance again, same as how a real WMS treats the physical
pick as the stock-affecting event.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import operations as ops
from app.models import outbound_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import outbound_ops as s

router = APIRouter()

# ---- Generic CRUD: Allocation Strategies, Waves, Outbound Tasks/Appointments ----
router.include_router(make_crud_router(
    model=m.AllocationStrategy, create_schema=s.AllocationStrategyCreate, update_schema=s.AllocationStrategyUpdate,
    read_schema=s.AllocationStrategyRead, prefix="/allocation-strategies", tag="Allocation Strategy",
))
router.include_router(make_crud_router(
    model=m.OutboundTask, create_schema=s.OutboundTaskCreate, update_schema=s.OutboundTaskUpdate,
    read_schema=s.OutboundTaskRead, prefix="/outbound-tasks", tag="Outbound Task",
))
router.include_router(make_crud_router(
    model=m.OutboundAppointment, create_schema=s.OutboundAppointmentCreate, update_schema=s.OutboundAppointmentUpdate,
    read_schema=s.OutboundAppointmentRead, prefix="/outbound-appointments", tag="Outbound Appointment",
))


def _next_number(db: Session, model_cls, column, prefix: str, pad: int = 4) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


# ================= Shipment Orders =================
order_router = APIRouter(prefix="/outbound-orders", tags=["Shipment Order"])


@order_router.get("/", response_model=list[s.ShipmentOrderRead])
def list_orders(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.ShipmentOrder)
    if status:
        q = q.filter(m.ShipmentOrder.status == status)
    return q.order_by(m.ShipmentOrder.id.desc()).limit(300).all()


@order_router.post("/", response_model=s.ShipmentOrderRead, status_code=201)
def create_order(payload: s.ShipmentOrderCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"lines", "order_number"})
    order = m.ShipmentOrder(order_number=payload.order_number, **data)
    db.add(order)
    db.flush()
    for line in payload.lines:
        db.add(m.ShipmentOrderLine(order_id=order.id, material_id=line.material_id, qty_ordered=line.qty_ordered))
    db.commit()
    db.refresh(order)
    return order


@order_router.patch("/{order_id}", response_model=s.ShipmentOrderRead)
def update_order(order_id: int, payload: s.ShipmentOrderUpdate, db: Session = Depends(get_db)):
    order = db.get(m.ShipmentOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(order, k, v)
    db.commit()
    db.refresh(order)
    return order


@order_router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(m.ShipmentOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("Pending", "Cancelled"):
        raise HTTPException(status_code=400, detail="Only a Pending or already-Cancelled order can be deleted — cancel allocations first.")
    db.query(m.ShipmentOrderLine).filter(m.ShipmentOrderLine.order_id == order_id).delete()
    db.delete(order)
    db.commit()
    return None


line_router = APIRouter(prefix="/outbound-order-lines", tags=["Shipment Order Line"])


@line_router.get("/", response_model=list[s.ShipmentOrderLineRead])
def list_lines(order_id: int | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.ShipmentOrderLine)
    if order_id is not None:
        q = q.filter(m.ShipmentOrderLine.order_id == order_id)
    return q.order_by(m.ShipmentOrderLine.id).limit(500).all()


# ================= Allocation =================
alloc_router = APIRouter(prefix="/outbound-allocations", tags=["Allocation"])


@alloc_router.get("/", response_model=list[s.OutboundAllocationRead])
def list_allocations(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.OutboundAllocation)
    if status:
        q = q.filter(m.OutboundAllocation.status == status)
    return q.order_by(m.OutboundAllocation.id.desc()).limit(500).all()


def _available_locations_for(db: Session, material_id: int):
    """Locations holding this material with on_hand - allocated - on_hold > 0, richest first."""
    balances = (
        db.query(ops.InventoryBalance)
        .filter(ops.InventoryBalance.material_id == material_id)
        .all()
    )
    out = []
    for b in balances:
        avail = (b.on_hand or 0) - (b.allocated or 0) - (b.on_hold or 0)
        if avail > 0:
            out.append((b, avail))
    out.sort(key=lambda pair: pair[1], reverse=True)
    return out


@alloc_router.post("/allocate", response_model=list[s.OutboundAllocationRead], status_code=201)
def allocate_line(payload: s.AllocateRequest, db: Session = Depends(get_db)):
    line = db.get(m.ShipmentOrderLine, payload.order_line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Order line not found")
    remaining = payload.qty if payload.qty is not None else (line.qty_ordered - line.qty_allocated)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="This line is already fully allocated.")

    candidates = _available_locations_for(db, line.material_id)
    if not candidates:
        raise HTTPException(status_code=400, detail="No available stock to allocate — out of stock at every location.")

    created = []
    for balance, avail in candidates:
        if remaining <= 0:
            break
        take = min(avail, remaining)
        balance.allocated = (balance.allocated or 0) + take
        alloc = m.OutboundAllocation(order_line_id=line.id, material_id=line.material_id, location_id=balance.location_id, qty=take, status="Allocated")
        db.add(alloc)
        created.append(alloc)
        line.qty_allocated += take
        remaining -= take

    order = db.get(m.ShipmentOrder, line.order_id)
    all_lines = db.query(m.ShipmentOrderLine).filter(m.ShipmentOrderLine.order_id == order.id).all()
    if all(l.qty_allocated >= l.qty_ordered for l in all_lines):
        order.status = "Allocated"
    elif order.status == "Pending":
        order.status = "Pending"  # stays Pending — a partial allocation isn't "Allocated" yet

    db.commit()
    for a in created:
        db.refresh(a)
    return created


@alloc_router.post("/auto-allocate-all", response_model=dict)
def auto_allocate_all(db: Session = Depends(get_db)):
    open_lines = (
        db.query(m.ShipmentOrderLine)
        .join(m.ShipmentOrder, m.ShipmentOrder.id == m.ShipmentOrderLine.order_id)
        .filter(m.ShipmentOrder.status == "Pending", m.ShipmentOrderLine.qty_allocated < m.ShipmentOrderLine.qty_ordered)
        .all()
    )
    allocated_count = 0
    for line in open_lines:
        remaining = line.qty_ordered - line.qty_allocated
        candidates = _available_locations_for(db, line.material_id)
        for balance, avail in candidates:
            if remaining <= 0:
                break
            take = min(avail, remaining)
            balance.allocated = (balance.allocated or 0) + take
            db.add(m.OutboundAllocation(order_line_id=line.id, material_id=line.material_id, location_id=balance.location_id, qty=take, status="Allocated"))
            line.qty_allocated += take
            remaining -= take
            allocated_count += 1
        order = db.get(m.ShipmentOrder, line.order_id)
        all_lines = db.query(m.ShipmentOrderLine).filter(m.ShipmentOrderLine.order_id == order.id).all()
        if all(l.qty_allocated >= l.qty_ordered for l in all_lines):
            order.status = "Allocated"
    db.commit()
    return {"allocations_created": allocated_count}


@alloc_router.delete("/{allocation_id}", status_code=204)
def unallocate(allocation_id: int, db: Session = Depends(get_db)):
    alloc = db.get(m.OutboundAllocation, allocation_id)
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.status != "Allocated":
        raise HTTPException(status_code=400, detail="Only an Allocated (not yet picked) row can be unallocated.")
    balance = db.query(ops.InventoryBalance).filter_by(material_id=alloc.material_id, location_id=alloc.location_id).first()
    if balance:
        balance.allocated = max(0, (balance.allocated or 0) - alloc.qty)
    line = db.get(m.ShipmentOrderLine, alloc.order_line_id)
    line.qty_allocated = max(0, line.qty_allocated - alloc.qty)
    order = db.get(m.ShipmentOrder, line.order_id)
    if order.status == "Allocated":
        order.status = "Pending"
    db.delete(alloc)
    db.commit()
    return None


# ================= Waves =================
wave_router = APIRouter(prefix="/outbound-waves", tags=["Wave"])


@wave_router.get("/", response_model=list[s.WaveRead])
def list_waves(db: Session = Depends(get_db)):
    return db.query(m.Wave).order_by(m.Wave.id.desc()).limit(200).all()


@wave_router.post("/", response_model=s.WaveRead, status_code=201)
def create_wave(payload: s.WaveCreate, db: Session = Depends(get_db)):
    """Building a wave pulls in up to max_orders Allocated-but-not-yet-waved
    orders (optionally matching the priority filter) and creates a Ready
    Pick Task for each of their allocations."""
    wave_number = _next_number(db, m.Wave, "wave_number", "WV")
    wave = m.Wave(wave_number=wave_number, **payload.model_dump())
    db.add(wave)
    db.flush()

    q = db.query(m.ShipmentOrder).filter(m.ShipmentOrder.status == "Allocated", m.ShipmentOrder.wave_id.is_(None))
    if payload.priority_filter and payload.priority_filter not in ("All", ""):
        if payload.priority_filter == "Urgent Only":
            q = q.filter(m.ShipmentOrder.priority == "Urgent")
        elif payload.priority_filter == "High & Urgent":
            q = q.filter(m.ShipmentOrder.priority.in_(["Urgent", "High"]))
    eligible = q.order_by(m.ShipmentOrder.id).limit(payload.max_orders or 20).all()

    tasks_created = 0
    for order in eligible:
        order.wave_id = wave.id
        order.status = "Picking"
        for line in order.lines:
            allocations = db.query(m.OutboundAllocation).filter(
                m.OutboundAllocation.order_line_id == line.id, m.OutboundAllocation.status == "Allocated"
            ).all()
            for alloc in allocations:
                db.add(m.PickTask(allocation_id=alloc.id, wave_id=wave.id, status="Ready"))
                tasks_created += 1

    db.commit()
    db.refresh(wave)
    return wave


@wave_router.patch("/{wave_id}", response_model=s.WaveRead)
def update_wave(wave_id: int, payload: s.WaveUpdate, db: Session = Depends(get_db)):
    wave = db.get(m.Wave, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(wave, k, v)
    db.commit()
    db.refresh(wave)
    return wave


@wave_router.delete("/{wave_id}", status_code=204)
def delete_wave(wave_id: int, db: Session = Depends(get_db)):
    wave = db.get(m.Wave, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    if wave.status == "Completed":
        raise HTTPException(status_code=400, detail="A Completed wave can't be deleted.")
    db.delete(wave)
    db.commit()
    return None


# ================= Pick Tasks =================
pick_router = APIRouter(prefix="/pick-tasks", tags=["Pick Task"])


@pick_router.get("/", response_model=list[s.PickTaskRead])
def list_pick_tasks(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.PickTask)
    if status:
        q = q.filter(m.PickTask.status == status)
    return q.order_by(m.PickTask.id.desc()).limit(300).all()


@pick_router.patch("/{task_id}/assign", response_model=s.PickTaskRead)
def assign_picker(task_id: int, payload: s.AssignPickerRequest, db: Session = Depends(get_db)):
    task = db.get(m.PickTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Pick task not found")
    if task.status != "Ready":
        raise HTTPException(status_code=400, detail="Only a Ready task can be assigned.")
    task.assignee = payload.assignee
    task.status = "In Progress"
    db.commit()
    db.refresh(task)
    return task


@pick_router.patch("/{task_id}/confirm", response_model=s.PickTaskRead)
def confirm_pick(task_id: int, db: Session = Depends(get_db)):
    task = db.get(m.PickTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Pick task not found")
    if task.status == "Completed":
        raise HTTPException(status_code=400, detail="This task is already completed.")
    alloc = db.get(m.OutboundAllocation, task.allocation_id)

    balance = db.query(ops.InventoryBalance).filter_by(material_id=alloc.material_id, location_id=alloc.location_id).first()
    if balance:
        balance.on_hand = max(0, (balance.on_hand or 0) - alloc.qty)
        balance.allocated = max(0, (balance.allocated or 0) - alloc.qty)

    db.add(ops.InventoryTransaction(
        txn_type="Shipment", material_id=alloc.material_id, location_id=alloc.location_id,
        qty=alloc.qty, reference=f"PICK-{task.id}", status="Completed",
    ))

    alloc.status = "Picked"
    line = db.get(m.ShipmentOrderLine, alloc.order_line_id)
    line.qty_picked += alloc.qty
    task.status = "Completed"
    task.completed_at = datetime.utcnow()

    order = db.get(m.ShipmentOrder, line.order_id)
    all_lines = db.query(m.ShipmentOrderLine).filter(m.ShipmentOrderLine.order_id == order.id).all()
    if all(l.qty_picked >= l.qty_ordered for l in all_lines):
        order.status = "Picking"  # fully picked, awaiting a Pack task to move it to "Packed"

    db.commit()
    db.refresh(task)
    return task


# ================= Load & Unload =================
load_router = APIRouter(prefix="/load-tasks", tags=["Load Task"])


@load_router.get("/", response_model=list[s.LoadTaskRead])
def list_loads(db: Session = Depends(get_db)):
    return db.query(m.LoadTask).order_by(m.LoadTask.id.desc()).limit(200).all()


@load_router.post("/", response_model=s.LoadTaskRead, status_code=201)
def create_load(payload: s.LoadTaskCreate, db: Session = Depends(get_db)):
    load_number = _next_number(db, m.LoadTask, "load_number", "LD")
    load = m.LoadTask(load_number=load_number, **payload.model_dump())
    db.add(load)
    db.commit()
    db.refresh(load)
    return load


@load_router.patch("/{load_id}", response_model=s.LoadTaskRead)
def update_load(load_id: int, payload: s.LoadTaskUpdate, db: Session = Depends(get_db)):
    load = db.get(m.LoadTask, load_id)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(load, k, v)
    db.commit()
    db.refresh(load)
    return load


@load_router.delete("/{load_id}", status_code=204)
def delete_load(load_id: int, db: Session = Depends(get_db)):
    load = db.get(m.LoadTask, load_id)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    db.delete(load)
    db.commit()
    return None


# ================= Pack / Unpack =================
pack_router = APIRouter(prefix="/pack-tasks", tags=["Pack Task"])


@pack_router.get("/", response_model=list[s.PackTaskRead])
def list_pack_tasks(db: Session = Depends(get_db)):
    return db.query(m.PackageCarton).order_by(m.PackageCarton.id.desc()).limit(200).all()


@pack_router.post("/", response_model=s.PackTaskRead, status_code=201)
def create_pack_task(payload: s.PackTaskCreate, db: Session = Depends(get_db)):
    order = db.get(m.ShipmentOrder, payload.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    qty_items = sum(l.qty_ordered for l in order.lines)
    pack_number = _next_number(db, m.PackageCarton, "pack_number", "PK")
    pack = m.PackageCarton(pack_number=pack_number, order_id=order.id, station=payload.station, packer=payload.packer, qty_items=qty_items, status="Ready")
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


@pack_router.patch("/{pack_id}/start", response_model=s.PackTaskRead)
def start_pack(pack_id: int, db: Session = Depends(get_db)):
    pack = db.get(m.PackageCarton, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack task not found")
    if pack.status != "Ready":
        raise HTTPException(status_code=400, detail="Only a Ready pack task can be started.")
    pack.status = "Packing"
    db.commit()
    db.refresh(pack)
    return pack


@pack_router.patch("/{pack_id}/complete", response_model=s.PackTaskRead)
def complete_pack(pack_id: int, db: Session = Depends(get_db)):
    pack = db.get(m.PackageCarton, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack task not found")
    pack.status = "Packed"
    pack.qty_packed = pack.qty_items
    order = db.get(m.ShipmentOrder, pack.order_id)
    order.status = "Packed"
    db.commit()
    db.refresh(pack)
    return pack


# ================= Ship =================
ship_router = APIRouter(prefix="/shipments", tags=["Shipment"])


@ship_router.get("/", response_model=list[s.ShipmentRead])
def list_shipments(db: Session = Depends(get_db)):
    return db.query(m.Shipment).order_by(m.Shipment.id.desc()).limit(200).all()


@ship_router.post("/", response_model=s.ShipmentRead, status_code=201)
def create_shipment(payload: s.ShipmentCreate, db: Session = Depends(get_db)):
    order = db.get(m.ShipmentOrder, payload.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "Packed":
        raise HTTPException(status_code=400, detail="Only a Packed order is ready to ship.")
    ship_number = _next_number(db, m.Shipment, "ship_number", "SH")
    shipment = m.Shipment(
        ship_number=ship_number, order_id=order.id, carrier_id=payload.carrier_id or order.carrier_id,
        manifest_number=payload.manifest_number, weight=payload.weight, status="Ready to Ship",
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


def _dispatch(db: Session, shipment: m.Shipment):
    shipment.status = "Dispatched"
    shipment.dispatched_at = datetime.utcnow()
    order = db.get(m.ShipmentOrder, shipment.order_id)
    order.status = "Shipped"
    db.commit()
    db.refresh(shipment)
    return shipment


@ship_router.patch("/{shipment_id}/dispatch", response_model=s.ShipmentRead)
def dispatch_shipment(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.get(m.Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if shipment.status == "Dispatched":
        raise HTTPException(status_code=400, detail="Already dispatched.")
    return _dispatch(db, shipment)


@ship_router.post("/dispatch-by-code", response_model=s.ShipmentRead)
def dispatch_by_code(payload: s.DispatchByCodeRequest, db: Session = Depends(get_db)):
    code = payload.code.strip()
    shipment = (
        db.query(m.Shipment)
        .filter((m.Shipment.ship_number == code) | (m.Shipment.manifest_number == code))
        .first()
    )
    if not shipment:
        order = db.query(m.ShipmentOrder).filter(m.ShipmentOrder.order_number == code).first()
        if order:
            shipment = db.query(m.Shipment).filter(m.Shipment.order_id == order.id).order_by(m.Shipment.id.desc()).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="No matching shipment or order found for that code.")
    if shipment.status == "Dispatched":
        raise HTTPException(status_code=400, detail="Already dispatched.")
    return _dispatch(db, shipment)
