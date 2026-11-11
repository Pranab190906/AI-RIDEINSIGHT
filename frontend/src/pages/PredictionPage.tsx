import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Car,
  Clock,
  Calendar,
  MapPin,
  IndianRupee,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Network,
  History,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { PredictResponse } from '../types';
import { Header } from '../components/Header';

const KNOWN_LOCATIONS = [
  'Tumkur Road',
  'Magadi Road',
  'RT Nagar',
  'Varthur',
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'Electronic City',
  'HSR Layout',
  'BTM Layout',
  'Jayanagar',
  'Marathahalli',
  'Yelahanka',
  'Hebbal',
  'Bannerghatta Road',
];

const VEHICLE_TYPES = [
  'Prime Sedan',
  'eBike',
  'Auto',
  'Prime Plus',
  'Bike',
  'Prime SUV',
  'Mini',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PredictionPage: React.FC = () => {
  const navigate = useNavigate();

  const [vehicleOptions, setVehicleOptions] = useState<string[]>(VEHICLE_TYPES);
  const [pickupOptions, setPickupOptions] = useState<string[]>(KNOWN_LOCATIONS);
  const [dropOptions, setDropOptions] = useState<string[]>(KNOWN_LOCATIONS);

  // Form State
  const [bookingTime, setBookingTime] = useState<string>('14:30');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Friday');
  const [vehicleType, setVehicleType] = useState<string>('Prime Sedan');
  const [pickupLocation, setPickupLocation] = useState<string>('Tumkur Road');
  const [dropLocation, setDropLocation] = useState<string>('RT Nagar');
  const [bookingValue, setBookingValue] = useState<number>(450);
  const [threshold, setThreshold] = useState<number>(0.5);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    api.getFieldOptions().then((opts) => {
      if (opts.vehicle_types?.length) {
        setVehicleOptions(opts.vehicle_types);
        if (!opts.vehicle_types.includes(vehicleType)) {
          setVehicleType(opts.vehicle_types[0]);
        }
      }
      if (opts.pickup_locations?.length) {
        setPickupOptions(opts.pickup_locations);
        if (!opts.pickup_locations.includes(pickupLocation)) {
          setPickupLocation(opts.pickup_locations[0]);
        }
      }
      if (opts.drop_locations?.length) {
        setDropOptions(opts.drop_locations);
        if (!opts.drop_locations.includes(dropLocation)) {
          setDropLocation(opts.drop_locations[Math.min(1, opts.drop_locations.length - 1)]);
        }
      }
    }).catch(() => {});
  }, []);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.predict({
        booking_time: bookingTime,
        day_of_week: dayOfWeek,
        vehicle_type: vehicleType,
        pickup_location: pickupLocation,
        drop_location: dropLocation,
        booking_value: bookingValue,
        decision_threshold: threshold,
      });
      setPrediction(res);
    } catch (err: any) {
      setError(err.message || 'Prediction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainWithShap = () => {
    // Navigate to explainability page with query params
    const params = new URLSearchParams({
      time: bookingTime,
      day: dayOfWeek,
      vehicle: vehicleType,
      pickup: pickupLocation,
      drop: dropLocation,
      value: bookingValue.toString(),
    });
    navigate(`/explainability?${params.toString()}`);
  };

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Smart Cancellation Risk Prediction"
        subtitle="Real-time inferencing with decision threshold calibration using strictly pre-booking parameters"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Anti-Leakage Guarantee Notice */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-cyan-200">Anti-Target Leakage Certified:</span> This prediction form strictly accepts inputs known at the exact instant a ride is requested. Ride distance, vehicle turnaround time (V_TAT), and post-trip ratings are excluded from inference.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Prediction Input Form */}
          <form
            onSubmit={handlePredict}
            className="lg:col-span-7 p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Booking Dispatch Parameters</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Real-time Pipeline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Booking Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Booking Time (24h)
                </label>
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  required
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Day of Week */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Day of Week
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  Vehicle Category
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {vehicleOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Booking Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-cyan-400" />
                  Estimated Fare (₹)
                </label>
                <input
                  type="number"
                  min="20"
                  max="5000"
                  value={bookingValue}
                  onChange={(e) => setBookingValue(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Pickup Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Pickup Location
                </label>
                <select
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {pickupOptions.map((loc) => (
                    <option key={`p-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drop Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Drop Location
                </label>
                <select
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {dropOptions.map((loc) => (
                    <option key={`d-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Decision Threshold Slider */}
            <div className="pt-2 border-t border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Operational Decision Threshold:
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {(threshold * 100).toFixed(0)}% ({threshold})
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Aggressive (Catch More Cancels)</span>
                <span>Conservative (High Confidence Only)</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Cancellation Risk...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Assess Booking Cancellation Risk</span>
                </>
              )}
            </button>
          </form>

          {/* Prediction Result Display */}
          <div className="lg:col-span-5 space-y-5">
            {prediction ? (
              <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <span className="text-xs font-semibold text-slate-400">Risk Assessment Result</span>
                  <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    Model: {prediction.model_used}
                  </span>
                </div>

                {/* Risk Category Header */}
                <div className="text-center space-y-2 py-2">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      prediction.risk_category === 'High Risk'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 ring-4 ring-rose-500/10'
                        : prediction.risk_category === 'Medium Risk'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 ring-4 ring-amber-500/10'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 ring-4 ring-emerald-500/10'
                    }`}
                  >
                    {prediction.risk_category === 'High Risk' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : prediction.risk_category === 'Medium Risk' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{prediction.risk_category}</span>
                  </div>

                  <h2 className="text-4xl font-extrabold text-white font-mono">
                    {(prediction.cancellation_probability * 100).toFixed(1)}%
                  </h2>
                  <p className="text-xs text-slate-400">Calculated Cancellation Probability</p>
                </div>

                {/* Probability Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">
                      Success: {(prediction.success_probability * 100).toFixed(1)}%
                    </span>
                    <span className="text-rose-400">
                      Cancel: {(prediction.cancellation_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      style={{ width: `${prediction.success_probability * 100}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                    />
                    <div
                      style={{ width: `${prediction.cancellation_probability * 100}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* Classification Decision Details */}
                <div className="p-3 rounded-lg bg-[#0D1322] border border-[#1E293B] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Classification Outcome:</span>
                    <span className={`font-bold ${prediction.predicted_class === 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {prediction.predicted_label} (Class {prediction.predicted_class})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Decision Cutoff Applied:</span>
                    <span className="font-mono text-slate-300">{prediction.decision_threshold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inference Timestamp:</span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(prediction.prediction_timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Direct SHAP Link */}
                <button
                  onClick={handleExplainWithShap}
                  className="w-full py-2.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-cyan-400 font-bold text-xs border border-cyan-500/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Network className="w-4 h-4" />
                  <span>Explain with SHAP Attributions</span>
                </button>
              </div>
            ) : (
              <div className="p-10 rounded-xl bg-[#111827] border border-[#1E293B] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">No Prediction Run Yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Enter trip parameters and trigger the machine learning pipeline to assess cancellation likelihood.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
