import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Network,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { ShapGlobalResponse, ShapLocalResponse } from '../types';
import { Header } from '../components/Header';

export const ExplainabilityPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [globalShap, setGlobalShap] = useState<ShapGlobalResponse | null>(null);
  const [localShap, setLocalShap] = useState<ShapLocalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form values for individual explanation
  const [bookingTime, setBookingTime] = useState<string>(searchParams.get('time') || '18:00');
  const [dayOfWeek, setDayOfWeek] = useState<string>(searchParams.get('day') || 'Friday');
  const [vehicleType, setVehicleType] = useState<string>(searchParams.get('vehicle') || 'Prime Sedan');
  const [pickupLocation, setPickupLocation] = useState<string>(searchParams.get('pickup') || 'Tumkur Road');
  const [dropLocation, setDropLocation] = useState<string>(searchParams.get('drop') || 'RT Nagar');
  const [bookingValue, setBookingValue] = useState<number>(parseFloat(searchParams.get('value') || '350'));

  const loadExplanations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const gRes = await api.getShapGlobal();
      setGlobalShap(gRes);

      const lRes = await api.getShapLocal({
        booking_time: bookingTime,
        day_of_week: dayOfWeek,
        vehicle_type: vehicleType,
        pickup_location: pickupLocation,
        drop_location: dropLocation,
        booking_value: bookingValue,
      });
      setLocalShap(lRes);
    } catch (err: any) {
      setError(err.message || 'Failed to compute SHAP values.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplanations();
  }, []);

  const handleUpdateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lRes = await api.getShapLocal({
        booking_time: bookingTime,
        day_of_week: dayOfWeek,
        vehicle_type: vehicleType,
        pickup_location: pickupLocation,
        drop_location: dropLocation,
        booking_value: bookingValue,
      });
      setLocalShap(lRes);
    } catch (err: any) {
      setError(err.message || 'Failed to update local SHAP.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Computing SHapley Additive exPlanations (SHAP) across transformed feature space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Explainable AI (SHAP)"
        subtitle="Game-theoretic feature attributions explaining both global model mechanics and individual ride risk drivers"
        onRefresh={loadExplanations}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* SHAP Theory Alert */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-cyan-300">SHapley Additive exPlanations (SHAP) Protocol</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              SHAP attributes the contribution of each feature to the model's final prediction relative to the baseline expectation.
              Features with positive SHAP values push the prediction <span className="text-rose-400 font-semibold">towards cancellation</span>,
              while negative values push <span className="text-emerald-400 font-semibold">towards completion</span>.
            </p>
          </div>
        </div>

        {/* Global Feature Importance Section */}
        {globalShap && (
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Global Feature Importance (SHAP Summary)</h3>
                <p className="text-xs text-slate-400">{globalShap.interpretation}</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded bg-[#0D1322] text-cyan-400 font-mono border border-[#1E293B]">
                {globalShap.method}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Chart */}
              <div className="lg:col-span-7 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={globalShap.top_features}
                    margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={11} unit="%" />
                    <YAxis dataKey="feature" type="category" stroke="#64748B" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="importance" name="Relative Impact (%)" radius={[0, 4, 4, 0]}>
                      {globalShap.top_features.map((_, index) => (
                        <Cell
                          key={`global-${index}`}
                          fill={index === 0 ? '#06B6D4' : index === 1 ? '#3B82F6' : '#6366F1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Explanatory cards */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Operational Mechanism Insights
                </h4>
                <div className="space-y-2 text-xs">
                  {globalShap.top_features.slice(0, 4).map((f) => (
                    <div key={f.feature} className="p-3 rounded-lg bg-[#0D1322] border border-[#1E293B] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">{f.feature}</span>
                        <span className="font-mono text-cyan-400 font-bold">{f.importance}% impact</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.direction_hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Local Individual Prediction SHAP Breakdown */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-6">
          <div className="border-b border-[#1E293B] pb-4">
            <h3 className="text-sm font-semibold text-white">Local Instance Explanation</h3>
            <p className="text-xs text-slate-400">
              Why did this specific trip receive its predicted risk probability?
            </p>
          </div>

          {/* Quick Input Parameters Bar */}
          <form onSubmit={handleUpdateLocal} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Time</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Vehicle</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded px-2 py-1 text-xs"
              >
                {['Prime Sedan', 'eBike', 'Auto', 'Prime Plus', 'Bike', 'Prime SUV', 'Mini'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Pickup</label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Drop</label>
              <input
                type="text"
                value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Fare (₹)</label>
              <input
                type="number"
                value={bookingValue}
                onChange={(e) => setBookingValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition-all"
              >
                Explain Booking
              </button>
            </div>
          </form>

          {/* Local Attribution Results */}
          {localShap && (
            <div className="space-y-6 pt-4 border-t border-[#1E293B]">
              {/* Baseline vs Prediction Anchor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B]">
                  <p className="text-[10px] text-slate-400 uppercase">Population Base Value</p>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">
                    {(localShap.base_value * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">Average dataset cancellation risk</p>
                </div>

                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B]">
                  <p className="text-[10px] text-slate-400 uppercase">Trip Predicted Risk</p>
                  <p className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {(localShap.prediction_probability * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">Model output for this booking</p>
                </div>

                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B]">
                  <p className="text-[10px] text-slate-400 uppercase">Risk Tier</p>
                  <p
                    className={`text-xl font-bold font-mono mt-1 ${
                      localShap.risk_category === 'High Risk'
                        ? 'text-rose-400'
                        : localShap.risk_category === 'Medium Risk'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {localShap.risk_category}
                  </p>
                  <p className="text-[10px] text-slate-500">Calibrated operational tier</p>
                </div>
              </div>

              {/* Attribution Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Individual Factor Attributions (SHAP Values)
                </h4>
                <div className="space-y-2">
                  {localShap.contributions.map((c) => {
                    const isPositive = c.shap_value > 0;
                    return (
                      <div
                        key={c.feature}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isPositive
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-emerald-950/20 border-emerald-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isPositive
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs">{c.display_name}:</span>{' '}
                            <span className="font-mono text-slate-300">{String(c.feature_value)}</span>
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.impact}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isPositive ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isPositive ? `+${(c.shap_value * 100).toFixed(2)}%` : `${(c.shap_value * 100).toFixed(2)}%`}
                          </span>
                          <p className="text-[10px] text-slate-500">SHAP attribution</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
