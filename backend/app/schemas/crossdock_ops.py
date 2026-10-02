from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---- CD Planning ----
class CrossDockPlanCreate(BaseModel):
    receipt_id: int
    order_line_id: int
    qty: float
    transfer_type: str = "Pure Cross Dock"
    match_level: str = "Exact SKU Match"
    priority: str = "Medium"


class CrossDockPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan_number: str
    receipt_id: int
    order_line_id: int
    material_id: int
    qty: float
    match_level: str
    transfer_type: str
    priority: str
    rule_applied: str | None = None
    status: str
    created_at: datetime
    confirmed_at: datetime | None = None
    sku: str = ""
    description: str = ""
    asn_number: str = ""
    order_number: str = ""


class MatchCandidate(BaseModel):
    receipt_id: int
    order_line_id: int
    sku: str
    description: str
    asn_number: str
    order_number: str
    qty: float


# ---- CD Execution ----
class CrossDockTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_number: str
    plan_id: int
    plan_number: str = ""
    material_id: int
    sku: str = ""
    description: str = ""
    qty: float
    lpn: str | None = None
    from_door_code: str | None = None
    to_door_code: str | None = None
    current_location_code: str | None = None
    assignee: str | None = None
    status: str
    created_at: datetime
    staged_at: datetime | None = None
    completed_at: datetime | None = None


class AssignTaskRequest(BaseModel):
    assignee: str


# ---- Opportunistic CD ----
class OpportunisticRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    rule_type: str
    description: str | None = None
    status: str
    created_at: datetime


class OpportunisticRuleUpdate(BaseModel):
    status: str


# ---- Staging & Sorting ----
class StagingZoneRead(BaseModel):
    zone: str
    zone_name: str
    capacity: int
    occupied: int
    next_priority: str


# ---- CD Analytics ----
class VolumeTrendPoint(BaseModel):
    day: str
    cd: int
    std: int


class CrossDockReportSummary(BaseModel):
    total_savings_usd: float
    avg_cycle_minutes: float
    storage_avoided_units: float
    active_tasks: int
    completed_tasks: int
    volume_trend: list[VolumeTrendPoint]
