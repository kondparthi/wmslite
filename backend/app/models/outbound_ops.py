"""
SQLAlchemy models for the Outbound module's 12 tabs.

Design mirrors the Inbound phase's split between a lightweight header and a
bespoke row that actually moves inventory:
 - ShipmentOrder is the header (customer, carrier, priority, dates) —
   ShipmentOrderLine carries the per-SKU quantities, since (unlike ASN/PO,
   which stayed header-only per the Inventory-phase scoping note) Allocation
   and Picking genuinely need per-SKU rows to work against.
 - OutboundAllocation is the bespoke row that reserves stock: allocating
   increases InventoryBalance.allocated (never touches on_hand yet).
 - PickTask is the bespoke row that actually removes stock: confirming a
   pick decreases InventoryBalance.on_hand and .allocated and writes an
   InventoryTransaction (txn_type="Shipment"), exactly mirroring how
   confirming a Putaway Task moves stock on the Inbound side. Packing and
   Shipping afterwards are paperwork/status steps only — the stock already
   left its location at pick-confirm, matching real WMS practice.
 - Wave, LoadTask, PackageCarton, Shipment, OutboundTask and
   OutboundAppointment are simpler headers, same spirit as Inbound's
   PutawayStrategy/InboundAppointment/InboundTask.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ShipmentOrder(Base):
    __tablename__ = "shipment_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(30), unique=True, nullable=False, index=True)
    ship_to_id = Column(Integer, ForeignKey("ship_to_from.id"), nullable=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    priority = Column(String(10), default="Normal")  # Urgent | High | Normal | Low
    required_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    wave_id = Column(Integer, ForeignKey("outbound_waves.id"), nullable=True)
    status = Column(String(20), default="Pending")  # Pending|Allocated|Picking|Packed|Shipped|Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ship_to = relationship("ShipToFrom")
    carrier = relationship("Carrier")
    lines = relationship("ShipmentOrderLine", back_populates="order")


class ShipmentOrderLine(Base):
    __tablename__ = "shipment_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("shipment_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty_ordered = Column(Float, nullable=False, default=0)
    qty_allocated = Column(Float, nullable=False, default=0)
    qty_picked = Column(Float, nullable=False, default=0)

    order = relationship("ShipmentOrder", back_populates="lines")
    material = relationship("Material")


class AllocationStrategy(Base):
    __tablename__ = "allocation_strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    method = Column(String(30), nullable=False)  # FIFO | FEFO | LIFO | Zone-Priority
    scope_description = Column(String(200), nullable=True)
    status = Column(String(20), default="Active")
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Wave(Base):
    __tablename__ = "outbound_waves"

    id = Column(Integer, primary_key=True, index=True)
    wave_number = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    zone_scope = Column(String(50), nullable=True)
    priority_filter = Column(String(30), nullable=True)
    max_orders = Column(Integer, default=20)
    assigned_pickers = Column(Integer, default=0)
    status = Column(String(20), default="Active")  # Active | Paused | Completed
    created_at = Column(DateTime, default=datetime.utcnow)


class OutboundAllocation(Base):
    __tablename__ = "outbound_allocations"

    id = Column(Integer, primary_key=True, index=True)
    order_line_id = Column(Integer, ForeignKey("shipment_order_lines.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    qty = Column(Float, nullable=False, default=0)
    status = Column(String(20), default="Allocated")  # Allocated | Picked | Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    order_line = relationship("ShipmentOrderLine")
    material = relationship("Material")
    location = relationship("Location")


class PickTask(Base):
    __tablename__ = "pick_tasks"

    id = Column(Integer, primary_key=True, index=True)
    allocation_id = Column(Integer, ForeignKey("outbound_allocations.id"), nullable=False)
    wave_id = Column(Integer, ForeignKey("outbound_waves.id"), nullable=True)
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Ready")  # Ready | In Progress | Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    allocation = relationship("OutboundAllocation")


class LoadTask(Base):
    __tablename__ = "load_tasks"

    id = Column(Integer, primary_key=True, index=True)
    load_number = Column(String(30), unique=True, nullable=False, index=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    dock_door = Column(String(30), nullable=True)
    eta = Column(String(20), nullable=True)  # free-text clock time, matches the mock (no full datetime needed)
    status = Column(String(20), default="Planned")  # Planned | Staged | Loading | Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    carrier = relationship("Carrier")


class PackageCarton(Base):
    __tablename__ = "package_cartons"

    id = Column(Integer, primary_key=True, index=True)
    pack_number = Column(String(30), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("shipment_orders.id"), nullable=False)
    station = Column(String(30), nullable=True)
    packer = Column(String(100), nullable=True)
    qty_items = Column(Float, default=0)
    qty_packed = Column(Float, default=0)
    status = Column(String(20), default="Ready")  # Ready | Packing | Packed
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("ShipmentOrder")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    ship_number = Column(String(30), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("shipment_orders.id"), nullable=False)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    manifest_number = Column(String(30), nullable=True)
    manifest_id = Column(Integer, ForeignKey("shipping_manifests.id"), nullable=True)
    weight = Column(Float, nullable=True)
    status = Column(String(20), default="Ready to Ship")  # Ready to Ship | Dispatched
    dispatched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Shipping Execution columns (app/models/shipping_ops.py) — added here
    # rather than a second table because a shipment's label/tracking state
    # belongs to the same row Outbound's own Ship tab already writes.
    tracking_no = Column(String(40), nullable=True)
    label_printed = Column(Boolean, default=False)
    service = Column(String(30), nullable=True)
    pkgs = Column(Integer, default=1)
    eta = Column(DateTime, nullable=True)

    order = relationship("ShipmentOrder")
    carrier = relationship("Carrier")


class OutboundTask(Base):
    __tablename__ = "outbound_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(30), nullable=False)  # Pick | Pack | Load | Ship | Count
    order_id = Column(Integer, ForeignKey("shipment_orders.id"), nullable=True)
    assignee = Column(String(100), nullable=True)
    zone = Column(String(50), nullable=True)
    priority = Column(String(10), default="Medium")
    status = Column(String(20), default="Pending")  # Pending | In Progress | Completed
    due_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OutboundAppointment(Base):
    __tablename__ = "outbound_appointments"

    id = Column(Integer, primary_key=True, index=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("shipment_orders.id"), nullable=True)
    appt_date = Column(DateTime, nullable=False)
    dock_door = Column(String(30), nullable=True)
    driver_name = Column(String(100), nullable=True)
    vehicle_plate = Column(String(30), nullable=True)
    status = Column(String(20), default="Scheduled")  # Scheduled|Confirmed|Arrived|Completed|No Show|Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
