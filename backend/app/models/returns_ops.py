"""
Returns / RMA's 6 tabs. RMARequest, InspectionRecord and Disposition are
genuinely new entities — nothing existing models a customer return, a
grading/inspection step, or a disposition decision. The Inventory
Adjustment tab, by contrast, reuses Inventory's existing
InventoryTransaction ledger directly (txn_type Receipt/Adjustment/Transfer
already fit the mock's ADJ-R-* rows one-for-one) rather than forking a
second adjustment table — same "reuse, don't fork" principle as every
other module in this build.

order_reference is a plain string (the real ShipmentOrder.order_number
when the return is tied to a real outbound order) rather than a hard FK:
plenty of real-world RMAs (vendor recalls, expired product found in a
cycle count) have no originating sales order at all, so a nullable
free-text reference is the more accurate model, and it's still enough to
join back to ShipmentOrder for the Returns Rate report metric.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class RMARequest(Base):
    __tablename__ = "rma_requests"

    id = Column(Integer, primary_key=True, index=True)
    rma_number = Column(String(20), unique=True, nullable=False, index=True)
    order_reference = Column(String(30), nullable=True)  # ShipmentOrder.order_number, free-text
    customer = Column(String(150), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False)
    reason = Column(String(30), nullable=False)  # Defective|Wrong Item|Damaged|Not Described|Expired|Other
    return_type = Column(String(30), default="Customer Return")  # Customer Return|Carrier Damage|Vendor Recall|Expired Product
    priority = Column(String(10), default="Medium")  # High|Medium|Low
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Pending Approval")
    # Pending Approval -> Approved -> In Transit -> Received -> Inspection -> Closed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    received_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    material = relationship("Material")


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    inspection_number = Column(String(20), unique=True, nullable=False, index=True)
    rma_id = Column(Integer, ForeignKey("rma_requests.id"), nullable=False)
    qty_received = Column(Float, nullable=False)
    qty_inspected = Column(Float, default=0)
    grade = Column(String(30), nullable=True)  # A - Resellable|B - Refurbishable|C - Scrap
    inspector = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="Pending")  # Pending|Graded|Approved
    created_at = Column(DateTime, default=datetime.utcnow)
    inspected_at = Column(DateTime, nullable=True)

    rma = relationship("RMARequest")


class Disposition(Base):
    __tablename__ = "dispositions"

    id = Column(Integer, primary_key=True, index=True)
    disposition_number = Column(String(20), unique=True, nullable=False, index=True)
    rma_id = Column(Integer, ForeignKey("rma_requests.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspection_records.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty = Column(Float, nullable=False)
    action = Column(String(30), nullable=False)  # Return to Stock|Repair & Relist|Dispose / Destroy|Vendor Return
    target_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    status = Column(String(20), default="Pending")  # Pending|In Progress|Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    # set once the Inventory Adjustment tab actually posts the InventoryTransaction
    posted_txn_id = Column(Integer, ForeignKey("inventory_transactions.id"), nullable=True)

    rma = relationship("RMARequest")
    inspection = relationship("InspectionRecord")
    material = relationship("Material")
    target_location = relationship("Location")
