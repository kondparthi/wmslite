"""
Shipping Execution's 6 tabs. This module deliberately does NOT create a
second Shipment table — the Shipments tab is the exact same row Outbound's
own Ship tab writes (app/models/outbound_ops.py::Shipment), just read and
advanced by more endpoints (label printing, manifest assignment). Carrier
Integration likewise extends the existing Master Data Carrier row
(app/models/master_data.py::Carrier) rather than forking a second carrier
list that Outbound's order.carrier_id and this module would disagree about.

What IS new here:

  Manifest        a carrier pickup batch. Shipment count/weight/packages are
                  computed by querying Shipment.manifest_id rather than
                  stored on the Manifest row, so closing a manifest can never
                  leave a stale total if a shipment is reassigned afterward.
  CarrierRate     a per-carrier, per-service rate table. "Get Rates" (Rate
                  Shopping tab, app/routers/shipping_ops.py) computes
                  base_rate + per_kg_rate * weight from these real rows
                  instead of returning fabricated numbers.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Manifest(Base):
    __tablename__ = "shipping_manifests"

    id = Column(Integer, primary_key=True, index=True)
    manifest_number = Column(String(30), unique=True, nullable=False, index=True)  # e.g. MFT-2026-001
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=False)
    status = Column(String(20), default="Open")  # Open | Closed
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    carrier = relationship("Carrier")


class CarrierRate(Base):
    __tablename__ = "shipping_carrier_rates"

    id = Column(Integer, primary_key=True, index=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=False)
    service = Column(String(30), nullable=False)  # e.g. Express, Standard, Economy
    base_rate = Column(Float, default=0)
    per_kg_rate = Column(Float, default=0)
    transit_days = Column(String(20), nullable=True)  # e.g. "1 Day", "2-3 Days"
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    carrier = relationship("Carrier")
