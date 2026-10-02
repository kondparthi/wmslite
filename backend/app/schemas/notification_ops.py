from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Notification Rules ──────────────────────────────────────────────────
class NotificationRuleCreate(BaseModel):
    name: str
    module: str
    event: str
    condition_type: str = "manual"
    threshold: Optional[str] = None
    channels: str = "inapp"
    recipients: Optional[str] = None
    frequency: str = "Immediate"
    priority: str = "Medium"
    active: bool = True


class NotificationRuleUpdate(BaseModel):
    name: Optional[str] = None
    module: Optional[str] = None
    event: Optional[str] = None
    condition_type: Optional[str] = None
    threshold: Optional[str] = None
    channels: Optional[str] = None
    recipients: Optional[str] = None
    frequency: Optional[str] = None
    priority: Optional[str] = None
    active: Optional[bool] = None


class NotificationRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rule_code: str
    name: str
    module: str
    event: str
    condition_type: str
    threshold: Optional[str] = None
    channels: str
    recipients: Optional[str] = None
    frequency: str
    priority: str
    active: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime


# ── Channels ─────────────────────────────────────────────────────────────
class NotificationChannelCreate(BaseModel):
    type: str
    provider: Optional[str] = None
    from_address: Optional[str] = None
    status: str = "Active"


class NotificationChannelUpdate(BaseModel):
    provider: Optional[str] = None
    from_address: Optional[str] = None
    status: Optional[str] = None


class NotificationChannelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    provider: Optional[str] = None
    from_address: Optional[str] = None
    status: str
    last_test_at: Optional[datetime] = None


class TestChannelRequest(BaseModel):
    recipient: Optional[str] = None


# ── Escalation Rules ─────────────────────────────────────────────────────
class EscalationRuleCreate(BaseModel):
    name: str
    rule_id: int
    escalate_to: str
    channel: str = "email"
    delay_minutes: int = 60
    active: bool = True


class EscalationRuleUpdate(BaseModel):
    name: Optional[str] = None
    escalate_to: Optional[str] = None
    channel: Optional[str] = None
    delay_minutes: Optional[int] = None
    active: Optional[bool] = None


class EscalationRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    esc_code: str
    name: str
    rule_id: int
    escalate_to: str
    channel: str
    delay_minutes: int
    active: bool
    last_escalated_at: Optional[datetime] = None
    # denormalized
    rule_name: str = ""
    is_due: bool = False


# ── Digest Settings ──────────────────────────────────────────────────────
class DigestSettingCreate(BaseModel):
    name: str
    schedule: str
    modules: str = "All"
    recipients: Optional[str] = None
    active: bool = True


class DigestSettingUpdate(BaseModel):
    name: Optional[str] = None
    schedule: Optional[str] = None
    modules: Optional[str] = None
    recipients: Optional[str] = None
    active: Optional[bool] = None


class DigestSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    schedule: str
    modules: str
    recipients: Optional[str] = None
    active: bool
    last_sent_at: Optional[datetime] = None


# ── Log ──────────────────────────────────────────────────────────────────
class NotificationLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    log_code: str
    kind: str
    rule_id: Optional[int] = None
    event_detail: str
    channels: str
    recipients_count: int
    status: str
    created_at: datetime
    rule_name: str = ""


# ── Reports ──────────────────────────────────────────────────────────────
class DailyChannelPoint(BaseModel):
    day: str
    email: int
    sms: int
    inapp: int


class NotificationReportSummary(BaseModel):
    sent_mtd: int
    delivery_success_pct: float
    escalations_triggered_mtd: int
    digest_sends_mtd: int
    daily_by_channel: list[DailyChannelPoint]
