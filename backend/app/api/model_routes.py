import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.ml.trainer import trainer
from app.database.session import get_db
from app.database.models import PredictionRecord
from app.schemas.all_schemas import (
    TrainRequest,
    ModelComparisonResponse,
    PredictRequest,
    PredictResponse
)

router = APIRouter(prefix="/models", tags=["Machine Learning Engine"])

@router.post("/train", response_model=ModelComparisonResponse)
def train_models(req: TrainRequest):
    try:
        comparison = trainer.train_and_evaluate_all(
            split_type=req.split_type,
            test_size=req.test_size,
            tune_hyperparameters=req.tune_hyperparameters,
            selected_algorithms=req.selected_algorithms
        )
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.get("/compare", response_model=ModelComparisonResponse)
def compare_models():
    try:
        return trainer.get_comparison()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch model comparison: {str(e)}")

@router.get("/status")
def get_model_status():
    return {
        "active_model": trainer.active_model_name,
        "models_dir": str(trainer.models_dir),
        "is_ready": (trainer.models_dir / "active_model.joblib").exists()
    }

@router.post("/select-active")
def select_active_model(model_name: str):
    try:
        updated_name = trainer.set_active_model(model_name)
        return {"status": "success", "active_model": updated_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/predict", response_model=PredictResponse)
def predict_cancellation(req: PredictRequest, db: Session = Depends(get_db)):
    try:
        threshold = req.decision_threshold if req.decision_threshold is not None else 0.50
        result = trainer.predict_single(
            booking_time=req.booking_time,
            day_of_week=req.day_of_week,
            vehicle_type=req.vehicle_type,
            pickup_location=req.pickup_location,
            drop_location=req.drop_location,
            booking_value=req.booking_value,
            threshold=threshold
        )
        
        # Save prediction record in SQLite DB for monitoring
        pred_record = PredictionRecord(
            input_features=json.dumps(result["input_features"]),
            cancellation_probability=result["cancellation_probability"],
            success_probability=result["success_probability"],
            risk_category=result["risk_category"],
            threshold_used=result["decision_threshold"]
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
