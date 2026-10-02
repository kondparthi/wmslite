/**
 * Admin Configuration — Integrations, Localization, Audit & Security,
 * Master Data Config, and the Notifications sub-tab's one new table
 * (NotificationTemplate; Rules/Channels/Escalations reuse
 * useNotificationOpsApi.ts's hooks directly — see admin_config.py's
 * model docstring for why nothing else is forked here).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Integrations ─────────────────────────────────────────────────────────
export interface IntegrationConnector {
  id: number; code: string; name: string; type: string; protocol: string; direction: string;
  sync_freq: string; env: string; carrier_id: number | null; status: string;
  last_sync_at: string | null; records: number; errors: number; created_at: string;
}

export interface IntegrationSyncLog {
  id: number; log_code: string; connector_id: number; connector_name: string; direction: string;
  type: string; records: number; status: string; started_at: string; duration_seconds: number; error: string | null;
}

export interface Webhook {
  id: number; name: string; url: string; event: string; source: string; status: string;
  last_triggered_at: string | null; deliveries: number;
}

export interface ApiKey {
  id: number; name: string; scope: string; created_by: string | null; key_preview: string;
  created_at: string; expiry_at: string | null; status: string; last_used_at: string | null;
}

export interface ApiKeyCreatedResponse { key: ApiKey; full_key: string; }

const CONNECTORS = "/admin/integration-connectors";
const SYNC_LOGS = "/admin/integration-sync-logs";
const WEBHOOKS = "/admin/webhooks";
const API_KEYS = "/admin/api-keys";

export function useIntegrationConnectors() {
  return useQuery<IntegrationConnector[]>({ queryKey: [CONNECTORS], queryFn: () => api.raw<IntegrationConnector[]>(`${CONNECTORS}/`) });
}

export interface ConnectorPayload { name: string; type?: string; protocol?: string; direction?: string; sync_freq?: string; env?: string; carrier_id?: number | null; status?: string; }

export function useCreateConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConnectorPayload) => api.raw<IntegrationConnector>(`${CONNECTORS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONNECTORS] }),
  });
}

export function useUpdateConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ConnectorPayload> }) =>
      api.raw<IntegrationConnector>(`${CONNECTORS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONNECTORS] }),
  });
}

export function useDeleteConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${CONNECTORS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONNECTORS] }),
  });
}

export function useSyncConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<IntegrationConnector>(`${CONNECTORS}/${id}/sync`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONNECTORS] }); qc.invalidateQueries({ queryKey: [SYNC_LOGS] }); },
  });
}

export function useSyncLogs() {
  return useQuery<IntegrationSyncLog[]>({ queryKey: [SYNC_LOGS], queryFn: () => api.raw<IntegrationSyncLog[]>(`${SYNC_LOGS}/`) });
}

export function useWebhooks() {
  return useQuery<Webhook[]>({ queryKey: [WEBHOOKS], queryFn: () => api.raw<Webhook[]>(`${WEBHOOKS}/`) });
}

export interface WebhookPayload { name: string; url: string; event: string; source?: string; status?: string; }

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WebhookPayload) => api.raw<Webhook>(`${WEBHOOKS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WEBHOOKS] }),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WebhookPayload> }) =>
      api.raw<Webhook>(`${WEBHOOKS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WEBHOOKS] }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${WEBHOOKS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WEBHOOKS] }),
  });
}

export function useTestWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Webhook>(`${WEBHOOKS}/${id}/test`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WEBHOOKS] }),
  });
}

export function useApiKeys() {
  return useQuery<ApiKey[]>({ queryKey: [API_KEYS], queryFn: () => api.raw<ApiKey[]>(`${API_KEYS}/`) });
}

export interface ApiKeyPayload { name: string; scope?: string; created_by?: string; expiry_at?: string | null; }

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiKeyPayload) => api.raw<ApiKeyCreatedResponse>(`${API_KEYS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS] }),
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ApiKeyCreatedResponse>(`${API_KEYS}/${id}/rotate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ApiKey>(`${API_KEYS}/${id}/revoke`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${API_KEYS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS] }),
  });
}

// ── Localization ──────────────────────────────────────────────────────────
export interface Language { id: number; name: string; native_name: string | null; code: string; direction: string; is_default: boolean; enabled: boolean; completeness_pct: number; }
export interface DateTimeProfile { id: number; name: string; timezone: string; date_format: string; time_format: string; week_start: string; is_default: boolean; }
export interface Currency { id: number; name: string; code: string; symbol: string; decimal_places: number; thousand_sep: string; decimal_sep: string; is_default: boolean; enabled: boolean; }
export interface AddressFormat { id: number; name: string; fields_display: string; postal_label: string; state_label: string; phone_format: string | null; active: boolean; }
export interface TranslationEntry { id: number; key: string; module: string | null; en: string | null; hi: string | null; ar: string | null; }
export interface TranslationCompleteness { code: string; name: string; completeness_pct: number; }

const LANGUAGES = "/admin/languages";
const DATETIME = "/admin/datetime-profiles";
const CURRENCIES = "/admin/currencies";
const ADDRESS_FORMATS = "/admin/address-formats";
const TRANSLATIONS = "/admin/translations";

function makeSimpleCrud<T, TCreate = Partial<T>, TUpdate = Partial<T>>(base: string, key: string) {
  return {
    useList: () => useQuery<T[]>({ queryKey: [key], queryFn: () => api.raw<T[]>(`${base}/`) }),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (payload: TCreate) => api.raw<T>(`${base}/`, { method: "POST", body: JSON.stringify(payload) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: TUpdate }) =>
          api.raw<T>(`${base}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
    useDelete: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: number) => api.raw(`${base}/${id}`, { method: "DELETE" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
  };
}

const languageCrud = makeSimpleCrud<Language>(LANGUAGES, LANGUAGES);
export const useLanguages = languageCrud.useList;
export const useCreateLanguage = languageCrud.useCreate;
export const useUpdateLanguage = languageCrud.useUpdate;
export const useDeleteLanguage = languageCrud.useDelete;

const dtpCrud = makeSimpleCrud<DateTimeProfile>(DATETIME, DATETIME);
export const useDateTimeProfiles = dtpCrud.useList;
export const useCreateDateTimeProfile = dtpCrud.useCreate;
export const useUpdateDateTimeProfile = dtpCrud.useUpdate;
export const useDeleteDateTimeProfile = dtpCrud.useDelete;

const currencyCrud = makeSimpleCrud<Currency>(CURRENCIES, CURRENCIES);
export const useCurrencies = currencyCrud.useList;
export const useCreateCurrency = currencyCrud.useCreate;
export const useUpdateCurrency = currencyCrud.useUpdate;
export const useDeleteCurrency = currencyCrud.useDelete;

const addressCrud = makeSimpleCrud<AddressFormat>(ADDRESS_FORMATS, ADDRESS_FORMATS);
export const useAddressFormats = addressCrud.useList;
export const useCreateAddressFormat = addressCrud.useCreate;
export const useUpdateAddressFormat = addressCrud.useUpdate;
export const useDeleteAddressFormat = addressCrud.useDelete;

export function useTranslations(module?: string) {
  return useQuery<TranslationEntry[]>({
    queryKey: [TRANSLATIONS, module],
    queryFn: () => api.raw<TranslationEntry[]>(`${TRANSLATIONS}/${module && module !== "All" ? `?module=${encodeURIComponent(module)}` : ""}`),
  });
}

export function useTranslationCompleteness() {
  return useQuery<TranslationCompleteness[]>({ queryKey: [TRANSLATIONS, "completeness"], queryFn: () => api.raw<TranslationCompleteness[]>(`${TRANSLATIONS}/completeness`) });
}

export function useUpdateTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TranslationEntry> }) =>
      api.raw<TranslationEntry>(`${TRANSLATIONS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TRANSLATIONS] }),
  });
}

// ── Audit & Security ──────────────────────────────────────────────────────
export interface AuditLogRow {
  id: number; log_code: string; user_id: number | null; username: string | null; role: string | null;
  action: string; entity_type: string; entity_id: string | null; module: string; field_detail: string | null;
  ip_address: string | null; severity: string; created_at: string;
}

export interface ComplianceReport {
  id: number; name: string; standard: string; period: string | null; status: string;
  last_run_at: string | null; findings: number; exportable: boolean;
}

export interface DataClassification {
  id: number; name: string; code: string; color: string; description: string | null;
  entities: string[]; encryption: boolean; mask_display: boolean; audit_all: boolean;
}

export interface SecurityPolicy { id: number; key: string; name: string; description: string | null; enabled: boolean; updated_at: string; }

const AUDIT_LOG = "/admin/audit-log";
const COMPLIANCE = "/admin/compliance-reports";
const DATA_CLASS = "/admin/data-classifications";
const SEC_POLICIES = "/admin/security-policies";

export function useAuditLog(filters?: { module?: string; severity?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.module && filters.module !== "All") params.set("module", filters.module);
  if (filters?.severity && filters.severity !== "All") params.set("severity", filters.severity);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  return useQuery<AuditLogRow[]>({
    queryKey: [AUDIT_LOG, filters],
    queryFn: () => api.raw<AuditLogRow[]>(`${AUDIT_LOG}/${qs ? `?${qs}` : ""}`),
  });
}

const complianceCrud = makeSimpleCrud<ComplianceReport>(COMPLIANCE, COMPLIANCE);
export const useComplianceReports = complianceCrud.useList;
export const useCreateComplianceReport = complianceCrud.useCreate;
export const useUpdateComplianceReport = complianceCrud.useUpdate;

export function useRerunComplianceReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ComplianceReport>(`${COMPLIANCE}/${id}/rerun`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPLIANCE] }),
  });
}

export function useDataClassifications() {
  return useQuery<DataClassification[]>({ queryKey: [DATA_CLASS], queryFn: () => api.raw<DataClassification[]>(`${DATA_CLASS}/`) });
}

export function useSecurityPolicies() {
  return useQuery<SecurityPolicy[]>({ queryKey: [SEC_POLICIES], queryFn: () => api.raw<SecurityPolicy[]>(`${SEC_POLICIES}/`) });
}

export function useUpdateSecurityPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.raw<SecurityPolicy>(`${SEC_POLICIES}/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SEC_POLICIES] }),
  });
}

// ── Master Data Config ────────────────────────────────────────────────────
export interface MaterialType { id: number; name: string; code: string; track_expiry: boolean; track_serial: boolean; track_batch: boolean; hazmat: boolean; cold_chain: boolean; status: string; }
export interface UnitOfMeasure { id: number; name: string; abbreviation: string; type: string; is_base: boolean; conversion_factor: number; status: string; }
export interface PackKeyTemplate { id: number; name: string; code: string; inner_pack: number; outer_pack: number; pallet_qty: number; weight: number; dimensions: string | null; status: string; }
export interface AdminMaterialOwner { id: number; code: string; name: string; contact_email: string | null; type: string | null; country: string | null; status: string; }
export interface MaterialCategory { id: number; name: string; code: string; parent_id: number | null; parent_code: string | null; sku_count: number; status: string; }

const MATERIAL_TYPES = "/admin/material-types";
const UOM = "/admin/uom";
const PACK_KEYS = "/admin/pack-key-templates";
const OWNERS = "/admin/material-owners";
const CATEGORIES = "/admin/material-categories";

const materialTypeCrud = makeSimpleCrud<MaterialType>(MATERIAL_TYPES, MATERIAL_TYPES);
export const useMaterialTypes = materialTypeCrud.useList;
export const useCreateMaterialType = materialTypeCrud.useCreate;
export const useUpdateMaterialType = materialTypeCrud.useUpdate;
export const useDeleteMaterialType = materialTypeCrud.useDelete;

const uomCrud = makeSimpleCrud<UnitOfMeasure>(UOM, UOM);
export const useUnitsOfMeasure = uomCrud.useList;
export const useCreateUnitOfMeasure = uomCrud.useCreate;
export const useUpdateUnitOfMeasure = uomCrud.useUpdate;
export const useDeleteUnitOfMeasure = uomCrud.useDelete;

const packKeyCrud = makeSimpleCrud<PackKeyTemplate>(PACK_KEYS, PACK_KEYS);
export const usePackKeyTemplates = packKeyCrud.useList;
export const useCreatePackKeyTemplate = packKeyCrud.useCreate;
export const useUpdatePackKeyTemplate = packKeyCrud.useUpdate;
export const useDeletePackKeyTemplate = packKeyCrud.useDelete;

export function useAdminMaterialOwners() {
  return useQuery<AdminMaterialOwner[]>({ queryKey: [OWNERS], queryFn: () => api.raw<AdminMaterialOwner[]>(`${OWNERS}/`) });
}

export function useUpdateAdminMaterialOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminMaterialOwner> }) =>
      api.raw<AdminMaterialOwner>(`${OWNERS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [OWNERS] }),
  });
}

const categoryCrud = makeSimpleCrud<MaterialCategory>(CATEGORIES, CATEGORIES);
export const useMaterialCategories = categoryCrud.useList;
export const useCreateMaterialCategory = categoryCrud.useCreate;
export const useUpdateMaterialCategory = categoryCrud.useUpdate;
export const useDeleteMaterialCategory = categoryCrud.useDelete;

// ── Notifications sub-tab (NotificationTemplate only) ──────────────────
export interface NotificationTemplate { id: number; tpl_code: string; name: string; module: string | null; channel: string; subject: string | null; body: string; status: string; }

const NOTIF_TEMPLATES = "/admin/notification-templates";
const templateCrud = makeSimpleCrud<NotificationTemplate>(NOTIF_TEMPLATES, NOTIF_TEMPLATES);
export const useNotificationTemplates = templateCrud.useList;
export const useCreateNotificationTemplate = templateCrud.useCreate;
export const useUpdateNotificationTemplate = templateCrud.useUpdate;
export const useDeleteNotificationTemplate = templateCrud.useDelete;

// ── Bar Code Configs (Admin Config's 9th tab) ───────────────────────────
export interface BarcodeConfig {
  id: number;
  module: string;
  label_type: string;
  symbology: string;
  label_width_mm: number;
  label_height_mm: number;
  fields_included: string;
  active: boolean;
  created_at: string;
}

const BARCODE_CONFIGS = "/admin/barcode-configs";
const barcodeConfigCrud = makeSimpleCrud<BarcodeConfig>(BARCODE_CONFIGS, BARCODE_CONFIGS);
export const useBarcodeConfigs = barcodeConfigCrud.useList;
export const useCreateBarcodeConfig = barcodeConfigCrud.useCreate;
export const useUpdateBarcodeConfig = barcodeConfigCrud.useUpdate;
export const useDeleteBarcodeConfig = barcodeConfigCrud.useDelete;
