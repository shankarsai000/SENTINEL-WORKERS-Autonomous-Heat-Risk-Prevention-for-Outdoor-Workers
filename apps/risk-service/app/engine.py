"""
Sentinel Workers - Deterministic Risk Engine & Contextual Scoring
"""

import datetime
from typing import List, Tuple
from app.models import (
    WorkerContextInput,
    ThermalObservationInput,
    RiskStateOutput,
    RiskLevel,
)


def evaluate_worker_risk(
    worker: WorkerContextInput,
    obs: ThermalObservationInput
) -> RiskStateOutput:
    """
    Computes deterministic contextual risk score:
    risk_score = w_env * env_norm + w_exp * exp_norm + w_task * task_norm + w_mod * mod_norm - w_rec * rec_norm
    """
    # 1. Environmental component (normalized against 25°C - 50°C scale)
    temp = obs.temperature_c
    wbgt_proxy = obs.wet_bulb_c
    # Effective heat metric combines ambient and wet-bulb
    effective_temp = 0.7 * wbgt_proxy + 0.3 * temp
    env_norm = max(0.0, min(1.0, (effective_temp - 25.0) / 20.0))

    # 2. Exposure duration component (normalized against 0 - 360 mins)
    exp_norm = max(0.0, min(1.0, worker.exposure_duration_mins / 360.0))

    # 3. Task intensity component
    intensity_weights = {
        'LIGHT': 0.15,
        'MODERATE': 0.50,
        'HEAVY': 0.90,
    }
    task_norm = intensity_weights.get(worker.task_intensity, 0.5)

    # 4. Abstract risk modifier component
    modifier_weights = {
        'baseline': 0.1,
        'acclimatizing': 0.5,
        'elevated': 0.8,
    }
    mod_norm = modifier_weights.get(worker.risk_modifier, 0.1)

    # 5. Recovery credit
    rec_norm = max(0.0, min(1.0, worker.recent_recovery_mins / 45.0))

    # Composite weighted scoring
    w_env = 0.45
    w_exp = 0.25
    w_task = 0.20
    w_mod = 0.10
    w_rec = 0.15

    raw_score = (
        w_env * env_norm +
        w_exp * exp_norm +
        w_task * task_norm +
        w_mod * mod_norm -
        w_rec * rec_norm
    )

    # Ensure hard physical threshold guardrails
    if temp >= 45.0 or effective_temp >= 33.0:
        raw_score = max(raw_score, 0.86)
    elif temp >= 42.0 or effective_temp >= 31.0:
        raw_score = max(raw_score, 0.72)

    score = round(max(0.0, min(1.0, raw_score)), 3)

    # Determine risk level and reason codes
    level, reason_codes = _determine_level_and_reasons(score, temp, worker, obs)

    # Confidence calculation incorporating observation confidence & freshness
    freshness_penalty = min(0.5, (obs.freshness_seconds / 600.0) * 0.5)
    confidence = round(max(0.2, min(1.0, obs.confidence - freshness_penalty)), 2)

    # Forecast breach estimation
    forecast_breach = None
    if level in ['ELEVATED', 'HIGH', 'CRITICAL']:
        mins_ahead = 15 if level == 'CRITICAL' else (30 if level == 'HIGH' else 45)
        dt = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=mins_ahead)
        forecast_breach = dt.isoformat()

    return RiskStateOutput(
        worker_id=worker.worker_id,
        site_id=worker.site_id,
        timestamp=obs.timestamp,
        score=score,
        level=level,
        confidence=confidence,
        reason_codes=reason_codes,
        forecast_breach_time=forecast_breach,
        exposure_duration_mins=worker.exposure_duration_mins,
    )


def _determine_level_and_reasons(
    score: float,
    temp_c: float,
    worker: WorkerContextInput,
    obs: ThermalObservationInput
) -> Tuple[RiskLevel, List[str]]:
    reasons: List[str] = []

    if temp_c >= 44.0:
        reasons.append("EXTREME_AMBIENT_HEAT")
    elif temp_c >= 38.0:
        reasons.append("HIGH_TEMPERATURE")
    elif temp_c >= 32.0:
        reasons.append("ELEVATED_HEAT_CONDITIONS")

    if obs.solar_irradiance > 800:
        reasons.append("HIGH_SOLAR_RADIATION")

    if worker.exposure_duration_mins >= 180:
        reasons.append("PROLONGED_EXPOSURE_180MIN")
    elif worker.exposure_duration_mins >= 90:
        reasons.append("MODERATE_EXPOSURE_90MIN")

    if worker.task_intensity == "HEAVY":
        reasons.append("HEAVY_METABOLIC_LOAD")

    if worker.risk_modifier == "elevated":
        reasons.append("ELEVATED_RISK_MODIFIER")
    elif worker.risk_modifier == "acclimatizing":
        reasons.append("UNACCLIMATIZED_WORKER")

    if score >= 0.85:
        level: RiskLevel = "CRITICAL"
        reasons.insert(0, "CRITICAL_HEAT_STRESS_IMMOBILIZATION_RISK")
    elif score >= 0.70:
        level = "HIGH"
        reasons.insert(0, "HIGH_RISK_IMMEDIATE_ACTION_REQUIRED")
    elif score >= 0.50:
        level = "ELEVATED"
        reasons.insert(0, "ELEVATED_RISK_SCHEDULED_REST_REQUIRED")
    elif score >= 0.30:
        level = "WATCH"
        reasons.insert(0, "WATCH_HYDRATION_MONITORING")
    else:
        level = "GREEN"
        reasons.append("NORMAL_OPERATING_LIMITS")

    return level, reasons
