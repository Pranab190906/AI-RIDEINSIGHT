import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Car,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  TrendingUp,
  Percent,
  Download,
  Calendar,
  IndianRupee,
  UploadCloud,
  FileSpreadsheet,
  Settings2,
  Eye,
  Trash2,
  RefreshCw,
  HelpCircle,
  X,
  ShieldCheck,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import {
  ExecutiveOverview,
  DailyTrendPoint,
  DatasetListResponse,
  DatasetInfo,
  ColumnMapping,
  DataQualityBreakdown,
  DatasetPreview
} from '../types';
import { StatCard } from '../components/StatCard';
import { Header } from '../components/Header';

const STATUS_COLORS = {
  Success: '#10B981', // emerald
  'Canceled by Driver': '#EF4444', // rose
  'Canceled by Customer': '#F59E0B', // amber
  'Driver Not Found': '#6366F1', // indigo
};

const VEHICLE_COLORS = ['#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#EAB308'];

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<ExecutiveOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('All');

  // Dataset Management States
  const [datasetsData, setDatasetsData] = useState<DatasetListResponse | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Dataset Details
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>({});
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [qualityBreakdown, setQualityBreakdown] = useState<DataQualityBreakdown | null>(null);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, datasetsRes, qualityRes] = await Promise.all([
        api.getOverview(),
        api.getDatasets().catch(() => null),
        api.getQuality().catch(() => null),
      ]);
      setData(overviewRes);
      if (datasetsRes) {
        setDatasetsData(datasetsRes);
        const activeMeta = datasetsRes.datasets.find((d) => d.id === datasetsRes.active_dataset_id);
        if (activeMeta) {
          setCurrentMapping(activeMeta.mapping || {});
          setDatasetColumns(activeMeta.columns || []);
        }
      }
      if (qualityRes?.breakdown) {
        setQualityBreakdown(qualityRes.breakdown);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load executive overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        setUploadFile(file);
        setUploadError(null);
      } else {
        setUploadError('Only CSV files (.csv) are supported.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        setUploadFile(file);
        setUploadError(null);
      } else {
        setUploadError('Only CSV files (.csv) are supported.');
      }
    }
  };

  const executeUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 200);

    try {
      const res = await api.uploadCsv(uploadFile);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadSuccess(`Successfully uploaded '${res.filename}' with ${res.total_rows.toLocaleString()} records!`);
      setTimeout(() => {
        setUploadFile(null);
        setShowUploadModal(false);
        setUploadProgress(0);
        loadOverview();
      }, 1200);
    } catch (err: any) {
      clearInterval(progressTimer);
      setUploadProgress(0);
      setUploadError(err.message || 'Failed to upload CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivateDataset = async (datasetId: string) => {
    try {
      setIsLoading(true);
      await api.activateDataset(datasetId);
      await loadOverview();
    } catch (err: any) {
      alert(`Error activating dataset: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset '${filename}'?`)) return;
    try {
      await api.deleteDataset(datasetId);
      await loadOverview();
    } catch (err: any) {
      alert(`Error deleting dataset: ${err.message}`);
    }
  };

  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
    try {
      const prev = await api.getPreview(25);
      setPreviewData(prev);
    } catch (err: any) {
      alert(`Error loading preview: ${err.message}`);
    }
  };

  const handleSaveMapping = async () => {
    if (!datasetsData) return;
    setIsSavingMapping(true);
    try {
      await api.mapColumns(datasetsData.active_dataset_id, currentMapping);
      setShowMappingModal(false);
      await loadOverview();
    } catch (err: any) {
      alert(`Error updating column mapping: ${err.message}`);
    } finally {
      setIsSavingMapping(false);
    }
  };

  // Filter daily trends by date if specified
  const filteredDailyTrends = useMemo(() => {
    if (!data) return [];
    if (dateFilter === 'All') return data.daily_trends;
    if (dateFilter === 'First Half') return data.daily_trends.slice(0, Math.ceil(data.daily_trends.length / 2));
    if (dateFilter === 'Second Half') return data.daily_trends.slice(Math.ceil(data.daily_trends.length / 2));
    return data.daily_trends;
  }, [data, dateFilter]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading dataset and operational intelligence...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-4 max-w-xl mx-auto my-16 bg-[#111827] rounded-2xl border border-rose-500/20 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Application Connection Error</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">{error}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 text-left text-[11px] text-slate-400 space-y-2">
          <p className="font-semibold text-slate-200">Troubleshooting Steps:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Ensure backend is running: <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded font-mono">python run_backend.py</code> or <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded font-mono">.\start_backend.ps1</code></li>
            <li>If the server was cold starting or training initial ML models, wait a moment and click Retry.</li>
            <li>Check backend health directly at <a href="http://127.0.0.1:8000/api/health" target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300">http://127.0.0.1:8000/api/health</a>.</li>
          </ul>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={loadOverview}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Reconnecting...' : 'Retry Connection'}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            Upload New Dataset
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    filename: 'Bookings.csv',
    total_bookings: 0,
    successful_rides: 0,
    canceled_by_driver: 0,
    canceled_by_customer: 0,
    driver_not_found: 0,
    completion_rate: 0,
    unsuccessful_rate: 0,
    cancellation_rate: 0,
    avg_booking_value: 0,
    min_date: null,
    max_date: null,
    status_distribution: {},
    vehicle_distribution: {},
  };

  const statusDist = data?.status_distribution || [];
  const vehicleDist = data?.vehicle_distribution || [];

  const activeDatasetMeta = datasetsData?.datasets.find((d) => d.id === datasetsData.active_dataset_id);

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Executive Overview"
        subtitle={`End-to-end performance metrics, completion rates, and daily demand patterns for ${summary.filename}`}
        onRefresh={loadOverview}
        isLoading={isLoading}
      />

      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* DATASET CONTROL & UPLOAD HUB */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111827] via-[#131C31] to-[#111827] border border-cyan-500/20 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase font-bold border border-cyan-500/30">
                  Active Dataset
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                  {summary.filename}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {summary.total_bookings.toLocaleString()} records •{' '}
                {summary.min_date && summary.max_date
                  ? `${summary.min_date} to ${summary.max_date}`
                  : 'Full observation timeline'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quality Scorecard Button */}
              {qualityBreakdown && (
                <button
                  onClick={() => setShowQualityModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
                  title="View transparent data quality scoring calculation"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Quality: {qualityBreakdown.score}/100</span>
                </button>
              )}

              {/* Column Mapping Button */}
              <button
                onClick={() => setShowMappingModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#151E32] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 text-xs font-medium transition-all"
                title="Configure column mappings for target, vehicle, locations and fare"
              >
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span>Column Mapping</span>
              </button>

              {/* Preview Button */}
              <button
                onClick={handleOpenPreview}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#151E32] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 text-xs font-medium transition-all"
                title="Preview raw dataset records and data types"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Preview Data</span>
              </button>

              {/* Upload Dataset Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Dataset</span>
              </button>
            </div>
          </div>

          {/* Dataset Switcher Row */}
          {datasetsData && datasetsData.datasets.length > 1 && (
            <div className="pt-3 border-t border-[#1E293B]/70 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <span className="font-medium text-slate-300">Registered Datasets:</span>
              <div className="flex flex-wrap items-center gap-2">
                {datasetsData.datasets.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                      d.id === datasetsData.active_dataset_id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-[#0E1526] text-slate-400 border-[#1E293B] hover:text-white'
                    }`}
                  >
                    <button onClick={() => handleActivateDataset(d.id)} className="flex items-center gap-1.5">
                      <span className="truncate max-w-[140px]">{d.filename}</span>
                      <span className="font-mono text-[10px] text-slate-500">({d.total_rows.toLocaleString()})</span>
                    </button>
                    {d.id !== 'default' && (
                      <button
                        onClick={() => handleDeleteDataset(d.id, d.filename)}
                        className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                        title="Delete this uploaded dataset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Filter & Export Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">Timeline Slice:</span>
            <div className="flex gap-1.5">
              {['All', 'First Half', 'Second Half'].map((period) => (
                <button
                  key={period}
                  onClick={() => setDateFilter(period)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    dateFilter === period
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-[#1E293B]'
                  }`}
                >
                  {period === 'All' ? 'Complete Horizon' : period}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => api.downloadFile('/data/export', `rideinsight_${summary.filename}.csv`)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-slate-200 text-xs font-medium border border-[#1E293B] transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Summary CSV</span>
          </button>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="TOTAL BOOKINGS"
            value={summary.total_bookings.toLocaleString()}
            subtitle={`${summary.filename} Demands`}
            icon={Car}
            variant="cyan"
            badge="100% Verified"
          />
          <StatCard
            title="COMPLETED RIDES"
            value={summary.successful_rides.toLocaleString()}
            subtitle={`Completion Rate: ${summary.completion_rate}%`}
            icon={CheckCircle2}
            variant="emerald"
            badge={`${summary.completion_rate}%`}
          />
          <StatCard
            title="CANCELLATION RATE"
            value={`${summary.cancellation_rate}%`}
            subtitle={`${(summary.canceled_by_driver + summary.canceled_by_customer).toLocaleString()} Cancelled`}
            icon={XCircle}
            variant="rose"
            badge="Driver + Customer"
          />
          <StatCard
            title="DRIVER NOT FOUND"
            value={summary.driver_not_found.toLocaleString()}
            subtitle={`${Math.round((summary.driver_not_found / max(1, summary.total_bookings)) * 100)}% of unserved demand`}
            icon={UserX}
            variant="purple"
            badge="Supply Deficit"
          />
        </div>

        {/* Secondary Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Cancelled by Driver</p>
              <h4 className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                {summary.canceled_by_driver.toLocaleString()}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {roundPct(summary.canceled_by_driver, summary.total_bookings)}% of total bookings
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xs">
              {roundPct(summary.canceled_by_driver, max(1, summary.canceled_by_driver + summary.canceled_by_customer))}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Cancelled by Customer</p>
              <h4 className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {summary.canceled_by_customer.toLocaleString()}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {roundPct(summary.canceled_by_customer, summary.total_bookings)}% of total bookings
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              {roundPct(summary.canceled_by_customer, max(1, summary.canceled_by_driver + summary.canceled_by_customer))}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Average Booking Value</p>
              <h4 className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                ₹{summary.avg_booking_value || 439}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Mean fare per dispatch request</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts Row 1: Daily Booking Volumes & Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Trends Area Chart */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Daily Booking Trajectory</h3>
                <p className="text-xs text-slate-400">Completed rides vs. cancelled demand day-over-day</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded bg-[#1E293B] text-slate-300 font-mono">
                {filteredDailyTrends.length} Days
              </span>
            </div>

            <div className="h-72 w-full">
              {filteredDailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredDailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorDriver" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      tickFormatter={(val) => (val.includes('-') ? val.split('-').slice(1).join('/') : val)}
                      fontSize={11}
                    />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="success"
                      name="Completed Rides"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorSuccess)"
                    />
                    <Area
                      type="monotone"
                      dataKey="canceled_driver"
                      name="Canceled by Driver"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#colorDriver)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No daily trend data available for active mapping.
                </div>
              )}
            </div>
          </div>

          {/* Booking Status Distribution Donut */}
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Booking Status Breakdown</h3>
              <p className="text-xs text-slate-400">Total outcomes recorded in dataset</p>
            </div>

            <div className="h-56 w-full">
              {statusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDist.map((entry) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#64748B'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No status breakdown available.
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
              {statusDist.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] || '#64748B' }}
                    />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {item.value.toLocaleString()} ({roundPct(item.value, summary.total_bookings)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2: Vehicle Distribution & Completion Rate Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle Type Distribution */}
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Vehicle Category Distribution</h3>
              <p className="text-xs text-slate-400">Total booking attempts partitioned by vehicle tier</p>
            </div>

            <div className="h-64 w-full">
              {vehicleDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleDist} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-25} textAnchor="end" />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="value" name="Bookings" radius={[4, 4, 0, 0]}>
                      {vehicleDist.map((_, index) => (
                        <Cell key={`veh-${index}`} fill={VEHICLE_COLORS[index % VEHICLE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No vehicle category mapped.
                </div>
              )}
            </div>
          </div>

          {/* Efficiency Trend Line */}
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Efficiency Trend (%)</h3>
              <p className="text-xs text-slate-400">Completion rate vs. cancellation rate day-over-day</p>
            </div>

            <div className="h-64 w-full">
              {filteredDailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredDailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      tickFormatter={(val) => (val.includes('-') ? val.split('-').slice(1).join('/') : val)}
                      fontSize={11}
                    />
                    <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="completion_rate"
                      name="Completion Rate (%)"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cancellation_rate"
                      name="Cancellation Rate (%)"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Efficiency trends require temporal date series.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD DATASET MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Upload Ride-Hailing Dataset</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : uploadFile
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-[#1E293B] hover:border-cyan-500/40 bg-[#090E1A]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              {uploadFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {uploadFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your CSV dataset here, or <span className="text-cyan-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500">Supports Bookings.csv or custom ride-hailing datasets (up to 100MB)</p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Uploading & scoring data quality...</span>
                  <span className="font-mono text-cyan-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status alerts */}
            {uploadError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeUpload}
                disabled={!uploadFile || isUploading}
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 disabled:opacity-50 transition-all"
              >
                {isUploading ? 'Processing...' : 'Upload & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COLUMN MAPPING MODAL */}
      {/* ========================================================================= */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Configure Column Mapping</h3>
                  <p className="text-xs text-slate-400">Map your CSV columns to RideInsight analytics concepts</p>
                </div>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {[
                {
                  key: 'target_column',
                  label: 'Booking Status / Cancellation Target',
                  req: true,
                  desc: 'Ground truth outcome (e.g. Success, Cancelled, Completed, 0/1)',
                },
                {
                  key: 'vehicle_type_column',
                  label: 'Vehicle Category Column',
                  req: false,
                  desc: 'Fleet tiers (e.g. Prime Sedan, Auto, Mini, Bike, SUV)',
                },
                {
                  key: 'pickup_location_column',
                  label: 'Pickup Location Column',
                  req: false,
                  desc: 'Origin zone, neighborhood or hub',
                },
                {
                  key: 'drop_location_column',
                  label: 'Drop Location Column',
                  req: false,
                  desc: 'Destination area or landmark',
                },
                {
                  key: 'booking_value_column',
                  label: 'Booking Fare / Price Column',
                  req: false,
                  desc: 'Trip value or estimated fare (numeric currency)',
                },
                {
                  key: 'date_column',
                  label: 'Date Column',
                  req: false,
                  desc: 'Booking creation date for time-series forecasting',
                },
                {
                  key: 'time_column',
                  label: 'Time Column',
                  req: false,
                  desc: 'Booking timestamp or HH:MM string for hourly friction fingerprints',
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1 p-3 bg-[#0A0F1D] rounded-xl border border-[#1E293B]">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200">
                      {field.label} {field.req && <span className="text-rose-400">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">{field.key}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{field.desc}</p>
                  <select
                    value={(currentMapping as any)[field.key] || ''}
                    onChange={(e) =>
                      setCurrentMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value === '' ? null : e.target.value,
                      }))
                    }
                    className="w-full mt-1.5 px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-slate-200 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="">-- (Not Mapped / None) --</option>
                    {datasetColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={isSavingMapping}
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
              >
                {isSavingMapping ? 'Applying...' : 'Save & Retrain Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DATA QUALITY SCORECARD MODAL */}
      {/* ========================================================================= */}
      {showQualityModal && qualityBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Data Quality Scorecard</h3>
                  <p className="text-xs text-slate-400">Transparent mathematical breakdown of dataset health</p>
                </div>
              </div>
              <button
                onClick={() => setShowQualityModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Big Score Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-[#111827] to-[#111827] border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider font-bold">
                  Quality Tier: {qualityBreakdown.rating}
                </span>
                <h2 className="text-4xl font-extrabold text-white font-mono mt-1">
                  {qualityBreakdown.score}
                  <span className="text-lg text-slate-500 font-normal"> / 100</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {qualityBreakdown.total_records.toLocaleString()} rows • {qualityBreakdown.total_columns} columns evaluated
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-lg">
                {qualityBreakdown.score}%
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="p-3.5 bg-[#0A0F1D] rounded-xl border border-[#1E293B] space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Scoring Formula</span>
              <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{qualityBreakdown.formula}</p>
            </div>

            {/* Deductions breakdown */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-white">Quality Assessment Checks</h4>
              {qualityBreakdown.deductions.length === 0 ? (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Zero quality penalties detected! Dataset is completely clean and verified.</span>
                </div>
              ) : (
                qualityBreakdown.deductions.map((ded, i) => (
                  <div key={i} className="p-3 bg-[#0E1526] rounded-xl border border-[#1E293B] flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200">{ded.category}</span>
                      <p className="text-slate-400">{ded.description}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{ded.impact}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300 font-mono font-bold shrink-0">
                      -{ded.points_deducted} pts
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowQualityModal(false)}
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DATASET PREVIEW MODAL */}
      {/* ========================================================================= */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Dataset Preview ({previewData.filename})</h3>
                  <p className="text-xs text-slate-400">
                    Displaying first {previewData.sample_records.length} sample rows across {previewData.total_cols} columns
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-[#1E293B] rounded-xl bg-[#090E1A]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#151E32] sticky top-0 border-b border-[#1E293B]">
                  <tr>
                    {previewData.columns.map((col) => (
                      <th key={col} className="p-3 font-mono text-slate-300 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{col}</span>
                          <span className="text-[10px] text-cyan-400 font-normal">
                            {previewData.column_types[col] || 'unknown'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-mono text-slate-300">
                  {previewData.sample_records.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#111827] transition-colors">
                      {previewData.columns.map((col) => (
                        <td key={col} className="p-3 whitespace-nowrap max-w-[200px] truncate text-slate-300">
                          {row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span className="text-slate-600 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 shrink-0">
              <span className="text-xs text-slate-400">
                Total Records in Dataset: <span className="text-white font-mono">{previewData.total_rows.toLocaleString()}</span>
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function roundPct(count: number, total: number): string {
  if (total === 0) return '0';
  return ((count / total) * 100).toFixed(1);
}

function max(a: number, b: number): number {
  return a > b ? a : b;
}
