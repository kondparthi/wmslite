"""
SQLAlchemy models for the Master Data module (11 sub-modules).

Field choices follow the client's "WMS - Module Level Master.xlsx" comments:
 - Location: supports XYZ coordinates for 3D warehouse slotting.
 - Material: tracking flags (lot/serial/expiry/hazardous) per client spec.
 - Supplier: kept basic — no vendor rating/performance matrix (out of scope).
 - ZoneArea: zone type, temperature, GPS, occupancy % (per client spec).
 - AssignedLocation / ReplenishmentRule: simple Min/Max only (no advanced
   forecasting) — client explicitly scoped this down.
 - OutboundLot: lot attribute/validation template fields included.
 - Carrier: basic carrier/SCAC/mode only — no contracts/ratings (out of scope).
"""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class MaterialOwner(Base):
    __tablename__ = "material_owners"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    contact_name = Column(String(150))
    contact_email = Column(String(150))
    contact_phone = Column(String(30))
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Admin Configuration's Master Data Config tab (app/routers/admin_config.py)
    type = Column(String(30), default="Internal")
    country = Column(String(100), nullable=True)

    materials = relationship("Material", back_populates="owner")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    address_line1 = Column(String(200))
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    contact_name = Column(String(150))
    contact_email = Column(String(150))
    contact_phone = Column(String(30))
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShipToFrom(Base):
    __tablename__ = "ship_to_from"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    party_type = Column(String(20), nullable=False)  # "Ship To" | "Ship From"
    address_line1 = Column(String(200))
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    contact_name = Column(String(150))
    contact_phone = Column(String(30))
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ZoneArea(Base):
    __tablename__ = "zones_areas"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    zone_type = Column(String(50))          # e.g. Bulk, Pick, Cold Storage, Hazmat
    temperature_controlled = Column(Boolean, default=False)
    temperature_min_c = Column(Float, nullable=True)
    temperature_max_c = Column(Float, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    capacity_units = Column(Float, nullable=True)
    occupancy_pct = Column(Float, default=0)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Admin Configuration's Warehouse Config tab (app/routers/admin_config.py)
    warehouse_id = Column(Integer, ForeignKey("admin_warehouses.id"), nullable=True)
    pick_priority = Column(String(10), default="Medium")

    locations = relationship("Location", back_populates="zone")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    description = Column(String(200))
    zone_id = Column(Integer, ForeignKey("zones_areas.id"), nullable=True)
    aisle = Column(String(20))
    rack = Column(String(20))
    level = Column(String(20))
    bin = Column(String(20))
    # XYZ coordinates — client comment: "Support for maintaining coordinates
    # (XYZ) to support 3D warehouse".
    x_coordinate = Column(Float, nullable=True)
    y_coordinate = Column(Float, nullable=True)
    z_coordinate = Column(Float, nullable=True)
    location_type = Column(String(50))      # e.g. Storage, Pick Face, Staging, Dock
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    zone = relationship("ZoneArea", back_populates="locations")
    assigned_locations = relationship("AssignedLocation", back_populates="location")
    replenishment_rules = relationship("ReplenishmentRule", back_populates="location")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(200), nullable=False)
    category = Column(String(100))
    uom = Column(String(20), default="EA")
    weight = Column(Float, nullable=True)
    reorder_point = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("material_owners.id"), nullable=True)

    lot_tracked = Column(Boolean, default=False)
    serial_tracked = Column(Boolean, default=False)
    expiry_tracked = Column(Boolean, default=False)
    hazardous = Column(Boolean, default=False)

    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("MaterialOwner", back_populates="materials")
    packkeys = relationship("MaterialPackkey", back_populates="material")
    lots = relationship("OutboundLot", back_populates="material")
    assigned_locations = relationship("AssignedLocation", back_populates="material")
    replenishment_rules = relationship("ReplenishmentRule", back_populates="material")


class MaterialPackkey(Base):
    __tablename__ = "material_packkeys"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    pack_uom = Column(String(20), nullable=False)     # e.g. CASE, PALLET
    base_uom = Column(String(20), nullable=False)      # e.g. EA
    conversion_qty = Column(Float, nullable=False)     # e.g. 1 CASE = 24 EA
    is_default = Column(Boolean, default=False)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    material = relationship("Material", back_populates="packkeys")


class AssignedLocation(Base):
    """SKU-to-location assignment — simple Min/Max only, per client scope."""
    __tablename__ = "assigned_locations"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    min_qty = Column(Float, default=0)
    max_qty = Column(Float, default=0)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    material = relationship("Material", back_populates="assigned_locations")
    location = relationship("Location", back_populates="assigned_locations")


class ReplenishmentRule(Base):
    """Min/Max + reorder point — Min/Max only, per client scope."""
    __tablename__ = "replenishment_rules"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    min_qty = Column(Float, default=0)
    max_qty = Column(Float, default=0)
    reorder_point = Column(Float, nullable=True)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    material = relationship("Material", back_populates="replenishment_rules")
    location = relationship("Location", back_populates="replenishment_rules")


class OutboundLot(Base):
    __tablename__ = "outbound_lots"

    id = Column(Integer, primary_key=True, index=True)
    lot_number = Column(String(50), unique=True, nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    total_qty = Column(Float, nullable=False, default=0)
    remaining_qty = Column(Float, nullable=False, default=0)
    mfg_date = Column(DateTime, nullable=True)
    exp_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="Active")
    # LOT attribute/validation template — free-form JSON-ish text per client spec
    attribute_template = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    material = relationship("Material", back_populates="lots")


class Carrier(Base):
    """Carrier / Bill To — basic only, no contracts/ratings (out of scope)."""
    __tablename__ = "carriers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    scac = Column(String(10))
    name = Column(String(150), nullable=False)
    mode = Column(String(50))   # e.g. LTL, FTL, Parcel, Ocean, Air
    contact_name = Column(String(150))
    contact_phone = Column(String(30))
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Shipping Execution's Carrier Integration tab (app/routers/shipping_ops.py)
    api_status = Column(String(20), default="Disconnected")
    account_no = Column(String(50), nullable=True)
    label_format = Column(String(30), nullable=True)
    tracking_url_template = Column(String(255), nullable=True)
    services = Column(String(255), nullable=True)
    active = Column(Boolean, default=True)
