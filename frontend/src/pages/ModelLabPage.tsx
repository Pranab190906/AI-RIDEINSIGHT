import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  Sliders,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { api } from '../services/api';
import { ModelComparison, ModelMetrics } from '../types';
import { Header } from '../components/Header';

export const ModelLabPage: React.FC = () => {
  const [comparison, setComparison] = useState<ModelComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<string>('random');
  const [testSize, setTestSize] = useState<number>(0.2);
  const [tuneHp, setTuneHp] = useState<boolean>(false);
  const [activeTabModel, setActiveTabModel] = useState<string>('Gradient Boosting');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadComparison = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getModelComparison();
      setComparison(res);
      setActiveTabModel(res.active_model || res.recommended_model || 'Gradient Boosting');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch model comparison.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, []);

  const handleTrain = async () => {
    setIsTraining(true);
    setError(null);
    setSuccessNotice(null);
    try {
      const res = await api.trainModels({
        split_type: splitType,
        test_size: testSize,
        tune_hyperparameters: tuneHp,
      });
      setComparison(res);
      setActiveTabModel(res.recommended_model);
      setSuccessNotice(`Training completed successfully using ${splitType} evaluation split.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Training run failed.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleSetActive = async (name: string) => {
    try {
      await api.selectActiveModel(name);
      if (comparison) {
        setComparison({ ...comparison, active_model: name });
      }
      setSuccessNotice(`Active deployed model updated to ${name}.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to set active model.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading model benchmarks and pipelines...</p>
        </div>
      </div>
    );
  }

  if (error && !comparison) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-3">
        <p className="text-sm">{error}</p>
        <button onClick={loadComparison} className="px-4 py-2 bg-cyan-600 text-white text-xs rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const modelList: ModelMetrics[] = comparison ? Object.values(comparison.models) : [];
  const selectedModel = comparison?.models[activeTabModel] || modelList[0];

  // Comparison chart data
  const comparisonChartData = modelList.map((m) => ({
    name: m.algorithm,
    Accuracy: +(m.accuracy * 100).toFixed(1),
    Precision: +(m.precision * 100).toFixed(1),
    Recall: +(m.recall * 100).toFixed(1),
    F1: +(m.f1 * 100).toFixed(1),
    'ROC-AUC': +(m.roc_auc * 100).toFixed(1),
  }));

  // Radar data for selected model
  const radarData = selectedModel
    ? [
        { metric: 'Accuracy', value: +(selectedModel.accuracy * 100).toFixed(1) },
        { metric: 'Precision', value: +(selectedModel.precision * 100).toFixed(1) },
        { metric: 'Recall', value: +(selectedModel.recall * 100).toFixed(1) },
        { metric: 'F1 Score', value: +(selectedModel.f1 * 100).toFixed(1) },
        { metric: 'ROC-AUC', value: +(selectedModel.roc_auc * 100).toFixed(1) },
      ]
    : [];

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Machine Learning Model Lab"
        subtitle="Benchmark, tune, and deploy 4 supervised learning algorithms evaluated on strictly leak-free booking parameters"
        onRefresh={loadComparison}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Notification Banner */}
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Experiment Configuration & Control Bar */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Pipeline Training Configuration</h3>
            </div>
            <span className="text-xs text-slate-400">
              Evaluated on{' '}
              <span className="font-mono font-bold text-cyan-300">
                {comparison?.test_records_count.toLocaleString()} unseen test rides
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Split Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Validation Mode</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="random">Stratified Random (80/20)</option>
                <option value="chronological">Chronological (Time-Ordered)</option>
              </select>
              <p className="text-[10px] text-slate-500">
                {splitType === 'chronological' ? 'Realistic future deployment test' : 'Standard balanced baseline'}
              </p>
            </div>

            {/* Test Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Holdout Size</span>
                <span className="font-mono text-cyan-400 font-semibold">{Math.round(testSize * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.35"
                step="0.05"
                value={testSize}
                onChange={(e) => setTestSize(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800"
              />
            </div>

            {/* Hyperparameter Tuning Toggle */}
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="tuneHp"
                checked={tuneHp}
                onChange={(e) => setTuneHp(e.target.checked)}
                className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="tuneHp" className="text-xs text-slate-300 cursor-pointer select-none">
                Enable Grid Search Tuning
              </label>
            </div>

            {/* Train Trigger Button */}
            <button
              onClick={handleTrain}
              disabled={isTraining}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50"
            >
              {isTraining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Training 4 Models...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Train & Evaluate Suite</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recommended Model Justification Banner */}
        {comparison && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#111827] via-[#131F37] to-[#111827] border border-cyan-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                    Recommended Model by Objective
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                    {comparison.recommended_model}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  {comparison.recommendation_reason}
                </p>
              </div>
            </div>

            {comparison.active_model !== comparison.recommended_model ? (
              <button
                onClick={() => handleSetActive(comparison.recommended_model)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 shadow-md shadow-cyan-500/20 transition-all"
              >
                Deploy {comparison.recommended_model}
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-medium text-xs flex items-center gap-1.5 shrink-0">
                <Check className="w-4 h-4" /> Deployed as Active
              </span>
            )}
          </div>
        )}

        {/* Model Comparison Arena Chart */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Model Comparison Arena</h3>
              <p className="text-xs text-slate-400">Side-by-side performance across 5 standardized metrics (%)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-cyan-400 font-semibold">{modelList.length}</span> Models Evaluated
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Accuracy" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Precision" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Recall" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithm Deep-Dive Panel */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Algorithm Inspection & Confusion Matrix</h3>
              <p className="text-xs text-slate-400">Select an algorithm to view classification breakdown and latency</p>
            </div>

            {/* Model Tabs */}
            <div className="flex flex-wrap gap-2">
              {modelList.map((m) => (
                <button
                  key={m.algorithm}
                  onClick={() => setActiveTabModel(m.algorithm)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTabModel === m.algorithm
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:bg-[#1E293B]'
                  }`}
                >
                  {m.algorithm}
                </button>
              ))}
            </div>
          </div>

          {selectedModel && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Confusion Matrix Card */}
              <div className="p-5 rounded-xl bg-[#0D1322] border border-[#1E293B] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200">Confusion Matrix (Test Set)</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Time: {selectedModel.duration_seconds}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                    <p className="text-[10px] text-emerald-400 uppercase font-semibold">True Negative (TN)</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">
                      {selectedModel.confusion_matrix[0][0].toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">Correctly Predicted Success</p>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30">
                    <p className="text-[10px] text-rose-400 uppercase font-semibold">False Positive (FP)</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">
                      {selectedModel.confusion_matrix[0][1].toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">False Alarm Cancellation</p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
                    <p className="text-[10px] text-amber-400 uppercase font-semibold">False Negative (FN)</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">
                      {selectedModel.confusion_matrix[1][0].toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">Missed Cancellation</p>
                  </div>

                  <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <p className="text-[10px] text-cyan-400 uppercase font-semibold">True Positive (TP)</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">
                      {selectedModel.confusion_matrix[1][1].toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">Correctly Flagged Risk</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Decision Threshold:</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedModel.threshold}</span>
                </div>
              </div>

              {/* Radar Profile */}
              <div className="p-4 rounded-xl bg-[#0D1322] border border-[#1E293B] h-64 flex flex-col justify-between">
                <h4 className="text-xs font-semibold text-slate-200">Metric Balance Profile</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#1E293B" />
                      <PolarAngleAxis dataKey="metric" stroke="#64748B" fontSize={10} />
                      <PolarRadiusAxis stroke="#1E293B" domain={[0, 100]} />
                      <Radar
                        name={selectedModel.algorithm}
                        dataKey="value"
                        stroke="#06B6D4"
                        fill="#06B6D4"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action & Metric Specs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Accuracy:</span>
                    <span className="font-mono font-bold text-white">{(selectedModel.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">F1 Score (Harmonic Mean):</span>
                    <span className="font-mono font-bold text-emerald-400">{(selectedModel.f1 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">ROC-AUC:</span>
                    <span className="font-mono font-bold text-purple-400">{selectedModel.roc_auc.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Training Latency:</span>
                    <span className="font-mono text-slate-300">{selectedModel.duration_seconds} sec</span>
                  </div>
                </div>

                {comparison?.active_model === selectedModel.algorithm ? (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium text-center">
                    Currently Active in Production Pipeline
                  </div>
                ) : (
                  <button
                    onClick={() => handleSetActive(selectedModel.algorithm)}
                    className="w-full py-2.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-cyan-400 font-bold text-xs border border-cyan-500/30 transition-all"
                  >
                    Set {selectedModel.algorithm} as Active
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
