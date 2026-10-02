"""
Dynamic Slotting's 5 tabs. Velocity Analysis, Storage Utilization and the
"misplaced SKU" detection behind Re-slotting Tasks all read off entities
other modules already own — Master Data's Material/Location/ZoneArea/
AssignedLocation and Inventory's InventoryBalance/InventoryTransaction —
rather than forking a second pick-history or slot-assignment table. A
"pick" is the same InventoryTransaction(txn_type="Shipment") row Outbound's
own pick-confirm step already writes; this module only aggregates it.

What IS new here, because nothing upstream models a slotting rule or a
physical relocation task:

  SlottingStrategy    a named rule (base logic + target zones) a simulation
                      can be run against.
  SlottingSimulation  one run of a strategy: counts today's misplaced SKUs
                      (see _misplaced_materials in the router) and reports
                      a real efficiency/labor estimate derived from that
                      count — never a fixed, fabricated number. Applying it
                      creates the ReslottingTask rows.
  ReslottingTask      a suggested from->to move for one SKU. Completing one
                      actually updates that SKU's AssignedLocation and
                      InventoryBalance row, same "roll activity into a real
                      state change" idea as Shipping's Manifest.close.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class SlottingStrategy(Base):
    __tablename__ = "slotting_strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    base_logic = Column(String(30), default="Velocity-Based")  # Velocity-Based | Volume-Based | Product Affinity | Hazard Class
    lookback_days = Column(Integer, default=90)
    target_zones = Column(String(150), nullable=True)  # comma-separated zone codes, e.g. "ZONE-A,ZONE-B"
    status = Column(String(20), default="Active")  # Active | Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SlottingSimulation(Base):
    __tablename__ = "slotting_simulations"

    id = Column(Integer, primary_key=True, index=True)
    sim_number = Column(String(20), unique=True, nullable=False, index=True)
    strategy_id = Column(Integer, ForeignKey("slotting_strategies.id"), nullable=False)
    misplaced_count = Column(Integer, default=0)
    efficiency_gain_pct = Column(Float, default=0)
    labor_saving_hours = Column(Float, default=0)
    status = Column(String(20), default="Completed")  # Completed | Applied
    created_at = Column(DateTime, default=datetime.utcnow)
    applied_at = Column(DateTime, nullable=True)

    strategy = relationship("SlottingStrategy")


class ReslottingTask(Base):
    __tablename__ = "reslotting_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_number = Column(String(20), unique=True, nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    reason = Column(String(30), nullable=False)  # Velocity Inc. | Velocity Dec. | Consolidation
    priority = Column(String(10), default="Med")  # High | Med | Low
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Ready")  # Ready | Assigned | Completed
    simulation_id = Column(Integer, ForeignKey("slotting_simulations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    material = relationship("Material")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
