import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Query
from app.core.config import settings
from app.data.processor import processor
from app.schemas.all_schemas import (
    DatasetPreviewResponse,
    DatasetSummaryResponse,
    DataQualityResponse,
    LeakageAuditResponse,
    DatasetUploadResponse,
    DatasetListResponse,
    MapColumnsRequest,
    FieldOptionsResponse
)

router = APIRouter(prefix="/data", tags=["Dataset Operations"])

@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")
        
    try:
        content = await file.read()
        res = processor.register_uploaded_csv(file.filename, content)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded CSV: {str(e)}")

@router.get("/datasets", response_model=DatasetListResponse)
def list_datasets():
    return processor.list_datasets()

@router.get("/datasets/{dataset_id}")
def get_dataset(dataset_id: str):
    lst = processor.list_datasets()
    for d in lst["datasets"]:
        if d["id"] == dataset_id:
            return d
    raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

@router.post("/datasets/{dataset_id}/activate")
def activate_dataset(dataset_id: str):
    try:
        summary = processor.activate_dataset(dataset_id)
        return {
            "status": "success",
            "active_dataset_id": dataset_id,
            "summary": summary
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/datasets/{dataset_id}/map-columns")
def map_columns(dataset_id: str, req: MapColumnsRequest):
    try:
        mapping_dict = req.mapping.model_dump()
        return processor.update_column_mapping(dataset_id, mapping_dict)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    try:
        processor.delete_dataset(dataset_id)
        return {"status": "success", "message": f"Dataset '{dataset_id}' deleted."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/field-options", response_model=FieldOptionsResponse)
def get_field_options():
    return processor.get_field_options()

@router.get("/preview", response_model=DatasetPreviewResponse)
def get_preview(limit: int = 20, dataset_id: Optional[str] = None):
    if dataset_id and dataset_id in processor._datasets:
        meta = processor._datasets[dataset_id]
        df = meta["df"] if meta["df"] is not None else processor._read_csv_safe(meta["path"])
        filename = meta["filename"]
    else:
        df = processor.get_dataframe()
        filename = processor.csv_path.name
        dataset_id = processor.active_dataset_id
        
    sample_records = df.head(limit).fillna("").to_dict(orient="records")
    col_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
    
    return {
        "filename": filename,
        "dataset_id": dataset_id,
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "columns": list(df.columns),
        "column_types": col_types,
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
        f"Dataset ID,{summary.get('dataset_id', 'default')}\n"
        f"Filename,{summary['filename']}\n"
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
        headers={"Content-Disposition": f"attachment; filename=rideinsight_{summary.get('dataset_id', 'summary')}.csv"}
    )
