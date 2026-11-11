import math
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from datetime import timedelta
from app.data.processor import processor

class TimeSeriesForecaster:
    def __init__(self):
        self._daily_cache: Optional[pd.DataFrame] = None

    def get_daily_series(self) -> pd.DataFrame:
        if self._daily_cache is not None:
            return self._daily_cache
            
        df = processor.get_dataframe().copy()
        
        # Parse date
        parsed_dates = pd.to_datetime(df["Date"], errors="coerce")
        df["date_only"] = parsed_dates.dt.date
        
        status_col = df["Booking_Status"].astype(str).str.strip().str.lower()
        df["is_success"] = status_col.str.contains("success").astype(int)
        df["is_canceled_driver"] = (status_col.str.contains("driver") & status_col.str.contains("cancel")).astype(int)
        df["is_canceled_customer"] = (status_col.str.contains("customer") & status_col.str.contains("cancel")).astype(int)
        df["is_driver_not_found"] = status_col.str.contains("not found").astype(int)
        
        daily = df.groupby("date_only").agg(
            total_bookings=("Booking_Status", "count"),
            completed_rides=("is_success", "sum"),
            canceled_by_driver=("is_canceled_driver", "sum"),
            canceled_by_customer=("is_canceled_customer", "sum"),
            driver_not_found=("is_driver_not_found", "sum")
        ).reset_index()
        
        daily = daily.sort_values(by="date_only").reset_index(drop=True)
        self._daily_cache = daily
        return daily

    def generate_forecast(self, horizon_days: int = 7) -> Dict[str, Any]:
        """
        Builds a validated daily completed-rides forecast using Holt's exponential smoothing
        with chronological backtesting validation.
        """
        daily = self.get_daily_series().copy()
        
        if len(daily) < 7:
            raise ValueError("Insufficient daily data for time series forecasting.")
            
        y = daily["completed_rides"].values.astype(float)
        dates = [str(d) for d in daily["date_only"].values]
        
        # Chronological validation: hold out the last 7 days of July 2024
        val_size = min(7, len(y) // 4)
        train_y = y[:-val_size]
        test_y = y[-val_size:]
        
        # Exponential Smoothing Baseline
        # Alpha: smoothing factor, Beta: trend factor
        alpha = 0.35
        beta = 0.15
        
        level = train_y[0]
        trend = (train_y[-1] - train_y[0]) / len(train_y)
        
        for val in train_y[1:]:
            last_level = level
            level = alpha * val + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend
            
        # Backtest validation predictions
        val_preds = []
        for i in range(1, val_size + 1):
            pred = level + i * trend
            val_preds.append(max(0.0, pred))
            
        mae = round(float(np.mean(np.abs(test_y - val_preds))), 2)
        rmse = round(float(np.sqrt(np.mean((test_y - val_preds) ** 2))), 2)
        
        # Now refit on all available July data for future projection
        level = y[0]
        trend = (y[-1] - y[0]) / len(y)
        historical_smoothed = [level]
        
        for val in y[1:]:
            last_level = level
            level = alpha * val + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend
            historical_smoothed.append(round(level, 1))
            
        # Build timeline points
        points = []
        for idx in range(len(daily)):
            points.append({
                "date": dates[idx],
                "actual_completed": float(y[idx]),
                "forecasted_completed": float(historical_smoothed[idx]),
                "lower_bound": None,
                "upper_bound": None,
                "is_future": False
            })
            
        # Standard error for prediction interval (based on backtest RMSE)
        std_err = max(rmse, 25.0)
        
        # Project into future horizon
        last_date = pd.to_datetime(daily["date_only"].iloc[-1])
        for step in range(1, horizon_days + 1):
            future_date = (last_date + timedelta(days=step)).strftime("%Y-%m-%d")
            f_val = round(max(0.0, level + step * trend), 1)
            margin = round(1.96 * std_err * math.sqrt(step), 1)
            
            points.append({
                "date": future_date,
                "actual_completed": None,
                "forecasted_completed": f_val,
                "lower_bound": round(max(0.0, f_val - margin), 1),
                "upper_bound": round(f_val + margin, 1),
                "is_future": True
            })
            
        limitations = (
            "NOTICE: The dataset covers July 2024 (approx. 31 days). A one-month timeframe is insufficient "
            "to capture quarterly or annual seasonality, macroeconomic cycles, or long-range macro shifts. "
            "This forecast operates as a validated short-horizon operational baseline (7 to 30 days) "
            "and should be continually updated with incoming daily dispatch streams."
        )
        
        return {
            "points": points,
            "historical_points_count": len(daily),
            "forecast_horizon_days": horizon_days,
            "mae": mae,
            "rmse": rmse,
            "model_name": "Validated Holt Exponential Smoothing (Chronological Backtesting)",
            "limitations_disclosure": limitations
        }

# Global singleton
forecaster = TimeSeriesForecaster()
