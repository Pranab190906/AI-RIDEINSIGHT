from fastapi import APIRouter
from app.data.processor import processor
from app.data.fingerprint import fingerprint_analyzer
from app.forecasting.time_series import forecaster
from app.schemas.all_schemas import (
    ExecutiveOverviewResponse,
    CancellationFingerprintResponse,
    DailyTrendPoint
)

router = APIRouter(prefix="/analysis", tags=["Performance & Fingerprint Analysis"])

@router.get("/overview", response_model=ExecutiveOverviewResponse)
def get_executive_overview():
    summary_data = processor.get_summary()
    daily_df = forecaster.get_daily_series()
    
    daily_trends = []
    for _, row in daily_df.iterrows():
        t = int(row["total_bookings"])
        s = int(row["completed_rides"])
        cd = int(row["canceled_by_driver"])
        cc = int(row["canceled_by_customer"])
        dnf = int(row["driver_not_found"])
        
        comp_rate = round(s / t * 100, 2) if t > 0 else 0.0
        eligible = s + cd + cc
        canc_rate = round((cd + cc) / eligible * 100, 2) if eligible > 0 else 0.0
        
        daily_trends.append(DailyTrendPoint(
            date=str(row["date_only"]),
            total=t,
            success=s,
            canceled_driver=cd,
            canceled_customer=cc,
            driver_not_found=dnf,
            completion_rate=comp_rate,
            cancellation_rate=canc_rate
        ))

    status_dist = [
        {"name": k, "value": v}
        for k, v in summary_data["status_distribution"].items()
    ]
    
    vehicle_dist = [
        {"name": k, "value": v}
        for k, v in summary_data["vehicle_distribution"].items()
    ]

    return {
        "summary": summary_data,
        "daily_trends": daily_trends,
        "status_distribution": status_dist,
        "vehicle_distribution": vehicle_dist
    }

@router.get("/fingerprint", response_model=CancellationFingerprintResponse)
def get_cancellation_fingerprint():
    return fingerprint_analyzer.calculate_fingerprint()
