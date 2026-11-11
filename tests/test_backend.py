import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.data.processor import processor
from app.ml.trainer import trainer
from app.forecasting.time_series import forecaster
from app.forecasting.scenarios import simulator
from app.explainability.shap_explainer import explainer

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "RideInsight AI 2.0" in data["service"]

def test_data_summary():
    response = client.get("/api/data/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_bookings"] == 103024
    assert data["successful_rides"] == 63967
    assert data["canceled_by_driver"] == 18434
    assert data["canceled_by_customer"] == 10499
    assert data["driver_not_found"] == 10124
    assert data["completion_rate"] > 60.0

def test_data_quality():
    response = client.get("/api/data/quality")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 103024
    assert "Ride_Distance" in data["column_types"]

def test_data_leakage_audit():
    response = client.get("/api/data/leakage-audit")
    assert response.status_code == 200
    data = response.json()
    assert "Ride_Distance" in [item["feature"] for item in data["excluded_features"]]
    assert "Vehicle_Type" in data["included_features"]

def test_analysis_overview():
    response = client.get("/api/analysis/overview")
    assert response.status_code == 200
    data = response.json()
    assert len(data["daily_trends"]) > 0
    assert len(data["vehicle_distribution"]) > 0

def test_cancellation_fingerprint():
    response = client.get("/api/analysis/fingerprint")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_cancellation_rate"] > 0
    assert len(data["segments_by_vehicle"]) > 0
    assert len(data["segments_by_pickup"]) > 0

def test_model_training_and_comparison():
    # Train Logistic Regression and Decision Tree for fast testing
    response = client.post("/api/models/train", json={
        "split_type": "random",
        "test_size": 0.20,
        "tune_hyperparameters": False,
        "selected_algorithms": ["Logistic Regression", "Decision Tree"]
    })
    assert response.status_code == 200
    data = response.json()
    assert "Logistic Regression" in data["models"]
    assert "Decision Tree" in data["models"]
    assert data["models"]["Decision Tree"]["accuracy"] > 0.50

def test_prediction_endpoint():
    payload = {
        "booking_time": "14:30",
        "day_of_week": "Friday",
        "vehicle_type": "Prime Sedan",
        "pickup_location": "Tumkur Road",
        "drop_location": "RT Nagar",
        "booking_value": 450.0,
        "decision_threshold": 0.50
    }
    response = client.post("/api/models/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["cancellation_probability"] <= 1.0
    assert 0.0 <= data["success_probability"] <= 1.0
    assert round(data["cancellation_probability"] + data["success_probability"], 2) == 1.0
    assert data["risk_category"] in ["Low Risk", "Medium Risk", "High Risk"]
    assert data["predicted_class"] in [0, 1]

def test_shap_global():
    response = client.get("/api/explain/shap-global")
    assert response.status_code == 200
    data = response.json()
    assert len(data["top_features"]) > 0
    assert "method" in data

def test_shap_local():
    payload = {
        "booking_time": "18:00",
        "day_of_week": "Saturday",
        "vehicle_type": "Auto",
        "pickup_location": "Magadi Road",
        "drop_location": "Varthur",
        "booking_value": 180.0
    }
    response = client.post("/api/explain/shap-local", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["contributions"]) > 0
    assert "base_value" in data

def test_forecasting():
    response = client.get("/api/forecast/daily?horizon_days=7")
    assert response.status_code == 200
    data = response.json()
    assert data["forecast_horizon_days"] == 7
    assert data["mae"] > 0
    assert data["rmse"] > 0
    assert len(data["points"]) > 30

def test_scenario_simulation():
    payload = {
        "name": "Custom Efficiency Scenario",
        "total_bookings": 103024,
        "current_cancellation_rate": 31.14,
        "proposed_reduction_percent": 3.0,
        "notes": "Test scenario"
    }
    response = client.post("/api/scenarios/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["additional_completed_rides"] == int(round(103024 * 0.03))
    assert data["scenario_cancellation_rate"] == 28.14
    assert data["percentage_improvement"] > 0

def test_recommendations():
    response = client.get("/api/insights/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert data["total_recommendations"] >= 4
    for item in data["items"]:
        assert item["observed_pattern"] != ""
        assert item["suggested_action"] != ""
        assert item["confidence"] in ["High", "Medium", "Moderate"]

def test_invalid_file_upload():
    response = client.post(
        "/api/data/upload",
        files={"file": ("invalid.txt", b"random content", "text/plain")}
    )
    assert response.status_code == 400
