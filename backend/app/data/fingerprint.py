import math
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from app.data.processor import processor

class CancellationFingerprintAnalyzer:
    def __init__(self, min_sample_size: int = 50):
        self.min_sample_size = min_sample_size

    def calculate_fingerprint(self) -> Dict[str, Any]:
        df = processor.get_dataframe().copy()
        mapping = processor.get_active_mapping()
        
        target_col = mapping.get("target_column")
        if not target_col or target_col not in df.columns:
            return {
                "overall_cancellation_rate": 0.0,
                "total_eligible_bookings": 0,
                "segments_by_vehicle": [],
                "segments_by_pickup": [],
                "segments_by_drop": [],
                "segments_by_hour": [],
                "segments_by_day": [],
                "formula_explanation": "Cancellation analysis unavailable: No target outcome column is mapped in the active dataset."
            }
            
        status_series = df[target_col].astype(str).str.strip().str.lower()
        is_success = status_series.str.contains("success") | status_series.isin(["0", "false", "completed"])
        is_cancelled = status_series.str.contains("cancel") | status_series.isin(["1", "true", "failed"])
        
        eligible_mask = is_success | is_cancelled
        if eligible_mask.sum() == 0:
            eligible_df = df.copy()
            eligible_df["is_cancelled"] = (df[target_col] != df[target_col].value_counts().index[0]).astype(int)
        else:
            eligible_df = df[eligible_mask].copy()
            eligible_df["is_cancelled"] = (eligible_df[target_col].astype(str).str.strip().str.lower().str.contains("cancel") | 
                                          eligible_df[target_col].astype(str).str.strip().str.lower().isin(["1", "true"])).astype(int)
        
        total_eligible = len(eligible_df)
        total_cancelled = int(eligible_df["is_cancelled"].sum())
        overall_cancellation_rate = round((total_cancelled / max(1, total_eligible) * 100), 2) if total_eligible > 0 else 0.0
        
        # Temporal features
        date_col = mapping.get("date_column")
        if date_col and date_col in eligible_df.columns:
            parsed_dates = pd.to_datetime(eligible_df[date_col], errors="coerce")
            eligible_df["Day_Of_Week"] = parsed_dates.dt.day_name().fillna("Unknown")
        else:
            eligible_df["Day_Of_Week"] = "Weekday"
            
        time_col = mapping.get("time_column")
        if time_col and time_col in eligible_df.columns:
            def extract_hour(val: str) -> str:
                try:
                    parts = str(val).split(":")
                    h = int(parts[0])
                    return f"{h:02d}:00 - {h:02d}:59"
                except:
                    return "12:00 - 12:59"
            eligible_df["Hour_Window"] = eligible_df[time_col].apply(extract_hour)
        else:
            eligible_df["Hour_Window"] = "All Day"
            
        def analyze_dimension(col_name: Optional[str], dimension_label: str) -> List[Dict[str, Any]]:
            if not col_name or col_name not in eligible_df.columns:
                return []
                
            grouped = eligible_df.groupby(col_name).agg(
                total_bookings=(target_col, "count"),
                cancelled_bookings=("is_cancelled", "sum")
            ).reset_index()
            
            # Apply dynamic minimum sample size filter (adaptive to dataset size)
            adaptive_min = min(self.min_sample_size, max(5, total_eligible // 500))
            filtered = grouped[grouped["total_bookings"] >= adaptive_min].copy()
            
            segments = []
            for _, row in filtered.iterrows():
                category = str(row[col_name]).strip()
                if not category or category == "nan":
                    continue
                t_count = int(row["total_bookings"])
                c_count = int(row["cancelled_bookings"])
                rate = round((c_count / max(1, t_count) * 100), 2) if t_count > 0 else 0.0
                
                # Analytical Fingerprint Score:
                # Relative Risk Ratio * log10(Sample Volume + 1)
                rel_ratio = (rate / max(0.1, overall_cancellation_rate)) if overall_cancellation_rate > 0 else 1.0
                score = round(rel_ratio * math.log10(t_count + 1), 2)
                
                segments.append({
                    "dimension": dimension_label,
                    "category": category,
                    "total_bookings": t_count,
                    "eligible_bookings": t_count,
                    "cancelled_bookings": c_count,
                    "cancellation_rate": rate,
                    "fingerprint_score": score,
                    "is_high_risk": rate > overall_cancellation_rate
                })
                
            segments.sort(key=lambda x: x["cancellation_rate"], reverse=True)
            return segments

        veh_col = mapping.get("vehicle_type_column")
        pick_col = mapping.get("pickup_location_column")
        drop_col = mapping.get("drop_location_column")
        
        vehicle_segments = analyze_dimension(veh_col, "Vehicle Type")
        pickup_segments = analyze_dimension(pick_col, "Pickup Location")
        drop_segments = analyze_dimension(drop_col, "Drop Location")
        hour_segments = analyze_dimension("Hour_Window", "Booking Time") if time_col and time_col in eligible_df.columns else []
        day_segments = analyze_dimension("Day_Of_Week", "Day of Week") if date_col and date_col in eligible_df.columns else []
        
        formula_explanation = (
            "Cancellation Rate = (Cancelled Bookings / Total Eligible Bookings) × 100. "
            "Fingerprint Score = (Segment Cancellation Rate / Overall Baseline Rate) × log10(Segment Volume + 1). "
            "This metric weights both the severity of the cancellation rate and statistical reliability to highlight high-impact operational friction."
        )
        
        return {
            "overall_cancellation_rate": overall_cancellation_rate,
            "total_eligible_bookings": total_eligible,
            "segments_by_vehicle": vehicle_segments,
            "segments_by_pickup": pickup_segments[:25],
            "segments_by_drop": drop_segments[:25],
            "segments_by_hour": hour_segments,
            "segments_by_day": day_segments,
            "formula_explanation": formula_explanation
        }

# Global singleton
fingerprint_analyzer = CancellationFingerprintAnalyzer()
