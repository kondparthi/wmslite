from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReplenishmentTaskCreate(BaseModel):
    material_id: int
    from_location_id: int
    to_location_id: int
    qty_required: float
    priority: str = "High"
    assignee: Optional[str] = None


class ReplenishmentTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_number: str
    rule_id: Optional[int] = None
    material_id: int
    from_location_id: int
    to_location_id: int
    qty_required: float
    qty_assigned: float
    priority: str
    assignee: Optional[str] = None
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    # denormalized display fields, filled in by the router
    sku: str = ""
    description: str = ""
    from_location_code: str = ""
    to_location_code: str = ""


class ReassignRequest(BaseModel):
    assignee: str


class TriggerRow(BaseModel):
    rule_id: int
    sku: str
    description: str
    location_id: int
    location_code: str
    current_qty: float
    min_qty: float
    max_qty: float
    reorder_point: Optional[float] = None
    deficit: float
    severity: str  # Critical | High | Medium
    open_task_id: Optional[int] = None
    open_task_number: Optional[str] = None
    status: str  # "Task Created" | "Pending Review" | "No Source Available"
    checked_at: datetime


class MonthlyVolumePoint(BaseModel):
    month: str
    tasks: int


class TopSkuPoint(BaseModel):
    sku: str
    qty: float


class ReplenishmentReportSummary(BaseModel):
    tasks_completed_mtd: int
    avg_task_duration_minutes: float
    auto_triggered_pct: float
    rule_accuracy_pct: float
    monthly_volume: list[MonthlyVolumePoint]
    top_skus: list[TopSkuPoint]
