"""
Notifications' 6 tabs. See app/models/notification_ops.py for why every
table here is new, and why "checking" a rule is real wherever the rule
names a checkable condition_type.

_check_condition(rule) is the one function that decides whether a rule is
currently true, reusing real data from other modules:
  low_stock       -> the same deficit check Replenishment's Trigger Monitor
                      runs (real InventoryBalance vs real ReplenishmentRule
                      min/reorder_point at each rule's location)
  asn_overdue     -> real ASN rows past their real expected_date, not yet
                      Received/Closed
  invoice_overdue -> real billing Invoice rows past their real due_date,
                      not yet Paid
  manual          -> no live check; only "Send Test" can fire it, exactly
                      like the mock's own manual Test button

POST /notification-rules/check is idempotent per rule within a 10-minute
window (skips a rule that already logged a Rule-kind entry that recently)
so clicking it repeatedly doesn't flood the log — the same debounce
Cross Docking's opportunistic detection and Replenishment's auto-generate
use to avoid duplicate open work.

A log entry's delivery status is real: it's "Failed" whenever one of its
channels isn't a currently Active NotificationChannel, not a coin flip.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import billing_ops as bl
from app.models import master_data as md
from app.models import notification_ops as m
from app.models import operations as ops
from app.routers.replenishment_ops import _current_qty
from app.schemas import notification_ops as s

rule_router = APIRouter(prefix="/notification-rules", tags=["Notification Rules"])
channel_router = APIRouter(prefix="/notification-channels", tags=["Channels & Templates"])
escalation_router = APIRouter(prefix="/notification-escalations", tags=["Escalation Rules"])
digest_router = APIRouter(prefix="/notification-digests", tags=["Digest & Frequency"])
log_router = APIRouter(prefix="/notification-log", tags=["Notification Log"])
report_router = APIRouter(prefix="/notification-reports", tags=["Notification Reports"])

CHANNEL_TYPE_BY_KEY = {"email": "Email", "sms": "SMS", "inapp": "In-App", "webhook": "Webhook"}
RECHECK_COOLDOWN_MINUTES = 10


def _next_code(db: Session, model_cls, column, prefix: str, pad: int = 3) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


def _channel_status_ok(db: Session, channels: str) -> bool:
    """A delivery is only as good as every channel it uses being Active."""
    keys = [c.strip() for c in channels.split(",") if c.strip()]
    for key in keys:
        ctype = CHANNEL_TYPE_BY_KEY.get(key.lower())
        if not ctype:
            continue
        chan = db.query(m.NotificationChannel).filter(m.NotificationChannel.type == ctype).first()
        if not chan or chan.status != "Active":
            return False
    return True


def _check_condition(db: Session, rule: m.NotificationRule):
    """Returns (is_true, detail_string, recipients_count_hint) for a rule's
    live condition, or (False, "", 0) for a condition_type this build
    doesn't model (manual)."""
    if rule.condition_type == "low_stock":
        active_rules = db.query(md.ReplenishmentRule).filter(
            md.ReplenishmentRule.status == "Active", md.ReplenishmentRule.location_id.isnot(None),
        ).all()
        hits = []
        for rr in active_rules:
            threshold = rr.reorder_point if rr.reorder_point is not None else rr.min_qty
            current = _current_qty(db, rr.material_id, rr.location_id)
            if current < threshold:
                mat = db.get(md.Material, rr.material_id)
                loc = db.get(md.Location, rr.location_id)
                hits.append(f"{mat.sku if mat else '?'} qty={current:g} at {loc.code if loc else '?'} (min {rr.min_qty:g})")
        if not hits:
            return False, "", 0
        detail = f"{len(hits)} SKU(s) below minimum: " + "; ".join(hits[:3]) + (" …" if len(hits) > 3 else "")
        return True, detail, len(hits)

    if rule.condition_type == "asn_overdue":
        now = datetime.utcnow()
        overdue = db.query(ops.ASN).filter(
            ops.ASN.status.notin_(["Received", "Closed"]),
            ops.ASN.expected_date.isnot(None), ops.ASN.expected_date < now,
        ).all()
        if not overdue:
            return False, "", 0
        names = [a.asn_number for a in overdue[:3]]
        detail = f"{len(overdue)} ASN(s) overdue: " + ", ".join(names) + (" …" if len(overdue) > 3 else "")
        return True, detail, len(overdue)

    if rule.condition_type == "invoice_overdue":
        now = datetime.utcnow()
        overdue = db.query(bl.Invoice).filter(
            bl.Invoice.status != "Paid", bl.Invoice.due_date.isnot(None), bl.Invoice.due_date < now,
        ).all()
        if not overdue:
            return False, "", 0
        names = [i.invoice_number for i in overdue[:3]]
        detail = f"{len(overdue)} invoice(s) overdue: " + ", ".join(names) + (" …" if len(overdue) > 3 else "")
        return True, detail, len(overdue)

    return False, "", 0


def _recipient_count(text: str | None) -> int:
    if not text:
        return 1
    return max(1, len([p for p in text.split(",") if p.strip()]))


def _log_out(db: Session, entry: m.NotificationLogEntry) -> s.NotificationLogRead:
    out = s.NotificationLogRead.model_validate(entry)
    if entry.rule:
        out.rule_name = entry.rule.name
    return out


# ─────────────────────────────── Rules ────────────────────────────────
@rule_router.get("/", response_model=list[s.NotificationRuleRead])
def list_rules(db: Session = Depends(get_db)):
    return db.query(m.NotificationRule).order_by(m.NotificationRule.id.desc()).all()


@rule_router.post("/", response_model=s.NotificationRuleRead)
def create_rule(payload: s.NotificationRuleCreate, db: Session = Depends(get_db)):
    rule = m.NotificationRule(rule_code=_next_code(db, m.NotificationRule, "rule_code", "NR"), **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@rule_router.patch("/{rule_id}", response_model=s.NotificationRuleRead)
def update_rule(rule_id: int, payload: s.NotificationRuleUpdate, db: Session = Depends(get_db)):
    rule = db.get(m.NotificationRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


@rule_router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(m.NotificationRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}


@rule_router.post("/check", response_model=list[s.NotificationLogRead])
def check_rules(db: Session = Depends(get_db)):
    """Re-runs every active rule with a checkable condition_type against
    real data. Skips a rule that already logged within the cooldown
    window so repeated clicks don't flood the log."""
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=RECHECK_COOLDOWN_MINUTES)
    created = []
    for rule in db.query(m.NotificationRule).filter(m.NotificationRule.active == True, m.NotificationRule.condition_type != "manual").all():  # noqa: E712
        recent = db.query(m.NotificationLogEntry).filter(
            m.NotificationLogEntry.rule_id == rule.id, m.NotificationLogEntry.kind == "Rule",
            m.NotificationLogEntry.created_at >= cutoff,
        ).first()
        if recent:
            continue
        is_true, detail, hint = _check_condition(db, rule)
        if not is_true:
            continue
        entry = m.NotificationLogEntry(
            log_code=_next_code(db, m.NotificationLogEntry, "log_code", "LOG", pad=4),
            kind="Rule", rule_id=rule.id, event_detail=detail, channels=rule.channels,
            recipients_count=_recipient_count(rule.recipients),
            status="Delivered" if _channel_status_ok(db, rule.channels) else "Failed",
        )
        db.add(entry)
        rule.last_triggered_at = now
        db.flush()
        created.append(entry)
    db.commit()
    return [_log_out(db, e) for e in created]


@rule_router.post("/{rule_id}/test", response_model=s.NotificationLogRead)
def send_test(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(m.NotificationRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    entry = m.NotificationLogEntry(
        log_code=_next_code(db, m.NotificationLogEntry, "log_code", "LOG", pad=4),
        kind="Test", rule_id=rule.id, event_detail=f"Test notification for rule '{rule.name}'",
        channels=rule.channels, recipients_count=_recipient_count(rule.recipients),
        status="Delivered" if _channel_status_ok(db, rule.channels) else "Failed",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _log_out(db, entry)


# ─────────────────────────────── Channels ─────────────────────────────
@channel_router.get("/", response_model=list[s.NotificationChannelRead])
def list_channels(db: Session = Depends(get_db)):
    return db.query(m.NotificationChannel).order_by(m.NotificationChannel.id).all()


@channel_router.post("/", response_model=s.NotificationChannelRead)
def create_channel(payload: s.NotificationChannelCreate, db: Session = Depends(get_db)):
    chan = m.NotificationChannel(**payload.model_dump())
    db.add(chan)
    db.commit()
    db.refresh(chan)
    return chan


@channel_router.patch("/{channel_id}", response_model=s.NotificationChannelRead)
def update_channel(channel_id: int, payload: s.NotificationChannelUpdate, db: Session = Depends(get_db)):
    chan = db.get(m.NotificationChannel, channel_id)
    if not chan:
        raise HTTPException(404, "Channel not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(chan, k, v)
    db.commit()
    db.refresh(chan)
    return chan


@channel_router.post("/{channel_id}/test", response_model=s.NotificationChannelRead)
def test_channel(channel_id: int, payload: s.TestChannelRequest | None = None, db: Session = Depends(get_db)):
    chan = db.get(m.NotificationChannel, channel_id)
    if not chan:
        raise HTTPException(404, "Channel not found")
    chan.last_test_at = datetime.utcnow()
    db.add(m.NotificationLogEntry(
        log_code=_next_code(db, m.NotificationLogEntry, "log_code", "LOG", pad=4),
        kind="Test", event_detail=f"Test notification sent via {chan.type} channel",
        channels=next((k for k, v in CHANNEL_TYPE_BY_KEY.items() if v == chan.type), "inapp"),
        recipients_count=1, status="Delivered" if chan.status == "Active" else "Failed",
    ))
    db.commit()
    db.refresh(chan)
    return chan


# ─────────────────────────────── Escalations ──────────────────────────
def _escalation_out(db: Session, esc: m.EscalationRule) -> s.EscalationRuleRead:
    out = s.EscalationRuleRead.model_validate(esc)
    rule = db.get(m.NotificationRule, esc.rule_id)
    out.rule_name = rule.name if rule else ""
    if esc.active and rule and rule.active and rule.last_triggered_at:
        is_true, _, _ = _check_condition(db, rule)
        overdue = (datetime.utcnow() - rule.last_triggered_at) >= timedelta(minutes=esc.delay_minutes)
        out.is_due = bool(is_true and overdue)
    return out


@escalation_router.get("/", response_model=list[s.EscalationRuleRead])
def list_escalations(db: Session = Depends(get_db)):
    rows = db.query(m.EscalationRule).order_by(m.EscalationRule.id).all()
    return [_escalation_out(db, e) for e in rows]


@escalation_router.post("/", response_model=s.EscalationRuleRead)
def create_escalation(payload: s.EscalationRuleCreate, db: Session = Depends(get_db)):
    if not db.get(m.NotificationRule, payload.rule_id):
        raise HTTPException(404, "Notification rule not found")
    esc = m.EscalationRule(esc_code=_next_code(db, m.EscalationRule, "esc_code", "ESC"), **payload.model_dump())
    db.add(esc)
    db.commit()
    db.refresh(esc)
    return _escalation_out(db, esc)


@escalation_router.patch("/{esc_id}", response_model=s.EscalationRuleRead)
def update_escalation(esc_id: int, payload: s.EscalationRuleUpdate, db: Session = Depends(get_db)):
    esc = db.get(m.EscalationRule, esc_id)
    if not esc:
        raise HTTPException(404, "Escalation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(esc, k, v)
    db.commit()
    db.refresh(esc)
    return _escalation_out(db, esc)


@escalation_router.delete("/{esc_id}")
def delete_escalation(esc_id: int, db: Session = Depends(get_db)):
    esc = db.get(m.EscalationRule, esc_id)
    if not esc:
        raise HTTPException(404, "Escalation not found")
    db.delete(esc)
    db.commit()
    return {"ok": True}


@escalation_router.post("/{esc_id}/escalate", response_model=s.NotificationLogRead)
def fire_escalation(esc_id: int, db: Session = Depends(get_db)):
    esc = db.get(m.EscalationRule, esc_id)
    if not esc:
        raise HTTPException(404, "Escalation not found")
    rule = db.get(m.NotificationRule, esc.rule_id)
    entry = m.NotificationLogEntry(
        log_code=_next_code(db, m.NotificationLogEntry, "log_code", "LOG", pad=4),
        kind="Escalation", rule_id=esc.rule_id, escalation_id=esc.id,
        event_detail=f"Escalated '{rule.name if rule else esc.name}' to {esc.escalate_to}",
        channels=esc.channel, recipients_count=_recipient_count(esc.escalate_to),
        status="Delivered" if _channel_status_ok(db, esc.channel) else "Failed",
    )
    db.add(entry)
    esc.last_escalated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return _log_out(db, entry)


# ─────────────────────────────── Digests ──────────────────────────────
@digest_router.get("/", response_model=list[s.DigestSettingRead])
def list_digests(db: Session = Depends(get_db)):
    return db.query(m.DigestSetting).order_by(m.DigestSetting.id).all()


@digest_router.post("/", response_model=s.DigestSettingRead)
def create_digest(payload: s.DigestSettingCreate, db: Session = Depends(get_db)):
    d = m.DigestSetting(**payload.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@digest_router.patch("/{digest_id}", response_model=s.DigestSettingRead)
def update_digest(digest_id: int, payload: s.DigestSettingUpdate, db: Session = Depends(get_db)):
    d = db.get(m.DigestSetting, digest_id)
    if not d:
        raise HTTPException(404, "Digest not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@digest_router.post("/{digest_id}/send-now", response_model=s.NotificationLogRead)
def send_digest_now(digest_id: int, db: Session = Depends(get_db)):
    d = db.get(m.DigestSetting, digest_id)
    if not d:
        raise HTTPException(404, "Digest not found")
    since = d.last_sent_at or d.created_at
    q = db.query(m.NotificationLogEntry).filter(
        m.NotificationLogEntry.kind.in_(["Rule", "Escalation"]), m.NotificationLogEntry.created_at >= since,
    )
    if d.modules != "All":
        wanted = {mm.strip() for mm in d.modules.split(",")}
        q = q.join(m.NotificationRule, m.NotificationLogEntry.rule_id == m.NotificationRule.id).filter(m.NotificationRule.module.in_(wanted))
    count = q.count()
    entry = m.NotificationLogEntry(
        log_code=_next_code(db, m.NotificationLogEntry, "log_code", "LOG", pad=4),
        kind="Digest", digest_id=d.id,
        event_detail=f"Digest '{d.name}': {count} notification(s) summarized since {since.strftime('%d %b %H:%M')}",
        channels="email", recipients_count=_recipient_count(d.recipients),
        status="Delivered" if _channel_status_ok(db, "email") else "Failed",
    )
    db.add(entry)
    d.last_sent_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return _log_out(db, entry)


# ─────────────────────────────── Log ──────────────────────────────────
@log_router.get("/", response_model=list[s.NotificationLogRead])
def list_log(db: Session = Depends(get_db)):
    rows = db.query(m.NotificationLogEntry).order_by(m.NotificationLogEntry.id.desc()).limit(200).all()
    return [_log_out(db, e) for e in rows]


# ─────────────────────────────── Reports ──────────────────────────────
@report_router.get("/summary", response_model=s.NotificationReportSummary)
def report_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    all_entries = db.query(m.NotificationLogEntry).all()
    mtd = [e for e in all_entries if e.created_at.year == now.year and e.created_at.month == now.month]

    delivered = sum(1 for e in mtd if e.status == "Delivered")
    success_pct = round(delivered / len(mtd) * 100, 1) if mtd else 100.0

    esc_mtd = sum(1 for e in mtd if e.kind == "Escalation")
    digest_mtd = sum(1 for e in mtd if e.kind == "Digest")

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    buckets = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        buckets.append(day)
    daily = []
    for day in buckets:
        day_entries = [e for e in all_entries if e.created_at.date() == day]
        counts = {"email": 0, "sms": 0, "inapp": 0}
        for e in day_entries:
            for key in [c.strip() for c in e.channels.split(",")]:
                if key in counts:
                    counts[key] += 1
        daily.append(s.DailyChannelPoint(day=day_names[day.weekday()], **counts))

    return s.NotificationReportSummary(
        sent_mtd=len(mtd), delivery_success_pct=success_pct,
        escalations_triggered_mtd=esc_mtd, digest_sends_mtd=digest_mtd,
        daily_by_channel=daily,
    )
