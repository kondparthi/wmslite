from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Billing Customer ----
class BillingCustomerBase(BaseModel):
    customer_code: str
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    billing_cycle: str = "Monthly"
    currency: str = "USD"
    payment_terms_days: int = 30
    tax_id: Optional[str] = None
    invoice_delivery: str = "Email"
    contract_type: str = "Standard"
    rate_card_id: Optional[int] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    auto_renew: bool = False
    status: str = "Active"


class BillingCustomerCreate(BillingCustomerBase):
    pass


class BillingCustomerUpdate(BaseModel):
    customer_code: Optional[str] = None
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    billing_cycle: Optional[str] = None
    currency: Optional[str] = None
    payment_terms_days: Optional[int] = None
    tax_id: Optional[str] = None
    invoice_delivery: Optional[str] = None
    contract_type: Optional[str] = None
    rate_card_id: Optional[int] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    auto_renew: Optional[bool] = None
    status: Optional[str] = None


class BillingCustomerRead(BillingCustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Rate Card ----
class RateCardBase(BaseModel):
    rate_card_code: str
    name: str
    category: str
    rate: float = 0
    unit_of_measure: Optional[str] = None
    min_qty: float = 0
    applicable_scope: str = "All"
    notes: Optional[str] = None
    status: str = "Enabled"


class RateCardCreate(RateCardBase):
    pass


class RateCardUpdate(BaseModel):
    rate_card_code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    rate: Optional[float] = None
    unit_of_measure: Optional[str] = None
    min_qty: Optional[float] = None
    applicable_scope: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class RateCardRead(RateCardBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Charge Rule ----
class ChargeRuleBase(BaseModel):
    rule_code: str
    name: str
    trigger_event: str
    calc_basis: str
    rate_amount: float = 0
    rate_card_id: Optional[int] = None
    customer_id: Optional[int] = None
    priority: int = 1
    status: str = "Enabled"


class ChargeRuleCreate(ChargeRuleBase):
    pass


class ChargeRuleUpdate(BaseModel):
    rule_code: Optional[str] = None
    name: Optional[str] = None
    trigger_event: Optional[str] = None
    calc_basis: Optional[str] = None
    rate_amount: Optional[float] = None
    rate_card_id: Optional[int] = None
    customer_id: Optional[int] = None
    priority: Optional[int] = None
    status: Optional[str] = None


class ChargeRuleRead(ChargeRuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Transactional Charge ----
# Note: no *Update schema — a charge is billed as-recorded and later marked
# invoiced by the batch job, not hand-edited; qty/rate/total are immutable
# once posted, same reasoning as an Outbound pick confirmation.
class TransactionalChargeBase(BaseModel):
    customer_id: int
    category: str = "Handling"
    activity: str
    qty: float = 0
    unit: Optional[str] = None
    rate: float = 0
    linked_reference: Optional[str] = None
    charge_rule_id: Optional[int] = None
    occurred_at: Optional[datetime] = None


class TransactionalChargeCreate(TransactionalChargeBase):
    pass


class TransactionalChargeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    txn_code: str
    customer_id: int
    category: str
    activity: str
    qty: float
    unit: Optional[str] = None
    rate: float
    total: float
    linked_reference: Optional[str] = None
    charge_rule_id: Optional[int] = None
    invoice_id: Optional[int] = None
    occurred_at: datetime
    created_at: datetime


# ---- Storage Billing Record ----
class StorageBillingRecordBase(BaseModel):
    customer_id: int
    zone: Optional[str] = None
    pallets: float = 0
    days: int = 30
    rate_card_id: Optional[int] = None
    rate: float = 0
    period_label: Optional[str] = None


class StorageBillingRecordCreate(StorageBillingRecordBase):
    pass


class StorageBillingRecordUpdate(BaseModel):
    customer_id: Optional[int] = None
    zone: Optional[str] = None
    pallets: Optional[float] = None
    days: Optional[int] = None
    rate_card_id: Optional[int] = None
    rate: Optional[float] = None
    period_label: Optional[str] = None


class StorageBillingRecordRead(StorageBillingRecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Invoice Line ----
class InvoiceLineBase(BaseModel):
    description: str
    qty: float = 1
    amount: float = 0


class InvoiceLineRead(InvoiceLineBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_id: int


# ---- Invoice ----
class InvoiceBase(BaseModel):
    customer_id: int
    period_label: Optional[str] = None
    issued_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: str = "Draft"


class InvoiceUpdate(BaseModel):
    period_label: Optional[str] = None
    issued_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None


class InvoiceRead(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_number: str
    created_at: datetime
    updated_at: datetime
    lines: list[InvoiceLineRead] = []


class GenerateBatchRequest(BaseModel):
    customer_ids: Optional[list[int]] = None
    period_label: str
    issued_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
