from typing import Any, Optional, Dict, List
from pydantic import BaseModel, Field

# --- DATA SCHEMAS ---

class DatasetPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    total_cols: int
    columns: List[str]
    sample_records: List[Dict[str, Any]]

class DatasetSummaryResponse(BaseModel):
    filename: str
    total_bookings: int
    successful_rides: int
    canceled_by_driver: int
    canceled_by_customer: int
    driver_not_found: int
    completion_rate: float
    unsuccessful_rate: float
    cancellation_rate: float # only driver + customer cancellations among eligible bookings
    avg_booking_value: Optional[float] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    status_distribution: Dict[str, int]
    vehicle_distribution: Dict[str, int]

class DataQualityResponse(BaseModel):
    total_records: int
    duplicate_records: int
    missing_values: Dict[str, Dict[str, Any]] # col -> {count: int, percentage: float}
    column_types: Dict[str, str]
    constant_columns: List[str]
    status_counts: Dict[str, int]
    has_target_leakage_risks: bool

class LeakageAuditItem(BaseModel):
    feature: str
    category: str # "Included", "Excluded - Target Leakage", "Excluded - Post Outcome", "Excluded - Identifier", "Excluded - Artifact"
    reason: str
    prediction_time_availability: str

class LeakageAuditResponse(BaseModel):
    included_features: List[str]
    excluded_features: List[LeakageAuditItem]
    audit_notes: str
    binary_classification_explanation: str

# --- ANALYSIS & FINGERPRINT SCHEMAS ---

class DailyTrendPoint(BaseModel):
    date: str
    total: int
    success: int
    canceled_driver: int
    canceled_customer: int
    driver_not_found: int
    completion_rate: float
    cancellation_rate: float

class ExecutiveOverviewResponse(BaseModel):
    summary: DatasetSummaryResponse
    daily_trends: List[DailyTrendPoint]
    status_distribution: List[Dict[str, Any]]
    vehicle_distribution: List[Dict[str, Any]]

class FingerprintSegment(BaseModel):
    dimension: str
    category: str
    total_bookings: int
    eligible_bookings: int
    cancelled_bookings: int
    cancellation_rate: float
    fingerprint_score: float # analytical score: (rate / baseline_rate) * log10(bookings + 1)
    is_high_risk: bool

class CancellationFingerprintResponse(BaseModel):
    overall_cancellation_rate: float
    total_eligible_bookings: int
    segments_by_vehicle: List[FingerprintSegment]
    segments_by_pickup: List[FingerprintSegment]
    segments_by_drop: List[FingerprintSegment]
    segments_by_hour: List[FingerprintSegment]
    segments_by_day: List[FingerprintSegment]
    formula_explanation: str

# --- MACHINE LEARNING SCHEMAS ---

class TrainRequest(BaseModel):
    split_type: str = Field(default="random", description="random or chronological")
    test_size: float = Field(default=0.20, ge=0.1, le=0.4)
    tune_hyperparameters: bool = Field(default=False)
    selected_algorithms: Optional[List[str]] = None

class ModelMetrics(BaseModel):
    algorithm: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    confusion_matrix: List[List[int]] # [[TN, FP], [FN, TP]]
    classification_report: Dict[str, Any]
    duration_seconds: float
    best_params: Dict[str, Any] = {}
    threshold: float = 0.50

class ModelComparisonResponse(BaseModel):
    split_type: str
    test_records_count: int
    models: Dict[str, ModelMetrics]
    recommended_model: str
    recommendation_reason: str
    active_model: str

class PredictRequest(BaseModel):
    booking_time: str = Field(default="14:00", description="HH:MM format")
    day_of_week: str = Field(default="Friday", description="Day name, e.g. Friday")
    vehicle_type: str = Field(default="Prime Sedan")
    pickup_location: str = Field(default="Tumkur Road")
    drop_location: str = Field(default="RT Nagar")
    booking_value: float = Field(default=350.0, ge=1.0)
    decision_threshold: Optional[float] = Field(default=0.50, ge=0.05, le=0.95)

class PredictResponse(BaseModel):
    predicted_class: int # 0 or 1
    predicted_label: str # "Success" or "Cancelled"
    cancellation_probability: float
    success_probability: float
    risk_category: str # "Low Risk", "Medium Risk", "High Risk"
    decision_threshold: float
    prediction_timestamp: str
    model_used: str

# --- EXPLAINABILITY SCHEMAS ---

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    direction_hint: str

class ShapGlobalResponse(BaseModel):
    algorithm: str
    top_features: List[FeatureImportanceItem]
    method: str
    interpretation: str

class FeatureContribution(BaseModel):
    feature: str
    display_name: str
    feature_value: Any
    shap_value: float
    impact: str # "Increases Cancellation Risk" or "Decreases Cancellation Risk"

class ShapLocalResponse(BaseModel):
    base_value: float
    prediction_probability: float
    risk_category: str
    contributions: List[FeatureContribution]
    method: str

# --- FORECASTING SCHEMAS ---

class ForecastPoint(BaseModel):
    date: str
    actual_completed: Optional[float] = None
    forecasted_completed: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    is_future: bool = False

class ForecastResponse(BaseModel):
    points: List[ForecastPoint]
    historical_points_count: int
    forecast_horizon_days: int
    mae: float
    rmse: float
    model_name: str
    limitations_disclosure: str

# --- WHAT-IF SIMULATION SCHEMAS ---

class ScenarioRequest(BaseModel):
    name: str = Field(default="Operational Efficiency 5%")
    total_bookings: int = Field(default=103024, ge=1)
    current_cancellation_rate: float = Field(default=31.13, ge=0.0, le=100.0)
    proposed_reduction_percent: float = Field(default=5.0, ge=0.1, le=50.0)
    notes: Optional[str] = None

class ScenarioResult(BaseModel):
    id: Optional[int] = None
    name: str
    total_bookings: int
    current_cancellation_rate: float
    proposed_reduction_percent: float
    scenario_cancellation_rate: float
    current_completed_rides: int
    scenario_completed_rides: int
    additional_completed_rides: int
    percentage_improvement: float
    formula_used: str
    notes: Optional[str] = None
    disclaimer: str

class ScenarioCompareResponse(BaseModel):
    scenarios: List[ScenarioResult]

# --- AI INSIGHTS & RECOMMENDATIONS ---

class RecommendationItem(BaseModel):
    id: str
    title: str
    category: str
    observed_pattern: str
    supporting_data: str
    why_it_matters: str
    suggested_action: str
    confidence: str # "High", "Medium", "Moderate"
    limitations: str

class RecommendationsResponse(BaseModel):
    generated_at: str
    total_recommendations: int
    items: List[RecommendationItem]

# --- MONITORING SCHEMAS ---

class OutcomeFeedbackRequest(BaseModel):
    prediction_id: int
    actual_outcome: str # "Success" or "Cancelled"

class MonitoringSummaryResponse(BaseModel):
    total_predictions: int
    evaluated_predictions: int
    pending_predictions: int
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    recent_records: List[Dict[str, Any]]
