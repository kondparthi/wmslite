/**
 * Admin Configuration's 8 tabs — Users & Roles, Warehouse Config and
 * System Settings sub-tabs. See useAdminConfigApi2.ts for the remaining
 * five (Integrations, Localization, Audit & Security, Master Data Config,
 * Notifications' new NotificationTemplate CRUD).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Users & Roles ────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  warehouse_id: number | null;
  warehouse_code: string | null;
  shift_id: number | null;
  shift_name: string | null;
  mfa_enabled: boolean;
  locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  level: string;
  description: string | null;
  modules: string[];
  status: string;
  user_count: number;
  created_at: string;
}

export interface ShiftSchedule {
  id: number;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  days_active: string[];
  status: string;
  staff_count: number;
}

export interface LoginHistoryRow {
  id: number;
  user_id: number | null;
  username_attempted: string;
  role: string | null;
  ip_address: string | null;
  device: string | null;
  status: string;
  mfa_verified: boolean;
  created_at: string;
}

const USERS = "/admin/users";
const ROLES = "/admin/roles";
const SHIFTS = "/admin/shifts";
const LOGIN_HISTORY = "/admin/login-history";

export function useAdminUsers(role?: string) {
  return useQuery<AdminUser[]>({
    queryKey: [USERS, role],
    queryFn: () => api.raw<AdminUser[]>(`${USERS}/${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  });
}

export interface AdminUserPayload {
  full_name: string; email: string; username?: string; role?: string;
  warehouse_id?: number | null; shift_id?: number | null; mfa_enabled?: boolean; status?: string; password?: string;
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserPayload) => api.raw<AdminUser>(`${USERS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUserPayload> }) =>
      api.raw<AdminUser>(`${USERS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useToggleUserLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, locked }: { id: number; locked: boolean }) =>
      api.raw<AdminUser>(`${USERS}/${id}/${locked ? "unlock" : "lock"}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${USERS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useRoles() {
  return useQuery<Role[]>({ queryKey: [ROLES], queryFn: () => api.raw<Role[]>(`${ROLES}/`) });
}

export interface RolePayload { code: string; name: string; level?: string; description?: string; modules?: string[]; status?: string; }

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RolePayload) => api.raw<Role>(`${ROLES}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<RolePayload> }) =>
      api.raw<Role>(`${ROLES}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${ROLES}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES] }),
  });
}

export function useShifts() {
  return useQuery<ShiftSchedule[]>({ queryKey: [SHIFTS], queryFn: () => api.raw<ShiftSchedule[]>(`${SHIFTS}/`) });
}

export interface ShiftPayload { code: string; name: string; start_time?: string; end_time?: string; break_minutes?: number; days_active?: string[]; status?: string; }

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShiftPayload) => api.raw<ShiftSchedule>(`${SHIFTS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHIFTS] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ShiftPayload> }) =>
      api.raw<ShiftSchedule>(`${SHIFTS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHIFTS] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${SHIFTS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHIFTS] }),
  });
}

export function useLoginHistory() {
  return useQuery<LoginHistoryRow[]>({ queryKey: [LOGIN_HISTORY], queryFn: () => api.raw<LoginHistoryRow[]>(`${LOGIN_HISTORY}/`) });
}

// ── Warehouse Config ─────────────────────────────────────────────────────
export interface Warehouse {
  id: number; code: string; name: string; city: string | null; country: string | null;
  sqft: number; type: string; temp_class: string; status: string; zones_count: number; docks_count: number;
}

export interface AdminZone {
  id: number; code: string; name: string; warehouse_id: number | null; warehouse_code: string | null;
  zone_type: string | null; temperature_controlled: boolean; occupancy_pct: number; pick_priority: string;
  status: string; locations_count: number;
}

export interface AdminDock {
  id: number; door_code: string; warehouse_id: number | null; warehouse_code: string | null;
  status: string; load_type: string | null; dimensions: string | null; direction: string | null;
  task_type: string | null; current_trailer: string | null;
}

export interface AisleRow {
  zone_id: number; zone_code: string; aisle: string; bays: number; levels: number;
  total_locations: number; occupied: number; location_type: string | null;
}

const WAREHOUSES = "/admin/warehouses";
const ZONES = "/admin/zones";
const DOCKS = "/admin/docks";
const AISLES = "/admin/aisles";

export function useWarehouses() {
  return useQuery<Warehouse[]>({ queryKey: [WAREHOUSES], queryFn: () => api.raw<Warehouse[]>(`${WAREHOUSES}/`) });
}

export interface WarehousePayload { code: string; name: string; city?: string; country?: string; sqft?: number; type?: string; temp_class?: string; status?: string; }

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WarehousePayload) => api.raw<Warehouse>(`${WAREHOUSES}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WAREHOUSES] }),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WarehousePayload> }) =>
      api.raw<Warehouse>(`${WAREHOUSES}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WAREHOUSES] }),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${WAREHOUSES}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WAREHOUSES] }),
  });
}

export function useAdminZones() {
  return useQuery<AdminZone[]>({ queryKey: [ZONES], queryFn: () => api.raw<AdminZone[]>(`${ZONES}/`) });
}

export interface AdminZonePayload { code: string; name: string; warehouse_id?: number | null; zone_type?: string; temperature_controlled?: boolean; pick_priority?: string; status?: string; }

export function useCreateAdminZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminZonePayload) => api.raw<AdminZone>(`${ZONES}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ZONES] }); qc.invalidateQueries({ queryKey: [WAREHOUSES] }); },
  });
}

export function useUpdateAdminZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminZonePayload> }) =>
      api.raw<AdminZone>(`${ZONES}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ZONES] }); qc.invalidateQueries({ queryKey: [WAREHOUSES] }); },
  });
}

export function useDeleteAdminZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${ZONES}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [ZONES] }); qc.invalidateQueries({ queryKey: [WAREHOUSES] }); },
  });
}

export function useAdminDocks() {
  return useQuery<AdminDock[]>({ queryKey: [DOCKS], queryFn: () => api.raw<AdminDock[]>(`${DOCKS}/`) });
}

export interface AdminDockPayload { door_code: string; warehouse_id?: number | null; direction?: string; load_type?: string; dimensions?: string; }

export function useCreateAdminDock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminDockPayload) => api.raw<AdminDock>(`${DOCKS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DOCKS] }); qc.invalidateQueries({ queryKey: [WAREHOUSES] }); },
  });
}

export function useUpdateAdminDock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminDockPayload> }) =>
      api.raw<AdminDock>(`${DOCKS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DOCKS] }),
  });
}

export function useDeleteAdminDock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${DOCKS}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DOCKS] }); qc.invalidateQueries({ queryKey: [WAREHOUSES] }); },
  });
}

export function useAisles() {
  return useQuery<AisleRow[]>({ queryKey: [AISLES], queryFn: () => api.raw<AisleRow[]>(`${AISLES}/`) });
}

export interface BulkGenerateLocationsPayload { zone_id: number; aisle: string; bays: number; levels: number; location_type?: string; }

export function useBulkGenerateLocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkGenerateLocationsPayload) => api.raw<AisleRow[]>(`${AISLES}/bulk-generate`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [AISLES] }); qc.invalidateQueries({ queryKey: [ZONES] }); },
  });
}

// ── System Settings ──────────────────────────────────────────────────────
export interface SystemSetting {
  id: number; system_name: string; company_name: string; default_warehouse_id: number | null;
  timezone: string; date_format: string; time_format: string; currency: string; fiscal_year_start: string;
  session_timeout_minutes: number; max_login_attempts: number; auto_logout: boolean; maintenance_mode: boolean;
  debug_mode: boolean; api_rate_limit: number; data_retention_days: number; backup_frequency: string;
}

export interface BrandingSetting {
  id: number; primary_color: string; secondary_color: string; accent_color: string; logo_text: string;
  tagline: string; favicon_text: string; footer_text: string; sidebar_style: string; font_family: string;
}

export interface ModuleToggle { id: number; key: string; label: string; description: string | null; enabled: boolean; core: boolean; }

export interface NumberingSequence {
  id: number; module: string; entity: string; prefix: string; suffix: string; next_seq: number;
  pad_length: number; active: boolean; preview: string;
}

const SETTINGS = "/admin/system-settings";
const BRANDING = "/admin/branding";
const MODULE_TOGGLES = "/admin/module-toggles";
const NUMBERING = "/admin/numbering-sequences";

export function useSystemSettings() {
  return useQuery<SystemSetting>({ queryKey: [SETTINGS], queryFn: () => api.raw<SystemSetting>(`${SETTINGS}/`) });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SystemSetting>) => api.raw<SystemSetting>(`${SETTINGS}/`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SETTINGS] }),
  });
}

export function useBranding() {
  return useQuery<BrandingSetting>({ queryKey: [BRANDING], queryFn: () => api.raw<BrandingSetting>(`${BRANDING}/`) });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BrandingSetting>) => api.raw<BrandingSetting>(`${BRANDING}/`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BRANDING] }),
  });
}

export function useModuleToggles() {
  return useQuery<ModuleToggle[]>({ queryKey: [MODULE_TOGGLES], queryFn: () => api.raw<ModuleToggle[]>(`${MODULE_TOGGLES}/`) });
}

export function useUpdateModuleToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.raw<ModuleToggle>(`${MODULE_TOGGLES}/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MODULE_TOGGLES] }),
  });
}

export function useNumberingSequences() {
  return useQuery<NumberingSequence[]>({ queryKey: [NUMBERING], queryFn: () => api.raw<NumberingSequence[]>(`${NUMBERING}/`) });
}

export function useUpdateNumberingSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<NumberingSequence> }) =>
      api.raw<NumberingSequence>(`${NUMBERING}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NUMBERING] }),
  });
}
