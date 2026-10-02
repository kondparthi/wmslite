"""
Yard Management's 5 tabs. Unlike Shipping Execution, this is a genuinely new
domain — nothing upstream already models a trailer sitting at the gate or a
dock door's occupancy — so all three entities here are new tables rather
than extensions of an existing one. Carrier Integration already lives on
Master Data's Carrier row (app/models/master_data.py::Carrier), so
YardCheckIn only references it by carrier_id.

  YardCheckIn   one trailer's gate-to-departure lifecycle: At Gate -> Checked
                In (assigned a yard zone) -> Inspected -> Departed. Dwell
                time (for the aging report) and turnaround time (for carrier
                performance) are both derived from checked_in_at/
                checked_out_at at read time, never stored, so they can't go
                stale.
  YardDoor      a physical dock door. Assigning a check-in occupies it;
                releasing frees it. Seeded with a fixed set of door codes —
                doors aren't created/deleted through the app, matching the
                mock's fixed D1..D4 grid.
  YardMove      a shunter (internal yard-move) task tied to one check-in,
                dispatched then completed; completing a move updates that
                check-in's zone for real, same "roll a real state change
                into a header" idea as Shipping's Manifest.close.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class YardCheckIn(Base):
    __tablename__ = "yard_checkins"

    id = Column(Integer, primary_key=True, index=True)
    pass_id = Column(String(20), unique=True, nullable=False, index=True)
    trailer_number = Column(String(30), nullable=False)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)
    transaction_type = Column(String(30), default="Inbound Load")  # Inbound Load | Outbound Empty | Drop Trailer
    seal_number = Column(String(30), nullable=True)
    status = Column(String(20), default="At Gate")  # At Gate | Checked In | Inspected | Departed
    zone = Column(String(40), nullable=True)
    checked_in_at = Column(DateTime, default=datetime.utcnow)
    checked_out_at = Column(DateTime, nullable=True)

    carrier = relationship("Carrier")


class YardDoor(Base):
    __tablename__ = "yard_doors"

    id = Column(Integer, primary_key=True, index=True)
    door_code = Column(String(10), unique=True, nullable=False, index=True)
    status = Column(String(20), default="Empty")  # Empty | Occupied | Reserved
    checkin_id = Column(Integer, ForeignKey("yard_checkins.id"), nullable=True)
    task_type = Column(String(30), nullable=True)  # Unloading | Outbound Load
    progress = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Admin Configuration's Warehouse Config tab (app/routers/admin_config.py)
    warehouse_id = Column(Integer, ForeignKey("admin_warehouses.id"), nullable=True)
    load_type = Column(String(20), nullable=True)  # FTL | LTL | Both
    dimensions = Column(String(60), nullable=True)
    direction = Column(String(20), default="Inbound")  # Inbound | Outbound | Inbound/Outbound

    checkin = relationship("YardCheckIn")


class YardMove(Base):
    __tablename__ = "yard_moves"

    id = Column(Integer, primary_key=True, index=True)
    move_number = Column(String(20), unique=True, nullable=False, index=True)
    checkin_id = Column(Integer, ForeignKey("yard_checkins.id"), nullable=False)
    from_location = Column(String(40), nullable=False)
    to_location = Column(String(40), nullable=False)
    priority = Column(String(10), default="Normal")  # Urgent | Normal
    status = Column(String(20), default="Pending")  # Pending | In Route | Completed
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    checkin = relationship("YardCheckIn")
