"""
Replenishment's 5 tabs.

Only one genuinely new entity: ReplenishmentTask (the pick-face-to-storage
move itself). "Replenishment Rules" is NOT forked here — it's Master
Data's existing `ReplenishmentRule` table (material_id + optional
location_id + min/max/reorder_point, scoped to Min/Max only per the
client), reused as-is via its existing CRUD endpoint
(/master-data/replenishment-rules). The Trigger Monitor tab is not a
stored table at all — it's a live comparison of each active rule's
threshold against Inventory's real `InventoryBalance.on_hand` at that
rule's location, computed fresh on every call.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReplenishmentTask(Base):
    __tablename__ = "replenishment_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_number = Column(String(30), unique=True, nullable=False, index=True)
    rule_id = Column(Integer, ForeignKey("replenishment_rules.id"), nullable=True)  # null for a manually created task
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    qty_required = Column(Float, nullable=False)
    qty_assigned = Column(Float, nullable=False, default=0)
    priority = Column(String(20), default="Medium")  # Critical | High | Medium | Low
    assignee = Column(String(100), nullable=True)
    status = Column(String(20), default="Pending")  # Pending | Ready | In Progress | On Hold | Completed | Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    rule = relationship("ReplenishmentRule")
    material = relationship("Material")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
