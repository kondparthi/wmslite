"""
Cross Docking's 5 tabs. The whole point of cross-docking is routing freight
that already exists in two other modules' tables — an unconsumed Inbound
receipt and an open Outbound order line — straight past putaway, so
CrossDockPlan and CrossDockTask are the only genuinely new entities here.
Staging locations reuse Master Data's ZoneArea/Location (new rows, zone_type
"Staging", same "add rows, don't fork a table" approach every other module
uses), and door references reuse Yard Management's YardDoor rows read-only
(we display real door codes without mutating Yard's own check-in/dispatch
state, since that's Yard's workflow to own).

Completing a task feeds its result back into Outbound's own
ShipmentOrderLine/OutboundAllocation exactly the way a normal
allocate-then-pick would (qty_allocated and qty_picked both advance at
once, an OutboundAllocation row lands with status "Picked", a Shipment
InventoryTransaction is logged) — cross-docked freight never touches
InventoryBalance because it never sat in storage.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class CrossDockPlan(Base):
    __tablename__ = "crossdock_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_number = Column(String(20), unique=True, nullable=False, index=True)
    receipt_id = Column(Integer, ForeignKey("inbound_receipts.id"), nullable=False)
    order_line_id = Column(Integer, ForeignKey("shipment_order_lines.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False)
    match_level = Column(String(20), default="Exact SKU Match")  # Exact SKU Match|Partial Match|By Category
    transfer_type = Column(String(20), default="Pure Cross Dock")  # Pure Cross Dock|Merge-in-Transit|Opportunistic
    priority = Column(String(10), default="Medium")  # Urgent|High|Medium|Low
    rule_applied = Column(String(50), nullable=True)  # set when created by the opportunistic detector
    status = Column(String(20), default="Proposed")  # Proposed|Confirmed|Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    receipt = relationship("InboundReceipt")
    order_line = relationship("ShipmentOrderLine")
    material = relationship("Material")


class CrossDockTask(Base):
    __tablename__ = "crossdock_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_number = Column(String(20), unique=True, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("crossdock_plans.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False)
    lpn = Column(String(30), nullable=True)
    from_door_id = Column(Integer, ForeignKey("yard_doors.id"), nullable=True)
    to_door_id = Column(Integer, ForeignKey("yard_doors.id"), nullable=True)
    current_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Pending")  # Pending|Staged|In Progress|Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    staged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    plan = relationship("CrossDockPlan")
    material = relationship("Material")
    from_door = relationship("YardDoor", foreign_keys=[from_door_id])
    to_door = relationship("YardDoor", foreign_keys=[to_door_id])
    current_location = relationship("Location")


class OpportunisticRule(Base):
    __tablename__ = "crossdock_opportunistic_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rule_type = Column(String(30), nullable=False)  # High Priority Backorder|Zero Stock Item
    description = Column(String(250), nullable=True)
    status = Column(String(20), default="Active")  # Active|Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
