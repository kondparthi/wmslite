"""
3PL Billing's 7 tabs. Customer Master, Rate Cards, Charge Rules and Storage
Billing are plain generic CRUD (same pattern as Labor Management — no
inventory side effects). The bespoke piece is billing itself:

  TransactionalCharge  POST computes total = qty * rate server-side and
                        auto-generates txn_code, so a charge can never be
                        entered with a total that doesn't match qty/rate.
  Invoice.generate-batch  rolls up each customer's un-invoiced charges
                        (grouped by activity) into a new Invoice + lines,
                        and marks the source charges as invoiced — the same
                        "roll real activity into a header" idea as
                        Outbound's Wave picking up eligible orders.

Revenue Analytics (the 7th tab) needs no router of its own — the frontend
derives it from invoices/charges already exposed here.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import billing_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import billing_ops as s

router = APIRouter()

# ---- Generic CRUD: Customers, Rate Cards, Charge Rules, Storage Billing ----
router.include_router(make_crud_router(
    model=m.BillingCustomer, create_schema=s.BillingCustomerCreate, update_schema=s.BillingCustomerUpdate,
    read_schema=s.BillingCustomerRead, prefix="/billing-customers", tag="Billing Customer",
))
router.include_router(make_crud_router(
    model=m.RateCard, create_schema=s.RateCardCreate, update_schema=s.RateCardUpdate,
    read_schema=s.RateCardRead, prefix="/billing-rate-cards", tag="Rate Card",
))
router.include_router(make_crud_router(
    model=m.ChargeRule, create_schema=s.ChargeRuleCreate, update_schema=s.ChargeRuleUpdate,
    read_schema=s.ChargeRuleRead, prefix="/billing-charge-rules", tag="Charge Rule",
))
router.include_router(make_crud_router(
    model=m.StorageBillingRecord, create_schema=s.StorageBillingRecordCreate, update_schema=s.StorageBillingRecordUpdate,
    read_schema=s.StorageBillingRecordRead, prefix="/billing-storage-records", tag="Storage Billing Record",
))


def _next_number(db: Session, model_cls, column, prefix: str, pad: int = 4) -> str:
    last = db.query(model_cls).order_by(model_cls.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{str(n).zfill(pad)}"


# ================= Transactional Charges =================
charge_router = APIRouter(prefix="/billing-charges", tags=["Transactional Charge"])


@charge_router.get("/", response_model=list[s.TransactionalChargeRead])
def list_charges(
    customer_id: int | None = Query(None),
    invoiced: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(m.TransactionalCharge)
    if customer_id is not None:
        q = q.filter(m.TransactionalCharge.customer_id == customer_id)
    if invoiced is True:
        q = q.filter(m.TransactionalCharge.invoice_id.isnot(None))
    elif invoiced is False:
        q = q.filter(m.TransactionalCharge.invoice_id.is_(None))
    return q.order_by(m.TransactionalCharge.id.desc()).limit(500).all()


@charge_router.post("/", response_model=s.TransactionalChargeRead, status_code=201)
def create_charge(payload: s.TransactionalChargeCreate, db: Session = Depends(get_db)):
    customer = db.get(m.BillingCustomer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    txn_code = _next_number(db, m.TransactionalCharge, "txn_code", "TXN", pad=6)
    data = payload.model_dump()
    occurred_at = data.pop("occurred_at", None) or datetime.utcnow()
    charge = m.TransactionalCharge(
        txn_code=txn_code,
        total=(payload.qty or 0) * (payload.rate or 0),
        occurred_at=occurred_at,
        **data,
    )
    db.add(charge)
    db.commit()
    db.refresh(charge)
    return charge


@charge_router.delete("/{charge_id}", status_code=204)
def delete_charge(charge_id: int, db: Session = Depends(get_db)):
    charge = db.get(m.TransactionalCharge, charge_id)
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    if charge.invoice_id is not None:
        raise HTTPException(status_code=400, detail="An already-invoiced charge can't be deleted.")
    db.delete(charge)
    db.commit()
    return None


# ================= Invoices =================
invoice_router = APIRouter(prefix="/billing-invoices", tags=["Invoice"])


@invoice_router.get("/", response_model=list[s.InvoiceRead])
def list_invoices(customer_id: int | None = Query(None), status: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.Invoice)
    if customer_id is not None:
        q = q.filter(m.Invoice.customer_id == customer_id)
    if status:
        q = q.filter(m.Invoice.status == status)
    return q.order_by(m.Invoice.id.desc()).limit(300).all()


@invoice_router.get("/{invoice_id}", response_model=s.InvoiceRead)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.get(m.Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@invoice_router.patch("/{invoice_id}", response_model=s.InvoiceRead)
def update_invoice(invoice_id: int, payload: s.InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.get(m.Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(invoice, k, v)
    db.commit()
    db.refresh(invoice)
    return invoice


@invoice_router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.get(m.Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status not in ("Draft",):
        raise HTTPException(status_code=400, detail="Only a Draft invoice can be deleted — its charges would need re-releasing first.")
    db.query(m.TransactionalCharge).filter(m.TransactionalCharge.invoice_id == invoice_id).update({"invoice_id": None})
    db.delete(invoice)
    db.commit()
    return None


@invoice_router.post("/generate-batch", response_model=list[s.InvoiceRead], status_code=201)
def generate_batch(payload: s.GenerateBatchRequest, db: Session = Depends(get_db)):
    """Rolls up each customer's un-invoiced TransactionalCharge rows,
    grouped by activity, into one new Invoice with one line per activity —
    then marks those charges as invoiced so a second run never double-bills
    them."""
    q = db.query(m.TransactionalCharge).filter(m.TransactionalCharge.invoice_id.is_(None))
    if payload.customer_ids:
        q = q.filter(m.TransactionalCharge.customer_id.in_(payload.customer_ids))
    open_charges = q.all()

    by_customer: dict[int, list[m.TransactionalCharge]] = {}
    for charge in open_charges:
        by_customer.setdefault(charge.customer_id, []).append(charge)

    created: list[m.Invoice] = []
    for customer_id, charges in by_customer.items():
        by_activity: dict[str, list[m.TransactionalCharge]] = {}
        for c in charges:
            by_activity.setdefault(c.activity, []).append(c)

        invoice_number = _next_number(db, m.Invoice, "invoice_number", "INV-2026", pad=4)
        invoice = m.Invoice(
            invoice_number=invoice_number,
            customer_id=customer_id,
            period_label=payload.period_label,
            issued_date=payload.issued_date or datetime.utcnow(),
            due_date=payload.due_date,
            status="Draft",
        )
        db.add(invoice)
        db.flush()

        for activity, rows in by_activity.items():
            total_qty = sum(r.qty for r in rows)
            total_amount = sum(r.total for r in rows)
            db.add(m.InvoiceLine(invoice_id=invoice.id, description=activity, qty=total_qty, amount=total_amount))
            for r in rows:
                r.invoice_id = invoice.id

        created.append(invoice)

    db.commit()
    for inv in created:
        db.refresh(inv)
    return created


# ================= Invoice Lines =================
invoice_line_router = APIRouter(prefix="/billing-invoice-lines", tags=["Invoice Line"])


@invoice_line_router.get("/", response_model=list[s.InvoiceLineRead])
def list_invoice_lines(invoice_id: int | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(m.InvoiceLine)
    if invoice_id is not None:
        q = q.filter(m.InvoiceLine.invoice_id == invoice_id)
    return q.order_by(m.InvoiceLine.id).limit(500).all()
