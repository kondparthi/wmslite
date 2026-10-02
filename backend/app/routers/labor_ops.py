"""
Labor Management's 6 tabs. Unlike Inbound/Outbound, nothing here moves
inventory, so every entity is plain generic CRUD (app/routers/generic_crud.py)
— the same pattern already used for Allocation Strategies / Outbound Tasks /
Outbound Appointments. See app/models/labor_ops.py for what each entity
covers and why "actual"/"efficiency" on the Performance tab are computed on
the frontend from LaborShiftLog rather than stored.
"""
from fastapi import APIRouter

from app.models import labor_ops as m
from app.routers.generic_crud import make_crud_router
from app.schemas import labor_ops as s

router = APIRouter()

router.include_router(make_crud_router(
    model=m.Employee, create_schema=s.EmployeeCreate, update_schema=s.EmployeeUpdate,
    read_schema=s.EmployeeRead, prefix="/labor-employees", tag="Employee",
))
router.include_router(make_crud_router(
    model=m.LaborShiftLog, create_schema=s.LaborShiftLogCreate, update_schema=s.LaborShiftLogUpdate,
    read_schema=s.LaborShiftLogRead, prefix="/labor-shift-logs", tag="Labor Shift Log",
))
router.include_router(make_crud_router(
    model=m.AttendanceRecord, create_schema=s.AttendanceRecordCreate, update_schema=s.AttendanceRecordUpdate,
    read_schema=s.AttendanceRecordRead, prefix="/labor-attendance", tag="Attendance Record",
))
router.include_router(make_crud_router(
    model=m.ZoneAllocation, create_schema=s.ZoneAllocationCreate, update_schema=s.ZoneAllocationUpdate,
    read_schema=s.ZoneAllocationRead, prefix="/labor-zone-allocations", tag="Zone Allocation",
))
router.include_router(make_crud_router(
    model=m.PerformanceGoal, create_schema=s.PerformanceGoalCreate, update_schema=s.PerformanceGoalUpdate,
    read_schema=s.PerformanceGoalRead, prefix="/labor-performance-goals", tag="Performance Goal",
))
