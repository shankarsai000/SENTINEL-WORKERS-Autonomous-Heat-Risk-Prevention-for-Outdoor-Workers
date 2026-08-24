import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine import evaluate_worker_risk
from app.models import WorkerContextInput, ThermalObservationInput

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "risk-service"


def test_capabilities_endpoint():
    response = client.get("/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "DETERMINISTIC_CONTEXTUAL_V1" in data["supported_models"]


def test_worker_risk_scoring_normal_conditions():
    worker = WorkerContextInput(
        worker_id="WRK-0001",
        site_id="PHX-SITE-01",
        role="Laborer",
        task_intensity="LIGHT",
        risk_modifier="baseline",
        exposure_duration_mins=15,
        recent_recovery_mins=0,
    )
    obs = ThermalObservationInput(
        observation_id="OBS-01",
        site_id="PHX-SITE-01",
        timestamp="2026-08-24T06:00:00Z",
        temperature_c=28.0,
        humidity_pct=35.0,
        wet_bulb_c=18.0,
        solar_irradiance=100.0,
    )

    result = evaluate_worker_risk(worker, obs)
    assert result.level == "GREEN"
    assert result.score < 0.30
    assert "NORMAL_OPERATING_LIMITS" in result.reason_codes


def test_worker_risk_scoring_critical_conditions():
    worker = WorkerContextInput(
        worker_id="WRK-0042",
        site_id="PHX-SITE-02",
        role="Welder",
        task_intensity="HEAVY",
        risk_modifier="elevated",
        exposure_duration_mins=240,
        recent_recovery_mins=0,
    )
    obs = ThermalObservationInput(
        observation_id="OBS-02",
        site_id="PHX-SITE-02",
        timestamp="2026-08-24T14:00:00Z",
        temperature_c=46.5,
        humidity_pct=18.0,
        wet_bulb_c=32.5,
        solar_irradiance=980.0,
    )

    result = evaluate_worker_risk(worker, obs)
    assert result.level == "CRITICAL"
    assert result.score >= 0.85
    assert "CRITICAL_HEAT_STRESS_IMMOBILIZATION_RISK" in result.reason_codes
    assert "HEAVY_METABOLIC_LOAD" in result.reason_codes
    assert "PROLONGED_EXPOSURE_180MIN" in result.reason_codes
    assert result.forecast_breach_time is not None


def test_batch_evaluation_api():
    payload = {
        "site_id": "PHX-SITE-01",
        "observation": {
            "observation_id": "OBS-BATCH",
            "site_id": "PHX-SITE-01",
            "timestamp": "2026-08-24T12:00:00Z",
            "temperature_c": 41.0,
            "humidity_pct": 25.0,
            "wet_bulb_c": 26.0,
            "solar_irradiance": 800.0,
        },
        "workers": [
            {
                "worker_id": "WRK-0001",
                "site_id": "PHX-SITE-01",
                "role": "Laborer",
                "task_intensity": "LIGHT",
                "risk_modifier": "baseline",
                "exposure_duration_mins": 30,
                "recent_recovery_mins": 0,
            },
            {
                "worker_id": "WRK-0002",
                "site_id": "PHX-SITE-01",
                "role": "Carpenter",
                "task_intensity": "HEAVY",
                "risk_modifier": "elevated",
                "exposure_duration_mins": 180,
                "recent_recovery_mins": 0,
            },
        ],
    }

    response = client.post("/evaluate-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["evaluated_count"] == 2
    assert len(data["risk_states"]) == 2
    # Carpenter with heavy intensity and 180 mins exposure should have higher risk than Light laborer
    assert data["risk_states"][1]["score"] > data["risk_states"][0]["score"]
