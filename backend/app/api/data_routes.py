import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from app.core.config import settings
from app.data.processor import processor
from app.schemas.all_schemas import (
    DatasetPreviewResponse,
    DatasetSummaryResponse,
    DataQualityResponse,
    LeakageAuditResponse
)

router = APIRouter(prefix="/data", tags=["Dataset Operations"])

@router.post("/upload", response_model=DatasetSummaryResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")
    
    dest_path = settings.DATA_DIR / file.filename
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Re-initialize processor with new file
        processor.csv_path = dest_path
        processor.load_raw_data()
        
        # Reset any cached daily series or explainer cache
        from app.forecasting.time_series import forecaster
        from app.explainability.shap_explainer import explainer
        forecaster._daily_cache = None
        explainer._global_cache.clear()
        
        return processor.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded CSV: {str(e)}")

@router.get("/preview", response_model=DatasetPreviewResponse)
def get_preview(limit: int = 20):
    df = processor.get_dataframe()
    sample_records = df.head(limit).fillna("").to_dict(orient="records")
    return {
        "filename": processor.csv_path.name,
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "columns": list(df.columns),
        "sample_records": sample_records
    }

@router.get("/summary", response_model=DatasetSummaryResponse)
def get_summary():
    return processor.get_summary()

@router.get("/quality", response_model=DataQualityResponse)
def get_quality():
    return processor.get_data_quality()

@router.get("/leakage-audit", response_model=LeakageAuditResponse)
def get_leakage_audit():
    return processor.get_leakage_audit()

@router.get("/export")
def export_dataset_summary():
    summary = processor.get_summary()
    csv_content = (
        "Metric,Value\n"
        f"Total Bookings,{summary['total_bookings']}\n"
        f"Successful Rides,{summary['successful_rides']}\n"
        f"Canceled by Driver,{summary['canceled_by_driver']}\n"
        f"Canceled by Customer,{summary['canceled_by_customer']}\n"
        f"Driver Not Found,{summary['driver_not_found']}\n"
        f"Completion Rate (%),{summary['completion_rate']}\n"
        f"Cancellation Rate (%),{summary['cancellation_rate']}\n"
        f"Unsuccessful Rate (%),{summary['unsuccessful_rate']}\n"
        f"Average Booking Value,{summary['avg_booking_value']}\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rideinsight_dataset_summary.csv"}
    )
