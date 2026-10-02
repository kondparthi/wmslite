"""
Notifications' 6 tabs. All five tables here are genuinely new — nothing
elsewhere in the system already models "a rule that watches for an event
and fires an alert" — but the watching itself reuses real data wherever a
rule names a checkable condition: "Low Stock" rules re-run the exact same
deficit check Replenishment's Trigger Monitor uses (real InventoryBalance
vs real ReplenishmentRule thresholds), "ASN Overdue" checks real ASN rows
past their expected_date, and "Invoice Overdue" checks real billing
Invoice rows past their due_date. A rule with any other condition_type
("manual") has no live check — it can only be fired by hand via "Send
Test", exactly like the mock's own Test button, because nothing in this
build models a generic arbitrary trigger.

Delivery success/failure is real too: a NotificationLogEntry's status is
"Failed" whenever one of its channels isn't currently an Active
NotificationChannel, not a coin flip.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class NotificationRule(Base):
    __tablename__ = "notification_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(20), unique=True, nullable=False, index=True)  # NR-001
    name = Column(String(150), nullable=False)
    module = Column(String(50), nullable=False)
    event = Column(String(200), nullable=False)          # human description of the trigger event
    condition_type = Column(String(30), default="manual")  # low_stock | asn_overdue | invoice_overdue | manual
    threshold = Column(String(100), nullable=True)         # display-only condition text
    channels = Column(String(60), default="inapp")         # comma-separated: email,sms,inapp
    recipients = Column(String(200), nullable=True)
    frequency = Column(String(30), default="Immediate")
    priority = Column(String(20), default="Medium")
    active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    log_entries = relationship("NotificationLogEntry", back_populates="rule")
    escalations = relationship("EscalationRule", back_populates="rule")


class NotificationChannel(Base):
    __tablename__ = "notification_channels"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False)  # Email | SMS | In-App | Webhook
    provider = Column(String(150), nullable=True)
    from_address = Column(String(150), nullable=True)
    status = Column(String(20), default="Active")  # Active | Inactive
    last_test_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id = Column(Integer, primary_key=True, index=True)
    esc_code = Column(String(20), unique=True, nullable=False, index=True)  # ESC-001
    name = Column(String(150), nullable=False)
    rule_id = Column(Integer, ForeignKey("notification_rules.id"), nullable=False)
    escalate_to = Column(String(200), nullable=False)
    channel = Column(String(60), default="email")
    delay_minutes = Column(Integer, default=60)
    active = Column(Boolean, default=True)
    last_escalated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rule = relationship("NotificationRule", back_populates="escalations")


class DigestSetting(Base):
    __tablename__ = "digest_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    schedule = Column(String(60), nullable=False)   # display text, e.g. "Daily at 08:00"
    modules = Column(String(200), default="All")
    recipients = Column(String(200), nullable=True)
    active = Column(Boolean, default=True)
    last_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NotificationLogEntry(Base):
    __tablename__ = "notification_log_entries"

    id = Column(Integer, primary_key=True, index=True)
    log_code = Column(String(20), unique=True, nullable=False, index=True)  # LOG-9001
    kind = Column(String(20), default="Rule")  # Rule | Escalation | Digest | Test
    rule_id = Column(Integer, ForeignKey("notification_rules.id"), nullable=True)
    escalation_id = Column(Integer, ForeignKey("escalation_rules.id"), nullable=True)
    digest_id = Column(Integer, ForeignKey("digest_settings.id"), nullable=True)
    event_detail = Column(Text, nullable=False)
    channels = Column(String(60), default="inapp")
    recipients_count = Column(Integer, default=1)
    status = Column(String(20), default="Delivered")  # Delivered | Failed
    created_at = Column(DateTime, default=datetime.utcnow)

    rule = relationship("NotificationRule", back_populates="log_entries")
