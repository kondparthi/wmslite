"""
Yard Management's 5 tabs. See app/models/yard_ops.py for why these are new
tables rather than extensions of an existing module. Bespoke pieces:

  check-in lifecycle    At Gate -> enter-yard (assign zone) -> inspect ->
                        check-out, mirroring the mock's gate workflow.
  door assign/release   occupies/frees a YardDoor and drives its progress.
  move dispatch/complete  completing a shunter move updates the check-in's
                        zone for real, same "roll activity into a header"
                        idea used by Shipping's Manifest.close.
  aging / carrier perf  computed from checked_in_at/checked_out_at at read
                        time — never stored, so they can't go stale.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import master_data as md
from app.models import yard_ops as m
from app.schemas import yard_ops as s

ZONES = {"Parking Zone A": 20, "Parking Zone B": 20, "Empty Pool": 15, "Loaded Storage": 15}
ON_TIME_TURNAROUND_MINUTES = 150  # SLA used for "on-time" carrier performance
OVERDUE_DWELL_HOURS = 72


def _next_pass_id(db: Session) -> str:
    last = db.query(m.YardCheckIn).order_by(m.YardCheckIn.id.desc()).first()
    n = (last.id if last else 0) + 8800
    return f"T-{n + 1}"


def _next_move_number(db: Session) -> str:
    last = db.query(m.YardMove).order_by(m.YardMove.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"MV-{str(n).zfill(4)}"


def _to_checkin_read(c: m.YardCheckIn) -> s.YardCheckInRead:
    end = c.checked_out_at or datetime.utcnow()
    dwell = int((end - c.checked_in_at).total_seconds() // 60) if c.checked_in_at else 0
    return s.YardCheckInRead(
        id=c.id, pass_id=c.pass_id, trailer_number=c.trailer_number, carrier_id=c.carrier_id,
        transaction_type=c.transaction_type, seal_number=c.seal_number, status=c.status, zone=c.zone,
        checked_in_at=c.checked_in_at, checked_out_at=c.checked_out_at, dwell_minutes=max(dwell, 0),
    )


# ================= Gate Management =================
checkin_router = APIRouter(prefix="/yard-checkins", tags=["Yard Check-In"])


@checkin_router.get("/", response_model=list[s.YardCheckInRead])
def list_checkins(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.YardCheckIn)
    if status:
        q = q.filter(m.YardCheckIn.status == status)
    checkins = q.order_by(m.YardCheckIn.id.desc()).limit(300).all()
    return [_to_checkin_read(c) for c in checkins]


@checkin_router.post("/", response_model=s.YardCheckInRead, status_code=201)
def check_in_trailer(payload: s.YardCheckInCreate, db: Session = Depends(get_db)):
    if payload.carrier_id and not db.get(md.Carrier, payload.carrier_id):
        raise HTTPException(status_code=404, detail="Carrier not found")
    checkin = m.YardCheckIn(
        pass_id=_next_pass_id(db), trailer_number=payload.trailer_number, carrier_id=payload.carrier_id,
        transaction_type=payload.transaction_type, seal_number=payload.seal_number, status="At Gate",
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return _to_checkin_read(checkin)


@checkin_router.patch("/{checkin_id}/enter-yard", response_model=s.YardCheckInRead)
def enter_yard(checkin_id: int, payload: s.EnterYardRequest, db: Session = Depends(get_db)):
    checkin = db.get(m.YardCheckIn, checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if checkin.status == "Departed":
        raise HTTPException(status_code=400, detail="Trailer already departed.")
    checkin.status = "Checked In"
    checkin.zone = payload.zone
    db.commit()
    db.refresh(checkin)
    return _to_checkin_read(checkin)


@checkin_router.patch("/{checkin_id}/inspect", response_model=s.YardCheckInRead)
def inspect_checkin(checkin_id: int, db: Session = Depends(get_db)):
    checkin = db.get(m.YardCheckIn, checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if checkin.status == "Departed":
        raise HTTPException(status_code=400, detail="Trailer already departed.")
    checkin.status = "Inspected"
    db.commit()
    db.refresh(checkin)
    return _to_checkin_read(checkin)


@checkin_router.patch("/{checkin_id}/check-out", response_model=s.YardCheckInRead)
def check_out(checkin_id: int, db: Session = Depends(get_db)):
    checkin = db.get(m.YardCheckIn, checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if checkin.status == "Departed":
        raise HTTPException(status_code=400, detail="Already checked out.")
    door = db.query(m.YardDoor).filter(m.YardDoor.checkin_id == checkin.id).first()
    if door:
        door.status, door.checkin_id, door.task_type, door.progress = "Empty", None, None, 0
    checkin.status = "Departed"
    checkin.checked_out_at = datetime.utcnow()
    checkin.zone = None
    db.commit()
    db.refresh(checkin)
    return _to_checkin_read(checkin)


@checkin_router.get("/summary", response_model=s.GateSummary)
def gate_summary(db: Session = Depends(get_db)):
    pending_entry = db.query(m.YardCheckIn).filter(m.YardCheckIn.status == "At Gate").count()
    inside_yard = db.query(m.YardCheckIn).filter(m.YardCheckIn.status.in_(["Checked In", "Inspected"])).count()
    now = datetime.utcnow()
    overdue = 0
    for c in db.query(m.YardCheckIn).filter(m.YardCheckIn.status.in_(["Checked In", "Inspected"])).all():
        if (now - c.checked_in_at).total_seconds() >= OVERDUE_DWELL_HOURS * 3600:
            overdue += 1
    departed = db.query(m.YardCheckIn).filter(m.YardCheckIn.status == "Departed").all()
    if departed:
        total_minutes = sum((c.checked_out_at - c.checked_in_at).total_seconds() / 60 for c in departed)
        avg_turnaround = int(total_minutes / len(departed))
    else:
        avg_turnaround = 0
    return s.GateSummary(
        pending_entry=pending_entry, inside_yard=inside_yard,
        avg_turnaround_minutes=avg_turnaround, overdue_dwell=overdue,
    )


# ================= Yard Inventory (zones) =================
zone_router = APIRouter(prefix="/yard-zones", tags=["Yard Zone"])


@zone_router.get("/summary", response_model=list[s.ZoneSummary])
def zone_summary(db: Session = Depends(get_db)):
    checkins = db.query(m.YardCheckIn).filter(m.YardCheckIn.status.in_(["Checked In", "Inspected"])).all()
    counts = {zone: 0 for zone in ZONES}
    for c in checkins:
        if c.zone in counts:
            counts[c.zone] += 1
    return [
        s.ZoneSummary(zone=zone, count=count, capacity=ZONES[zone], utilization_pct=int(count / ZONES[zone] * 100))
        for zone, count in counts.items()
    ]


# ================= Dock & Doors =================
door_router = APIRouter(prefix="/yard-doors", tags=["Yard Door"])


def _to_door_read(db: Session, door: m.YardDoor) -> s.YardDoorRead:
    trailer_number = None
    if door.checkin_id:
        checkin = db.get(m.YardCheckIn, door.checkin_id)
        trailer_number = checkin.trailer_number if checkin else None
    return s.YardDoorRead(
        id=door.id, door_code=door.door_code, status=door.status, checkin_id=door.checkin_id,
        trailer_number=trailer_number, task_type=door.task_type, progress=door.progress, updated_at=door.updated_at,
    )


@door_router.get("/", response_model=list[s.YardDoorRead])
def list_doors(db: Session = Depends(get_db)):
    doors = db.query(m.YardDoor).order_by(m.YardDoor.door_code).all()
    return [_to_door_read(db, d) for d in doors]


@door_router.post("/{door_id}/assign", response_model=s.YardDoorRead)
def assign_door(door_id: int, payload: s.AssignDoorRequest, db: Session = Depends(get_db)):
    door = db.get(m.YardDoor, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    if door.status == "Occupied":
        raise HTTPException(status_code=400, detail="Door is already occupied.")
    checkin = db.get(m.YardCheckIn, payload.checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    door.status = "Occupied"
    door.checkin_id = checkin.id
    door.task_type = payload.task_type
    door.progress = 0
    db.commit()
    db.refresh(door)
    return _to_door_read(db, door)


@door_router.patch("/{door_id}/progress", response_model=s.YardDoorRead)
def update_door_progress(door_id: int, payload: s.DoorProgressRequest, db: Session = Depends(get_db)):
    door = db.get(m.YardDoor, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    if door.status != "Occupied":
        raise HTTPException(status_code=400, detail="Door has no active task.")
    door.progress = max(0, min(100, payload.progress))
    db.commit()
    db.refresh(door)
    return _to_door_read(db, door)


@door_router.patch("/{door_id}/release", response_model=s.YardDoorRead)
def release_door(door_id: int, db: Session = Depends(get_db)):
    door = db.get(m.YardDoor, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    door.status, door.checkin_id, door.task_type, door.progress = "Empty", None, None, 0
    db.commit()
    db.refresh(door)
    return _to_door_read(db, door)


# ================= Shunter Workflows (moves) =================
move_router = APIRouter(prefix="/yard-moves", tags=["Yard Move"])


def _to_move_read(db: Session, move: m.YardMove) -> s.YardMoveRead:
    checkin = db.get(m.YardCheckIn, move.checkin_id)
    return s.YardMoveRead(
        id=move.id, move_number=move.move_number, checkin_id=move.checkin_id,
        trailer_number=checkin.trailer_number if checkin else None, from_location=move.from_location,
        to_location=move.to_location, priority=move.priority, status=move.status,
        requested_at=move.requested_at, completed_at=move.completed_at,
    )


@move_router.get("/", response_model=list[s.YardMoveRead])
def list_moves(status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.YardMove)
    if status:
        q = q.filter(m.YardMove.status == status)
    moves = q.order_by(m.YardMove.id.desc()).limit(200).all()
    return [_to_move_read(db, mv) for mv in moves]


@move_router.post("/", response_model=s.YardMoveRead, status_code=201)
def create_move(payload: s.YardMoveCreate, db: Session = Depends(get_db)):
    checkin = db.get(m.YardCheckIn, payload.checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    move = m.YardMove(
        move_number=_next_move_number(db), checkin_id=payload.checkin_id, from_location=payload.from_location,
        to_location=payload.to_location, priority=payload.priority, status="Pending",
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return _to_move_read(db, move)


@move_router.patch("/{move_id}/dispatch", response_model=s.YardMoveRead)
def dispatch_move(move_id: int, db: Session = Depends(get_db)):
    move = db.get(m.YardMove, move_id)
    if not move:
        raise HTTPException(status_code=404, detail="Move not found")
    if move.status != "Pending":
        raise HTTPException(status_code=400, detail="Only a Pending move can be dispatched.")
    move.status = "In Route"
    db.commit()
    db.refresh(move)
    return _to_move_read(db, move)


@move_router.patch("/{move_id}/complete", response_model=s.YardMoveRead)
def complete_move(move_id: int, db: Session = Depends(get_db)):
    move = db.get(m.YardMove, move_id)
    if not move:
        raise HTTPException(status_code=404, detail="Move not found")
    if move.status == "Completed":
        raise HTTPException(status_code=400, detail="Already completed.")
    move.status = "Completed"
    move.completed_at = datetime.utcnow()
    checkin = db.get(m.YardCheckIn, move.checkin_id)
    if checkin and checkin.status != "Departed":
        checkin.zone = move.to_location if move.to_location in ZONES else checkin.zone
    db.commit()
    db.refresh(move)
    return _to_move_read(db, move)


# ================= Yard Analytics =================
report_router = APIRouter(prefix="/yard-reports", tags=["Yard Report"])


@report_router.get("/aging", response_model=list[s.AgingBucket])
def aging_report(db: Session = Depends(get_db)):
    """Dwell-time buckets for trailers still in the yard, computed from
    checked_in_at at read time — never a stored/stale count."""
    buckets = {"< 24h": 0, "24-48h": 0, "48-72h": 0, "> 72h": 0}
    now = datetime.utcnow()
    for c in db.query(m.YardCheckIn).filter(m.YardCheckIn.status.in_(["Checked In", "Inspected"])).all():
        hours = (now - c.checked_in_at).total_seconds() / 3600
        if hours < 24:
            buckets["< 24h"] += 1
        elif hours < 48:
            buckets["24-48h"] += 1
        elif hours < 72:
            buckets["48-72h"] += 1
        else:
            buckets["> 72h"] += 1
    return [s.AgingBucket(range=r, count=c) for r, c in buckets.items()]


@report_router.get("/carrier-performance", response_model=list[s.CarrierPerformance])
def carrier_performance(db: Session = Depends(get_db)):
    """On-time % per carrier computed from real gate-to-departure turnaround
    times (checked_out_at - checked_in_at) against ON_TIME_TURNAROUND_MINUTES."""
    departed = db.query(m.YardCheckIn).filter(m.YardCheckIn.status == "Departed", m.YardCheckIn.carrier_id.isnot(None)).all()
    by_carrier: dict[int, list[float]] = {}
    for c in departed:
        minutes = (c.checked_out_at - c.checked_in_at).total_seconds() / 60
        by_carrier.setdefault(c.carrier_id, []).append(minutes)

    results = []
    for carrier_id, turnarounds in by_carrier.items():
        carrier = db.get(md.Carrier, carrier_id)
        if not carrier:
            continue
        on_time = sum(1 for t in turnarounds if t <= ON_TIME_TURNAROUND_MINUTES)
        results.append(s.CarrierPerformance(
            carrier_id=carrier_id, carrier_name=carrier.name,
            on_time_pct=int(on_time / len(turnarounds) * 100), trailer_count=len(turnarounds),
        ))
    results.sort(key=lambda r: -r.on_time_pct)
    return results
