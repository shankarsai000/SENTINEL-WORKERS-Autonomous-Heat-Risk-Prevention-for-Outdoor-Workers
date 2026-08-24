"""
Sentinel Workers - Python Risk Service Data Contracts
Master Build Reference v2.0
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


WorkerRole = Literal['Laborer', 'Carpenter', 'Electrician', 'Welder', 'Supervisor']
TaskIntensity = Literal['LIGHT', 'MODERATE', 'HEAVY']
RiskModifier = Literal['baseline', 'elevated', 'acclimatizing']
RiskLevel = Literal['GREEN', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']


class ThermalObservationInput(BaseModel):
    observation_id: str
    site_id: str
    timestamp: str
    temperature_c: float
    humidity_pct: float
    wet_bulb_c: float
    apparent_temperature_c: Optional[float] = None
    solar_irradiance: float = 0.0
    source: str = "simulation"
    freshness_seconds: int = 0
    confidence: float = 1.0


class WorkerContextInput(BaseModel):
    worker_id: str
    site_id: str
    role: WorkerRole
    task_intensity: TaskIntensity
    risk_modifier: RiskModifier = "baseline"
    exposure_duration_mins: int = 0
    recent_recovery_mins: int = 0


class WorkerEvaluationRequest(BaseModel):
    worker: WorkerContextInput
    observation: ThermalObservationInput


class BatchEvaluationRequest(BaseModel):
    site_id: str
    observation: ThermalObservationInput
    workers: List[WorkerContextInput]


class RiskStateOutput(BaseModel):
    worker_id: str
    site_id: str
    timestamp: str
    score: float = Field(ge=0.0, le=1.0)
    level: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    reason_codes: List[str]
    forecast_breach_time: Optional[str] = None
    exposure_duration_mins: int


class BatchEvaluationResponse(BaseModel):
    site_id: str
    evaluated_count: int
    timestamp: str
    risk_states: List[RiskStateOutput]
