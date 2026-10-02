from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Inventory Transactions (Transactions / Movement / Adjustment / Update tabs) ----
class InventoryAdjustmentRequest(BaseModel):
    material_id: int
    location_id: int
    qty: float  # signed delta — negative reduces on_hand
    reason: Optional[str] = None
    reference: Optional[str] = None


class InventoryTransferRequest(BaseModel):
    material_id: int
    from_location_id: int
    to_location_id: int
    qty: float  # positive
    reference: Optional[str] = None
    immediate: bool = True  # False = queued "Movement" (In Transit until completed)


class InventoryTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    txn_type: str
    material_id: int
    location_id: int
    to_location_id: Optional[int] = None
    qty: float
    reason: Optional[str] = None
    reference: Optional[str] = None
    status: str
    created_at: datetime


# ---- Holds ----
class InventoryHoldCreate(BaseModel):
    material_id: int
    location_id: int
    qty: float
    reason: Optional[str] = None


class InventoryHoldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    material_id: int
    location_id: int
    qty: float
    reason: Optional[str] = None
    status: str
    created_at: datetime
    released_at: Optional[datetime] = None


# ---- Cycle Count Plans ----
class CycleCountPlanBase(BaseModel):
    name: str
    scope_description: Optional[str] = None
    method: str = "Web UI"
    status: str = "Pending"
    total_items: int = 0
    variance: int = 0


class CycleCountPlanCreate(CycleCountPlanBase):
    pass


class CycleCountPlanUpdate(BaseModel):
    name: Optional[str] = None
    scope_description: Optional[str] = None
    method: Optional[str] = None
    status: Optional[str] = None
    total_items: Optional[int] = None
    variance: Optional[int] = None


class CycleCountPlanRead(CycleCountPlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Kitting Orders ----
class KittingOrderBase(BaseModel):
    order_number: str
    kit_material_id: int
    qty: float = 0
    components_json: Optional[str] = None  # JSON string: [{"material_id":1,"qty_per_kit":2}]
    status: str = "Scheduled"
    priority: str = "Medium"


class KittingOrderCreate(KittingOrderBase):
    pass


class KittingOrderUpdate(BaseModel):
    order_number: Optional[str] = None
    kit_material_id: Optional[int] = None
    qty: Optional[float] = None
    components_json: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class KittingOrderRead(KittingOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
