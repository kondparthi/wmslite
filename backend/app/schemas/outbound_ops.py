from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Shipment Orders + lines ----
class ShipmentOrderLineIn(BaseModel):
    material_id: int
    qty_ordered: float


class ShipmentOrderLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    material_id: int
    qty_ordered: float
    qty_allocated: float
    qty_picked: float


class ShipmentOrderCreate(BaseModel):
    order_number: str
    ship_to_id: Optional[int] = None
    carrier_id: Optional[int] = None
    priority: str = "Normal"
    required_date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: list[ShipmentOrderLineIn] = []


class ShipmentOrderUpdate(BaseModel):
    ship_to_id: Optional[int] = None
    carrier_id: Optional[int] = None
    priority: Optional[str] = None
    required_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ShipmentOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    ship_to_id: Optional[int] = None
    carrier_id: Optional[int] = None
    priority: str
    required_date: Optional[datetime] = None
    notes: Optional[str] = None
    wave_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime


# ---- Allocation Strategies ----
class AllocationStrategyBase(BaseModel):
    name: str
    method: str
    scope_description: Optional[str] = None
    status: str = "Active"
    usage_count: int = 0


class AllocationStrategyCreate(AllocationStrategyBase):
    pass


class AllocationStrategyUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    scope_description: Optional[str] = None
    status: Optional[str] = None
    usage_count: Optional[int] = None


class AllocationStrategyRead(AllocationStrategyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Waves ----
class WaveCreate(BaseModel):
    name: str
    zone_scope: Optional[str] = None
    priority_filter: Optional[str] = None
    max_orders: int = 20
    assigned_pickers: int = 0


class WaveUpdate(BaseModel):
    name: Optional[str] = None
    zone_scope: Optional[str] = None
    priority_filter: Optional[str] = None
    max_orders: Optional[int] = None
    assigned_pickers: Optional[int] = None
    status: Optional[str] = None


class WaveRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    wave_number: str
    name: str
    zone_scope: Optional[str] = None
    priority_filter: Optional[str] = None
    max_orders: int
    assigned_pickers: int
    status: str
    created_at: datetime


# ---- Allocation ----
class AllocateRequest(BaseModel):
    order_line_id: int
    qty: Optional[float] = None  # defaults to the line's remaining unallocated qty


class OutboundAllocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_line_id: int
    material_id: int
    location_id: int
    qty: float
    status: str
    created_at: datetime


# ---- Pick Tasks ----
class PickTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    allocation_id: int
    wave_id: Optional[int] = None
    assignee: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class AssignPickerRequest(BaseModel):
    assignee: str


# ---- Load Tasks ----
class LoadTaskCreate(BaseModel):
    carrier_id: Optional[int] = None
    dock_door: Optional[str] = None
    eta: Optional[str] = None


class LoadTaskUpdate(BaseModel):
    carrier_id: Optional[int] = None
    dock_door: Optional[str] = None
    eta: Optional[str] = None
    status: Optional[str] = None


class LoadTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    load_number: str
    carrier_id: Optional[int] = None
    dock_door: Optional[str] = None
    eta: Optional[str] = None
    status: str
    created_at: datetime


# ---- Pack Tasks (PackageCarton) ----
class PackTaskCreate(BaseModel):
    order_id: int
    station: Optional[str] = None
    packer: Optional[str] = None


class PackTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pack_number: str
    order_id: int
    station: Optional[str] = None
    packer: Optional[str] = None
    qty_items: float
    qty_packed: float
    status: str
    created_at: datetime


# ---- Shipments ----
class ShipmentCreate(BaseModel):
    order_id: int
    carrier_id: Optional[int] = None
    manifest_number: Optional[str] = None
    weight: Optional[float] = None


class ShipmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ship_number: str
    order_id: int
    carrier_id: Optional[int] = None
    manifest_number: Optional[str] = None
    manifest_id: Optional[int] = None
    weight: Optional[float] = None
    status: str
    dispatched_at: Optional[datetime] = None
    created_at: datetime
    # Shipping Execution fields (app/routers/shipping_ops.py) — same Shipment
    # row Outbound's own Ship tab writes, just read/written by more endpoints.
    tracking_no: Optional[str] = None
    label_printed: bool = False
    service: Optional[str] = None
    pkgs: int = 1
    eta: Optional[datetime] = None


class DispatchByCodeRequest(BaseModel):
    code: str  # matches ship_number, manifest_number or the order's order_number


# ---- Outbound Task (work queue) ----
class OutboundTaskBase(BaseModel):
    task_type: str
    order_id: Optional[int] = None
    assignee: Optional[str] = None
    zone: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class OutboundTaskCreate(OutboundTaskBase):
    pass


class OutboundTaskUpdate(BaseModel):
    task_type: Optional[str] = None
    order_id: Optional[int] = None
    assignee: Optional[str] = None
    zone: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class OutboundTaskRead(OutboundTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Outbound Appointment ----
class OutboundAppointmentBase(BaseModel):
    carrier_id: Optional[int] = None
    order_id: Optional[int] = None
    appt_date: datetime
    dock_door: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    status: str = "Scheduled"


class OutboundAppointmentCreate(OutboundAppointmentBase):
    pass


class OutboundAppointmentUpdate(BaseModel):
    carrier_id: Optional[int] = None
    order_id: Optional[int] = None
    appt_date: Optional[datetime] = None
    dock_door: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    status: Optional[str] = None


class OutboundAppointmentRead(OutboundAppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
