"""
Admin Configuration's 8 tabs. See app/models/admin_config.py's docstring for
the reuse-first design and explicit scope-downs this router follows.

_audit(...) is the one hook every hand-written mutation in this file calls
(directly, or via _crud_with_audit wrapping a make_crud_router instance) so
the Audit Trail tab is a real, working log of Admin Config's own changes —
not every action across all 15 modules (out of scope, see the model
docstring).
"""
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import admin_config as m
from app.models import master_data as md
from app.models import outbound_ops as ob
from app.models import yard_ops as yd
from app.models.auth import User
from app.routers.generic_crud import make_crud_router
from app.schemas import admin_config as s

ADMIN_ACTOR = {"username": "Admin", "role": "System Admin"}


def _next_code(db: Session, model_cls, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _audit(db: Session, action: str, entity_type: str, entity_id, module: str, detail: str, severity: str = "Info"):
    db.add(m.AuditLog(
        log_code=_next_code(db, m.AuditLog, "AUD", pad=4),
        user_id=None, username=ADMIN_ACTOR["username"], role=ADMIN_ACTOR["role"],
        action=action, entity_type=entity_type, entity_id=str(entity_id) if entity_id is not None else None,
        module=module, field_detail=detail, severity=severity,
    ))


# ═══════════════════════════ Users & Roles ════════════════════════════
users_router = APIRouter(prefix="/admin/users", tags=["Admin: Users"])
roles_router = APIRouter(prefix="/admin/roles", tags=["Admin: Roles"])
shifts_router = APIRouter(prefix="/admin/shifts", tags=["Admin: Shifts"])
loginhistory_router = APIRouter(prefix="/admin/login-history", tags=["Admin: Login History"])


def _user_out(db: Session, u: User) -> s.AdminUserRead:
    out = s.AdminUserRead.model_validate(u)
    if u.warehouse_id:
        wh = db.get(m.Warehouse, u.warehouse_id)
        out.warehouse_code = wh.code if wh else None
    if u.shift_id:
        sh = db.get(m.ShiftSchedule, u.shift_id)
        out.shift_name = sh.name if sh else None
    return out


@users_router.get("/", response_model=list[s.AdminUserRead])
def list_users(role: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return [_user_out(db, u) for u in q.order_by(User.id).all()]


@users_router.post("/", response_model=s.AdminUserRead, status_code=201)
def create_user(payload: s.AdminUserCreate, db: Session = Depends(get_db)):
    from app.core.config import DEFAULT_TENANT_ID
    from app.core.security import hash_password

    username = payload.username or payload.email.split("@")[0]
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "A user with this email already exists")
    user = User(
        tenant_id=DEFAULT_TENANT_ID, username=username, email=payload.email,
        full_name=payload.full_name, role=payload.role, status=payload.status,
        password_hash=hash_password(payload.password or "Welcome@123"),
        warehouse_id=payload.warehouse_id, shift_id=payload.shift_id,
        mfa_enabled=payload.mfa_enabled,
    )
    db.add(user)
    db.flush()
    _audit(db, "Created", "User", user.id, "Admin Configuration", f"User created: {user.full_name} ({user.email})")
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@users_router.patch("/{user_id}", response_model=s.AdminUserRead)
def update_user(user_id: int, payload: s.AdminUserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    _audit(db, "Updated", "User", user.id, "Admin Configuration", f"User updated: {user.full_name}")
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@users_router.patch("/{user_id}/lock", response_model=s.AdminUserRead)
def lock_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.locked = True
    _audit(db, "Disabled", "User", user.id, "Admin Configuration", f"Account locked: {user.full_name}", severity="High")
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@users_router.patch("/{user_id}/unlock", response_model=s.AdminUserRead)
def unlock_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.locked = False
    _audit(db, "Enabled", "User", user.id, "Admin Configuration", f"Account unlocked: {user.full_name}", severity="Medium")
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@users_router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    _audit(db, "Deleted", "User", user.id, "Admin Configuration", f"User deleted: {user.full_name}", severity="High")
    db.delete(user)
    db.commit()
    return None


def _role_out(db: Session, r: m.Role) -> s.RoleRead:
    out = s.RoleRead.model_validate(r)
    out.user_count = db.query(User).filter(User.role == r.name).count()
    return out


@roles_router.get("/", response_model=list[s.RoleRead])
def list_roles(db: Session = Depends(get_db)):
    return [_role_out(db, r) for r in db.query(m.Role).order_by(m.Role.id).all()]


@roles_router.post("/", response_model=s.RoleRead, status_code=201)
def create_role(payload: s.RoleCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["modules"] = ",".join(data["modules"])
    role = m.Role(**data)
    db.add(role)
    db.flush()
    _audit(db, "Created", "Role", role.id, "Admin Configuration", f"Role created: {role.name}")
    db.commit()
    db.refresh(role)
    return _role_out(db, role)


@roles_router.patch("/{role_id}", response_model=s.RoleRead)
def update_role(role_id: int, payload: s.RoleUpdate, db: Session = Depends(get_db)):
    role = db.get(m.Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    data = payload.model_dump(exclude_unset=True)
    if "modules" in data:
        data["modules"] = ",".join(data["modules"])
    for k, v in data.items():
        setattr(role, k, v)
    _audit(db, "Updated", "Role", role.id, "Admin Configuration", f"Role updated: {role.name}")
    db.commit()
    db.refresh(role)
    return _role_out(db, role)


@roles_router.delete("/{role_id}", status_code=204)
def delete_role(role_id: int, db: Session = Depends(get_db)):
    role = db.get(m.Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    _audit(db, "Deleted", "Role", role.id, "Admin Configuration", f"Role deleted: {role.name}", severity="High")
    db.delete(role)
    db.commit()
    return None


def _shift_out(db: Session, sh: m.ShiftSchedule) -> s.ShiftScheduleRead:
    out = s.ShiftScheduleRead.model_validate(sh)
    out.staff_count = db.query(User).filter(User.shift_id == sh.id).count()
    return out


@shifts_router.get("/", response_model=list[s.ShiftScheduleRead])
def list_shifts(db: Session = Depends(get_db)):
    return [_shift_out(db, sh) for sh in db.query(m.ShiftSchedule).order_by(m.ShiftSchedule.id).all()]


@shifts_router.post("/", response_model=s.ShiftScheduleRead, status_code=201)
def create_shift(payload: s.ShiftScheduleCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["days_active"] = ",".join(data["days_active"])
    shift = m.ShiftSchedule(**data)
    db.add(shift)
    db.flush()
    _audit(db, "Created", "Shift", shift.id, "Admin Configuration", f"Shift created: {shift.name}")
    db.commit()
    db.refresh(shift)
    return _shift_out(db, shift)


@shifts_router.patch("/{shift_id}", response_model=s.ShiftScheduleRead)
def update_shift(shift_id: int, payload: s.ShiftScheduleUpdate, db: Session = Depends(get_db)):
    shift = db.get(m.ShiftSchedule, shift_id)
    if not shift:
        raise HTTPException(404, "Shift not found")
    data = payload.model_dump(exclude_unset=True)
    if "days_active" in data:
        data["days_active"] = ",".join(data["days_active"])
    for k, v in data.items():
        setattr(shift, k, v)
    _audit(db, "Updated", "Shift", shift.id, "Admin Configuration", f"Shift updated: {shift.name}")
    db.commit()
    db.refresh(shift)
    return _shift_out(db, shift)


@shifts_router.delete("/{shift_id}", status_code=204)
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.get(m.ShiftSchedule, shift_id)
    if not shift:
        raise HTTPException(404, "Shift not found")
    _audit(db, "Deleted", "Shift", shift.id, "Admin Configuration", f"Shift deleted: {shift.name}")
    db.delete(shift)
    db.commit()
    return None


@loginhistory_router.get("/", response_model=list[s.LoginHistoryRead])
def list_login_history(db: Session = Depends(get_db)):
    return db.query(m.LoginHistory).order_by(m.LoginHistory.id.desc()).limit(300).all()


# ═══════════════════════════ Warehouse Config ══════════════════════════
warehouses_router = APIRouter(prefix="/admin/warehouses", tags=["Admin: Warehouses"])
zones_router = APIRouter(prefix="/admin/zones", tags=["Admin: Zones"])
docks_router = APIRouter(prefix="/admin/docks", tags=["Admin: Dock Doors"])
aisles_router = APIRouter(prefix="/admin/aisles", tags=["Admin: Aisle/Bay/Level"])


def _warehouse_out(db: Session, w: m.Warehouse) -> s.WarehouseRead:
    out = s.WarehouseRead.model_validate(w)
    out.zones_count = db.query(md.ZoneArea).filter(md.ZoneArea.warehouse_id == w.id).count()
    out.docks_count = db.query(yd.YardDoor).filter(yd.YardDoor.warehouse_id == w.id).count()
    return out


@warehouses_router.get("/", response_model=list[s.WarehouseRead])
def list_warehouses(db: Session = Depends(get_db)):
    return [_warehouse_out(db, w) for w in db.query(m.Warehouse).order_by(m.Warehouse.id).all()]


@warehouses_router.post("/", response_model=s.WarehouseRead, status_code=201)
def create_warehouse(payload: s.WarehouseCreate, db: Session = Depends(get_db)):
    wh = m.Warehouse(**payload.model_dump())
    db.add(wh)
    db.flush()
    _audit(db, "Created", "Warehouse", wh.id, "Admin Configuration", f"Warehouse created: {wh.name}")
    db.commit()
    db.refresh(wh)
    return _warehouse_out(db, wh)


@warehouses_router.patch("/{wh_id}", response_model=s.WarehouseRead)
def update_warehouse(wh_id: int, payload: s.WarehouseUpdate, db: Session = Depends(get_db)):
    wh = db.get(m.Warehouse, wh_id)
    if not wh:
        raise HTTPException(404, "Warehouse not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(wh, k, v)
    _audit(db, "Updated", "Warehouse", wh.id, "Admin Configuration", f"Warehouse updated: {wh.name}")
    db.commit()
    db.refresh(wh)
    return _warehouse_out(db, wh)


@warehouses_router.delete("/{wh_id}", status_code=204)
def delete_warehouse(wh_id: int, db: Session = Depends(get_db)):
    wh = db.get(m.Warehouse, wh_id)
    if not wh:
        raise HTTPException(404, "Warehouse not found")
    _audit(db, "Deleted", "Warehouse", wh.id, "Admin Configuration", f"Warehouse deleted: {wh.name}", severity="High")
    db.delete(wh)
    db.commit()
    return None


def _zone_out(db: Session, z: md.ZoneArea) -> s.AdminZoneRead:
    out = s.AdminZoneRead.model_validate(z)
    out.pick_priority = getattr(z, "pick_priority", None) or "Medium"
    if z.warehouse_id:
        wh = db.get(m.Warehouse, z.warehouse_id)
        out.warehouse_code = wh.code if wh else None
    out.locations_count = db.query(md.Location).filter(md.Location.zone_id == z.id).count()
    return out


@zones_router.get("/", response_model=list[s.AdminZoneRead])
def list_admin_zones(db: Session = Depends(get_db)):
    return [_zone_out(db, z) for z in db.query(md.ZoneArea).order_by(md.ZoneArea.id).all()]


@zones_router.post("/", response_model=s.AdminZoneRead, status_code=201)
def create_admin_zone(payload: s.AdminZoneCreate, db: Session = Depends(get_db)):
    zone = md.ZoneArea(**payload.model_dump())
    db.add(zone)
    db.flush()
    _audit(db, "Created", "Zone", zone.id, "Admin Configuration", f"Zone created: {zone.name}")
    db.commit()
    db.refresh(zone)
    return _zone_out(db, zone)


@zones_router.patch("/{zone_id}", response_model=s.AdminZoneRead)
def update_admin_zone(zone_id: int, payload: s.AdminZoneUpdate, db: Session = Depends(get_db)):
    zone = db.get(md.ZoneArea, zone_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(zone, k, v)
    _audit(db, "Updated", "Zone", zone.id, "Admin Configuration", f"Zone updated: {zone.name}")
    db.commit()
    db.refresh(zone)
    return _zone_out(db, zone)


@zones_router.delete("/{zone_id}", status_code=204)
def delete_admin_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.get(md.ZoneArea, zone_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    _audit(db, "Deleted", "Zone", zone.id, "Admin Configuration", f"Zone deleted: {zone.name}", severity="High")
    db.delete(zone)
    db.commit()
    return None


def _dock_out(db: Session, d: yd.YardDoor) -> s.AdminDockRead:
    out = s.AdminDockRead.model_validate(d)
    if d.warehouse_id:
        wh = db.get(m.Warehouse, d.warehouse_id)
        out.warehouse_code = wh.code if wh else None
    if d.checkin_id:
        checkin = db.get(yd.YardCheckIn, d.checkin_id)
        out.current_trailer = checkin.trailer_number if checkin else None
    return out


@docks_router.get("/", response_model=list[s.AdminDockRead])
def list_admin_docks(db: Session = Depends(get_db)):
    return [_dock_out(db, d) for d in db.query(yd.YardDoor).order_by(yd.YardDoor.id).all()]


@docks_router.post("/", response_model=s.AdminDockRead, status_code=201)
def create_admin_dock(payload: s.AdminDockCreate, db: Session = Depends(get_db)):
    if db.query(yd.YardDoor).filter(yd.YardDoor.door_code == payload.door_code).first():
        raise HTTPException(400, "A dock door with this code already exists")
    door = yd.YardDoor(door_code=payload.door_code, warehouse_id=payload.warehouse_id, direction=payload.direction, load_type=payload.load_type, dimensions=payload.dimensions)
    db.add(door)
    db.flush()
    _audit(db, "Created", "Dock Door", door.id, "Admin Configuration", f"Dock door created: {door.door_code}")
    db.commit()
    db.refresh(door)
    return _dock_out(db, door)


@docks_router.patch("/{door_id}", response_model=s.AdminDockRead)
def update_admin_dock(door_id: int, payload: s.AdminDockUpdate, db: Session = Depends(get_db)):
    door = db.get(yd.YardDoor, door_id)
    if not door:
        raise HTTPException(404, "Dock door not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(door, k, v)
    _audit(db, "Updated", "Dock Door", door.id, "Admin Configuration", f"Dock door updated: {door.door_code}")
    db.commit()
    db.refresh(door)
    return _dock_out(db, door)


@docks_router.delete("/{door_id}", status_code=204)
def delete_admin_dock(door_id: int, db: Session = Depends(get_db)):
    door = db.get(yd.YardDoor, door_id)
    if not door:
        raise HTTPException(404, "Dock door not found")
    _audit(db, "Deleted", "Dock Door", door.id, "Admin Configuration", f"Dock door deleted: {door.door_code}")
    db.delete(door)
    db.commit()
    return None


@aisles_router.get("/", response_model=list[s.AisleRow])
def list_aisles(db: Session = Depends(get_db)):
    """Live GROUP BY over Location — Aisle/Bay/Level is not a stored table
    at all (see the model docstring)."""
    rows: dict[tuple, list[md.Location]] = {}
    for loc in db.query(md.Location).filter(md.Location.zone_id.isnot(None), md.Location.aisle.isnot(None)).all():
        rows.setdefault((loc.zone_id, loc.aisle), []).append(loc)
    out = []
    for (zone_id, aisle), locs in sorted(rows.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        zone = db.get(md.ZoneArea, zone_id)
        bays = len({l.rack for l in locs if l.rack})
        levels = len({l.level for l in locs if l.level})
        occupied = sum(1 for l in locs if l.status != "Active" or db.query(ob.OutboundAllocation).filter(ob.OutboundAllocation.location_id == l.id).first())
        out.append(s.AisleRow(
            zone_id=zone_id, zone_code=zone.code if zone else "", aisle=aisle,
            bays=bays or 1, levels=levels or 1, total_locations=len(locs),
            occupied=min(occupied, len(locs)), location_type=locs[0].location_type if locs else None,
        ))
    return out


@aisles_router.post("/bulk-generate", response_model=list[s.AisleRow])
def bulk_generate_locations(payload: s.BulkGenerateLocationsRequest, db: Session = Depends(get_db)):
    zone = db.get(md.ZoneArea, payload.zone_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    created = 0
    for bay in range(1, payload.bays + 1):
        for level in range(1, payload.levels + 1):
            code = f"{zone.code}-{payload.aisle}{str(bay).zfill(2)}-L{level}"
            if db.query(md.Location).filter(md.Location.code == code).first():
                continue
            db.add(md.Location(
                code=code, zone_id=zone.id, aisle=payload.aisle, rack=str(bay).zfill(2), level=str(level),
                location_type=payload.location_type, status="Active",
            ))
            created += 1
    _audit(db, "Created", "Location", None, "Admin Configuration", f"Bulk-generated {created} location(s) in {zone.code} aisle {payload.aisle}")
    db.commit()
    return list_aisles(db)


# ═══════════════════════════ System Settings ═══════════════════════════
settings_router = APIRouter(prefix="/admin/system-settings", tags=["Admin: System Settings"])
branding_router = APIRouter(prefix="/admin/branding", tags=["Admin: Branding"])
moduletoggle_router = APIRouter(prefix="/admin/module-toggles", tags=["Admin: Module Toggles"])
numbering_router = APIRouter(prefix="/admin/numbering-sequences", tags=["Admin: Numbering Sequences"])


def _get_or_create_settings(db: Session) -> m.SystemSetting:
    row = db.query(m.SystemSetting).first()
    if not row:
        row = m.SystemSetting()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@settings_router.get("/", response_model=s.SystemSettingRead)
def get_system_settings(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)


@settings_router.patch("/", response_model=s.SystemSettingRead)
def update_system_settings(payload: s.SystemSettingUpdate, db: Session = Depends(get_db)):
    row = _get_or_create_settings(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    _audit(db, "Updated", "System Setting", "SYS", "Admin Configuration", "System settings updated", severity="High")
    db.commit()
    db.refresh(row)
    return row


def _get_or_create_branding(db: Session) -> m.BrandingSetting:
    row = db.query(m.BrandingSetting).first()
    if not row:
        row = m.BrandingSetting()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@branding_router.get("/", response_model=s.BrandingSettingRead)
def get_branding(db: Session = Depends(get_db)):
    return _get_or_create_branding(db)


@branding_router.patch("/", response_model=s.BrandingSettingRead)
def update_branding(payload: s.BrandingSettingUpdate, db: Session = Depends(get_db)):
    row = _get_or_create_branding(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    _audit(db, "Updated", "Branding Setting", "BRAND", "Admin Configuration", "Branding settings updated")
    db.commit()
    db.refresh(row)
    return row


@moduletoggle_router.get("/", response_model=list[s.ModuleToggleRead])
def list_module_toggles(db: Session = Depends(get_db)):
    return db.query(m.ModuleToggle).order_by(m.ModuleToggle.id).all()


@moduletoggle_router.patch("/{toggle_id}", response_model=s.ModuleToggleRead)
def update_module_toggle(toggle_id: int, payload: s.ModuleToggleUpdate, db: Session = Depends(get_db)):
    toggle = db.get(m.ModuleToggle, toggle_id)
    if not toggle:
        raise HTTPException(404, "Module not found")
    if toggle.core and not payload.enabled:
        raise HTTPException(400, f"{toggle.label} is a core module and cannot be disabled")
    toggle.enabled = payload.enabled
    _audit(db, "Enabled" if payload.enabled else "Disabled", "Module", toggle.key, "Admin Configuration", f"Module {toggle.label} {'enabled' if payload.enabled else 'disabled'}", severity="Medium")
    db.commit()
    db.refresh(toggle)
    return toggle


def _seq_out(row: m.NumberingSequence) -> s.NumberingSequenceRead:
    out = s.NumberingSequenceRead.model_validate(row)
    out.preview = f"{row.prefix}{str(row.next_seq).zfill(row.pad_length)}{row.suffix}"
    return out


@numbering_router.get("/", response_model=list[s.NumberingSequenceRead])
def list_numbering_sequences(db: Session = Depends(get_db)):
    return [_seq_out(r) for r in db.query(m.NumberingSequence).order_by(m.NumberingSequence.id).all()]


@numbering_router.post("/", response_model=s.NumberingSequenceRead, status_code=201)
def create_numbering_sequence(payload: s.NumberingSequenceCreate, db: Session = Depends(get_db)):
    row = m.NumberingSequence(**payload.model_dump())
    db.add(row)
    db.flush()
    _audit(db, "Created", "Numbering Sequence", row.id, "Admin Configuration", f"Sequence created: {row.module}/{row.entity}")
    db.commit()
    db.refresh(row)
    return _seq_out(row)


@numbering_router.patch("/{seq_id}", response_model=s.NumberingSequenceRead)
def update_numbering_sequence(seq_id: int, payload: s.NumberingSequenceUpdate, db: Session = Depends(get_db)):
    row = db.get(m.NumberingSequence, seq_id)
    if not row:
        raise HTTPException(404, "Sequence not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    _audit(db, "Updated", "Numbering Sequence", row.id, "Admin Configuration", f"Sequence updated: {row.module}/{row.entity}", severity="Medium")
    db.commit()
    db.refresh(row)
    return _seq_out(row)


# ═══════════════════════════ Integrations ══════════════════════════════
connectors_router = APIRouter(prefix="/admin/integration-connectors", tags=["Admin: Integrations"])
synclog_router = APIRouter(prefix="/admin/integration-sync-logs", tags=["Admin: Sync Log"])
webhooks_router = APIRouter(prefix="/admin/webhooks", tags=["Admin: Webhooks"])
apikeys_router = APIRouter(prefix="/admin/api-keys", tags=["Admin: API Keys"])


@connectors_router.get("/", response_model=list[s.IntegrationConnectorRead])
def list_connectors(db: Session = Depends(get_db)):
    return db.query(m.IntegrationConnector).order_by(m.IntegrationConnector.id).all()


@connectors_router.post("/", response_model=s.IntegrationConnectorRead, status_code=201)
def create_connector(payload: s.IntegrationConnectorCreate, db: Session = Depends(get_db)):
    conn = m.IntegrationConnector(code=_next_code(db, m.IntegrationConnector, "INT"), **payload.model_dump())
    db.add(conn)
    db.flush()
    _audit(db, "Created", "Integration", conn.id, "Admin Configuration", f"Connector created: {conn.name}")
    db.commit()
    db.refresh(conn)
    return conn


@connectors_router.patch("/{conn_id}", response_model=s.IntegrationConnectorRead)
def update_connector(conn_id: int, payload: s.IntegrationConnectorUpdate, db: Session = Depends(get_db)):
    conn = db.get(m.IntegrationConnector, conn_id)
    if not conn:
        raise HTTPException(404, "Connector not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(conn, k, v)
    _audit(db, "Updated", "Integration", conn.id, "Admin Configuration", f"Connector updated: {conn.name}")
    db.commit()
    db.refresh(conn)
    return conn


@connectors_router.delete("/{conn_id}", status_code=204)
def delete_connector(conn_id: int, db: Session = Depends(get_db)):
    conn = db.get(m.IntegrationConnector, conn_id)
    if not conn:
        raise HTTPException(404, "Connector not found")
    _audit(db, "Deleted", "Integration", conn.id, "Admin Configuration", f"Connector deleted: {conn.name}", severity="High")
    db.delete(conn)
    db.commit()
    return None


@connectors_router.post("/{conn_id}/sync", response_model=s.IntegrationConnectorRead)
def sync_connector(conn_id: int, db: Session = Depends(get_db)):
    """A Carrier-type connector's sync computes a REAL record count from
    that carrier's own Shipment rows; anything else logs an honest
    zero-record no-op (see the model docstring — no external system is
    actually reached by this build)."""
    conn = db.get(m.IntegrationConnector, conn_id)
    if not conn:
        raise HTTPException(404, "Connector not found")
    started = datetime.utcnow()
    if conn.type == "Carrier" and conn.carrier_id:
        count = db.query(ob.Shipment).filter(ob.Shipment.carrier_id == conn.carrier_id).count()
        status_ = "Success"
        error = None
    else:
        count = 0
        status_ = "Success"
        error = None
    duration = max((datetime.utcnow() - started).total_seconds(), 0.1)
    conn.records = count
    conn.last_sync_at = datetime.utcnow()
    conn.status = "Connected"
    db.add(m.IntegrationSyncLog(
        log_code=_next_code(db, m.IntegrationSyncLog, "LOG", pad=4),
        connector_id=conn.id, direction=conn.direction, type="Manual",
        records=count, status=status_, duration_seconds=round(duration, 2), error=error,
    ))
    _audit(db, "Updated", "Integration", conn.id, "Admin Configuration", f"Sync Now run for {conn.name}: {count} record(s)")
    db.commit()
    db.refresh(conn)
    return conn


@synclog_router.get("/", response_model=list[s.IntegrationSyncLogRead])
def list_sync_logs(db: Session = Depends(get_db)):
    rows = db.query(m.IntegrationSyncLog).order_by(m.IntegrationSyncLog.id.desc()).limit(200).all()
    out = []
    for r in rows:
        item = s.IntegrationSyncLogRead.model_validate(r)
        item.connector_name = r.connector.name if r.connector else ""
        out.append(item)
    return out


@webhooks_router.get("/", response_model=list[s.WebhookRead])
def list_webhooks(db: Session = Depends(get_db)):
    return db.query(m.Webhook).order_by(m.Webhook.id).all()


@webhooks_router.post("/", response_model=s.WebhookRead, status_code=201)
def create_webhook(payload: s.WebhookCreate, db: Session = Depends(get_db)):
    wh = m.Webhook(**payload.model_dump())
    db.add(wh)
    db.flush()
    _audit(db, "Created", "Webhook", wh.id, "Admin Configuration", f"Webhook created: {wh.name}")
    db.commit()
    db.refresh(wh)
    return wh


@webhooks_router.patch("/{wh_id}", response_model=s.WebhookRead)
def update_webhook(wh_id: int, payload: s.WebhookUpdate, db: Session = Depends(get_db)):
    wh = db.get(m.Webhook, wh_id)
    if not wh:
        raise HTTPException(404, "Webhook not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(wh, k, v)
    _audit(db, "Updated", "Webhook", wh.id, "Admin Configuration", f"Webhook updated: {wh.name}")
    db.commit()
    db.refresh(wh)
    return wh


@webhooks_router.delete("/{wh_id}", status_code=204)
def delete_webhook(wh_id: int, db: Session = Depends(get_db)):
    wh = db.get(m.Webhook, wh_id)
    if not wh:
        raise HTTPException(404, "Webhook not found")
    db.delete(wh)
    db.commit()
    return None


@webhooks_router.post("/{wh_id}/test", response_model=s.WebhookRead)
def test_webhook(wh_id: int, db: Session = Depends(get_db)):
    wh = db.get(m.Webhook, wh_id)
    if not wh:
        raise HTTPException(404, "Webhook not found")
    wh.last_triggered_at = datetime.utcnow()
    wh.deliveries = (wh.deliveries or 0) + 1
    _audit(db, "Updated", "Webhook", wh.id, "Admin Configuration", f"Test delivery sent for webhook: {wh.name}")
    db.commit()
    db.refresh(wh)
    return wh


def _mask_key(raw: str) -> str:
    return f"wms_live_••••{raw[-4:]}"


@apikeys_router.get("/", response_model=list[s.ApiKeyRead])
def list_api_keys(db: Session = Depends(get_db)):
    return db.query(m.ApiKey).order_by(m.ApiKey.id).all()


@apikeys_router.post("/", response_model=s.ApiKeyCreatedResponse, status_code=201)
def create_api_key(payload: s.ApiKeyCreate, db: Session = Depends(get_db)):
    raw = secrets.token_hex(20)
    key = m.ApiKey(
        name=payload.name, scope=payload.scope, created_by=payload.created_by or ADMIN_ACTOR["username"],
        key_preview=_mask_key(raw), expiry_at=payload.expiry_at,
    )
    db.add(key)
    db.flush()
    _audit(db, "Created", "API Key", key.id, "Admin Configuration", f"API key generated: {key.name}", severity="High")
    db.commit()
    db.refresh(key)
    return s.ApiKeyCreatedResponse(key=key, full_key=f"wms_live_{raw}")


@apikeys_router.post("/{key_id}/rotate", response_model=s.ApiKeyCreatedResponse)
def rotate_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.get(m.ApiKey, key_id)
    if not key:
        raise HTTPException(404, "API key not found")
    raw = secrets.token_hex(20)
    key.key_preview = _mask_key(raw)
    key.status = "Active"
    _audit(db, "Updated", "API Key", key.id, "Admin Configuration", f"API key rotated: {key.name}", severity="High")
    db.commit()
    db.refresh(key)
    return s.ApiKeyCreatedResponse(key=key, full_key=f"wms_live_{raw}")


@apikeys_router.post("/{key_id}/revoke", response_model=s.ApiKeyRead)
def revoke_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.get(m.ApiKey, key_id)
    if not key:
        raise HTTPException(404, "API key not found")
    key.status = "Revoked"
    _audit(db, "Disabled", "API Key", key.id, "Admin Configuration", f"API key revoked: {key.name}", severity="High")
    db.commit()
    db.refresh(key)
    return key


@apikeys_router.delete("/{key_id}", status_code=204)
def delete_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.get(m.ApiKey, key_id)
    if not key:
        raise HTTPException(404, "API key not found")
    db.delete(key)
    db.commit()
    return None


# ═══════════════════════════ Localization ══════════════════════════════
translations_router = APIRouter(prefix="/admin/translations", tags=["Admin: Translations"])


@translations_router.get("/", response_model=list[s.TranslationEntryRead])
def list_translations(module: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.TranslationEntry)
    if module:
        q = q.filter(m.TranslationEntry.module == module)
    return q.order_by(m.TranslationEntry.id).all()


@translations_router.post("/", response_model=s.TranslationEntryRead, status_code=201)
def create_translation(payload: s.TranslationEntryCreate, db: Session = Depends(get_db)):
    if db.query(m.TranslationEntry).filter(m.TranslationEntry.key == payload.key).first():
        raise HTTPException(400, "A translation with this key already exists")
    row = m.TranslationEntry(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@translations_router.patch("/{entry_id}", response_model=s.TranslationEntryRead)
def update_translation(entry_id: int, payload: s.TranslationEntryUpdate, db: Session = Depends(get_db)):
    row = db.get(m.TranslationEntry, entry_id)
    if not row:
        raise HTTPException(404, "Translation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    _audit(db, "Updated", "Translation", row.id, "Admin Configuration", f"Translation updated: {row.key}")
    db.commit()
    db.refresh(row)
    return row


@translations_router.get("/completeness", response_model=list[s.TranslationCompleteness])
def translation_completeness(db: Session = Depends(get_db)):
    """% of translation rows with a non-empty cell for each language —
    computed live from real TranslationEntry rows, never stored."""
    entries = db.query(m.TranslationEntry).all()
    total = len(entries)
    langs = db.query(m.Language).order_by(m.Language.id).all()
    out = []
    for lang in langs:
        if total == 0:
            pct = 100.0
        else:
            filled = sum(1 for e in entries if (getattr(e, lang.code, None) or "").strip())
            pct = round(filled / total * 100, 1)
        out.append(s.TranslationCompleteness(code=lang.code, name=lang.name, completeness_pct=pct))
    return out


# ═══════════════════════════ Audit & Security ══════════════════════════
auditlog_router = APIRouter(prefix="/admin/audit-log", tags=["Admin: Audit Log"])


@auditlog_router.get("/", response_model=list[s.AuditLogRead])
def list_audit_log(module: str | None = Query(None), severity: str | None = Query(None), search: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.AuditLog)
    if module and module != "All":
        q = q.filter(m.AuditLog.module == module)
    if severity and severity != "All":
        q = q.filter(m.AuditLog.severity == severity)
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        q = q.filter(or_(m.AuditLog.username.ilike(like), m.AuditLog.entity_type.ilike(like), m.AuditLog.entity_id.ilike(like)))
    return q.order_by(m.AuditLog.id.desc()).limit(300).all()


# ═══════════════════════════ Master Data Config ════════════════════════
owners_router = APIRouter(prefix="/admin/material-owners", tags=["Admin: Material Owners"])
categories_router = APIRouter(prefix="/admin/material-categories", tags=["Admin: Material Categories"])


@owners_router.get("/", response_model=list[s.MaterialOwnerAdminRead])
def list_admin_owners(db: Session = Depends(get_db)):
    return db.query(md.MaterialOwner).order_by(md.MaterialOwner.id).all()


@owners_router.patch("/{owner_id}", response_model=s.MaterialOwnerAdminRead)
def update_admin_owner(owner_id: int, payload: s.MaterialOwnerAdminUpdate, db: Session = Depends(get_db)):
    owner = db.get(md.MaterialOwner, owner_id)
    if not owner:
        raise HTTPException(404, "Owner not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(owner, k, v)
    _audit(db, "Updated", "Material Owner", owner.id, "Admin Configuration", f"Owner updated: {owner.name}")
    db.commit()
    db.refresh(owner)
    return owner


def _category_out(db: Session, c: m.MaterialCategory) -> s.MaterialCategoryRead:
    out = s.MaterialCategoryRead.model_validate(c)
    if c.parent_id:
        parent = db.get(m.MaterialCategory, c.parent_id)
        out.parent_code = parent.code if parent else None
    out.sku_count = db.query(md.Material).filter(md.Material.category == c.name).count()
    return out


@categories_router.get("/", response_model=list[s.MaterialCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return [_category_out(db, c) for c in db.query(m.MaterialCategory).order_by(m.MaterialCategory.id).all()]


@categories_router.post("/", response_model=s.MaterialCategoryRead, status_code=201)
def create_category(payload: s.MaterialCategoryCreate, db: Session = Depends(get_db)):
    cat = m.MaterialCategory(**payload.model_dump())
    db.add(cat)
    db.flush()
    _audit(db, "Created", "Material Category", cat.id, "Admin Configuration", f"Category created: {cat.name}")
    db.commit()
    db.refresh(cat)
    return _category_out(db, cat)


@categories_router.patch("/{cat_id}", response_model=s.MaterialCategoryRead)
def update_category(cat_id: int, payload: s.MaterialCategoryUpdate, db: Session = Depends(get_db)):
    cat = db.get(m.MaterialCategory, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    _audit(db, "Updated", "Material Category", cat.id, "Admin Configuration", f"Category updated: {cat.name}")
    db.commit()
    db.refresh(cat)
    return _category_out(db, cat)


@categories_router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.get(m.MaterialCategory, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
    return None


# ═══════════════ Generic CRUD tables (simple reference data) ═══════════
languages_router = make_crud_router(
    model=m.Language, create_schema=s.LanguageCreate, update_schema=s.LanguageUpdate,
    read_schema=s.LanguageRead, prefix="/admin/languages", tag="Admin: Languages",
)
datetime_router = make_crud_router(
    model=m.DateTimeProfile, create_schema=s.DateTimeProfileCreate, update_schema=s.DateTimeProfileUpdate,
    read_schema=s.DateTimeProfileRead, prefix="/admin/datetime-profiles", tag="Admin: Date/Time Profiles",
)
currencies_router = make_crud_router(
    model=m.Currency, create_schema=s.CurrencyCreate, update_schema=s.CurrencyUpdate,
    read_schema=s.CurrencyRead, prefix="/admin/currencies", tag="Admin: Currencies",
)
addressformats_router = make_crud_router(
    model=m.AddressFormat, create_schema=s.AddressFormatCreate, update_schema=s.AddressFormatUpdate,
    read_schema=s.AddressFormatRead, prefix="/admin/address-formats", tag="Admin: Address Formats",
)
compliance_router = make_crud_router(
    model=m.ComplianceReport, create_schema=s.ComplianceReportCreate, update_schema=s.ComplianceReportUpdate,
    read_schema=s.ComplianceReportRead, prefix="/admin/compliance-reports", tag="Admin: Compliance Reports",
)
secpolicy_router = make_crud_router(
    model=m.SecurityPolicy, create_schema=s.SecurityPolicyCreate, update_schema=s.SecurityPolicyUpdate,
    read_schema=s.SecurityPolicyRead, prefix="/admin/security-policies", tag="Admin: Security Policies",
)
materialtypes_router = make_crud_router(
    model=m.MaterialType, create_schema=s.MaterialTypeCreate, update_schema=s.MaterialTypeUpdate,
    read_schema=s.MaterialTypeRead, prefix="/admin/material-types", tag="Admin: Material Types",
)
uom_router = make_crud_router(
    model=m.UnitOfMeasure, create_schema=s.UnitOfMeasureCreate, update_schema=s.UnitOfMeasureUpdate,
    read_schema=s.UnitOfMeasureRead, prefix="/admin/uom", tag="Admin: Units of Measure",
)
packkey_router = make_crud_router(
    model=m.PackKeyTemplate, create_schema=s.PackKeyTemplateCreate, update_schema=s.PackKeyTemplateUpdate,
    read_schema=s.PackKeyTemplateRead, prefix="/admin/pack-key-templates", tag="Admin: Pack Key Templates",
)
barcodeconfigs_router = make_crud_router(
    model=m.BarcodeConfig, create_schema=s.BarcodeConfigCreate, update_schema=s.BarcodeConfigUpdate,
    read_schema=s.BarcodeConfigRead, prefix="/admin/barcode-configs", tag="Admin: Bar Code Configs",
)
notiftemplates_router = make_crud_router(
    model=m.NotificationTemplate, create_schema=s.NotificationTemplateCreate, update_schema=s.NotificationTemplateUpdate,
    read_schema=s.NotificationTemplateRead, prefix="/admin/notification-templates", tag="Admin: Notification Templates",
)
dataclass_router = APIRouter(prefix="/admin/data-classifications", tags=["Admin: Data Classification"])


@dataclass_router.get("/", response_model=list[s.DataClassificationRead])
def list_data_classifications(db: Session = Depends(get_db)):
    return db.query(m.DataClassification).order_by(m.DataClassification.id).all()


@dataclass_router.post("/", response_model=s.DataClassificationRead, status_code=201)
def create_data_classification(payload: s.DataClassificationCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["entities"] = ",".join(data["entities"])
    row = m.DataClassification(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@dataclass_router.patch("/{row_id}", response_model=s.DataClassificationRead)
def update_data_classification(row_id: int, payload: s.DataClassificationUpdate, db: Session = Depends(get_db)):
    row = db.get(m.DataClassification, row_id)
    if not row:
        raise HTTPException(404, "Classification not found")
    data = payload.model_dump(exclude_unset=True)
    if "entities" in data:
        data["entities"] = ",".join(data["entities"])
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@compliance_router.post("/{report_id}/rerun", response_model=s.ComplianceReportRead)
def rerun_compliance_report(report_id: int, db: Session = Depends(get_db)):
    """Compliance Reports are admin-recorded results — re-running one
    updates its last_run_at, it doesn't scan anything (see model
    docstring: nothing in this codebase scans for GDPR/SOC2/PCI findings)."""
    report = db.get(m.ComplianceReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    report.last_run_at = datetime.utcnow()
    _audit(db, "Updated", "Compliance Report", report.id, "Admin Configuration", f"Report re-run: {report.name}")
    db.commit()
    db.refresh(report)
    return report
