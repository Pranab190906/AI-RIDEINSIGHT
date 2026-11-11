
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

// =====================================================
// 1. BACKEND API CONFIGURATION
// =====================================================

const ENV_BACKEND = import.meta.env.VITE_API_URL;

const DEFAULT_BACKEND = import.meta.env.DEV
  ? 'http://localhost:8000'
  : 'https://ridebackend2.onrender.com';

const BACKEND_URL = (
  ENV_BACKEND || DEFAULT_BACKEND
).replace(/\/+$/, '');

// Prevent duplicate /api if environment variable already includes it.
export const API_BASE = BACKEND_URL.endsWith('/api')
  ? BACKEND_URL
  : `${BACKEND_URL}/api`;

console.info('RideInsight API Base URL:', API_BASE);

// =====================================================
// 2. URL HELPER
// =====================================================

function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');

  if (
    cleanEndpoint === 'api' ||
    cleanEndpoint.startsWith('api/')
  ) {
    return `${BACKEND_URL}/${cleanEndpoint}`;
  }

  return `${API_BASE}/${cleanEndpoint}`;
}

// =====================================================
// 3. STANDARD HTTP REQUEST HANDLER
// =====================================================

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 45000
): Promise<T> {

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {

      let detailMessage = response.statusText;

      try {
        const errorData = await response.json();

        detailMessage =
          errorData.detail ||
          errorData.message ||
          detailMessage;

      } catch {
        // Response was not JSON.
      }

      throw new Error(
        `HTTP ${response.status}: ${detailMessage || 'Request failed'}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json() as T;

  } catch (error: unknown) {

    if (error instanceof Error) {

      if (error.name === 'AbortError') {
        throw new Error(
          `Request timed out after ${Math.round(timeoutMs / 1000)} seconds: ${url}. Check backend processing and Render logs.`
        );
      }

      if (
        error.message === 'Failed to fetch' ||
        error.message.includes('NetworkError') ||
        error.message.includes('ECONNREFUSED')
      ) {
        throw new Error(
          `Cannot connect to RideInsight backend: ${API_BASE}. Check backend availability, frontend API URL and CORS configuration. Original error: ${error.message}`
        );
      }

      throw error;
    }

    throw new Error('An unexpected network error occurred.');

  } finally {
    clearTimeout(timeoutId);
  }
}

// =====================================================
// 4. RIDEINSIGHT API FUNCTIONS
// =====================================================

export const api = {

  // ---------------------------------------------------
  // HEALTH AND STATUS
  // ---------------------------------------------------

  getHealth: (): Promise<HealthResponse> =>
    fetchWithTimeout<HealthResponse>(
      buildApiUrl('/health'),
      {},
      15000
    ),

  // ---------------------------------------------------
  // DATASET MANAGEMENT
  // ---------------------------------------------------

  getSummary: (): Promise<DatasetSummary> =>
    fetchWithTimeout<DatasetSummary>(
      buildApiUrl('/data/summary')
    ),

  getQuality: (): Promise<DataQuality> =>
    fetchWithTimeout<DataQuality>(
      buildApiUrl('/data/quality')
    ),

  getLeakageAudit: (): Promise<LeakageAudit> =>
    fetchWithTimeout<LeakageAudit>(
      buildApiUrl('/data/leakage-audit')
    ),

  getDatasets: (): Promise<DatasetListResponse> =>
    fetchWithTimeout<DatasetListResponse>(
      buildApiUrl('/data/datasets')
    ),

  getDataset: (id: string): Promise<DatasetInfo> =>
    fetchWithTimeout<DatasetInfo>(
      buildApiUrl(`/data/datasets/${encodeURIComponent(id)}`)
    ),

  activateDataset: (
    id: string
  ): Promise<{
    status: string;
    active_dataset_id: string;
    summary: DatasetSummary;
  }> =>
    fetchWithTimeout<{
      status: string;
      active_dataset_id: string;
      summary: DatasetSummary;
    }>(
      buildApiUrl(
        `/data/datasets/${encodeURIComponent(id)}/activate`
      ),
      { method: 'POST' }
    ),

  mapColumns: (
    id: string,
    mapping: ColumnMapping
  ): Promise<any> =>
    fetchWithTimeout<any>(
      buildApiUrl(
        `/data/datasets/${encodeURIComponent(id)}/map-columns`
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mapping })
      }
    ),

  deleteDataset: (
    id: string
  ): Promise<{ status: string; message: string }> =>
    fetchWithTimeout<{ status: string; message: string }>(
      buildApiUrl(
        `/data/datasets/${encodeURIComponent(id)}`
      ),
      { method: 'DELETE' }
    ),

  getFieldOptions: (): Promise<FieldOptionsResponse> =>
    fetchWithTimeout<FieldOptionsResponse>(
      buildApiUrl('/data/field-options')
    ),

  getPreview: (
    limit: number = 20,
    dataset_id?: string
  ): Promise<DatasetPreview> => {

    const params = new URLSearchParams();

    params.set('limit', String(limit));

    if (dataset_id) {
      params.set('dataset_id', dataset_id);
    }

    return fetchWithTimeout<DatasetPreview>(
      `${buildApiUrl('/data/preview')}?${params.toString()}`
    );
  },

  // ---------------------------------------------------
  // CSV UPLOAD
  // ---------------------------------------------------

  uploadCsv: (
    file: File
  ): Promise<DatasetUploadResponse> => {

    const formData = new FormData();

    formData.append('file', file);

    return fetchWithTimeout<DatasetUploadResponse>(
      buildApiUrl('/data/upload'),
      {
        method: 'POST',
        body: formData
      },
      180000
    );
  },

  // ---------------------------------------------------
  // ANALYSIS AND CANCELLATION FINGERPRINT
  // ---------------------------------------------------

  getOverview: (): Promise<ExecutiveOverview> =>
    fetchWithTimeout<ExecutiveOverview>(
      buildApiUrl('/analysis/overview')
    ),

  getFingerprint: (): Promise<CancellationFingerprint> =>
    fetchWithTimeout<CancellationFingerprint>(
      buildApiUrl('/analysis/fingerprint')
    ),

  // ---------------------------------------------------
  // MODEL LAB AND MODEL COMPARISON
  // ---------------------------------------------------

  getModelComparison: (): Promise<ModelComparison> =>
    fetchWithTimeout<ModelComparison>(
      buildApiUrl('/models/compare')
    ),

  trainModels: (params: {
    split_type: string;
    test_size: number;
    tune_hyperparameters: boolean;
    selected_algorithms?: string[];
  }): Promise<ModelComparison> =>
    fetchWithTimeout<ModelComparison>(
      buildApiUrl('/models/train'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      },
      180000
    ),

  selectActiveModel: (
    model_name: string
  ): Promise<{
    status: string;
    active_model: string;
  }> =>
    fetchWithTimeout<{
      status: string;
      active_model: string;
    }>(
      `${buildApiUrl('/models/select-active')}?model_name=${encodeURIComponent(model_name)}`,
      { method: 'POST' }
    ),

  // ---------------------------------------------------
  // PREDICTIONS
  // ---------------------------------------------------

  predict: (
    req: PredictRequest
  ): Promise<PredictResponse> =>
    fetchWithTimeout<PredictResponse>(
      buildApiUrl('/models/predict'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req)
      }
    ),

  // ---------------------------------------------------
  // SHAP EXPLAINABILITY
  // ---------------------------------------------------

  getShapGlobal: (
    model_name?: string
  ): Promise<ShapGlobalResponse> => {

    const params = new URLSearchParams();

    if (model_name) {
      params.set('model_name', model_name);
    }

    const query = params.toString();

    return fetchWithTimeout<ShapGlobalResponse>(
      `${buildApiUrl('/explain/shap-global')}${query ? `?${query}` : ''}`,
      {},
      60000
    );
  },

  getShapLocal: (
    req: PredictRequest,
    model_name?: string
  ): Promise<ShapLocalResponse> => {

    const params = new URLSearchParams();

    if (model_name) {
      params.set('model_name', model_name);
    }

    const query = params.toString();

    return fetchWithTimeout<ShapLocalResponse>(
      `${buildApiUrl('/explain/shap-local')}${query ? `?${query}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req)
      },
      60000
    );
  },

  // ---------------------------------------------------
  // FORECASTING
  // ---------------------------------------------------

  getForecast: (
    horizon_days: number = 7
  ): Promise<ForecastResponse> =>
    fetchWithTimeout<ForecastResponse>(
      `${buildApiUrl('/forecast/daily')}?horizon_days=${encodeURIComponent(String(horizon_days))}`
    ),

  // ---------------------------------------------------
  // SCENARIO SIMULATION
  // ---------------------------------------------------

  getScenarios: (): Promise<ScenarioResult[]> =>
    fetchWithTimeout<ScenarioResult[]>(
      buildApiUrl('/scenarios/list')
    ),

  simulateScenario: (params: {
    name: string;
    total_bookings: number;
    current_cancellation_rate: number;
    proposed_reduction_percent: number;
    notes?: string;
  }): Promise<ScenarioResult> =>
    fetchWithTimeout<ScenarioResult>(
      buildApiUrl('/scenarios/simulate'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      }
    ),

  resetScenarios: (): Promise<ScenarioResult[]> =>
    fetchWithTimeout<ScenarioResult[]>(
      buildApiUrl('/scenarios/reset'),
      { method: 'POST' }
    ),

  // ---------------------------------------------------
  // INSIGHTS AND RECOMMENDATIONS
  // ---------------------------------------------------

  getRecommendations: (): Promise<RecommendationsResponse> =>
    fetchWithTimeout<RecommendationsResponse>(
      buildApiUrl('/insights/recommendations')
    ),

  // ---------------------------------------------------
  // MONITORING
  // ---------------------------------------------------

  getMonitoringSummary: (): Promise<MonitoringSummary> =>
    fetchWithTimeout<MonitoringSummary>(
      buildApiUrl('/monitoring/summary')
    ),

  recordOutcome: (
    prediction_id: number,
    actual_outcome: string
  ): Promise<{ status: string }> =>
    fetchWithTimeout<{ status: string }>(
      buildApiUrl('/monitoring/record-outcome'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prediction_id,
          actual_outcome
        })
      }
    ),

  // ---------------------------------------------------
  // REPORT DOWNLOAD
  // ---------------------------------------------------

  downloadFile: async (
    endpoint: string,
    defaultFilename: string
  ): Promise<void> => {

    const targetUrl = endpoint.startsWith('http')
      ? endpoint
      : buildApiUrl(endpoint);

    const response = await fetch(targetUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download report. HTTP ${response.status}: ${response.statusText}`
      );
    }

    const blob = await response.blob();

    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = defaultFilename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
  }

};
