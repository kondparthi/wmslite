"""
Admin Configuration's 8 tabs — the last of the 15 modules.

Reuse-first decisions (see main.py's add_missing_columns calls for the
columns added to existing tables rather than forking new ones):
  - Users & Roles reuses the real `User` (auth.py) login table directly —
    warehouse/shift/mfa/locked/last_login columns are added to it, not a
    second "AdminUser" table.
  - Warehouse Config's Zones & Areas reuses Master Data's `ZoneArea`
    (adding warehouse_id + pick_priority); Dock Doors reuses Yard
    Management's `YardDoor` (adding warehouse_id/load_type/dimensions/
    direction); Aisle/Bay/Level is not a table at all — it's `Location`
    rows grouped by (zone_id, aisle) live, with a bulk-generate action
    that creates real Location rows.
  - Master Data Config's Material Owners reuses `MaterialOwner` directly
    (adding type/country). SKU Types, UOM, Pack Key templates and
    Categories are genuinely new reference tables Material doesn't have
    today.
  - Integrations' Carrier-type connectors reference Master Data's real
    `Carrier` rows (via carrier_id) instead of duplicating carrier state.
  - The Notifications sub-tab has no new backend beyond one
    NotificationTemplate table — it reads/writes the same Rules/
    Channels/Escalation tables the standalone Notifications module uses.
  - Everything else here (Warehouse, Role, ShiftSchedule, LoginHistory,
    SystemSetting, BrandingSetting, ModuleToggle, NumberingSequence,
    IntegrationConnector/SyncLog, Webhook, ApiKey, Language,
    DateTimeProfile, Currency, AddressFormat, TranslationEntry, AuditLog,
    ComplianceReport, DataClassification, SecurityPolicy, MaterialType,
    UnitOfMeasure, PackKeyTemplate, MaterialCategory) is genuinely new —
    nothing elsewhere in the system models a warehouse record, a role
    catalog, a login attempt, or a translation string.

Scope notes, stated plainly rather than faked:
  - NumberingSequence is admin-editable configuration; other modules'
    own ID generators (`_next_number` helpers) are NOT rewired to read
    from it in this build — that would touch every module's router.
  - AuditLog is written to by Admin Config's own create/update/delete
    actions in this router (a real, working audit trail of admin
    changes), not by every action across all 15 modules — a
    system-wide audit hook is a larger cross-cutting change out of
    scope here.
  - Compliance Reports are admin-recorded results (create/edit), not an
    automated compliance scanner — nothing in this codebase scans for
    GDPR/SOC2/PCI findings, so nothing here pretends to.
  - Integration "Sync Now" and Webhook "Test" do not reach any real
    external system (the connectors/URLs are illustrative); Sync Now for
    a Carrier-type connector computes a real record count from that
    carrier's own Shipment rows, everything else logs an honest
    zero-record no-op rather than a fabricated number.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


# ── Users & Roles ────────────────────────────────────────────────────────
class Role(Base):
    __tablename__ = "admin_roles"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    level = Column(String(30), default="Operator")  # Super Admin|Admin|Manager|Supervisor|Analyst|Operator|Viewer
    description = Column(String(300), nullable=True)
    modules = Column(String(500), default="")  # comma-separated module names this role can access
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class ShiftSchedule(Base):
    __tablename__ = "admin_shift_schedules"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(5), default="08:00")
    end_time = Column(String(5), default="16:00")
    break_minutes = Column(Integer, default=30)
    days_active = Column(String(60), default="Mon,Tue,Wed,Thu,Fri")
    status = Column(String(20), default="Active")


class LoginHistory(Base):
    __tablename__ = "admin_login_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username_attempted = Column(String(100), nullable=False)
    role = Column(String(50), nullable=True)
    ip_address = Column(String(60), nullable=True)
    device = Column(String(150), nullable=True)
    status = Column(String(20), default="Success")  # Success|Failed|Locked|Blocked
    mfa_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Warehouse Config ─────────────────────────────────────────────────────
class Warehouse(Base):
    __tablename__ = "admin_warehouses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    sqft = Column(Float, default=0)
    type = Column(String(40), default="General Purpose")
    temp_class = Column(String(30), default="Ambient")
    status = Column(String(20), default="Active")


# ── System Settings ──────────────────────────────────────────────────────
class SystemSetting(Base):
    """Single-row (per tenant) config — created once by the seed."""
    __tablename__ = "admin_system_settings"
    id = Column(Integer, primary_key=True, index=True)
    system_name = Column(String(150), default="WMS Lite")
    company_name = Column(String(150), default="Delaplex")
    default_warehouse_id = Column(Integer, ForeignKey("admin_warehouses.id"), nullable=True)
    timezone = Column(String(60), default="Asia/Kolkata")
    date_format = Column(String(30), default="DD/MM/YYYY")
    time_format = Column(String(10), default="24h")
    currency = Column(String(10), default="INR")
    fiscal_year_start = Column(String(10), default="April")
    session_timeout_minutes = Column(Integer, default=30)
    max_login_attempts = Column(Integer, default=5)
    auto_logout = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    debug_mode = Column(Boolean, default=False)
    api_rate_limit = Column(Integer, default=1000)
    data_retention_days = Column(Integer, default=365)
    backup_frequency = Column(String(20), default="Daily")


class BrandingSetting(Base):
    __tablename__ = "admin_branding_settings"
    id = Column(Integer, primary_key=True, index=True)
    primary_color = Column(String(10), default="#003A78")
    secondary_color = Column(String(10), default="#005BAA")
    accent_color = Column(String(10), default="#009FE3")
    logo_text = Column(String(60), default="WMS Lite")
    tagline = Column(String(150), default="By Delaplex")
    favicon_text = Column(String(10), default="WL")
    footer_text = Column(String(200), default="© 2026 Delaplex. All rights reserved.")
    sidebar_style = Column(String(20), default="Dark")
    font_family = Column(String(60), default="Inter")


class ModuleToggle(Base):
    __tablename__ = "admin_module_toggles"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(40), unique=True, nullable=False)
    label = Column(String(80), nullable=False)
    description = Column(String(200), nullable=True)
    enabled = Column(Boolean, default=True)
    core = Column(Boolean, default=False)


class NumberingSequence(Base):
    __tablename__ = "admin_numbering_sequences"
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(60), nullable=False)
    entity = Column(String(60), nullable=False)
    prefix = Column(String(20), default="")
    suffix = Column(String(20), default="")
    next_seq = Column(Integer, default=1)
    pad_length = Column(Integer, default=4)
    active = Column(Boolean, default=True)


# ── Integrations ─────────────────────────────────────────────────────────
class IntegrationConnector(Base):
    __tablename__ = "admin_integration_connectors"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(30), default="Custom")  # ERP|TMS|Carrier|eCommerce|Finance|Analytics|Custom
    protocol = Column(String(30), default="REST API")
    direction = Column(String(20), default="Bidirectional")  # Inbound|Outbound|Bidirectional
    sync_freq = Column(String(30), default="Hourly")
    status = Column(String(20), default="Disconnected")  # Connected|Warning|Disconnected
    last_sync_at = Column(DateTime, nullable=True)
    records = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    env = Column(String(20), default="Production")
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)  # set for type == "Carrier"
    created_at = Column(DateTime, default=datetime.utcnow)


class IntegrationSyncLog(Base):
    __tablename__ = "admin_integration_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    log_code = Column(String(20), unique=True, nullable=False, index=True)
    connector_id = Column(Integer, ForeignKey("admin_integration_connectors.id"), nullable=False)
    direction = Column(String(20), default="Outbound")
    type = Column(String(30), default="Scheduled")
    records = Column(Integer, default=0)
    status = Column(String(20), default="Success")  # Success|Partial|Failed
    started_at = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Float, default=0)
    error = Column(String(300), nullable=True)

    connector = relationship("IntegrationConnector")


class Webhook(Base):
    __tablename__ = "admin_webhooks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    url = Column(String(300), nullable=False)
    event = Column(String(100), nullable=False)
    source = Column(String(60), default="System")
    status = Column(String(20), default="Active")  # Active|Paused
    last_triggered_at = Column(DateTime, nullable=True)
    deliveries = Column(Integer, default=0)


class ApiKey(Base):
    __tablename__ = "admin_api_keys"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    scope = Column(String(30), default="Read Only")  # Read Only|Write Only|Read+Write
    created_by = Column(String(100), nullable=True)
    key_preview = Column(String(30), nullable=False)  # e.g. "wms_live_••••7F2A" — full key shown once at creation
    created_at = Column(DateTime, default=datetime.utcnow)
    expiry_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="Active")  # Active|Expired|Revoked
    last_used_at = Column(DateTime, nullable=True)


# ── Localization ──────────────────────────────────────────────────────────
class Language(Base):
    __tablename__ = "admin_languages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)
    native_name = Column(String(60), nullable=True)
    code = Column(String(10), unique=True, nullable=False)  # BCP-47, e.g. en, hi, ar
    direction = Column(String(5), default="LTR")
    is_default = Column(Boolean, default=False)
    enabled = Column(Boolean, default=True)


class DateTimeProfile(Base):
    __tablename__ = "admin_datetime_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    timezone = Column(String(60), default="Asia/Kolkata")
    date_format = Column(String(30), default="DD/MM/YYYY")
    time_format = Column(String(10), default="24h")
    week_start = Column(String(10), default="Monday")
    is_default = Column(Boolean, default=False)


class Currency(Base):
    __tablename__ = "admin_currencies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    symbol = Column(String(5), default="$")
    decimal_places = Column(Integer, default=2)
    thousand_sep = Column(String(2), default=",")
    decimal_sep = Column(String(2), default=".")
    is_default = Column(Boolean, default=False)
    enabled = Column(Boolean, default=True)


class AddressFormat(Base):
    __tablename__ = "admin_address_formats"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    fields_display = Column(String(200), default="Street, City, State, Postal Code, Country")
    postal_label = Column(String(30), default="Postal Code")
    state_label = Column(String(30), default="State")
    phone_format = Column(String(60), nullable=True)
    active = Column(Boolean, default=True)


class TranslationEntry(Base):
    """Flat per-key row with one column per seeded language — matches the
    mock's translation grid exactly (key, en, hi, ar, module). Completeness
    is computed by counting non-empty cells, never stored."""
    __tablename__ = "admin_translation_entries"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    module = Column(String(60), nullable=True)
    en = Column(String(300), nullable=True)
    hi = Column(String(300), nullable=True)
    ar = Column(String(300), nullable=True)


# ── Audit & Security ──────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "admin_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    log_code = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(100), nullable=True)
    role = Column(String(50), nullable=True)
    action = Column(String(30), nullable=False)  # Created|Updated|Deleted|Enabled|Disabled|Login Failed
    entity_type = Column(String(60), nullable=False)
    entity_id = Column(String(30), nullable=True)
    module = Column(String(60), default="Admin Configuration")
    field_detail = Column(String(300), nullable=True)
    ip_address = Column(String(60), nullable=True)
    severity = Column(String(20), default="Info")  # Info|Medium|High|Critical
    created_at = Column(DateTime, default=datetime.utcnow)


class ComplianceReport(Base):
    __tablename__ = "admin_compliance_reports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    standard = Column(String(30), default="Internal")  # GDPR|SOC2|ISO27001|PCI-DSS|Internal
    period = Column(String(30), nullable=True)
    status = Column(String(30), default="Not Applicable")  # Compliant|Review Required|Action Needed|Not Applicable
    last_run_at = Column(DateTime, nullable=True)
    findings = Column(Integer, default=0)
    exportable = Column(Boolean, default=True)


class DataClassification(Base):
    __tablename__ = "admin_data_classifications"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    color = Column(String(10), default="#6B7280")
    description = Column(String(300), nullable=True)
    entities = Column(String(300), default="")  # comma-separated table/entity names
    encryption = Column(Boolean, default=False)
    mask_display = Column(Boolean, default=False)
    audit_all = Column(Boolean, default=False)


class SecurityPolicy(Base):
    __tablename__ = "admin_security_policies"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(40), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(String(300), nullable=True)
    enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Master Data Config ────────────────────────────────────────────────────
class MaterialType(Base):
    __tablename__ = "admin_material_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    track_expiry = Column(Boolean, default=False)
    track_serial = Column(Boolean, default=False)
    track_batch = Column(Boolean, default=False)
    hazmat = Column(Boolean, default=False)
    cold_chain = Column(Boolean, default=False)
    status = Column(String(20), default="Active")


class UnitOfMeasure(Base):
    __tablename__ = "admin_units_of_measure"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)
    abbreviation = Column(String(10), unique=True, nullable=False)
    type = Column(String(30), default="Count")  # Count|Weight|Volume|Length|Area
    is_base = Column(Boolean, default=False)
    conversion_factor = Column(Float, default=1)
    status = Column(String(20), default="Active")


class PackKeyTemplate(Base):
    __tablename__ = "admin_pack_key_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    inner_pack = Column(Integer, default=1)
    outer_pack = Column(Integer, default=1)
    pallet_qty = Column(Integer, default=1)
    weight = Column(Float, default=0)
    dimensions = Column(String(60), nullable=True)
    status = Column(String(20), default="Active")


class MaterialCategory(Base):
    __tablename__ = "admin_material_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("admin_material_categories.id"), nullable=True)
    status = Column(String(20), default="Active")


# ── Bar Code Configs (Admin Config's 9th tab) ─────────────────────────────
class BarcodeConfig(Base):
    """Label layout/encoding config that Inbound's Label Generation tab
    (app/routers/label_ops.py) reads live by (module, label_type, active=True)
    to decide the symbology and fields printed on a receiving/putaway label —
    a real config->output relationship, not just a cosmetic settings screen."""
    __tablename__ = "admin_barcode_configs"
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(30), nullable=False)       # Inbound | Outbound | Inventory | Master Data
    label_type = Column(String(40), nullable=False)    # Receiving Label | Putaway Label | Shipping Label | Location Label
    symbology = Column(String(20), default="Code128")  # Code128 | Code39 | EAN13 | QR
    label_width_mm = Column(Float, default=100)
    label_height_mm = Column(Float, default=50)
    fields_included = Column(String(200), default="LPN,Material,Qty")  # comma-separated
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Notifications sub-tab (only genuinely new piece) ─────────────────────
class NotificationTemplate(Base):
    __tablename__ = "admin_notification_templates"
    id = Column(Integer, primary_key=True, index=True)
    tpl_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    module = Column(String(60), nullable=True)
    channel = Column(String(20), default="Email")  # Email|SMS|In-App
    subject = Column(String(200), nullable=True)
    body = Column(Text, nullable=False)
    status = Column(String(20), default="Active")
