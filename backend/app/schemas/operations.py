from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Inventory Balance ----
class InventoryBalanceBase(BaseModel):
    material_id: int
    location_id: int
    on_hand: float = 0
    allocated: float = 0
    on_hold: float = 0
    uom: str = "EA"


class InventoryBalanceCreate(InventoryBalanceBase):
    pass


class InventoryBalanceUpdate(BaseModel):
    material_id: Optional[int] = None
    location_id: Optional[int] = None
    on_hand: Optional[float] = None
    allocated: Optional[float] = None
    on_hold: Optional[float] = None
    uom: Optional[str] = None


class InventoryBalanceRead(InventoryBalanceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Purchase Order ----
class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    lines: int = 1
    qty_ordered: float = 0
    qty_received: float = 0
    total_value: float = 0
    status: str = "Open"


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(BaseModel):
    po_number: Optional[str] = None
    supplier_id: Optional[int] = None
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    lines: Optional[int] = None
    qty_ordered: Optional[float] = None
    qty_received: Optional[float] = None
    total_value: Optional[float] = None
    status: Optional[str] = None


class PurchaseOrderRead(PurchaseOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- ASN ----
class ASNBase(BaseModel):
    asn_number: str
    supplier_id: int
    po_reference: Optional[str] = None
    carrier_id: Optional[int] = None
    material_owner_id: Optional[int] = None
    expected_date: Optional[datetime] = None
    tracking_number: Optional[str] = None
    dock_door: Optional[str] = None
    lines: int = 1
    qty_expected: float = 0
    qty_received: float = 0
    status: str = "Open"


class ASNCreate(ASNBase):
    pass


class ASNUpdate(BaseModel):
    asn_number: Optional[str] = None
    supplier_id: Optional[int] = None
    po_reference: Optional[str] = None
    carrier_id: Optional[int] = None
    material_owner_id: Optional[int] = None
    expected_date: Optional[datetime] = None
    tracking_number: Optional[str] = None
    dock_door: Optional[str] = None
    lines: Optional[int] = None
    qty_expected: Optional[float] = None
    qty_received: Optional[float] = None
    status: Optional[str] = None


class ASNRead(ASNBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Digital Twin (Dashboard's 2D heatmap floor plan) ----
class FloorPlanLocation(BaseModel):
    """One real Location with coordinates, plus real inventory-level and
    pick-pendency numbers computed live from InventoryBalance / PickTask —
    no synthetic locations or fabricated occupancy."""
    location_id: int
    code: str
    zone_code: Optional[str] = None
    zone_type: Optional[str] = None
    x: float
    y: float
    on_hand_qty: float
    pending_picks: int
    occupancy_ratio: float  # on_hand_qty / max on_hand_qty across all plotted locations, 0..1
