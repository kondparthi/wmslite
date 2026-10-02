"""
SQLAlchemy models for Inbound's remaining tabs (Receive/Putaway workflow,
Putaway Strategy, Inbound Appointment, Task Management).

Scoping notes (same spirit as Inventory phase):
 - PutawayTask carries the receive→putaway workflow: a receipt creates a
   Pending task with a suggested location; confirming it applies the
   quantity to InventoryBalance and writes an InventoryTransaction
   (txn_type="Receipt") so it shows up in Inventory's own Transactions
   ledger too — one real event, visible from both modules.
 - Suggested location uses a simple heuristic (the material's Assigned
   Location if one exists in Master Data, else the first Active location) —
   not a full slotting/optimization engine, which is out of scope here.
 - InboundTask is a general work-queue (Receive/Putaway/QC Check/Count)
   separate from PutawayTask, which specifically tracks the location
   workflow for a single receipt.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class PutawayStrategy(Base):
    __tablename__ = "putaway_strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    priority = Column(Integer, default=1)
    zone = Column(String(50), nullable=True)
    rule_type = Column(String(50), nullable=False)
    condition_text = Column(String(200), nullable=True)
    status = Column(String(20), default="Active")
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InboundReceipt(Base):
    __tablename__ = "inbound_receipts"

    id = Column(Integer, primary_key=True, index=True)
    asn_id = Column(Integer, ForeignKey("asns.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    lpn = Column(String(30), nullable=True)
    qty = Column(Float, nullable=False, default=0)
    condition = Column(String(20), default="Good")  # Good | Damaged | QC Hold
    received_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Label Generation tab (app/routers/label_ops.py) — reprintable receiving label.
    label_printed = Column(Boolean, default=False)
    print_count = Column(Integer, default=0)

    material = relationship("Material")


class PutawayTask(Base):
    __tablename__ = "putaway_tasks"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("inbound_receipts.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False, default=0)
    suggested_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    confirmed_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    priority = Column(String(10), default="Medium")
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Pending")  # Pending | In Progress | Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    # Label Generation tab (app/routers/label_ops.py) — reprintable putaway label.
    label_printed = Column(Boolean, default=False)
    print_count = Column(Integer, default=0)

    material = relationship("Material")


class InboundAppointment(Base):
    __tablename__ = "inbound_appointments"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    asn_id = Column(Integer, ForeignKey("asns.id"), nullable=True)
    appt_date = Column(DateTime, nullable=False)
    dock_door = Column(String(30), nullable=True)
    driver_name = Column(String(100), nullable=True)
    vehicle_plate = Column(String(30), nullable=True)
    status = Column(String(20), default="Scheduled")  # Scheduled|Confirmed|Arrived|Completed|No Show|Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InboundTask(Base):
    __tablename__ = "inbound_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(30), nullable=False)  # Receive | Putaway | QC Check | Count
    asn_id = Column(Integer, ForeignKey("asns.id"), nullable=True)
    assignee = Column(String(100), nullable=True)
    zone = Column(String(50), nullable=True)
    priority = Column(String(10), default="Medium")
    status = Column(String(20), default="Pending")  # Pending | In Progress | Completed
    due_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
