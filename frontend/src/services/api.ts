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
  MonitoringSummary,
  DatasetListResponse,
  DatasetInfo,
  DatasetUploadResponse,
  ColumnMapping,
  FieldOptionsResponse,
  DatasetPreview,
  HealthResponse
} from '../types';

// Resolve API base URL dynamically from environment variable for Vercel/Render deployment
const ENV_BACKEND = import.meta.env.VITE_API_URL || '';
export const API_BASE = ENV_BACKEND ? `${ENV_BACKEND.replace(/\/$/, '')}/api` : '/api';

/**
 * Standard HTTP fetcher with timeout and human-readable network error messages.
 */
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 45000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let detailMsg = res.statusText;
      try {
        const errorJson = await res.json();
        detailMsg = errorJson.detail || detailMsg;
      } catch {
        // Non-JSON response
      }
      throw new Error(detailMsg || `Server responded with HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(
        `Request to ${url} timed out after ${Math.round(timeoutMs / 1000)}s. The backend server might be performing initial ML training or starting up. Click 'Retry Connection' to reconnect.`
      );
    }

    // Network / connection refused / DNS errors
    if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.message?.includes('ECONNREFUSED')) {
      throw new Error(
        `Unable to reach RideInsight AI backend (${API_BASE}). Ensure the FastAPI server is running (e.g. 'python run_backend.py') and that CORS allows this origin.`
      );
    }

    throw err;
  }
}

export const api = {
  // --- HEALTH & STATUS ---
  getHealth: (): Promise<HealthResponse> =>
    fetchWithTimeout<HealthResponse>(`${API_BASE}/health`, {}, 8000),

  // --- DATA & DATASET MANAGEMENT ---
  getSummary: (): Promise<DatasetSummary> =>
    fetchWithTimeout<DatasetSummary>(`${API_BASE}/data/summary`),

  getQuality: (): Promise<DataQuality> =>
    fetchWithTimeout<DataQuality>(`${API_BASE}/data/quality`),

  getLeakageAudit: (): Promise<LeakageAudit> =>
    fetchWithTimeout<LeakageAudit>(`${API_BASE}/data/leakage-audit`),

  getDatasets: (): Promise<DatasetListResponse> =>
    fetchWithTimeout<DatasetListResponse>(`${API_BASE}/data/datasets`),

  getDataset: (id: string): Promise<DatasetInfo> =>
    fetchWithTimeout<DatasetInfo>(`${API_BASE}/data/datasets/${encodeURIComponent(id)}`),

  activateDataset: (
    id: string
  ): Promise<{ status: string; active_dataset_id: string; summary: DatasetSummary }> =>
    fetchWithTimeout<{ status: string; active_dataset_id: string; summary: DatasetSummary }>(
      `${API_BASE}/data/datasets/${encodeURIComponent(id)}/activate`,
      { method: 'POST' }
    ),

  mapColumns: (id: string, mapping: ColumnMapping): Promise<any> =>
    fetchWithTimeout<any>(`${API_BASE}/data/datasets/${encodeURIComponent(id)}/map-columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping }),
    }),

  deleteDataset: (id: string): Promise<{ status: string; message: string }> =>
    fetchWithTimeout<{ status: string; message: string }>(
      `${API_BASE}/data/datasets/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  getFieldOptions: (): Promise<FieldOptionsResponse> =>
    fetchWithTimeout<FieldOptionsResponse>(`${API_BASE}/data/field-options`),

  getPreview: (limit: number = 20, dataset_id?: string): Promise<DatasetPreview> => {
    const url = dataset_id
      ? `${API_BASE}/data/preview?limit=${limit}&dataset_id=${encodeURIComponent(dataset_id)}`
      : `${API_BASE}/data/preview?limit=${limit}`;
    return fetchWithTimeout<DatasetPreview>(url);
  },

  uploadCsv: (file: File): Promise<DatasetUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithTimeout<DatasetUploadResponse>(
      `${API_BASE}/data/upload`,
      {
        method: 'POST',
        body: formData,
      },
      90000 // 90s for large CSV uploads and initial quality scoring
    );
  },

  // --- ANALYSIS & FINGERPRINT ---
  getOverview: (): Promise<ExecutiveOverview> =>
    fetchWithTimeout<ExecutiveOverview>(`${API_BASE}/analysis/overview`),

  getFingerprint: (): Promise<CancellationFingerprint> =>
    fetchWithTimeout<CancellationFingerprint>(`${API_BASE}/analysis/fingerprint`),

  // --- MODEL LAB & PREDICTION ---
  getModelComparison: (): Promise<ModelComparison> =>
    fetchWithTimeout<ModelComparison>(`${API_BASE}/models/compare`),

  trainModels: (params: {
    split_type: string;
    test_size: number;
    tune_hyperparameters: boolean;
    selected_algorithms?: string[];
  }): Promise<ModelComparison> =>
    fetchWithTimeout<ModelComparison>(
      `${API_BASE}/models/train`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      120000 // 120s for full multi-model ML training
    ),

  selectActiveModel: (model_name: string): Promise<{ status: string; active_model: string }> =>
    fetchWithTimeout<{ status: string; active_model: string }>(
      `${API_BASE}/models/select-active?model_name=${encodeURIComponent(model_name)}`,
      { method: 'POST' }
    ),

  predict: (req: PredictRequest): Promise<PredictResponse> =>
    fetchWithTimeout<PredictResponse>(`${API_BASE}/models/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),

  // --- EXPLAINABILITY (SHAP) ---
  getShapGlobal: (model_name?: string): Promise<ShapGlobalResponse> => {
    const url = model_name
      ? `${API_BASE}/explain/shap-global?model_name=${encodeURIComponent(model_name)}`
      : `${API_BASE}/explain/shap-global`;
    return fetchWithTimeout<ShapGlobalResponse>(url, {}, 45000);
  },

  getShapLocal: (req: PredictRequest, model_name?: string): Promise<ShapLocalResponse> => {
    const url = model_name
      ? `${API_BASE}/explain/shap-local?model_name=${encodeURIComponent(model_name)}`
      : `${API_BASE}/explain/shap-local`;
    return fetchWithTimeout<ShapLocalResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },

  // --- FORECASTING ---
  getForecast: (horizon_days: number = 7): Promise<ForecastResponse> =>
    fetchWithTimeout<ForecastResponse>(`${API_BASE}/forecast/daily?horizon_days=${horizon_days}`),

  // --- SCENARIOS ---
  getScenarios: (): Promise<ScenarioResult[]> =>
    fetchWithTimeout<ScenarioResult[]>(`${API_BASE}/scenarios/list`),

  simulateScenario: (params: {
    name: string;
    total_bookings: number;
    current_cancellation_rate: number;
    proposed_reduction_percent: number;
    notes?: string;
  }): Promise<ScenarioResult> =>
    fetchWithTimeout<ScenarioResult>(`${API_BASE}/scenarios/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  resetScenarios: (): Promise<ScenarioResult[]> =>
    fetchWithTimeout<ScenarioResult[]>(`${API_BASE}/scenarios/reset`, { method: 'POST' }),

  // --- INSIGHTS ---
  getRecommendations: (): Promise<RecommendationsResponse> =>
    fetchWithTimeout<RecommendationsResponse>(`${API_BASE}/insights/recommendations`),

  // --- MONITORING ---
  getMonitoringSummary: (): Promise<MonitoringSummary> =>
    fetchWithTimeout<MonitoringSummary>(`${API_BASE}/monitoring/summary`),

  recordOutcome: (prediction_id: number, actual_outcome: string) =>
    fetchWithTimeout<{ status: string }>(`${API_BASE}/monitoring/record-outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prediction_id, actual_outcome }),
    }),

  // --- EXPORT DOWNLOAD HELPER ---
  downloadFile: async (endpoint: string, defaultFilename: string): Promise<void> => {
    const targetUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`Failed to download report (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  },
};
