import os
import re
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
import pandas as pd
import numpy as np
from app.core.config import settings

class DataProcessor:
    def __init__(self, csv_path: Optional[Path] = None):
        self.csv_path = Path(csv_path) if csv_path else settings.DEFAULT_CSV_PATH
        self._df: Optional[pd.DataFrame] = None
        self._cleaned_df: Optional[pd.DataFrame] = None

    def load_raw_data(self, file_path: Optional[Path] = None) -> pd.DataFrame:
        target_path = Path(file_path) if file_path else self.csv_path
        if not target_path.exists():
            raise FileNotFoundError(f"Dataset not found at {target_path}")
        
        # Load with UTF-8-sig to automatically handle BOM if present
        df = pd.read_csv(target_path, encoding="utf-8-sig", low_memory=False)
        
        # Strip whitespace from column names
        df.columns = [str(c).strip() for c in df.columns]
        
        # Drop completely empty artifact columns like 'Unnamed: 20' or ''
        drop_cols = [c for c in df.columns if c.startswith("Unnamed:") or c == ""]
        if drop_cols:
            df = df.drop(columns=drop_cols)
            
        self._df = df
        return df

    def get_dataframe(self) -> pd.DataFrame:
        if self._df is None:
            self.load_raw_data()
        return self._df

    def get_summary(self) -> Dict[str, Any]:
        df = self.get_dataframe()
        total_bookings = len(df)
        
        status_counts = df["Booking_Status"].value_counts().to_dict() if "Booking_Status" in df.columns else {}
        
        # Normalize status keys (handle one 'l' or two 'l's)
        success_count = sum(v for k, v in status_counts.items() if "success" in k.lower())
        canceled_driver = sum(v for k, v in status_counts.items() if "driver" in k.lower() and ("cancel" in k.lower()))
        canceled_customer = sum(v for k, v in status_counts.items() if "customer" in k.lower() and ("cancel" in k.lower()))
        driver_not_found = sum(v for k, v in status_counts.items() if "not found" in k.lower())
        
        total_canceled = canceled_driver + canceled_customer
        eligible_bookings = success_count + total_canceled
        
        completion_rate = round((success_count / total_bookings * 100), 2) if total_bookings > 0 else 0.0
        unsuccessful_rate = round(((total_bookings - success_count) / total_bookings * 100), 2) if total_bookings > 0 else 0.0
        cancellation_rate = round((total_canceled / eligible_bookings * 100), 2) if eligible_bookings > 0 else 0.0
        
        avg_booking_val = None
        if "Booking_Value" in df.columns:
            avg_booking_val = round(float(pd.to_numeric(df["Booking_Value"], errors="coerce").mean()), 2)
            
        vehicle_counts = df["Vehicle_Type"].value_counts().to_dict() if "Vehicle_Type" in df.columns else {}
        
        # Date parsing
        min_date = None
        max_date = None
        if "Date" in df.columns:
            date_series = pd.to_datetime(df["Date"], errors="coerce")
            valid_dates = date_series.dropna()
            if not valid_dates.empty:
                min_date = str(valid_dates.min().strftime("%Y-%m-%d"))
                max_date = str(valid_dates.max().strftime("%Y-%m-%d"))
                
        return {
            "filename": self.csv_path.name,
            "total_bookings": total_bookings,
            "successful_rides": success_count,
            "canceled_by_driver": canceled_driver,
            "canceled_by_customer": canceled_customer,
            "driver_not_found": driver_not_found,
            "completion_rate": completion_rate,
            "unsuccessful_rate": unsuccessful_rate,
            "cancellation_rate": cancellation_rate,
            "avg_booking_value": avg_booking_val,
            "min_date": min_date,
            "max_date": max_date,
            "status_distribution": status_counts,
            "vehicle_distribution": vehicle_counts
        }

    def get_data_quality(self) -> Dict[str, Any]:
        df = self.get_dataframe()
        total_records = len(df)
        
        # Missing values
        missing_dict = {}
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            if null_count > 0:
                missing_dict[col] = {
                    "count": null_count,
                    "percentage": round(null_count / total_records * 100, 2)
                }
                
        # Duplicates
        duplicate_records = int(df.duplicated().sum())
        
        # Types
        column_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Constant columns (nunique <= 1)
        constant_columns = [col for col in df.columns if df[col].nunique(dropna=False) <= 1]
        
        status_counts = df["Booking_Status"].value_counts().to_dict() if "Booking_Status" in df.columns else {}
        
        return {
            "total_records": total_records,
            "duplicate_records": duplicate_records,
            "missing_values": missing_dict,
            "column_types": column_types,
            "constant_columns": constant_columns,
            "status_counts": status_counts,
            "has_target_leakage_risks": "Ride_Distance" in df.columns or "V_TAT" in df.columns
        }

    def get_leakage_audit(self) -> Dict[str, Any]:
        return {
            "included_features": [
                "Vehicle_Type",
                "Pickup_Location",
                "Drop_Location",
                "Booking_Value",
                "Booking_Hour",
                "Booking_Minute",
                "Day_Of_Week",
                "Is_Weekend"
            ],
            "excluded_features": [
                {
                    "feature": "Ride_Distance",
                    "category": "Excluded - Target Leakage",
                    "reason": "Ride_Distance is strictly 0 for cancellations and positive only for successful trips. Using it produces artificial 100% target leakage.",
                    "prediction_time_availability": "Available only after trip completion. Trip meter is not run prior to ride execution."
                },
                {
                    "feature": "Booking_Status",
                    "category": "Excluded - Target Variable",
                    "reason": "This is the primary ground-truth outcome label to be predicted.",
                    "prediction_time_availability": "Outcome of the trip."
                },
                {
                    "feature": "Booking_ID",
                    "category": "Excluded - Unique Identifier",
                    "reason": "High-cardinality unique tracking ID with zero predictive generalization.",
                    "prediction_time_availability": "Generated at booking creation."
                },
                {
                    "feature": "Customer_ID",
                    "category": "Excluded - Identifier / Overfitting Risk",
                    "reason": "Prevents spurious memorization of specific customer IDs and preserves algorithmic fairness.",
                    "prediction_time_availability": "Available at booking."
                },
                {
                    "feature": "Canceled_Rides_by_Customer",
                    "category": "Excluded - Post Outcome",
                    "reason": "Logs the customer cancellation reason code. Only populated AFTER a customer cancellation occurs.",
                    "prediction_time_availability": "Only exists post-cancellation."
                },
                {
                    "feature": "Canceled_Rides_by_Driver",
                    "category": "Excluded - Post Outcome",
                    "reason": "Logs the driver cancellation reason code. Only populated AFTER a driver cancels.",
                    "prediction_time_availability": "Only exists post-cancellation."
                },
                {
                    "feature": "Incomplete_Rides",
                    "category": "Excluded - Post Outcome",
                    "reason": "Indicates whether a dispatched trip aborted mid-journey. Missing for all pre-dispatch bookings.",
                    "prediction_time_availability": "Recorded during or after trip dispatch."
                },
                {
                    "feature": "Incomplete_Rides_Reason",
                    "category": "Excluded - Post Outcome",
                    "reason": "Explains trip interruption reason post-dispatch.",
                    "prediction_time_availability": "Recorded post-trip."
                },
                {
                    "feature": "Payment_Method",
                    "category": "Excluded - Post Outcome",
                    "reason": "In the dataset, Payment_Method is recorded only upon trip settlement (missing for 100% of cancelled rides).",
                    "prediction_time_availability": "Available at completion settlement."
                },
                {
                    "feature": "Driver_Ratings",
                    "category": "Excluded - Post Outcome",
                    "reason": "Rating submitted by customer after ride completion.",
                    "prediction_time_availability": "Post-trip review."
                },
                {
                    "feature": "Customer_Rating",
                    "category": "Excluded - Post Outcome",
                    "reason": "Rating submitted by driver after ride completion.",
                    "prediction_time_availability": "Post-trip review."
                },
                {
                    "feature": "V_TAT",
                    "category": "Excluded - Post Dispatch",
                    "reason": "Vehicle turnaround / arrival time. Only measurable after vehicle dispatch; absent during initial matching.",
                    "prediction_time_availability": "Available after dispatch."
                },
                {
                    "feature": "C_TAT",
                    "category": "Excluded - Post Dispatch",
                    "reason": "Customer turnaround time. Recorded after vehicle reaches pickup spot.",
                    "prediction_time_availability": "Available after vehicle arrival."
                },
                {
                    "feature": "Vehicle Images",
                    "category": "Excluded - Artifact",
                    "reason": "Malformed Excel formula artifact ('#NAME?').",
                    "prediction_time_availability": "N/A"
                }
            ],
            "audit_notes": "All features used in the ML pipeline are strictly restricted to information available at the exact instant a ride request is initiated. No post-dispatch, post-trip, or outcome-derived attributes are leaked into training.",
            "binary_classification_explanation": "For the core classification experiment, bookings are partitioned into: Class 0 = Success (completed rides), Class 1 = Cancelled (either Cancelled by Driver or Cancelled by Customer). 'Driver Not Found' instances represent unassigned supply-exhaustion events rather than assigned cancellations and are analyzed separately in operational intelligence."
        }

    def prepare_ml_dataset(self) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
        """
        Extracts clean, non-leaked features and binary classification target.
        Returns:
            X: DataFrame with engineered features available at booking time
            y: Series with binary labels (0 = Success, 1 = Cancelled)
            full_df: DataFrame of eligible subset for chronological splitting
        """
        df = self.get_dataframe().copy()
        
        # Filter to eligible bookings: Success vs Cancelled (Driver or Customer)
        # Exclude 'Driver Not Found' for the binary cancellation experiment
        status_col = df["Booking_Status"].astype(str).str.strip().str.lower()
        
        is_success = status_col.str.contains("success")
        is_cancelled = status_col.str.contains("cancel")
        
        eligible_mask = is_success | is_cancelled
        eligible_df = df[eligible_mask].copy()
        
        # Target variable: 0 = Success, 1 = Cancelled
        y = (eligible_df["Booking_Status"].astype(str).str.strip().str.lower().str.contains("cancel")).astype(int)
        
        # Feature Engineering from Date and Time
        # Date e.g. '2024-07-26 14:00:00' or '2024-07-26'
        # Time e.g. '14:00:00'
        parsed_dates = pd.to_datetime(eligible_df["Date"], errors="coerce")
        
        # Extract Hour and Minute
        time_series = eligible_df["Time"].astype(str)
        def extract_hour(val: str) -> int:
            try:
                parts = val.split(":")
                return int(parts[0]) if len(parts) > 0 else 12
            except:
                return 12
                
        def extract_minute(val: str) -> int:
            try:
                parts = val.split(":")
                return int(parts[1]) if len(parts) > 1 else 0
            except:
                return 0

        booking_hour = time_series.apply(extract_hour)
        booking_minute = time_series.apply(extract_minute)
        
        # Fallback to parsed_dates for hour if time was missing
        booking_hour = booking_hour.fillna(parsed_dates.dt.hour.fillna(12)).astype(int)
        day_of_week = parsed_dates.dt.day_name().fillna("Friday")
        is_weekend = parsed_dates.dt.day_of_week.isin([5, 6]).astype(int)
        
        # Vehicle Type
        vehicle_type = eligible_df["Vehicle_Type"].fillna("Other").astype(str).str.strip()
        
        # Pickup and Drop locations - retain top locations, group sparse tail
        pickup_loc = eligible_df["Pickup_Location"].fillna("Other").astype(str).str.strip()
        drop_loc = eligible_df["Drop_Location"].fillna("Other").astype(str).str.strip()
        
        # Booking Value
        booking_val = pd.to_numeric(eligible_df["Booking_Value"], errors="coerce")
        median_val = booking_val.median() if not booking_val.dropna().empty else 300.0
        booking_val = booking_val.fillna(median_val)
        
        X = pd.DataFrame({
            "Booking_Hour": booking_hour,
            "Booking_Minute": booking_minute,
            "Day_Of_Week": day_of_week,
            "Is_Weekend": is_weekend,
            "Vehicle_Type": vehicle_type,
            "Pickup_Location": pickup_loc,
            "Drop_Location": drop_loc,
            "Booking_Value": booking_val
        })
        
        # Attach Date to eligible_df for chronological ordering
        eligible_df["_parsed_datetime"] = parsed_dates
        
        return X, y, eligible_df

# Global singleton
processor = DataProcessor()
