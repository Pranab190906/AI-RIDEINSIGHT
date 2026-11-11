from fastapi import APIRouter, HTTPException, Query
from app.forecasting.time_series import forecaster
from app.schemas.all_schemas import ForecastResponse

router = APIRouter(prefix="/forecast", tags=["Time-Series Forecasting"])

@router.get("/daily", response_model=ForecastResponse)
def get_daily_forecast(horizon_days: int = Query(default=7, ge=3, le=30)):
    try:
        return forecaster.generate_forecast(horizon_days=horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")
