import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Check,
  X,
  TrendingUp,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { MonitoringSummary } from '../types';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';

export const MonitoringPage: React.FC = () => {
  const [data, setData] = useState<MonitoringSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadMonitoring = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getMonitoringSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitoring data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
  }, []);

  const handleRecordOutcome = async (id: number, outcome: string) => {
    setUpdatingId(id);
    try {
      await api.recordOutcome(id, outcome);
      await loadMonitoring();
    } catch (err: any) {
      alert(`Error updating outcome: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading model monitoring metrics and prediction logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Model Observability & Monitoring"
        subtitle="Track inference performance, record ground-truth outcomes, and monitor drift over time"
        onRefresh={loadMonitoring}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Metric Cards */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="TOTAL PREDICTIONS"
              value={data.total_predictions.toLocaleString()}
              subtitle="Logged in SQLite audit store"
              icon={Activity}
              variant="cyan"
            />
            <StatCard
              title="EVALUATED OUTCOMES"
              value={data.evaluated_predictions.toLocaleString()}
              subtitle={`${data.pending_predictions} pending completion`}
              icon={Clock}
              variant="blue"
            />
            <StatCard
              title="LIVE ACCURACY"
              value={data.accuracy !== null ? `${(data.accuracy * 100).toFixed(1)}%` : 'Pending'}
              subtitle="On verified completed trips"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="LIVE F1 SCORE"
              value={data.f1_score !== null ? `${(data.f1_score * 100).toFixed(1)}%` : 'Pending'}
              subtitle="Harmonic precision/recall"
              icon={TrendingUp}
              variant="purple"
            />
          </div>
        )}

        {/* Prediction Logs with Feedback Action */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Prediction Inference Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Log of real-time predictions. Use the action buttons to record ground-truth ride outcomes once trips conclude.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 px-2.5 py-1 rounded bg-[#0D1322] border border-[#1E293B]">
              Persistent SQLite Storage
            </span>
          </div>

          {data && data.recent_records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D1322] text-slate-400 border-b border-[#1E293B]">
                  <tr>
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Timestamp</th>
                    <th className="p-3 font-semibold">Parameters</th>
                    <th className="p-3 font-semibold">Cancel Prob</th>
                    <th className="p-3 font-semibold">Risk Tier</th>
                    <th className="p-3 font-semibold">Threshold</th>
                    <th className="p-3 font-semibold">Actual Outcome</th>
                    <th className="p-3 font-semibold">Provide Ground Truth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {data.recent_records.map((r) => (
                    <tr key={r.id} className="hover:bg-[#151E32]/50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{r.id}</td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">
                        {r.created_at ? new Date(r.created_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-3 text-slate-300">
                        <span className="font-semibold text-white">{r.features.Vehicle_Type || 'Vehicle'}</span> •{' '}
                        <span>{r.features.Pickup_Location || 'Pickup'}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-400">
                        {(r.cancellation_probability * 100).toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            r.risk_category === 'High Risk'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                              : r.risk_category === 'Medium Risk'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {r.risk_category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{r.threshold_used}</td>
                      <td className="p-3">
                        {r.actual_outcome ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.actual_outcome === 'Success'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-950 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {r.actual_outcome}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pending Feedback</span>
                        )}
                      </td>
                      <td className="p-3">
                        {!r.actual_outcome ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRecordOutcome(r.id, 'Success')}
                              disabled={updatingId === r.id}
                              className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-all"
                            >
                              Success
                            </button>
                            <button
                              onClick={() => handleRecordOutcome(r.id, 'Cancelled')}
                              disabled={updatingId === r.id}
                              className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-all"
                            >
                              Cancelled
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No real-time predictions logged yet. Run predictions in the Smart Prediction interface to see them tracked here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
