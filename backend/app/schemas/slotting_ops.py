from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ================= Slotting Strategies =================
class SlottingStrategyBase(BaseModel):
    name: str
    base_logic: str = "Velocity-Based"
    lookback_days: int = 90
    target_zones: Optional[str] = None
    status: str = "Active"


class SlottingStrategyCreate(SlottingStrategyBase):
    pass


class SlottingStrategyUpdate(BaseModel):
    name: Optional[str] = None
    base_logic: Optional[str] = None
    lookback_days: Optional[int] = None
    target_zones: Optional[str] = None
    status: Optional[str] = None


class SlottingStrategyRead(SlottingStrategyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ================= Simulations =================
class RunSimulationRequest(BaseModel):
    strategy_id: int


class SimulationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sim_number: str
    strategy_id: int
    strategy_name: str
    misplaced_count: int
    efficiency_gain_pct: float
    labor_saving_hours: float
    status: str
    created_at: datetime
    applied_at: Optional[datetime] = None


# ================= Velocity Analysis =================
class VelocityBucket(BaseModel):
    classification: str  # A | B | C | Dead Stock
    count: int
    pick_count: int


class MaterialVelocity(BaseModel):
    material_id: int
    sku: str
    description: str
    pick_count: int
    classification: str
    location_code: Optional[str] = None
    location_type: Optional[str] = None


# ================= Storage Utilization =================
class ZoneUtilization(BaseModel):
    zone: str
    zone_type: str
    on_hand_units: float
    capacity_units: float
    utilization_pct: int


class HoneycombSummary(BaseModel):
    honeycombing_pct: int
    partial_pallets: int
    consolidatable: int
    total_assigned: int


# ================= Re-slotting Tasks =================
class ReslottingTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_number: str
    material_id: int
    sku: str
    description: str
    from_location_code: str
    to_location_code: str
    reason: str
    priority: str
    assignee: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class AssignReslottingRequest(BaseModel):
    assignee: str


# ================= Optimization Reports =================
class OptimizationImpact(BaseModel):
    travel_time_reduction_pct: float
    space_recovered_units: float
    labor_efficiency_pct: float
    applied_simulations: int
    completed_tasks: int
