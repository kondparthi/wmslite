"""
Pydantic schemas for the Master Data module.

Each entity gets: Base (shared fields), Create (input for POST), Update
(all-optional input for PATCH), Read (output, includes id + timestamps).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Material Owner ──────────────────────────────────────────────────────
class MaterialOwnerBase(BaseModel):
    code: str
    name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "Active"


class MaterialOwnerCreate(MaterialOwnerBase):
    pass


class MaterialOwnerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None


class MaterialOwnerRead(MaterialOwnerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Supplier ─────────────────────────────────────────────────────────────
class SupplierBase(BaseModel):
    code: str
    name: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "Active"


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Ship To / From ───────────────────────────────────────────────────────
class ShipToFromBase(BaseModel):
    code: str
    name: str
    party_type: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "Active"


class ShipToFromCreate(ShipToFromBase):
    pass


class ShipToFromUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    party_type: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None


class ShipToFromRead(ShipToFromBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Zone / Area ──────────────────────────────────────────────────────────
class ZoneAreaBase(BaseModel):
    code: str
    name: str
    zone_type: Optional[str] = None
    temperature_controlled: bool = False
    temperature_min_c: Optional[float] = None
    temperature_max_c: Optional[float] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    capacity_units: Optional[float] = None
    occupancy_pct: float = 0
    status: str = "Active"


class ZoneAreaCreate(ZoneAreaBase):
    pass


class ZoneAreaUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    zone_type: Optional[str] = None
    temperature_controlled: Optional[bool] = None
    temperature_min_c: Optional[float] = None
    temperature_max_c: Optional[float] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    capacity_units: Optional[float] = None
    occupancy_pct: Optional[float] = None
    status: Optional[str] = None


class ZoneAreaRead(ZoneAreaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Location ─────────────────────────────────────────────────────────────
class LocationBase(BaseModel):
    code: str
    description: Optional[str] = None
    zone_id: Optional[int] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    bin: Optional[str] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    z_coordinate: Optional[float] = None
    location_type: Optional[str] = None
    status: str = "Active"


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    zone_id: Optional[int] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    bin: Optional[str] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    z_coordinate: Optional[float] = None
    location_type: Optional[str] = None
    status: Optional[str] = None


class LocationRead(LocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Material ─────────────────────────────────────────────────────────────
class MaterialBase(BaseModel):
    sku: str
    description: str
    category: Optional[str] = None
    uom: str = "EA"
    weight: Optional[float] = None
    reorder_point: Optional[float] = None
    owner_id: Optional[int] = None
    lot_tracked: bool = False
    serial_tracked: bool = False
    expiry_tracked: bool = False
    hazardous: bool = False
    status: str = "Active"


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    uom: Optional[str] = None
    weight: Optional[float] = None
    reorder_point: Optional[float] = None
    owner_id: Optional[int] = None
    lot_tracked: Optional[bool] = None
    serial_tracked: Optional[bool] = None
    expiry_tracked: Optional[bool] = None
    hazardous: Optional[bool] = None
    status: Optional[str] = None


class MaterialRead(MaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Material Packkey ─────────────────────────────────────────────────────
class MaterialPackkeyBase(BaseModel):
    material_id: int
    pack_uom: str
    base_uom: str
    conversion_qty: float
    is_default: bool = False
    status: str = "Active"


class MaterialPackkeyCreate(MaterialPackkeyBase):
    pass


class MaterialPackkeyUpdate(BaseModel):
    material_id: Optional[int] = None
    pack_uom: Optional[str] = None
    base_uom: Optional[str] = None
    conversion_qty: Optional[float] = None
    is_default: Optional[bool] = None
    status: Optional[str] = None


class MaterialPackkeyRead(MaterialPackkeyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Assigned Location ────────────────────────────────────────────────────
class AssignedLocationBase(BaseModel):
    material_id: int
    location_id: int
    min_qty: float = 0
    max_qty: float = 0
    status: str = "Active"


class AssignedLocationCreate(AssignedLocationBase):
    pass


class AssignedLocationUpdate(BaseModel):
    material_id: Optional[int] = None
    location_id: Optional[int] = None
    min_qty: Optional[float] = None
    max_qty: Optional[float] = None
    status: Optional[str] = None


class AssignedLocationRead(AssignedLocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Replenishment Rule ───────────────────────────────────────────────────
class ReplenishmentRuleBase(BaseModel):
    material_id: int
    location_id: Optional[int] = None
    min_qty: float = 0
    max_qty: float = 0
    reorder_point: Optional[float] = None
    status: str = "Active"


class ReplenishmentRuleCreate(ReplenishmentRuleBase):
    pass


class ReplenishmentRuleUpdate(BaseModel):
    material_id: Optional[int] = None
    location_id: Optional[int] = None
    min_qty: Optional[float] = None
    max_qty: Optional[float] = None
    reorder_point: Optional[float] = None
    status: Optional[str] = None


class ReplenishmentRuleRead(ReplenishmentRuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Outbound Lot ─────────────────────────────────────────────────────────
class OutboundLotBase(BaseModel):
    lot_number: str
    material_id: int
    total_qty: float = 0
    remaining_qty: float = 0
    mfg_date: Optional[datetime] = None
    exp_date: Optional[datetime] = None
    status: str = "Active"
    attribute_template: Optional[str] = None


class OutboundLotCreate(OutboundLotBase):
    pass


class OutboundLotUpdate(BaseModel):
    lot_number: Optional[str] = None
    material_id: Optional[int] = None
    total_qty: Optional[float] = None
    remaining_qty: Optional[float] = None
    mfg_date: Optional[datetime] = None
    exp_date: Optional[datetime] = None
    status: Optional[str] = None
    attribute_template: Optional[str] = None


class OutboundLotRead(OutboundLotBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ── Carrier ──────────────────────────────────────────────────────────────
class CarrierBase(BaseModel):
    code: str
    scac: Optional[str] = None
    name: str
    mode: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "Active"
    # Shipping Execution's Carrier Integration tab (app/routers/shipping_ops.py
    # reads/writes these on the same carriers row Master Data and Outbound
    # already use) — optional so Master Data's own Carrier form is unaffected.
    api_status: str = "Disconnected"  # Connected | Error | Disconnected
    account_no: Optional[str] = None
    label_format: Optional[str] = None
    tracking_url_template: Optional[str] = None
    services: Optional[str] = None  # comma-separated, e.g. "Express,Economy"
    active: bool = True


class CarrierCreate(CarrierBase):
    pass


class CarrierUpdate(BaseModel):
    code: Optional[str] = None
    scac: Optional[str] = None
    name: Optional[str] = None
    mode: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None
    api_status: Optional[str] = None
    account_no: Optional[str] = None
    label_format: Optional[str] = None
    tracking_url_template: Optional[str] = None
    services: Optional[str] = None
    active: Optional[bool] = None


class CarrierRead(CarrierBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
