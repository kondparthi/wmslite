"""
SQLAlchemy models for the Labor Management module's 6 tabs.

Unlike Inbound/Outbound, nothing here touches InventoryBalance or writes an
InventoryTransaction — labor tracking is a separate concern (who's doing
what, where, and how well), so every entity is a plain header row managed
through generic CRUD (app/routers/generic_crud.py), the same pattern used
for Allocation Strategies / Outbound Tasks / Outbound Appointments:

 - Employee            the workforce master (Employee Master tab)
 - LaborShiftLog        a clock-in -> break/resume -> clock-out session
                        (Labor Tracking tab; "Attendance" derives its daily
                        present/absent/late view from these plus
                        AttendanceRecord corrections)
 - AttendanceRecord     one day's attendance record per employee, editable
                        via the Manual Entry / Correct actions
 - ZoneAllocation       assigned-vs-capacity headcount per zone/task/shift
                        (Allocation tab)
 - PerformanceGoal      the daily unit target per employee+task (Performance
                        tab); "actual" and "efficiency" are computed on the
                        frontend from LaborShiftLog.units_completed rather
                        than stored, so they can never drift out of sync
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Employee(Base):
    __tablename__ = "labor_employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. EMP001
    first_name = Column(String(60), nullable=False)
    last_name = Column(String(60), nullable=False)
    role = Column(String(30), default="Associate")  # Associate|Specialist|Lead|Manager|Supervisor
    department = Column(String(30), nullable=True)  # Outbound|Inbound|Inventory|Admin
    shift = Column(String(20), default="Morning")  # Morning|Afternoon|Night
    status = Column(String(20), default="Active")  # Active|Inactive|On Leave
    phone = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    skills = Column(String(255), nullable=True)  # comma-separated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shift_logs = relationship("LaborShiftLog", back_populates="employee", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="employee", cascade="all, delete-orphan")
    performance_goals = relationship("PerformanceGoal", back_populates="employee", cascade="all, delete-orphan")


class LaborShiftLog(Base):
    __tablename__ = "labor_shift_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("labor_employees.id"), nullable=False)
    activity = Column(String(30), nullable=False)  # Picking|Packing|Receiving|Cycle Count|Putaway|...
    zone = Column(String(50), nullable=True)
    clock_in = Column(DateTime, default=datetime.utcnow)
    clock_out = Column(DateTime, nullable=True)
    units_completed = Column(Float, default=0)
    status = Column(String(20), default="Active")  # Active|Break|Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="shift_logs")


class AttendanceRecord(Base):
    __tablename__ = "labor_attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("labor_employees.id"), nullable=False)
    work_date = Column(DateTime, nullable=False)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    status = Column(String(20), default="Present")  # Present|Absent|Late
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_records")


class ZoneAllocation(Base):
    __tablename__ = "labor_zone_allocations"

    id = Column(Integer, primary_key=True, index=True)
    zone_name = Column(String(80), nullable=False)
    task_type = Column(String(30), nullable=False)  # Inbound|Outbound|Inventory
    shift = Column(String(20), default="Morning")
    assigned = Column(Integer, default=0)
    capacity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PerformanceGoal(Base):
    __tablename__ = "labor_performance_goals"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("labor_employees.id"), nullable=False)
    task = Column(String(30), nullable=False)  # Picking|Packing|Receiving|Cycle Count|Putaway|...
    target = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="performance_goals")
