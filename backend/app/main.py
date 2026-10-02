"""
WMS Lite backend — FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000

Interactive API docs: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import (
    CORS_ORIGINS,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_TENANT_ID,
)
from app.core.auto_migrate import add_missing_columns
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.core.seed_demo_data import (
    seed_billing_demo_data, seed_demo_data, seed_labor_demo_data, seed_outbound_demo_data, seed_shipping_demo_data,
    seed_yard_demo_data, seed_slotting_demo_data, seed_returns_demo_data, seed_crossdock_demo_data,
    seed_replenishment_demo_data, seed_notification_demo_data, seed_admin_config_demo_data,
    seed_barcode_config_demo_data, seed_digital_twin_demo_data,
)
from app.models.auth import User
from app.routers import auth, billing_ops, inbound_ops, inventory_ops, labor_ops, label_ops, master_data, operations, outbound_ops, shipping_ops, yard_ops, slotting_ops, returns_ops, crossdock_ops, replenishment_ops, notification_ops, admin_config

# Import all models so they're registered on Base before create_all runs.
from app.models import master_data as _master_data_models  # noqa: F401
from app.models import operations as _operations_models  # noqa: F401
from app.models import inbound_ops as _inbound_ops_models  # noqa: F401
from app.models import outbound_ops as _outbound_ops_models  # noqa: F401
from app.models import labor_ops as _labor_ops_models  # noqa: F401
from app.models import billing_ops as _billing_ops_models  # noqa: F401
from app.models import shipping_ops as _shipping_ops_models  # noqa: F401
from app.models import yard_ops as _yard_ops_models  # noqa: F401
from app.models import slotting_ops as _slotting_ops_models  # noqa: F401
from app.models import returns_ops as _returns_ops_models  # noqa: F401
from app.models import crossdock_ops as _crossdock_ops_models  # noqa: F401
from app.models import replenishment_ops as _replenishment_ops_models  # noqa: F401
from app.models import notification_ops as _notification_ops_models  # noqa: F401
from app.models import admin_config as _admin_config_models  # noqa: F401

# Create tables on startup if they don't exist yet (dev convenience; for
# production migrations, use Alembic instead of relying on this).
Base.metadata.create_all(bind=engine)

# Schema changes on tables that may already exist from an earlier version of
# this backend (see app/core/auto_migrate.py for what this can and can't do).
add_missing_columns(engine, "inventory_balances", {"on_hold": "FLOAT DEFAULT 0"})
add_missing_columns(engine, "carriers", {
    "api_status": "VARCHAR(20) DEFAULT 'Disconnected'",
    "account_no": "VARCHAR(50)",
    "label_format": "VARCHAR(30)",
    "tracking_url_template": "VARCHAR(255)",
    "services": "VARCHAR(255)",
    "active": "BOOLEAN DEFAULT 1",
})
add_missing_columns(engine, "shipments", {
    "manifest_id": "INTEGER",
    "tracking_no": "VARCHAR(40)",
    "label_printed": "BOOLEAN DEFAULT 0",
    "service": "VARCHAR(30)",
    "pkgs": "INTEGER DEFAULT 1",
    "eta": "DATETIME",
})
# Admin Configuration additive columns (see app/models/admin_config.py).
add_missing_columns(engine, "users", {
    "warehouse_id": "INTEGER",
    "shift_id": "INTEGER",
    "mfa_enabled": "BOOLEAN DEFAULT 0",
    "locked": "BOOLEAN DEFAULT 0",
    "last_login_at": "DATETIME",
})
add_missing_columns(engine, "zones_areas", {
    "warehouse_id": "INTEGER",
    "pick_priority": "VARCHAR(10) DEFAULT 'Medium'",
})
add_missing_columns(engine, "yard_doors", {
    "warehouse_id": "INTEGER",
    "load_type": "VARCHAR(20)",
    "dimensions": "VARCHAR(60)",
    "direction": "VARCHAR(20) DEFAULT 'Inbound'",
})
add_missing_columns(engine, "material_owners", {
    "type": "VARCHAR(30) DEFAULT 'Internal'",
    "country": "VARCHAR(100)",
})
# Inbound Label Generation additive columns (see app/routers/label_ops.py).
add_missing_columns(engine, "inbound_receipts", {
    "label_printed": "BOOLEAN DEFAULT 0",
    "print_count": "INTEGER DEFAULT 0",
})
add_missing_columns(engine, "putaway_tasks", {
    "label_printed": "BOOLEAN DEFAULT 0",
    "print_count": "INTEGER DEFAULT 0",
})


def _seed_default_admin() -> None:
    """Create one admin login on first run so the client can sign in
    immediately, without anyone touching the database by hand."""
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(
                tenant_id=DEFAULT_TENANT_ID,
                username=DEFAULT_ADMIN_USERNAME,
                email=DEFAULT_ADMIN_EMAIL,
                full_name="Admin",
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                role="Administrator",
                status="Active",
            ))
            db.commit()
    finally:
        db.close()


_seed_default_admin()
seed_demo_data()
seed_outbound_demo_data()
seed_labor_demo_data()
seed_billing_demo_data()
seed_shipping_demo_data()
seed_yard_demo_data()
seed_slotting_demo_data()
seed_returns_demo_data()
seed_crossdock_demo_data()
seed_replenishment_demo_data()
seed_notification_demo_data()
seed_admin_config_demo_data()
seed_barcode_config_demo_data()
seed_digital_twin_demo_data()

app = FastAPI(
    title="WMS Lite API",
    description="Backend API for Delaplex WMS Lite — Master Data, Inventory, Inbound and beyond.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(master_data.router, prefix="/api/master-data")
app.include_router(operations.router, prefix="/api/operations")
app.include_router(operations.dashboard_router, prefix="/api")
app.include_router(inventory_ops.router, prefix="/api/operations")
app.include_router(inbound_ops.router, prefix="/api/operations")
app.include_router(inbound_ops.receipt_router, prefix="/api/operations")
app.include_router(inbound_ops.task_router, prefix="/api/operations")
app.include_router(label_ops.receiving_labels_router, prefix="/api/operations")
app.include_router(label_ops.putaway_labels_router, prefix="/api/operations")
app.include_router(operations.digital_twin_router, prefix="/api/operations")
app.include_router(outbound_ops.router, prefix="/api/operations")
app.include_router(outbound_ops.order_router, prefix="/api/operations")
app.include_router(outbound_ops.line_router, prefix="/api/operations")
app.include_router(outbound_ops.alloc_router, prefix="/api/operations")
app.include_router(outbound_ops.wave_router, prefix="/api/operations")
app.include_router(outbound_ops.pick_router, prefix="/api/operations")
app.include_router(outbound_ops.load_router, prefix="/api/operations")
app.include_router(outbound_ops.pack_router, prefix="/api/operations")
app.include_router(outbound_ops.ship_router, prefix="/api/operations")
app.include_router(labor_ops.router, prefix="/api/operations")
app.include_router(billing_ops.router, prefix="/api/operations")
app.include_router(billing_ops.charge_router, prefix="/api/operations")
app.include_router(billing_ops.invoice_router, prefix="/api/operations")
app.include_router(billing_ops.invoice_line_router, prefix="/api/operations")
app.include_router(shipping_ops.router, prefix="/api/operations")
app.include_router(shipping_ops.manifest_router, prefix="/api/operations")
app.include_router(shipping_ops.execution_router, prefix="/api/operations")
app.include_router(yard_ops.checkin_router, prefix="/api/operations")
app.include_router(yard_ops.zone_router, prefix="/api/operations")
app.include_router(yard_ops.door_router, prefix="/api/operations")
app.include_router(yard_ops.move_router, prefix="/api/operations")
app.include_router(yard_ops.report_router, prefix="/api/operations")
app.include_router(slotting_ops.strategy_crud, prefix="/api/operations")
app.include_router(slotting_ops.simulation_router, prefix="/api/operations")
app.include_router(slotting_ops.velocity_router, prefix="/api/operations")
app.include_router(slotting_ops.utilization_router, prefix="/api/operations")
app.include_router(slotting_ops.reslotting_router, prefix="/api/operations")
app.include_router(slotting_ops.report_router, prefix="/api/operations")
app.include_router(returns_ops.rma_router, prefix="/api/operations")
app.include_router(returns_ops.inspection_router, prefix="/api/operations")
app.include_router(returns_ops.disposition_router, prefix="/api/operations")
app.include_router(returns_ops.adjustment_router, prefix="/api/operations")
app.include_router(returns_ops.report_router, prefix="/api/operations")
app.include_router(crossdock_ops.plan_router, prefix="/api/operations")
app.include_router(crossdock_ops.task_router, prefix="/api/operations")
app.include_router(crossdock_ops.rule_router, prefix="/api/operations")
app.include_router(crossdock_ops.staging_router, prefix="/api/operations")
app.include_router(crossdock_ops.report_router, prefix="/api/operations")
app.include_router(replenishment_ops.task_router, prefix="/api/operations")
app.include_router(replenishment_ops.trigger_router, prefix="/api/operations")
app.include_router(replenishment_ops.report_router, prefix="/api/operations")
app.include_router(notification_ops.rule_router, prefix="/api/operations")
app.include_router(notification_ops.channel_router, prefix="/api/operations")
app.include_router(notification_ops.escalation_router, prefix="/api/operations")
app.include_router(notification_ops.digest_router, prefix="/api/operations")
app.include_router(notification_ops.log_router, prefix="/api/operations")
app.include_router(notification_ops.report_router, prefix="/api/operations")
app.include_router(admin_config.users_router, prefix="/api")
app.include_router(admin_config.roles_router, prefix="/api")
app.include_router(admin_config.shifts_router, prefix="/api")
app.include_router(admin_config.loginhistory_router, prefix="/api")
app.include_router(admin_config.warehouses_router, prefix="/api")
app.include_router(admin_config.zones_router, prefix="/api")
app.include_router(admin_config.docks_router, prefix="/api")
app.include_router(admin_config.aisles_router, prefix="/api")
app.include_router(admin_config.settings_router, prefix="/api")
app.include_router(admin_config.branding_router, prefix="/api")
app.include_router(admin_config.moduletoggle_router, prefix="/api")
app.include_router(admin_config.numbering_router, prefix="/api")
app.include_router(admin_config.connectors_router, prefix="/api")
app.include_router(admin_config.synclog_router, prefix="/api")
app.include_router(admin_config.webhooks_router, prefix="/api")
app.include_router(admin_config.apikeys_router, prefix="/api")
app.include_router(admin_config.languages_router, prefix="/api")
app.include_router(admin_config.datetime_router, prefix="/api")
app.include_router(admin_config.currencies_router, prefix="/api")
app.include_router(admin_config.addressformats_router, prefix="/api")
app.include_router(admin_config.translations_router, prefix="/api")
app.include_router(admin_config.auditlog_router, prefix="/api")
app.include_router(admin_config.compliance_router, prefix="/api")
app.include_router(admin_config.dataclass_router, prefix="/api")
app.include_router(admin_config.secpolicy_router, prefix="/api")
app.include_router(admin_config.materialtypes_router, prefix="/api")
app.include_router(admin_config.uom_router, prefix="/api")
app.include_router(admin_config.packkey_router, prefix="/api")
app.include_router(admin_config.owners_router, prefix="/api")
app.include_router(admin_config.categories_router, prefix="/api")
app.include_router(admin_config.barcodeconfigs_router, prefix="/api")
app.include_router(admin_config.notiftemplates_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "wms-lite-backend"}
