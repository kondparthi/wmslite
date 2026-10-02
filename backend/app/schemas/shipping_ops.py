from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Manifest ----
class ManifestCreate(BaseModel):
    carrier_id: int


class ManifestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    manifest_number: str
    carrier_id: int
    status: str
    created_at: datetime
    closed_at: Optional[datetime] = None
    # Computed from Shipment.manifest_id at read time — never stored, so a
    # shipment reassigned after the manifest closes can't leave a stale total.
    shipment_count: int = 0
    total_packages: int = 0
    total_weight: float = 0


class AssignToManifestRequest(BaseModel):
    shipment_ids: list[int]


# ---- Carrier Rate ----
class CarrierRateBase(BaseModel):
    carrier_id: int
    service: str
    base_rate: float = 0
    per_kg_rate: float = 0
    transit_days: Optional[str] = None
    active: bool = True


class CarrierRateCreate(CarrierRateBase):
    pass


class CarrierRateUpdate(BaseModel):
    carrier_id: Optional[int] = None
    service: Optional[str] = None
    base_rate: Optional[float] = None
    per_kg_rate: Optional[float] = None
    transit_days: Optional[str] = None
    active: Optional[bool] = None


class CarrierRateRead(CarrierRateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Rate Shopping ----
class RateQuoteRequest(BaseModel):
    weight: float
    service: Optional[str] = None  # filter to one service, or None for all
    carrier_id: Optional[int] = None


class RateQuoteResult(BaseModel):
    carrier_id: int
    carrier_name: str
    service: str
    transit_days: Optional[str] = None
    rate: float
    recommended: bool = False


# ---- Label printing / manifest assignment on the existing Shipment row ----
class PrintLabelRequest(BaseModel):
    service: Optional[str] = None
    pkgs: Optional[int] = None


class AssignManifestRequest(BaseModel):
    manifest_id: int
