from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---- RMA Requests ----
class RMARequestBase(BaseModel):
    order_reference: str | None = None
    customer: str
    material_id: int
    qty: float
    reason: str
    return_type: str = "Customer Return"
    priority: str = "Medium"
    assignee: str | None = None


class RMARequestCreate(RMARequestBase):
    pass


class RMARequestUpdate(BaseModel):
    order_reference: str | None = None
    customer: str | None = None
    material_id: int | None = None
    qty: float | None = None
    reason: str | None = None
    return_type: str | None = None
    priority: str | None = None
    assignee: str | None = None
    status: str | None = None


class RMARequestRead(RMARequestBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rma_number: str
    status: str
    created_at: datetime
    updated_at: datetime
    received_at: datetime | None = None
    closed_at: datetime | None = None
    sku: str = ""
    description: str = ""


# ---- Inspection & Grading ----
class InspectionCreateRequest(BaseModel):
    rma_id: int
    qty_received: float
    inspector: str | None = None


class InspectionGradeRequest(BaseModel):
    qty_inspected: float
    grade: str
    notes: str | None = None
    inspector: str | None = None


class InspectionRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inspection_number: str
    rma_id: int
    rma_number: str = ""
    sku: str = ""
    description: str = ""
    qty_received: float
    qty_inspected: float
    grade: str | None = None
    inspector: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    inspected_at: datetime | None = None


# ---- Disposition ----
class DispositionActionRequest(BaseModel):
    action: str


class DispositionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disposition_number: str
    rma_id: int
    rma_number: str = ""
    inspection_id: int | None = None
    material_id: int
    sku: str = ""
    description: str = ""
    qty: float
    action: str
    target_location_code: str | None = None
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    posted_txn_id: int | None = None


# ---- Reports ----
class ReturnsReasonBucket(BaseModel):
    reason: str
    count: int


class ReturnsMonthlyTrend(BaseModel):
    month: str
    returns: int
    processed: int


class ReturnsReportSummary(BaseModel):
    returns_rate_pct: float
    avg_processing_hours: float
    recovery_rate_pct: float
    open_rmas: int
    closed_rmas: int
    reason_breakdown: list[ReturnsReasonBucket]
    monthly_trend: list[ReturnsMonthlyTrend]
