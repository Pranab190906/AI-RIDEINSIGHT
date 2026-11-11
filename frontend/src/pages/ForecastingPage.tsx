import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { ForecastResponse } from '../types';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';

export const ForecastingPage: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = async (horizon: number = horizonDays) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getForecast(horizon);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate completed-ride forecast.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForecast(horizonDays);
  }, [horizonDays]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Computing daily time-series forecast with backtesting validation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Completed-Ride Forecasting"
        subtitle="Chronologically validated daily ride demand projections with prediction uncertainty intervals"
        onRefresh={() => loadForecast(horizonDays)}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Prominent Methodological Limitations Disclosure */}
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-amber-300">Data Horizon & Forecasting Limitation Notice</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data?.limitations_disclosure ||
                'The dataset encompasses July 2024 (31 historical days). While suitable for short-term operational pacing (7–14 days), one month is mathematically insufficient to infer annual seasonality or macroeconomic cyclicality. Forecast uses Holt Exponential Smoothing validated via chronological backtesting.'}
            </p>
          </div>
        </div>

        {/* Horizon Controls & Metric Cards */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">Projection Horizon:</span>
            <div className="flex gap-2">
              {[7, 14, 30].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizonDays(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    horizonDays === h
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:bg-[#1E293B]'
                  }`}
                >
                  +{h} Days Forward
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">
              Backtest MAE:{' '}
              <strong className="text-emerald-400">{data?.mae} rides/day</strong>
            </span>
            <span className="text-slate-400">
              Backtest RMSE:{' '}
              <strong className="text-cyan-400">{data?.rmse} rides/day</strong>
            </span>
          </div>
        </div>

        {/* Metric Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="HISTORICAL WINDOW"
            value="31 Days"
            subtitle="July 1 to July 31, 2024"
            icon={Calendar}
            variant="cyan"
          />
          <StatCard
            title="DAILY MEAN VOLUME"
            value="2,063 Rides"
            subtitle="Mean completed trips per day"
            icon={TrendingUp}
            variant="emerald"
          />
          <StatCard
            title="FORECAST HORIZON"
            value={`+${horizonDays} Days`}
            subtitle="August 2024 Projection"
            icon={Clock}
            variant="blue"
          />
          <StatCard
            title="MODEL ALGORITHM"
            value="Holt ES"
            subtitle="Exponential Smoothing + Trend"
            icon={CheckCircle2}
            variant="purple"
          />
        </div>

        {/* Primary Forecast Chart */}
        {data && (
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Daily Completed Rides: Actual vs. Forecasted</h3>
                <p className="text-xs text-slate-400">
                  Solid green indicates historical actuals; dashed cyan represents model projections with shaded 95% confidence bounds
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Actual Historical
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Projected Forecast
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.points} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorInterval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <ReferenceLine
                    x={data.points.find((p) => p.is_future)?.date}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: 'Forecast Horizon Start', fill: '#F59E0B', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual_completed"
                    name="Actual Completed Rides"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecasted_completed"
                    name="Forecasted Rides"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#colorForecast)"
                  />
                  <Area
                    type="monotone"
                    dataKey="upper_bound"
                    name="Upper Bound (95%)"
                    stroke="#3B82F6"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    fill="url(#colorInterval)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
