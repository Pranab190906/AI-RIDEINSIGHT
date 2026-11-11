
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Response

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


# --------------------------------------------------
# UPLOAD CSV DATASET
# --------------------------------------------------

@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_csv(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files (.csv) are supported."
        )

    saved_path = None

    try:
        max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "250"))
        max_upload_bytes = max_upload_mb * 1024 * 1024

        safe_filename = Path(file.filename).name

        dataset_id = f"ds_{uuid.uuid4().hex[:12]}"

        saved_path = (
            processor.uploads_dir /
            f"{dataset_id}_{safe_filename}"
        )

        total_size = 0

        # Stream the upload in 1 MB chunks
        with open(saved_path, "wb") as output:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > max_upload_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds the maximum upload "
                            f"limit of {max_upload_mb} MB."
                        )
                    )

                output.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty."
            )

        # Register the uploaded file with the processor
        result = processor.register_uploaded_csv_path(
            filename=safe_filename,
            saved_path=saved_path,
            file_size=total_size
        )

        return result

    except HTTPException:
        if saved_path and saved_path.exists():
            saved_path.unlink(missing_ok=True)
        raise

    except ValueError as exc:
        if saved_path and saved_path.exists():
            saved_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    except Exception as exc:
        if saved_path and saved_path.exists():
            saved_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload CSV: {str(exc)}"
        )

    finally:
        await file.close()


# --------------------------------------------------
# LIST DATASETS
# --------------------------------------------------

@router.get("/datasets", response_model=DatasetListResponse)
def list_datasets():
    return processor.list_datasets()


# --------------------------------------------------
# GET DATASET DETAILS
# --------------------------------------------------

@router.get("/datasets/{dataset_id}")
def get_dataset(dataset_id: str):

    lst = processor.list_datasets()

    for dataset in lst["datasets"]:
        if dataset["id"] == dataset_id:
            return dataset

    raise HTTPException(
        status_code=404,
        detail=f"Dataset '{dataset_id}' not found."
    )


# --------------------------------------------------
# ACTIVATE DATASET
# --------------------------------------------------

@router.post("/datasets/{dataset_id}/activate")
def activate_dataset(dataset_id: str):

    try:
        summary = processor.activate_dataset(dataset_id)

        return {
            "status": "success",
            "active_dataset_id": dataset_id,
            "summary": summary
        }

    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# MAP DATASET COLUMNS
# --------------------------------------------------

@router.post("/datasets/{dataset_id}/map-columns")
def map_columns(dataset_id: str, req: MapColumnsRequest):

    try:
        mapping_dict = req.mapping.model_dump()

        return processor.update_column_mapping(
            dataset_id,
            mapping_dict
        )

    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# DELETE DATASET
# --------------------------------------------------

@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):

    try:
        processor.delete_dataset(dataset_id)

        return {
            "status": "success",
            "message": f"Dataset '{dataset_id}' deleted."
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# FIELD OPTIONS
# --------------------------------------------------

@router.get("/field-options", response_model=FieldOptionsResponse)
def get_field_options():
    return processor.get_field_options()


# --------------------------------------------------
# DATASET PREVIEW
# --------------------------------------------------

@router.get("/preview", response_model=DatasetPreviewResponse)
def get_preview(
    limit: int = 20,
    dataset_id: Optional[str] = None
):

    if dataset_id and dataset_id in processor._datasets:

        meta = processor._datasets[dataset_id]

        df = (
            meta["df"]
            if meta["df"] is not None
            else processor._read_csv_safe(meta["path"])
        )

        filename = meta["filename"]

    else:

        df = processor.get_dataframe()
        filename = processor.csv_path.name
        dataset_id = processor.active_dataset_id

    sample_records = (
        df.head(limit)
        .fillna("")
        .to_dict(orient="records")
    )

    col_types = {
        col: str(dtype)
        for col, dtype in df.dtypes.items()
    }

    return {
        "filename": filename,
        "dataset_id": dataset_id,
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "columns": list(df.columns),
        "column_types": col_types,
        "sample_records": sample_records
    }


# --------------------------------------------------
# DATASET SUMMARY
# --------------------------------------------------

@router.get("/summary", response_model=DatasetSummaryResponse)
def get_summary():
    return processor.get_summary()


# --------------------------------------------------
# DATA QUALITY
# --------------------------------------------------

@router.get("/quality", response_model=DataQualityResponse)
def get_quality():
    return processor.get_data_quality()


# --------------------------------------------------
# DATA LEAKAGE AUDIT
# --------------------------------------------------

@router.get("/leakage-audit", response_model=LeakageAuditResponse)
def get_leakage_audit():
    return processor.get_leakage_audit()


# --------------------------------------------------
# EXPORT DATASET SUMMARY
# --------------------------------------------------

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
        headers={
            "Content-Disposition":
            f"attachment; filename=rideinsight_{summary.get('dataset_id', 'summary')}.csv"
        }
    )
