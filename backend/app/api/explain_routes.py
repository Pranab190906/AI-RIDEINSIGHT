from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
from app.explainability.shap_explainer import explainer
from app.schemas.all_schemas import ShapGlobalResponse, ShapLocalResponse, PredictRequest

router = APIRouter(prefix="/explain", tags=["Explainable AI (SHAP)"])

@router.get("/shap-global", response_model=ShapGlobalResponse)
def get_global_shap(model_name: Optional[str] = None):
    try:
        return explainer.get_global_importance(model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate SHAP global importance: {str(e)}")

@router.post("/shap-local", response_model=ShapLocalResponse)
def get_local_shap(req: PredictRequest, model_name: Optional[str] = None):
    try:
        # Parse hour & minute
        try:
            parts = req.booking_time.split(":")
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
        except:
            h, m = 12, 0
            
        is_wk = 1 if req.day_of_week.strip().lower() in ["saturday", "sunday"] else 0
        
        input_data = {
            "Booking_Hour": h,
            "Booking_Minute": m,
            "Day_Of_Week": req.day_of_week.strip(),
            "Is_Weekend": is_wk,
            "Vehicle_Type": req.vehicle_type.strip(),
            "Pickup_Location": req.pickup_location.strip(),
            "Drop_Location": req.drop_location.strip(),
            "Booking_Value": float(req.booking_value)
        }
        
        return explainer.explain_prediction(input_data, model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate local SHAP explanation: {str(e)}")
