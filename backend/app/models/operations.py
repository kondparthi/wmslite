"""
SQLAlchemy models for the Inventory and Inbound modules.

Kept intentionally lean for this phase — a single InventoryBalance row per
material+location (Master Data's OutboundLot table already tracks lot-level
detail separately and can be joined in later if the client asks for
lot-level balances), and flat PurchaseOrder / ASN headers matching exactly
the fields already shown in the approved mockups. Line-item detail (per-SKU
lines on a PO/ASN) can be added once/if the client confirms it's needed
beyond the summary counts (lines/qty) already on those screens.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class InventoryBalance(Base):
    __tablename__ = "inventory_balances"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    on_hand = Column(Float, nullable=False, default=0)
    allocated = Column(Float, nullable=False, default=0)
    on_hold = Column(Float, nullable=False, default=0)
    uom = Column(String(20), default="EA")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    material = relationship("Material")
    location = relationship("Location")


class InventoryTransaction(Base):
    """Unified ledger for the Transactions / Movement / Adjustment / Update
    (Transfer) tabs — one row per stock-affecting event. `qty` is always
    positive; `txn_type` + sign convention (Adjustment can be negative via
    the /adjust endpoint's request qty) says what happened. `to_location_id`
    is only set for Transfer rows.

    Kept at SKU + location granularity, matching the rest of this build —
    no LPN/pallet-level tracking (that's a bigger structural addition; the
    mockup's LPN numbers are illustrative, dropped here same as the fake
    per-line PO detail earlier).
    """
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    txn_type = Column(String(30), nullable=False)  # Receipt | Adjustment | Transfer | Shipment
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    qty = Column(Float, nullable=False)
    reason = Column(String(150), nullable=True)
    reference = Column(String(60), nullable=True)
    status = Column(String(20), default="Completed")  # Completed | In Transit | Pending
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material")
    location = relationship("Location", foreign_keys=[location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])


class InventoryHold(Base):
    __tablename__ = "inventory_holds"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    qty = Column(Float, nullable=False)
    reason = Column(String(150), nullable=True)
    status = Column(String(20), default="Active")  # Active | Released
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)

    material = relationship("Material")
    location = relationship("Location")


class CycleCountPlan(Base):
    __tablename__ = "cycle_count_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    scope_description = Column(String(200), nullable=True)  # free text, e.g. "Zone A"
    method = Column(String(20), default="Web UI")  # Web UI | RF Gun
    status = Column(String(20), default="Pending")  # Pending | In Progress | Completed
    total_items = Column(Integer, default=0)
    variance = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KittingOrder(Base):
    """Kit / VAS order. Components are stored as a simple JSON string
    (`[{"material_id":1,"qty_per_kit":2}, ...]`) rather than a full separate
    BOM master table — real and editable, but intentionally lean for this
    phase."""
    __tablename__ = "kitting_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(30), unique=True, nullable=False, index=True)
    kit_material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False, default=0)
    components_json = Column(Text, nullable=True)
    status = Column(String(20), default="Scheduled")  # Scheduled | Production | Completed
    priority = Column(String(10), default="Medium")    # Low | Medium | High
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    kit_material = relationship("Material")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(30), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    order_date = Column(DateTime, nullable=True)
    expected_date = Column(DateTime, nullable=True)
    lines = Column(Integer, default=1)
    qty_ordered = Column(Float, default=0)
    qty_received = Column(Float, default=0)
    total_value = Column(Float, default=0)
    status = Column(String(20), default="Open")  # Open | Partial | Closed | Overdue
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier")


class ASN(Base):
    """Advance Shipment Notice."""
    __tablename__ = "asns"

    id = Column(Integer, primary_key=True, index=True)
    asn_number = Column(String(30), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    po_reference = Column(String(30), nullable=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    material_owner_id = Column(Integer, ForeignKey("material_owners.id"), nullable=True)
    expected_date = Column(DateTime, nullable=True)
    tracking_number = Column(String(60), nullable=True)
    dock_door = Column(String(30), nullable=True)
    lines = Column(Integer, default=1)
    qty_expected = Column(Float, default=0)
    qty_received = Column(Float, default=0)
    status = Column(String(20), default="Open")  # Open | In Progress | Received | Overdue | Closed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier")
    carrier = relationship("Carrier")
    material_owner = relationship("MaterialOwner")
