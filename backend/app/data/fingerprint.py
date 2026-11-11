import math
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from app.data.processor import processor

class CancellationFingerprintAnalyzer:
    def __init__(self, min_sample_size: int = 50):
        self.min_sample_size = min_sample_size

    def calculate_fingerprint(self) -> Dict[str, Any]:
        df = processor.get_dataframe().copy()
        
        # Parse status
        status_col = df["Booking_Status"].astype(str).str.strip().str.lower()
        is_success = status_col.str.contains("success")
        is_cancelled = status_col.str.contains("cancel")
        
        # Eligible subset (success + driver cancel + customer cancel)
        eligible_df = df[is_success | is_cancelled].copy()
        eligible_df["is_cancelled"] = (eligible_df["Booking_Status"].astype(str).str.strip().str.lower().str.contains("cancel")).astype(int)
        
        total_eligible = len(eligible_df)
        total_cancelled = int(eligible_df["is_cancelled"].sum())
        overall_cancellation_rate = round((total_cancelled / total_eligible * 100), 2) if total_eligible > 0 else 0.0
        
        # Extract features
        parsed_dates = pd.to_datetime(eligible_df["Date"], errors="coerce")
        eligible_df["Day_Of_Week"] = parsed_dates.dt.day_name().fillna("Unknown")
        
        def extract_hour(val: str) -> str:
            try:
                parts = str(val).split(":")
                h = int(parts[0])
                return f"{h:02d}:00 - {h:02d}:59"
            except:
                return "12:00 - 12:59"
                
        eligible_df["Hour_Window"] = eligible_df["Time"].apply(extract_hour)
        
        def analyze_dimension(col_name: str, dimension_label: str) -> List[Dict[str, Any]]:
            grouped = eligible_df.groupby(col_name).agg(
                total_bookings=("Booking_Status", "count"),
                cancelled_bookings=("is_cancelled", "sum")
            ).reset_index()
            
            # Apply minimum sample size filter
            filtered = grouped[grouped["total_bookings"] >= self.min_sample_size].copy()
            
            segments = []
            for _, row in filtered.iterrows():
                category = str(row[col_name]).strip()
                t_count = int(row["total_bookings"])
                c_count = int(row["cancelled_bookings"])
                rate = round((c_count / t_count * 100), 2) if t_count > 0 else 0.0
                
                # Analytical Fingerprint Score:
                # Relative Risk Ratio * log10(Sample Volume + 1)
                rel_ratio = (rate / overall_cancellation_rate) if overall_cancellation_rate > 0 else 1.0
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
                
            # Sort descending by cancellation rate
            segments.sort(key=lambda x: x["cancellation_rate"], reverse=True)
            return segments

        vehicle_segments = analyze_dimension("Vehicle_Type", "Vehicle Type")
        pickup_segments = analyze_dimension("Pickup_Location", "Pickup Location")
        drop_segments = analyze_dimension("Drop_Location", "Drop Location")
        hour_segments = analyze_dimension("Hour_Window", "Booking Time")
        day_segments = analyze_dimension("Day_Of_Week", "Day of Week")
        
        formula_explanation = (
            "Cancellation Rate = (Cancelled Bookings / Total Eligible Bookings) × 100. "
            "Fingerprint Score = (Segment Cancellation Rate / Overall Baseline Rate) × log10(Segment Volume + 1). "
            "This metric weights both the severity of the cancellation rate and statistical reliability to highlight high-impact operational friction."
        )
        
        return {
            "overall_cancellation_rate": overall_cancellation_rate,
            "total_eligible_bookings": total_eligible,
            "segments_by_vehicle": vehicle_segments,
            "segments_by_pickup": pickup_segments[:15], # top 15 locations
            "segments_by_drop": drop_segments[:15],
            "segments_by_hour": hour_segments,
            "segments_by_day": day_segments,
            "formula_explanation": formula_explanation
        }

# Global singleton
fingerprint_analyzer = CancellationFingerprintAnalyzer()
