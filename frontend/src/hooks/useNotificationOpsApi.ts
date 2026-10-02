/**
 * Notifications' 6 tabs. Rules with condition_type "low_stock" /
 * "asn_overdue" / "invoice_overdue" are checked live against real data by
 * POST .../check (see app/routers/notification_ops.py); everything else
 * is a "manual" rule that can only be fired by hand via Send Test.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface NotificationRule {
  id: number;
  rule_code: string;
  name: string;
  module: string;
  event: string;
  condition_type: string;
  threshold: string | null;
  channels: string; // comma-separated: email,sms,inapp
  recipients: string | null;
  frequency: string;
  priority: string;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface NotificationChannel {
  id: number;
  type: string;
  provider: string | null;
  from_address: string | null;
  status: string;
  last_test_at: string | null;
}

export interface EscalationRule {
  id: number;
  esc_code: string;
  name: string;
  rule_id: number;
  escalate_to: string;
  channel: string;
  delay_minutes: number;
  active: boolean;
  last_escalated_at: string | null;
  rule_name: string;
  is_due: boolean;
}

export interface DigestSetting {
  id: number;
  name: string;
  schedule: string;
  modules: string;
  recipients: string | null;
  active: boolean;
  last_sent_at: string | null;
}

export interface NotificationLogEntry {
  id: number;
  log_code: string;
  kind: string;
  rule_id: number | null;
  event_detail: string;
  channels: string;
  recipients_count: number;
  status: string;
  created_at: string;
  rule_name: string;
}

export interface DailyChannelPoint { day: string; email: number; sms: number; inapp: number; }
export interface NotificationReportSummary {
  sent_mtd: number;
  delivery_success_pct: number;
  escalations_triggered_mtd: number;
  digest_sends_mtd: number;
  daily_by_channel: DailyChannelPoint[];
}

const RULES = "/operations/notification-rules";
const CHANNELS = "/operations/notification-channels";
const ESCALATIONS = "/operations/notification-escalations";
const DIGESTS = "/operations/notification-digests";
const LOG = "/operations/notification-log";
const REPORTS = "/operations/notification-reports";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [RULES] });
  qc.invalidateQueries({ queryKey: [ESCALATIONS] });
  qc.invalidateQueries({ queryKey: [LOG] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

// ---- Rules ----
export function useNotificationRules() {
  return useQuery<NotificationRule[]>({ queryKey: [RULES], queryFn: () => api.raw<NotificationRule[]>(`${RULES}/`) });
}

export interface RulePayload {
  name: string; module: string; event: string; condition_type?: string;
  threshold?: string; channels: string; recipients?: string; frequency: string; priority: string; active?: boolean;
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RulePayload) => api.raw<NotificationRule>(`${RULES}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<RulePayload> }) =>
      api.raw<NotificationRule>(`${RULES}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${RULES}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES] }),
  });
}

export function useCheckRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<NotificationLogEntry[]>(`${RULES}/check`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSendTestForRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => api.raw<NotificationLogEntry>(`${RULES}/${ruleId}/test`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Channels ----
export function useNotificationChannels() {
  return useQuery<NotificationChannel[]>({ queryKey: [CHANNELS], queryFn: () => api.raw<NotificationChannel[]>(`${CHANNELS}/`) });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status?: string; provider?: string; from_address?: string } }) =>
      api.raw<NotificationChannel>(`${CHANNELS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CHANNELS] }),
  });
}

export function useTestChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<NotificationChannel>(`${CHANNELS}/${id}/test`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CHANNELS] }); qc.invalidateQueries({ queryKey: [LOG] }); },
  });
}

// ---- Escalations ----
export function useEscalationRules() {
  return useQuery<EscalationRule[]>({ queryKey: [ESCALATIONS], queryFn: () => api.raw<EscalationRule[]>(`${ESCALATIONS}/`) });
}

export interface EscalationPayload { name: string; rule_id: number; escalate_to: string; channel: string; delay_minutes: number; active?: boolean; }

export function useCreateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EscalationPayload) => api.raw<EscalationRule>(`${ESCALATIONS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ESCALATIONS] }),
  });
}

export function useUpdateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<EscalationPayload> }) =>
      api.raw<EscalationRule>(`${ESCALATIONS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ESCALATIONS] }),
  });
}

export function useDeleteEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw(`${ESCALATIONS}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ESCALATIONS] }),
  });
}

export function useFireEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<NotificationLogEntry>(`${ESCALATIONS}/${id}/escalate`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Digests ----
export function useDigestSettings() {
  return useQuery<DigestSetting[]>({ queryKey: [DIGESTS], queryFn: () => api.raw<DigestSetting[]>(`${DIGESTS}/`) });
}

export function useUpdateDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { active?: boolean } }) =>
      api.raw<DigestSetting>(`${DIGESTS}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DIGESTS] }),
  });
}

export function useSendDigestNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<NotificationLogEntry>(`${DIGESTS}/${id}/send-now`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DIGESTS] }); invalidateAll(qc); },
  });
}

// ---- Log ----
export function useNotificationLog() {
  return useQuery<NotificationLogEntry[]>({ queryKey: [LOG], queryFn: () => api.raw<NotificationLogEntry[]>(`${LOG}/`) });
}

// ---- Reports ----
export function useNotificationReportSummary() {
  return useQuery<NotificationReportSummary>({ queryKey: [REPORTS], queryFn: () => api.raw<NotificationReportSummary>(`${REPORTS}/summary`) });
}
