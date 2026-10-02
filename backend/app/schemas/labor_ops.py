from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---- Employee ----
class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    role: str = "Associate"
    department: Optional[str] = None
    shift: str = "Morning"
    status: str = "Active"
    phone: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    shift: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[str] = None


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Labor Shift Log ----
class LaborShiftLogBase(BaseModel):
    employee_id: int
    activity: str
    zone: Optional[str] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    units_completed: float = 0
    status: str = "Active"


class LaborShiftLogCreate(LaborShiftLogBase):
    pass


class LaborShiftLogUpdate(BaseModel):
    employee_id: Optional[int] = None
    activity: Optional[str] = None
    zone: Optional[str] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    units_completed: Optional[float] = None
    status: Optional[str] = None


class LaborShiftLogRead(LaborShiftLogBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Attendance Record ----
class AttendanceRecordBase(BaseModel):
    employee_id: int
    work_date: datetime
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: str = "Present"
    notes: Optional[str] = None


class AttendanceRecordCreate(AttendanceRecordBase):
    pass


class AttendanceRecordUpdate(BaseModel):
    employee_id: Optional[int] = None
    work_date: Optional[datetime] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceRecordRead(AttendanceRecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Zone Allocation ----
class ZoneAllocationBase(BaseModel):
    zone_name: str
    task_type: str
    shift: str = "Morning"
    assigned: int = 0
    capacity: int = 0


class ZoneAllocationCreate(ZoneAllocationBase):
    pass


class ZoneAllocationUpdate(BaseModel):
    zone_name: Optional[str] = None
    task_type: Optional[str] = None
    shift: Optional[str] = None
    assigned: Optional[int] = None
    capacity: Optional[int] = None


class ZoneAllocationRead(ZoneAllocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ---- Performance Goal ----
class PerformanceGoalBase(BaseModel):
    employee_id: int
    task: str
    target: float = 0


class PerformanceGoalCreate(PerformanceGoalBase):
    pass


class PerformanceGoalUpdate(BaseModel):
    employee_id: Optional[int] = None
    task: Optional[str] = None
    target: Optional[float] = None


class PerformanceGoalRead(PerformanceGoalBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
