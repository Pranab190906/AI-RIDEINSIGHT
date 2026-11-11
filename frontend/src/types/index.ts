export interface ColumnMapping {
  target_column?: string | null;
  vehicle_type_column?: string | null;
  pickup_location_column?: string | null;
  drop_location_column?: string | null;
  booking_value_column?: string | null;
  date_column?: string | null;
  time_column?: string | null;
}

export interface QualityDeduction {
  category: string;
  impact: string;
  points_deducted: number;
  description: string;
}

export interface DataQualityBreakdown {
  score: number;
  rating: string;
  formula: string;
  total_records: number;
  total_columns: number;
  missing_cells_count: number;
  missing_cells_percentage: number;
  duplicate_rows_count: number;
  duplicate_rows_percentage: number;
  constant_columns_count: number;
  deductions: QualityDeduction[];
}

export interface DatasetInfo {
  id: string;
  filename: string;
  is_active: boolean;
  total_rows: number;
  total_cols: number;
  file_size_bytes: number;
  uploaded_at: string;
  quality_score: number;
  quality_rating: string;
  columns: string[];
  mapping: ColumnMapping;
  has_target: boolean;
  has_temporal: boolean;
}

export interface DatasetUploadResponse {
  dataset_id: string;
  filename: string;
  total_rows: number;
  total_cols: number;
  file_size_bytes: number;
  columns: string[];
  detected_mapping: ColumnMapping;
  quality: DataQualityBreakdown;
  sample_records: Record<string, any>[];
  summary: DatasetSummary;
  message: string;
}

export interface DatasetListResponse {
  active_dataset_id: string;
  datasets: DatasetInfo[];
}

export interface FieldOptionsResponse {
  vehicle_types: string[];
  pickup_locations: string[];
  drop_locations: string[];
  days_of_week: string[];
}

export interface DatasetPreview {
  filename: string;
  dataset_id: string;
  total_rows: number;
  total_cols: number;
  columns: string[];
  column_types: Record<string, string>;
  sample_records: Record<string, any>[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  active_dataset_id: string;
  dataset_name: string;
  dataset_loaded: boolean;
  active_model: string;
}

export interface DatasetSummary {
  filename: string;
  dataset_id?: string;
  total_bookings: number;
  successful_rides: number;
  canceled_by_driver: number;
  canceled_by_customer: number;
  driver_not_found: number;
  completion_rate: number;
  unsuccessful_rate: number;
  cancellation_rate: number;
  avg_booking_value: number | null;
  min_date: string | null;
  max_date: string | null;
  status_distribution: Record<string, number>;
  vehicle_distribution: Record<string, number>;
}

export interface DataQuality {
  total_records: number;
  duplicate_records: number;
  missing_values: Record<string, { count: number; percentage: number }>;
  column_types: Record<string, string>;
  constant_columns: string[];
  status_counts: Record<string, number>;
  has_target_leakage_risks: boolean;
  breakdown?: DataQualityBreakdown;
}

export interface LeakageAuditItem {
  feature: string;
  category: string;
  reason: string;
  prediction_time_availability: string;
}

export interface LeakageAudit {
  included_features: string[];
  excluded_features: LeakageAuditItem[];
  audit_notes: string;
  binary_classification_explanation: string;
}

export interface DailyTrendPoint {
  date: string;
  total: number;
  success: number;
  canceled_driver: number;
  canceled_customer: number;
  driver_not_found: number;
  completion_rate: number;
  cancellation_rate: number;
}

export interface ExecutiveOverview {
  summary: DatasetSummary;
  daily_trends: DailyTrendPoint[];
  status_distribution: { name: string; value: number }[];
  vehicle_distribution: { name: string; value: number }[];
}

export interface FingerprintSegment {
  dimension: string;
  category: string;
  total_bookings: number;
  eligible_bookings: number;
  cancelled_bookings: number;
  cancellation_rate: number;
  fingerprint_score: number;
  is_high_risk: boolean;
}

export interface CancellationFingerprint {
  overall_cancellation_rate: number;
  total_eligible_bookings: number;
  segments_by_vehicle: FingerprintSegment[];
  segments_by_pickup: FingerprintSegment[];
  segments_by_drop: FingerprintSegment[];
  segments_by_hour: FingerprintSegment[];
  segments_by_day: FingerprintSegment[];
  formula_explanation: string;
}

export interface ModelMetrics {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion_matrix: number[][];
  classification_report: Record<string, any>;
  duration_seconds: number;
  best_params: Record<string, any>;
  threshold: number;
}

export interface ModelComparison {
  split_type: string;
  test_records_count: number;
  models: Record<string, ModelMetrics>;
  recommended_model: string;
  recommendation_reason: string;
  active_model: string;
}

export interface PredictRequest {
  booking_time: string;
  day_of_week: string;
  vehicle_type: string;
  pickup_location: string;
  drop_location: string;
  booking_value: number;
  decision_threshold?: number;
}

export interface PredictResponse {
  predicted_class: number;
  predicted_label: string;
  cancellation_probability: number;
  success_probability: number;
  risk_category: 'Low Risk' | 'Medium Risk' | 'High Risk';
  decision_threshold: number;
  prediction_timestamp: string;
  model_used: string;
  input_features?: Record<string, any>;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  direction_hint: string;
}

export interface ShapGlobalResponse {
  algorithm: string;
  top_features: FeatureImportanceItem[];
  method: string;
  interpretation: string;
}

export interface FeatureContribution {
  feature: string;
  display_name: string;
  feature_value: any;
  shap_value: number;
  impact: string;
}

export interface ShapLocalResponse {
  base_value: number;
  prediction_probability: number;
  risk_category: string;
  contributions: FeatureContribution[];
  method: string;
}

export interface ForecastPoint {
  date: string;
  actual_completed: number | null;
  forecasted_completed: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  is_future: boolean;
}

export interface ForecastResponse {
  points: ForecastPoint[];
  historical_points_count: number;
  forecast_horizon_days: number;
  mae: number;
  rmse: number;
  model_name: string;
  limitations_disclosure: string;
}

export interface ScenarioResult {
  id?: number;
  name: string;
  total_bookings: number;
  current_cancellation_rate: number;
  proposed_reduction_percent: number;
  scenario_cancellation_rate: number;
  current_completed_rides: number;
  scenario_completed_rides: number;
  additional_completed_rides: number;
  percentage_improvement: number;
  formula_used: string;
  notes?: string;
  disclaimer: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  category: string;
  observed_pattern: string;
  supporting_data: string;
  why_it_matters: string;
  suggested_action: string;
  confidence: 'High' | 'Medium' | 'Moderate';
  limitations: string;
}

export interface RecommendationsResponse {
  generated_at: string;
  total_recommendations: number;
  items: RecommendationItem[];
}

export interface MonitoringSummary {
  total_predictions: number;
  evaluated_predictions: number;
  pending_predictions: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  recent_records: {
    id: number;
    created_at: string;
    features: Record<string, any>;
    cancellation_probability: number;
    success_probability: number;
    risk_category: string;
    threshold_used: number;
    actual_outcome: string | null;
    feedback_at: string | null;
  }[];
}
