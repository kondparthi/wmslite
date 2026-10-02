/**
 * Labor Management is all generic CRUD on the backend (no stock-moving side
 * effects like Inbound/Outbound have), so these are thin typed wrappers
 * around useMasterDataList/Create/Update/Delete rather than bespoke action
 * hooks. See app/routers/labor_ops.py for the backend side.
 */
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete } from "@/hooks/useMasterDataApi";

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  shift: string;
  status: string;
  phone: string | null;
  email: string | null;
  skills: string | null;
  created_at: string;
  updated_at: string;
}
export interface LaborShiftLog {
  id: number;
  employee_id: number;
  activity: string;
  zone: string | null;
  clock_in: string | null;
  clock_out: string | null;
  units_completed: number;
  status: string;
}
export interface AttendanceRecord {
  id: number;
  employee_id: number;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  notes: string | null;
}
export interface ZoneAllocation {
  id: number;
  zone_name: string;
  task_type: string;
  shift: string;
  assigned: number;
  capacity: number;
}
export interface PerformanceGoal {
  id: number;
  employee_id: number;
  task: string;
  target: number;
}

const EMPLOYEES = "/operations/labor-employees";
const SHIFT_LOGS = "/operations/labor-shift-logs";
const ATTENDANCE = "/operations/labor-attendance";
const ZONES = "/operations/labor-zone-allocations";
const GOALS = "/operations/labor-performance-goals";

export const useEmployees = () => useMasterDataList<Employee>(EMPLOYEES);
export const useCreateEmployee = () => useMasterDataCreate<Employee>(EMPLOYEES);
export const useUpdateEmployee = () => useMasterDataUpdate<Employee>(EMPLOYEES);
export const useDeleteEmployee = () => useMasterDataDelete(EMPLOYEES);

export const useShiftLogs = () => useMasterDataList<LaborShiftLog>(SHIFT_LOGS);
export const useCreateShiftLog = () => useMasterDataCreate<LaborShiftLog>(SHIFT_LOGS);
export const useUpdateShiftLog = () => useMasterDataUpdate<LaborShiftLog>(SHIFT_LOGS);
export const useDeleteShiftLog = () => useMasterDataDelete(SHIFT_LOGS);

export const useAttendanceRecords = () => useMasterDataList<AttendanceRecord>(ATTENDANCE);
export const useCreateAttendanceRecord = () => useMasterDataCreate<AttendanceRecord>(ATTENDANCE);
export const useUpdateAttendanceRecord = () => useMasterDataUpdate<AttendanceRecord>(ATTENDANCE);

export const useZoneAllocations = () => useMasterDataList<ZoneAllocation>(ZONES);
export const useCreateZoneAllocation = () => useMasterDataCreate<ZoneAllocation>(ZONES);
export const useUpdateZoneAllocation = () => useMasterDataUpdate<ZoneAllocation>(ZONES);
export const useDeleteZoneAllocation = () => useMasterDataDelete(ZONES);

export const usePerformanceGoals = () => useMasterDataList<PerformanceGoal>(GOALS);
export const useCreatePerformanceGoal = () => useMasterDataCreate<PerformanceGoal>(GOALS);
export const useUpdatePerformanceGoal = () => useMasterDataUpdate<PerformanceGoal>(GOALS);
