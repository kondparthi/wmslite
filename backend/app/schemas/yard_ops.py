from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ================= Check-In (Gate Management) =================
class YardCheckInCreate(BaseModel):
    trailer_number: str
    carrier_id: Optional[int] = None
    transaction_type: str = "Inbound Load"
    seal_number: Optional[str] = None


class YardCheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pass_id: str
    trailer_number: str
    carrier_id: Optional[int] = None
    transaction_type: str
    seal_number: Optional[str] = None
    status: str
    zone: Optional[str] = None
    checked_in_at: datetime
    checked_out_at: Optional[datetime] = None
    dwell_minutes: int = 0


class EnterYardRequest(BaseModel):
    zone: str


class GateSummary(BaseModel):
    pending_entry: int
    inside_yard: int
    avg_turnaround_minutes: int
    overdue_dwell: int


# ================= Yard Inventory (zones) =================
class ZoneSummary(BaseModel):
    zone: str
    count: int
    capacity: int
    utilization_pct: int


# ================= Dock & Doors =================
class YardDoorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    door_code: str
    status: str
    checkin_id: Optional[int] = None
    trailer_number: Optional[str] = None
    task_type: Optional[str] = None
    progress: int
    updated_at: datetime


class AssignDoorRequest(BaseModel):
    checkin_id: int
    task_type: str


class DoorProgressRequest(BaseModel):
    progress: int


# ================= Shunter Workflows (moves) =================
class YardMoveCreate(BaseModel):
    checkin_id: int
    from_location: str
    to_location: str
    priority: str = "Normal"


class YardMoveRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    move_number: str
    checkin_id: int
    trailer_number: Optional[str] = None
    from_location: str
    to_location: str
    priority: str
    status: str
    requested_at: datetime
    completed_at: Optional[datetime] = None


# ================= Yard Analytics =================
class AgingBucket(BaseModel):
    range: str
    count: int


class CarrierPerformance(BaseModel):
    carrier_id: int
    carrier_name: str
    on_time_pct: int
    trailer_count: int
