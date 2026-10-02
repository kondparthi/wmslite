from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Putaway Strategy ----
class PutawayStrategyBase(BaseModel):
    name: str
    priority: int = 1
    zone: Optional[str] = None
    rule_type: str
    condition_text: Optional[str] = None
    status: str = "Active"
    usage_count: int = 0


class PutawayStrategyCreate(PutawayStrategyBase):
    pass


class PutawayStrategyUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    zone: Optional[str] = None
    rule_type: Optional[str] = None
    condition_text: Optional[str] = None
    status: Optional[str] = None
    usage_count: Optional[int] = None


class PutawayStrategyRead(PutawayStrategyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Inbound Receipt ----
class InboundReceiptCreate(BaseModel):
    asn_id: Optional[int] = None
    material_id: int
    lpn: Optional[str] = None
    qty: float
    condition: str = "Good"
    received_by: Optional[str] = None


class InboundReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asn_id: Optional[int] = None
    material_id: int
    lpn: Optional[str] = None
    qty: float
    condition: str
    received_by: Optional[str] = None
    created_at: datetime
    label_printed: bool = False
    print_count: int = 0


# ---- Putaway Task ----
class PutawayTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    receipt_id: Optional[int] = None
    material_id: int
    qty: float
    suggested_location_id: Optional[int] = None
    confirmed_location_id: Optional[int] = None
    priority: str
    assignee: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    label_printed: bool = False
    print_count: int = 0


class ConfirmPutawayRequest(BaseModel):
    location_id: int


# ---- Inbound Appointment ----
class InboundAppointmentBase(BaseModel):
    supplier_id: int
    asn_id: Optional[int] = None
    appt_date: datetime
    dock_door: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    status: str = "Scheduled"


class InboundAppointmentCreate(InboundAppointmentBase):
    pass


class InboundAppointmentUpdate(BaseModel):
    supplier_id: Optional[int] = None
    asn_id: Optional[int] = None
    appt_date: Optional[datetime] = None
    dock_door: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    status: Optional[str] = None


class InboundAppointmentRead(InboundAppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Inbound Task ----
class InboundTaskBase(BaseModel):
    task_type: str
    asn_id: Optional[int] = None
    assignee: Optional[str] = None
    zone: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class InboundTaskCreate(InboundTaskBase):
    pass


class InboundTaskUpdate(BaseModel):
    task_type: Optional[str] = None
    asn_id: Optional[int] = None
    assignee: Optional[str] = None
    zone: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class InboundTaskRead(InboundTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Label Generation ----
class ReceivingLabelListItem(BaseModel):
    """Row shape for the Receiving Labels list/grid — real InboundReceipt
    data joined with the material's code/name for display."""
    id: int
    lpn: Optional[str] = None
    material_id: int
    material_code: str
    material_name: str
    qty: float
    uom: str
    condition: str
    received_by: Optional[str] = None
    created_at: datetime
    label_printed: bool
    print_count: int


class PutawayLabelListItem(BaseModel):
    """Row shape for the Putaway Labels list/grid — real PutawayTask data
    joined with the material and destination location codes."""
    id: int
    receipt_id: Optional[int] = None
    material_id: int
    material_code: str
    material_name: str
    qty: float
    uom: str
    destination_location_code: Optional[str] = None
    status: str
    created_at: datetime
    label_printed: bool
    print_count: int


class LabelPrintResponse(BaseModel):
    """The actual label payload returned on print/reprint — what the
    frontend renders as a barcode + field list. barcode_value is the exact
    string encoded into the barcode; symbology/fields_included come from
    the active BarcodeConfig for this module/label_type so changing that
    config changes what gets printed here, not just cosmetically."""
    barcode_value: str
    symbology: str
    fields_included: list[str]
    label_width_mm: float
    label_height_mm: float
    print_count: int
    # Fields available to render, keyed by name so the frontend can pick
    # only the ones fields_included asks for.
    fields: dict
