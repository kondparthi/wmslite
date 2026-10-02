"""
SQLAlchemy models for the 3PL Billing module's 7 tabs.

Most of this module is configuration (customers, rate cards, charge rules),
so those stay plain generic CRUD like Labor Management. The one genuine
workflow is billing itself:

  TransactionalCharge   a billable event (Outbound Pick, VAS Kitting, a
                        Storage Billing pallet-day, ...), qty x rate = total,
                        computed server-side at creation so it can never
                        drift from what was actually billed
    -> Invoice + lines  "Generate Batch" (app/routers/billing_ops.py)
                        rolls up a customer's un-invoiced charges into a
                        new Invoice, grouped by activity, and marks those
                        charges as invoiced — the same "roll real activity
                        into a header" idea as Outbound's Wave picking up
                        eligible orders.

StorageBillingRecord is kept as its own ledger (rather than forcing every
pallet-day into a TransactionalCharge) because the Storage Billing tab's
table (customer/zone/pallets/days/rate) is its own unit of entry in the
mock; its total is computed on the frontend (pallets x rate x days/30)
rather than stored, so a rate-card correction never leaves a stale total
in the database.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class BillingCustomer(Base):
    __tablename__ = "billing_customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. CUST001
    name = Column(String(150), nullable=False)
    contact_name = Column(String(100), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    billing_cycle = Column(String(20), default="Monthly")  # Monthly|Bi-Weekly|Weekly
    currency = Column(String(10), default="USD")
    payment_terms_days = Column(Integer, default=30)
    tax_id = Column(String(50), nullable=True)
    invoice_delivery = Column(String(20), default="Email")  # Email|Portal|Both
    contract_type = Column(String(20), default="Standard")  # Standard|Premium|Enterprise
    rate_card_id = Column(Integer, ForeignKey("billing_rate_cards.id"), nullable=True)
    contract_start = Column(DateTime, nullable=True)
    contract_end = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, default=False)
    status = Column(String(20), default="Active")  # Active|Inactive|Review
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RateCard(Base):
    __tablename__ = "billing_rate_cards"

    id = Column(Integer, primary_key=True, index=True)
    rate_card_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. RC-001
    name = Column(String(150), nullable=False)
    category = Column(String(20), nullable=False)  # Storage|Handling|VAS|Returns
    rate = Column(Float, default=0)
    unit_of_measure = Column(String(50), nullable=True)  # e.g. "Pallet/Month"
    min_qty = Column(Float, default=0)
    applicable_scope = Column(String(20), default="All")  # All|Specific
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="Enabled")  # Enabled|Disabled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChargeRule(Base):
    __tablename__ = "billing_charge_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. CR-001
    name = Column(String(150), nullable=False)
    trigger_event = Column(String(30), nullable=False)  # Daily EOD|Outbound Order|Inbound Receipt|Month End|VAS Complete
    calc_basis = Column(String(30), nullable=False)  # Location Volume|Per Pallet|Per Unit|Per Order|Flat Amount
    rate_amount = Column(Float, default=0)
    rate_card_id = Column(Integer, ForeignKey("billing_rate_cards.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("billing_customers.id"), nullable=True)  # null = All Customers
    priority = Column(Integer, default=1)
    status = Column(String(20), default="Enabled")  # Enabled|Disabled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TransactionalCharge(Base):
    __tablename__ = "billing_transactional_charges"

    id = Column(Integer, primary_key=True, index=True)
    txn_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. TXN-004821
    customer_id = Column(Integer, ForeignKey("billing_customers.id"), nullable=False)
    category = Column(String(20), default="Handling")  # Storage|Handling|VAS|Returns|Other
    activity = Column(String(50), nullable=False)  # e.g. "Outbound Pick"
    qty = Column(Float, default=0)
    unit = Column(String(20), nullable=True)  # Units|Pallets|Orders
    rate = Column(Float, default=0)
    total = Column(Float, default=0)  # qty * rate, computed at creation
    linked_reference = Column(String(30), nullable=True)  # e.g. "ORD-2291"
    charge_rule_id = Column(Integer, ForeignKey("billing_charge_rules.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("billing_invoices.id"), nullable=True)  # set once billed
    occurred_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class StorageBillingRecord(Base):
    __tablename__ = "billing_storage_records"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("billing_customers.id"), nullable=False)
    zone = Column(String(50), nullable=True)
    pallets = Column(Float, default=0)
    days = Column(Integer, default=30)
    rate_card_id = Column(Integer, ForeignKey("billing_rate_cards.id"), nullable=True)
    rate = Column(Float, default=0)  # copied from the rate card at entry time
    period_label = Column(String(20), nullable=True)  # e.g. "Nov 2026"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "billing_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(30), unique=True, nullable=False, index=True)  # e.g. INV-2026-0001
    customer_id = Column(Integer, ForeignKey("billing_customers.id"), nullable=False)
    period_label = Column(String(20), nullable=True)
    issued_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="Draft")  # Draft|Unpaid|Paid|Overdue
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "billing_invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("billing_invoices.id"), nullable=False)
    description = Column(String(150), nullable=False)
    qty = Column(Float, default=1)
    amount = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="lines")
