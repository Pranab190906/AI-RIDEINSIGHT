import {
  DatasetSummary,
  DataQuality,
  LeakageAudit,
  ExecutiveOverview,
  CancellationFingerprint,
  ModelComparison,
  PredictRequest,
  PredictResponse,
  ShapGlobalResponse,
  ShapLocalResponse,
  ForecastResponse,
  ScenarioResult,
  RecommendationsResponse,
  MonitoringSummary
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Data APIs
  getSummary: (): Promise<DatasetSummary> =>
    fetch(`${API_BASE}/data/summary`).then(handleResponse<DatasetSummary>),

  getQuality: (): Promise<DataQuality> =>
    fetch(`${API_BASE}/data/quality`).then(handleResponse<DataQuality>),

  getLeakageAudit: (): Promise<LeakageAudit> =>
    fetch(`${API_BASE}/data/leakage-audit`).then(handleResponse<LeakageAudit>),

  uploadCsv: (file: File): Promise<DatasetSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/data/upload`, {
      method: 'POST',
      body: formData,
    }).then(handleResponse<DatasetSummary>);
  },

  // Analysis APIs
  getOverview: (): Promise<ExecutiveOverview> =>
    fetch(`${API_BASE}/analysis/overview`).then(handleResponse<ExecutiveOverview>),

  getFingerprint: (): Promise<CancellationFingerprint> =>
    fetch(`${API_BASE}/analysis/fingerprint`).then(handleResponse<CancellationFingerprint>),

  // Model APIs
  getModelComparison: (): Promise<ModelComparison> =>
    fetch(`${API_BASE}/models/compare`).then(handleResponse<ModelComparison>),

  trainModels: (params: {
    split_type: string;
    test_size: number;
    tune_hyperparameters: boolean;
    selected_algorithms?: string[];
  }): Promise<ModelComparison> =>
    fetch(`${API_BASE}/models/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then(handleResponse<ModelComparison>),

  selectActiveModel: (model_name: string): Promise<{ status: string; active_model: string }> =>
    fetch(`${API_BASE}/models/select-active?model_name=${encodeURIComponent(model_name)}`, {
      method: 'POST',
    }).then(handleResponse<{ status: string; active_model: string }>),

  predict: (req: PredictRequest): Promise<PredictResponse> =>
    fetch(`${API_BASE}/models/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then(handleResponse<PredictResponse>),

  // Explainability
  getShapGlobal: (model_name?: string): Promise<ShapGlobalResponse> => {
    const url = model_name
      ? `${API_BASE}/explain/shap-global?model_name=${encodeURIComponent(model_name)}`
      : `${API_BASE}/explain/shap-global`;
    return fetch(url).then(handleResponse<ShapGlobalResponse>);
  },

  getShapLocal: (req: PredictRequest, model_name?: string): Promise<ShapLocalResponse> => {
    const url = model_name
      ? `${API_BASE}/explain/shap-local?model_name=${encodeURIComponent(model_name)}`
      : `${API_BASE}/explain/shap-local`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then(handleResponse<ShapLocalResponse>);
  },

  // Forecasting
  getForecast: (horizon_days: number = 7): Promise<ForecastResponse> =>
    fetch(`${API_BASE}/forecast/daily?horizon_days=${horizon_days}`).then(
      handleResponse<ForecastResponse>
    ),

  // Scenarios
  getScenarios: (): Promise<ScenarioResult[]> =>
    fetch(`${API_BASE}/scenarios/list`).then(handleResponse<ScenarioResult[]>),

  simulateScenario: (params: {
    name: string;
    total_bookings: number;
    current_cancellation_rate: number;
    proposed_reduction_percent: number;
    notes?: string;
  }): Promise<ScenarioResult> =>
    fetch(`${API_BASE}/scenarios/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then(handleResponse<ScenarioResult>),

  resetScenarios: (): Promise<ScenarioResult[]> =>
    fetch(`${API_BASE}/scenarios/reset`, { method: 'POST' }).then(
      handleResponse<ScenarioResult[]>
    ),

  // Insights
  getRecommendations: (): Promise<RecommendationsResponse> =>
    fetch(`${API_BASE}/insights/recommendations`).then(
      handleResponse<RecommendationsResponse>
    ),

  // Monitoring
  getMonitoringSummary: (): Promise<MonitoringSummary> =>
    fetch(`${API_BASE}/monitoring/summary`).then(handleResponse<MonitoringSummary>),

  recordOutcome: (prediction_id: number, actual_outcome: string) =>
    fetch(`${API_BASE}/monitoring/record-outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prediction_id, actual_outcome }),
    }).then(handleResponse<{ status: string }>),
};
