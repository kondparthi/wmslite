"""
User model for authentication. Kept separate from Master Data's
"material owner"/"supplier" contact fields — this is a login account.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(50), nullable=False, index=True)  # "Warehouse / Tenant ID" on login
    username = Column(String(100), nullable=False, index=True)
    email = Column(String(150), nullable=False, index=True)
    full_name = Column(String(150), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Warehouse Manager")
    status = Column(String(20), default="Active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Admin Configuration's Users & Roles tab (app/routers/admin_config.py) —
    # added here rather than a second "AdminUser" table (see
    # app/models/admin_config.py's docstring).
    warehouse_id = Column(Integer, ForeignKey("admin_warehouses.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("admin_shift_schedules.id"), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    locked = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
