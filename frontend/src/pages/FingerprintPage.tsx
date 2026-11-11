import React, { useEffect, useState } from 'react';
import {
  Fingerprint,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Info,
  Car,
  MapPin,
  Clock,
  Calendar,
  AlertOctagon,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { CancellationFingerprint, FingerprintSegment } from '../types';
import { Header } from '../components/Header';

export const FingerprintPage: React.FC = () => {
  const [data, setData] = useState<CancellationFingerprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<
    'vehicle' | 'pickup' | 'drop' | 'hour' | 'day'
  >('vehicle');
  const [minBookingsFilter, setMinBookingsFilter] = useState<number>(50);

  const loadFingerprint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getFingerprint();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate cancellation fingerprint.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFingerprint();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Computing cancellation fingerprints across 92,900 eligible bookings...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-3">
        <p className="text-sm">{error || 'Fingerprint data unavailable.'}</p>
        <button onClick={loadFingerprint} className="px-4 py-2 bg-cyan-600 text-white text-xs rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const getActiveSegments = (): FingerprintSegment[] => {
    switch (selectedDimension) {
      case 'vehicle':
        return data.segments_by_vehicle;
      case 'pickup':
        return data.segments_by_pickup;
      case 'drop':
        return data.segments_by_drop;
      case 'hour':
        return data.segments_by_hour;
      case 'day':
        return data.segments_by_day;
      default:
        return data.segments_by_vehicle;
    }
  };

  const segments = getActiveSegments().filter((s) => s.total_bookings >= minBookingsFilter);
  const highestSegment = segments.length > 0 ? segments[0] : null;
  const lowestSegment = segments.length > 0 ? segments[segments.length - 1] : null;

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Cancellation Fingerprint"
        subtitle="Empirical pattern mining of cancellation rates and statistical friction scores across operational dimensions"
        onRefresh={loadFingerprint}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Methodological Context Alert */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-cyan-300">Statistical Fingerprint Methodology</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cancellation Rate is calculated strictly on eligible assigned trips:{' '}
              <span className="font-mono text-cyan-200">
                Cancelled Bookings / (Success + Driver Cancel + Customer Cancel) × 100
              </span>
              . Baseline rate across platform:{' '}
              <span className="font-mono font-bold text-white">{data.overall_cancellation_rate}%</span>. A minimum
              sample filter (≥{minBookingsFilter} bookings) is enforced to prevent small-number volatility.
            </p>
          </div>
        </div>

        {/* Dimension Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111827] p-3 rounded-xl border border-[#1E293B]">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'vehicle', label: 'Vehicle Fleet', icon: Car },
              { id: 'pickup', label: 'Pickup Location', icon: MapPin },
              { id: 'drop', label: 'Drop Location', icon: MapPin },
              { id: 'hour', label: 'Booking Hour', icon: Clock },
              { id: 'day', label: 'Day of Week', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedDimension === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedDimension(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Min. Volume:</span>
            <select
              value={minBookingsFilter}
              onChange={(e) => setMinBookingsFilter(Number(e.target.value))}
              className="bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="10">10+ Bookings</option>
              <option value="50">50+ Bookings</option>
              <option value="200">200+ Bookings</option>
              <option value="1000">1,000+ Bookings</option>
            </select>
          </div>
        </div>

        {/* Segment Highlights Row */}
        {highestSegment && lowestSegment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Highest Friction Segment */}
            <div className="p-5 rounded-xl bg-[#111827] border border-rose-500/30 flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs uppercase font-bold text-rose-400 tracking-wider">
                    Highest Friction Segment
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{highestSegment.category}</h3>
                <p className="text-xs text-slate-400">
                  <span className="font-bold text-rose-400 text-sm font-mono">{highestSegment.cancellation_rate}%</span>{' '}
                  cancellation rate ({highestSegment.cancelled_bookings.toLocaleString()} of{' '}
                  {highestSegment.total_bookings.toLocaleString()} attempts)
                </p>
                <div className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300">
                  Fingerprint Score: {highestSegment.fingerprint_score} (Severe)
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Lowest Friction Segment */}
            <div className="p-5 rounded-xl bg-[#111827] border border-emerald-500/30 flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Most Reliable Segment
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{lowestSegment.category}</h3>
                <p className="text-xs text-slate-400">
                  <span className="font-bold text-emerald-400 text-sm font-mono">{lowestSegment.cancellation_rate}%</span>{' '}
                  cancellation rate ({lowestSegment.cancelled_bookings.toLocaleString()} of{' '}
                  {lowestSegment.total_bookings.toLocaleString()} attempts)
                </p>
                <div className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  Fingerprint Score: {lowestSegment.fingerprint_score} (Optimal)
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Primary Chart: Cancellation Rate by Segment vs Overall Baseline */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Cancellation Rate by Category (%)</h3>
              <p className="text-xs text-slate-400">
                Dashed line represents overall baseline rate ({data.overall_cancellation_rate}%). Bars in rose exceed baseline.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Above Baseline
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Below Baseline
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segments} margin={{ top: 15, right: 15, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="category" stroke="#64748B" fontSize={11} angle={-30} textAnchor="end" interval={0} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 45]} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as FingerprintSegment;
                      return (
                        <div className="bg-[#0D1322] border border-[#1E293B] p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{d.category}</p>
                          <p className="text-slate-300">
                            Cancellation Rate:{' '}
                            <span className="font-mono font-bold text-cyan-400">{d.cancellation_rate}%</span>
                          </p>
                          <p className="text-slate-400">
                            Volume: {d.cancelled_bookings.toLocaleString()} cancelled / {d.total_bookings.toLocaleString()} total
                          </p>
                          <p className="text-slate-400">
                            Fingerprint Score: <span className="font-mono text-purple-400">{d.fingerprint_score}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={data.overall_cancellation_rate}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: `Baseline (${data.overall_cancellation_rate}%)`,
                    fill: '#F59E0B',
                    fontSize: 11,
                    position: 'top',
                  }}
                />
                <Bar dataKey="cancellation_rate" radius={[4, 4, 0, 0]}>
                  {segments.map((entry) => (
                    <Cell
                      key={`cell-${entry.category}`}
                      fill={entry.cancellation_rate > data.overall_cancellation_rate ? '#EF4444' : '#06B6D4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Segment Fingerprint Table */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Segment Fingerprint Leaderboard</h3>
            <p className="text-xs text-slate-400">
              Ranked by analytical friction score: severity weighted by statistical confidence
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1322] text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="p-3 font-semibold">Rank</th>
                  <th className="p-3 font-semibold">Segment Name</th>
                  <th className="p-3 font-semibold">Eligible Bookings</th>
                  <th className="p-3 font-semibold">Cancelled Rides</th>
                  <th className="p-3 font-semibold">Cancellation Rate</th>
                  <th className="p-3 font-semibold">Relative Risk</th>
                  <th className="p-3 font-semibold">Fingerprint Score</th>
                  <th className="p-3 font-semibold">Risk State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {segments.map((seg, idx) => {
                  const relativeRisk = (seg.cancellation_rate / data.overall_cancellation_rate).toFixed(2);
                  return (
                    <tr key={seg.category} className="hover:bg-[#151E32]/50 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">{seg.category}</td>
                      <td className="p-3 font-mono text-slate-300">{seg.total_bookings.toLocaleString()}</td>
                      <td className="p-3 font-mono text-slate-300">{seg.cancelled_bookings.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-slate-200">{seg.cancellation_rate}%</td>
                      <td className="p-3 font-mono text-slate-300">{relativeRisk}x</td>
                      <td className="p-3 font-mono font-bold text-cyan-400">{seg.fingerprint_score}</td>
                      <td className="p-3">
                        {seg.is_high_risk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/30 font-semibold text-[10px]">
                            <AlertOctagon className="w-3 h-3" /> High Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Controlled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
