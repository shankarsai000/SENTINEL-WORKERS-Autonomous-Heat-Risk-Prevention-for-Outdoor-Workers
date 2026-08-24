"""
Sentinel Workers - FastAPI Risk Evaluation Microservice
Phase P0 Foundation
"""

import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import (
    WorkerEvaluationRequest,
    BatchEvaluationRequest,
    BatchEvaluationResponse,
    RiskStateOutput,
)
from app.engine import evaluate_worker_risk

app = FastAPI(
    title="Sentinel Workers - Risk Assessment Service",
    version="0.1.0",
    description="Stateless deterministic worker thermal-risk scoring engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "risk-service",
        "version": "0.1.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


@app.get("/capabilities")
def get_capabilities():
    return {
        "service": "risk-service",
        "supported_models": ["DETERMINISTIC_CONTEXTUAL_V1"],
        "max_batch_size": 1000,
        "metrics": {
            "version": "0.1.0",
            "p0_offline_deterministic": True,
        },
    }


@app.post("/evaluate-worker", response_model=RiskStateOutput)
def evaluate_worker(request: WorkerEvaluationRequest):
    try:
        return evaluate_worker_risk(request.worker, request.observation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk evaluation error: {str(e)}")


@app.post("/evaluate-batch", response_model=BatchEvaluationResponse)
def evaluate_batch(request: BatchEvaluationRequest):
    try:
        results = [
            evaluate_worker_risk(w, request.observation)
            for w in request.workers
        ]
        return BatchEvaluationResponse(
            site_id=request.site_id,
            evaluated_count=len(results),
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            risk_states=results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch evaluation error: {str(e)}")
