import json
import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import PredictionRecord
from app.schemas.all_schemas import MonitoringSummaryResponse, OutcomeFeedbackRequest

router = APIRouter(prefix="/monitoring", tags=["Model Observability & Monitoring"])

@router.get("/summary", response_model=MonitoringSummaryResponse)
def get_monitoring_summary(db: Session = Depends(get_db)):
    records = db.query(PredictionRecord).order_by(PredictionRecord.created_at.desc()).all()
    total_preds = len(records)
    
    evaluated = [r for r in records if r.actual_outcome is not None]
    evaluated_count = len(evaluated)
    pending_count = total_preds - evaluated_count
    
    acc, prec, rec, f1 = None, None, None, None
    if evaluated_count > 0:
        tp, fp, tn, fn = 0, 0, 0, 0
        for r in evaluated:
            actual_is_cancel = 1 if "cancel" in r.actual_outcome.lower() else 0
            pred_is_cancel = 1 if r.cancellation_probability >= r.threshold_used else 0
            
            if pred_is_cancel == 1 and actual_is_cancel == 1:
                tp += 1
            elif pred_is_cancel == 1 and actual_is_cancel == 0:
                fp += 1
            elif pred_is_cancel == 0 and actual_is_cancel == 0:
                tn += 1
            else:
                fn += 1
                
        acc = round((tp + tn) / evaluated_count, 4)
        prec = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
        rec = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
        f1 = round(2 * (prec * rec) / (prec + rec), 4) if (prec + rec) > 0 else 0.0

    recent_records = []
    for r in records[:50]: # last 50 predictions
        try:
            feats = json.loads(r.input_features) if r.input_features else {}
        except:
            feats = {}
            
        recent_records.append({
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "features": feats,
            "cancellation_probability": r.cancellation_probability,
            "success_probability": r.success_probability,
            "risk_category": r.risk_category,
            "threshold_used": r.threshold_used,
            "actual_outcome": r.actual_outcome,
            "feedback_at": r.feedback_at.isoformat() if r.feedback_at else None
        })

    return {
        "total_predictions": total_preds,
        "evaluated_predictions": evaluated_count,
        "pending_predictions": pending_count,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "recent_records": recent_records
    }

@router.post("/record-outcome")
def record_actual_outcome(req: OutcomeFeedbackRequest, db: Session = Depends(get_db)):
    record = db.query(PredictionRecord).filter(PredictionRecord.id == req.prediction_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction record not found.")
        
    record.actual_outcome = req.actual_outcome
    record.feedback_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(record)
    
    return {
        "status": "success",
        "prediction_id": record.id,
        "actual_outcome": record.actual_outcome,
        "feedback_at": record.feedback_at.isoformat()
    }
