"""
Pydantic schemas for Admin Configuration's 8 tabs. Mirrors
app/models/admin_config.py's own grouping and reuse notes.

A few fields are stored as CSV strings on the model (Role.modules,
ShiftSchedule.days_active, DataClassification.entities) but are edited as
lists/arrays by the existing frontend components — the Read schemas expose
them as List[str] and the routers join/split them, so nothing about the
mock's own form widgets has to change.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


def _csv_to_list(v) -> List[str]:
    if isinstance(v, list):
        return v
    if not v:
        return []
    return [p.strip() for p in v.split(",") if p.strip()]


# ── Users & Roles ────────────────────────────────────────────────────────
class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    status: str
    warehouse_id: Optional[int] = None
    warehouse_code: Optional[str] = None
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    mfa_enabled: bool = False
    locked: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime


class AdminUserCreate(BaseModel):
    full_name: str
    email: str
    username: Optional[str] = None
    role: str = "Operator"
    warehouse_id: Optional[int] = None
    shift_id: Optional[int] = None
    mfa_enabled: bool = False
    status: str = "Active"
    password: Optional[str] = None


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    warehouse_id: Optional[int] = None
    shift_id: Optional[int] = None
    mfa_enabled: Optional[bool] = None
    status: Optional[str] = None


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    level: str
    description: Optional[str] = None
    modules: List[str] = []
    status: str
    user_count: int = 0
    created_at: datetime

    @field_validator("modules", mode="before")
    @classmethod
    def _split_modules(cls, v):
        return _csv_to_list(v)


class RoleCreate(BaseModel):
    code: str
    name: str
    level: str = "Operator"
    description: Optional[str] = None
    modules: List[str] = []
    status: str = "Active"


class RoleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    modules: Optional[List[str]] = None
    status: Optional[str] = None


class ShiftScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    start_time: str
    end_time: str
    break_minutes: int
    days_active: List[str] = []
    status: str
    staff_count: int = 0

    @field_validator("days_active", mode="before")
    @classmethod
    def _split_days(cls, v):
        return _csv_to_list(v)


class ShiftScheduleCreate(BaseModel):
    code: str
    name: str
    start_time: str = "08:00"
    end_time: str = "16:00"
    break_minutes: int = 30
    days_active: List[str] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    status: str = "Active"


class ShiftScheduleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    break_minutes: Optional[int] = None
    days_active: Optional[List[str]] = None
    status: Optional[str] = None


class LoginHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    username_attempted: str
    role: Optional[str] = None
    ip_address: Optional[str] = None
    device: Optional[str] = None
    status: str
    mfa_verified: bool
    created_at: datetime


# ── Warehouse Config ─────────────────────────────────────────────────────
class WarehouseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    sqft: float
    type: str
    temp_class: str
    status: str
    zones_count: int = 0
    docks_count: int = 0


class WarehouseCreate(BaseModel):
    code: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    sqft: float = 0
    type: str = "General Purpose"
    temp_class: str = "Ambient"
    status: str = "Active"


class WarehouseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    sqft: Optional[float] = None
    type: Optional[str] = None
    temp_class: Optional[str] = None
    status: Optional[str] = None


class AdminZoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    warehouse_id: Optional[int] = None
    warehouse_code: Optional[str] = None
    zone_type: Optional[str] = None
    temperature_controlled: bool
    occupancy_pct: float
    pick_priority: str = "Medium"
    status: str
    locations_count: int = 0


class AdminZoneCreate(BaseModel):
    code: str
    name: str
    warehouse_id: Optional[int] = None
    zone_type: str = "Storage"
    temperature_controlled: bool = False
    pick_priority: str = "Medium"
    status: str = "Active"


class AdminZoneUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    warehouse_id: Optional[int] = None
    zone_type: Optional[str] = None
    temperature_controlled: Optional[bool] = None
    pick_priority: Optional[str] = None
    status: Optional[str] = None


class AdminDockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    door_code: str
    warehouse_id: Optional[int] = None
    warehouse_code: Optional[str] = None
    status: str
    load_type: Optional[str] = None
    dimensions: Optional[str] = None
    direction: Optional[str] = None
    task_type: Optional[str] = None
    current_trailer: Optional[str] = None


class AdminDockCreate(BaseModel):
    door_code: str
    warehouse_id: Optional[int] = None
    direction: str = "Inbound"
    load_type: str = "FTL"
    dimensions: Optional[str] = None


class AdminDockUpdate(BaseModel):
    door_code: Optional[str] = None
    warehouse_id: Optional[int] = None
    direction: Optional[str] = None
    load_type: Optional[str] = None
    dimensions: Optional[str] = None


class AisleRow(BaseModel):
    zone_id: int
    zone_code: str
    aisle: str
    bays: int
    levels: int
    total_locations: int
    occupied: int
    location_type: Optional[str] = None


class BulkGenerateLocationsRequest(BaseModel):
    zone_id: int
    aisle: str
    bays: int
    levels: int
    location_type: str = "Storage"


# ── System Settings ──────────────────────────────────────────────────────
class SystemSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    system_name: str
    company_name: str
    default_warehouse_id: Optional[int] = None
    timezone: str
    date_format: str
    time_format: str
    currency: str
    fiscal_year_start: str
    session_timeout_minutes: int
    max_login_attempts: int
    auto_logout: bool
    maintenance_mode: bool
    debug_mode: bool
    api_rate_limit: int
    data_retention_days: int
    backup_frequency: str


class SystemSettingUpdate(BaseModel):
    system_name: Optional[str] = None
    company_name: Optional[str] = None
    default_warehouse_id: Optional[int] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    currency: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    session_timeout_minutes: Optional[int] = None
    max_login_attempts: Optional[int] = None
    auto_logout: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    debug_mode: Optional[bool] = None
    api_rate_limit: Optional[int] = None
    data_retention_days: Optional[int] = None
    backup_frequency: Optional[str] = None


class BrandingSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    primary_color: str
    secondary_color: str
    accent_color: str
    logo_text: str
    tagline: str
    favicon_text: str
    footer_text: str
    sidebar_style: str
    font_family: str


class BrandingSettingUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    logo_text: Optional[str] = None
    tagline: Optional[str] = None
    favicon_text: Optional[str] = None
    footer_text: Optional[str] = None
    sidebar_style: Optional[str] = None
    font_family: Optional[str] = None


class ModuleToggleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label: str
    description: Optional[str] = None
    enabled: bool
    core: bool


class ModuleToggleUpdate(BaseModel):
    enabled: bool


class NumberingSequenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module: str
    entity: str
    prefix: str
    suffix: str
    next_seq: int
    pad_length: int
    active: bool
    preview: str = ""


class NumberingSequenceCreate(BaseModel):
    module: str
    entity: str
    prefix: str = ""
    suffix: str = ""
    next_seq: int = 1
    pad_length: int = 4
    active: bool = True


class NumberingSequenceUpdate(BaseModel):
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    next_seq: Optional[int] = None
    pad_length: Optional[int] = None
    active: Optional[bool] = None


# ── Integrations ─────────────────────────────────────────────────────────
class IntegrationConnectorBase(BaseModel):
    name: str
    type: str = "Custom"
    protocol: str = "REST API"
    direction: str = "Bidirectional"
    sync_freq: str = "Real-time"
    env: str = "Production"
    carrier_id: Optional[int] = None


class IntegrationConnectorCreate(IntegrationConnectorBase):
    status: str = "Disconnected"


class IntegrationConnectorUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    protocol: Optional[str] = None
    direction: Optional[str] = None
    sync_freq: Optional[str] = None
    env: Optional[str] = None
    carrier_id: Optional[int] = None
    status: Optional[str] = None


class IntegrationConnectorRead(IntegrationConnectorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    status: str
    last_sync_at: Optional[datetime] = None
    records: int
    errors: int
    created_at: datetime


class IntegrationSyncLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    log_code: str
    connector_id: int
    connector_name: str = ""
    direction: str
    type: str
    records: int
    status: str
    started_at: datetime
    duration_seconds: float
    error: Optional[str] = None


class WebhookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    url: str
    event: str
    source: str
    status: str
    last_triggered_at: Optional[datetime] = None
    deliveries: int


class WebhookCreate(BaseModel):
    name: str
    url: str
    event: str
    source: str = "WMS"
    status: str = "Active"


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    event: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    scope: str
    created_by: Optional[str] = None
    key_preview: str
    created_at: datetime
    expiry_at: Optional[datetime] = None
    status: str
    last_used_at: Optional[datetime] = None


class ApiKeyCreate(BaseModel):
    name: str
    scope: str = "Read Only"
    created_by: Optional[str] = None
    expiry_at: Optional[datetime] = None


class ApiKeyCreatedResponse(BaseModel):
    key: ApiKeyRead
    full_key: str  # shown once


# ── Localization ──────────────────────────────────────────────────────────
class LanguageBase(BaseModel):
    name: str
    native_name: Optional[str] = None
    code: str
    direction: str = "LTR"
    is_default: bool = False
    enabled: bool = True


class LanguageCreate(LanguageBase):
    pass


class LanguageUpdate(BaseModel):
    name: Optional[str] = None
    native_name: Optional[str] = None
    code: Optional[str] = None
    direction: Optional[str] = None
    is_default: Optional[bool] = None
    enabled: Optional[bool] = None


class LanguageRead(LanguageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    completeness_pct: float = 0


class DateTimeProfileBase(BaseModel):
    name: str
    timezone: str = "Asia/Kolkata"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"
    week_start: str = "Monday"
    is_default: bool = False


class DateTimeProfileCreate(DateTimeProfileBase):
    pass


class DateTimeProfileUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    week_start: Optional[str] = None
    is_default: Optional[bool] = None


class DateTimeProfileRead(DateTimeProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CurrencyBase(BaseModel):
    name: str
    code: str
    symbol: str = "$"
    decimal_places: int = 2
    thousand_sep: str = ","
    decimal_sep: str = "."
    is_default: bool = False
    enabled: bool = True


class CurrencyCreate(CurrencyBase):
    pass


class CurrencyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    symbol: Optional[str] = None
    decimal_places: Optional[int] = None
    thousand_sep: Optional[str] = None
    decimal_sep: Optional[str] = None
    is_default: Optional[bool] = None
    enabled: Optional[bool] = None


class CurrencyRead(CurrencyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class AddressFormatBase(BaseModel):
    name: str
    fields_display: str = "Street, City, State, Postal Code, Country"
    postal_label: str = "Postal Code"
    state_label: str = "State"
    phone_format: Optional[str] = None
    active: bool = True


class AddressFormatCreate(AddressFormatBase):
    pass


class AddressFormatUpdate(BaseModel):
    name: Optional[str] = None
    fields_display: Optional[str] = None
    postal_label: Optional[str] = None
    state_label: Optional[str] = None
    phone_format: Optional[str] = None
    active: Optional[bool] = None


class AddressFormatRead(AddressFormatBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TranslationEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    module: Optional[str] = None
    en: Optional[str] = None
    hi: Optional[str] = None
    ar: Optional[str] = None


class TranslationEntryCreate(BaseModel):
    key: str
    module: Optional[str] = None
    en: Optional[str] = None
    hi: Optional[str] = None
    ar: Optional[str] = None


class TranslationEntryUpdate(BaseModel):
    module: Optional[str] = None
    en: Optional[str] = None
    hi: Optional[str] = None
    ar: Optional[str] = None


class TranslationCompleteness(BaseModel):
    code: str
    name: str
    completeness_pct: float


# ── Audit & Security ──────────────────────────────────────────────────────
class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    log_code: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    module: str
    field_detail: Optional[str] = None
    ip_address: Optional[str] = None
    severity: str
    created_at: datetime


class ComplianceReportBase(BaseModel):
    name: str
    standard: str = "Internal"
    period: Optional[str] = None
    status: str = "Not Applicable"
    findings: int = 0
    exportable: bool = True


class ComplianceReportCreate(ComplianceReportBase):
    pass


class ComplianceReportUpdate(BaseModel):
    name: Optional[str] = None
    standard: Optional[str] = None
    period: Optional[str] = None
    status: Optional[str] = None
    findings: Optional[int] = None
    exportable: Optional[bool] = None


class ComplianceReportRead(ComplianceReportBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    last_run_at: Optional[datetime] = None


class DataClassificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    color: str
    description: Optional[str] = None
    entities: List[str] = []
    encryption: bool
    mask_display: bool
    audit_all: bool

    @field_validator("entities", mode="before")
    @classmethod
    def _split_entities(cls, v):
        return _csv_to_list(v)


class DataClassificationCreate(BaseModel):
    name: str
    code: str
    color: str = "#6B7280"
    description: Optional[str] = None
    entities: List[str] = []
    encryption: bool = False
    mask_display: bool = False
    audit_all: bool = False


class DataClassificationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    entities: Optional[List[str]] = None
    encryption: Optional[bool] = None
    mask_display: Optional[bool] = None
    audit_all: Optional[bool] = None


class SecurityPolicyBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    enabled: bool = True


class SecurityPolicyCreate(SecurityPolicyBase):
    pass


class SecurityPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


class SecurityPolicyRead(SecurityPolicyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime


# ── Master Data Config ────────────────────────────────────────────────────
class MaterialTypeBase(BaseModel):
    name: str
    code: str
    track_expiry: bool = False
    track_serial: bool = False
    track_batch: bool = False
    hazmat: bool = False
    cold_chain: bool = False
    status: str = "Active"


class MaterialTypeCreate(MaterialTypeBase):
    pass


class MaterialTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    track_expiry: Optional[bool] = None
    track_serial: Optional[bool] = None
    track_batch: Optional[bool] = None
    hazmat: Optional[bool] = None
    cold_chain: Optional[bool] = None
    status: Optional[str] = None


class MaterialTypeRead(MaterialTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class UnitOfMeasureBase(BaseModel):
    name: str
    abbreviation: str
    type: str = "Count"
    is_base: bool = False
    conversion_factor: float = 1
    status: str = "Active"


class UnitOfMeasureCreate(UnitOfMeasureBase):
    pass


class UnitOfMeasureUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    type: Optional[str] = None
    is_base: Optional[bool] = None
    conversion_factor: Optional[float] = None
    status: Optional[str] = None


class UnitOfMeasureRead(UnitOfMeasureBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class PackKeyTemplateBase(BaseModel):
    name: str
    code: str
    inner_pack: int = 1
    outer_pack: int = 1
    pallet_qty: int = 1
    weight: float = 0
    dimensions: Optional[str] = None
    status: str = "Active"


class PackKeyTemplateCreate(PackKeyTemplateBase):
    pass


class PackKeyTemplateUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    inner_pack: Optional[int] = None
    outer_pack: Optional[int] = None
    pallet_qty: Optional[int] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    status: Optional[str] = None


class PackKeyTemplateRead(PackKeyTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class MaterialOwnerAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    contact_email: Optional[str] = None
    type: Optional[str] = "Internal"
    country: Optional[str] = None
    status: str


class MaterialOwnerAdminUpdate(BaseModel):
    type: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    name: Optional[str] = None
    contact_email: Optional[str] = None


class MaterialCategoryBase(BaseModel):
    name: str
    code: str
    parent_id: Optional[int] = None
    status: str = "Active"


class MaterialCategoryCreate(MaterialCategoryBase):
    pass


class MaterialCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    parent_id: Optional[int] = None
    status: Optional[str] = None


class MaterialCategoryRead(MaterialCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    parent_code: Optional[str] = None
    sku_count: int = 0


# ── Bar Code Configs ───────────────────────────────────────────────────────
class BarcodeConfigBase(BaseModel):
    module: str
    label_type: str
    symbology: str = "Code128"
    label_width_mm: float = 100
    label_height_mm: float = 50
    fields_included: str = "LPN,Material,Qty"
    active: bool = True


class BarcodeConfigCreate(BarcodeConfigBase):
    pass


class BarcodeConfigUpdate(BaseModel):
    module: Optional[str] = None
    label_type: Optional[str] = None
    symbology: Optional[str] = None
    label_width_mm: Optional[float] = None
    label_height_mm: Optional[float] = None
    fields_included: Optional[str] = None
    active: Optional[bool] = None


class BarcodeConfigRead(BarcodeConfigBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ── Notifications sub-tab ─────────────────────────────────────────────────
class NotificationTemplateBase(BaseModel):
    name: str
    module: Optional[str] = None
    channel: str = "Email"
    subject: Optional[str] = None
    body: str
    status: str = "Active"


class NotificationTemplateCreate(NotificationTemplateBase):
    pass


class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    module: Optional[str] = None
    channel: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class NotificationTemplateRead(NotificationTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tpl_code: str
