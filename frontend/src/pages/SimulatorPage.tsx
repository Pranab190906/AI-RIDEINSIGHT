import React, { useEffect, useState } from 'react';
import {
  Sliders,
  TrendingUp,
  RotateCcw,
  PlusCircle,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Download,
  Info
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
  Cell
} from 'recharts';
import { api } from '../services/api';
import { ScenarioResult } from '../types';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';

export const SimulatorPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form input state
  const [scenarioName, setScenarioName] = useState<string>('Driver Staging at Tumkur & Magadi');
  const [totalBookings, setTotalBookings] = useState<number>(103024);
  const [currentCancRate, setCurrentCancRate] = useState<number>(31.14);
  const [reductionPercent, setReductionPercent] = useState<number>(5.0);
  const [scenarioNotes, setScenarioNotes] = useState<string>('Pre-allocating express pickup buffer during morning rush');

  const loadScenarios = async () => {
    setIsLoading(true);
    try {
      const res = await api.getScenarios();
      setScenarios(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load scenarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setError(null);
    try {
      const newScenario = await api.simulateScenario({
        name: scenarioName,
        total_bookings: totalBookings,
        current_cancellation_rate: currentCancRate,
        proposed_reduction_percent: reductionPercent,
        notes: scenarioNotes,
      });
      setScenarios([...scenarios, newScenario]);
    } catch (err: any) {
      setError(err.message || 'Simulation error.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = async () => {
    try {
      const defaults = await api.resetScenarios();
      setScenarios(defaults);
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    }
  };

  const activeScenario = scenarios.length > 0 ? scenarios[scenarios.length - 1] : null;

  // Comparison data for Recharts
  const comparisonChartData = scenarios.map((s) => ({
    name: s.name.length > 18 ? s.name.substring(0, 18) + '...' : s.name,
    Current: s.current_completed_rides,
    'With Reduction': s.scenario_completed_rides,
    Gain: s.additional_completed_rides,
  }));

  return (
    <div className="flex-1 pb-16">
      <Header
        title="What-If Operational Scenario Simulator"
        subtitle="Simulate the business and revenue impact of targeted cancellation rate reductions"
        onRefresh={loadScenarios}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Methodological Disclaimer */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-cyan-300">Hypothetical Simulation Disclaimer</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Calculations adhere to operational sensitivity formulation:{' '}
              <span className="font-mono text-cyan-200">
                Additional Completed Rides = Total Bookings × Proposed Cancellation Reduction Rate
              </span>
              . This is an analytical estimation assuming exogenous demand volume remains stable. It is not a causal guarantee.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Simulation Input Controls */}
          <form
            onSubmit={handleSimulate}
            className="lg:col-span-5 p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Scenario Assumptions</h3>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                title="Reset to default scenarios"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Scenario Title</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  required
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Total Booking Volume</label>
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  value={totalBookings}
                  onChange={(e) => setTotalBookings(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Current Cancellation Baseline</span>
                  <span className="font-mono text-cyan-400 font-bold">{currentCancRate.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="10.0"
                  max="50.0"
                  step="0.5"
                  value={currentCancRate}
                  onChange={(e) => setCurrentCancRate(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Targeted Cancellation Reduction</span>
                  <span className="font-mono text-emerald-400 font-bold">-{reductionPercent.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={reductionPercent}
                  onChange={(e) => setReductionPercent(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Conservative (-1%)</span>
                  <span>Ambitious (-10%)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Operational Notes / Strategy</label>
                <textarea
                  rows={2}
                  value={scenarioNotes}
                  onChange={(e) => setScenarioNotes(e.target.value)}
                  className="w-full bg-[#0D1322] border border-[#1E293B] text-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-cyan-500"
                />
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
              disabled={isSimulating}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <span>Calculating Scenario...</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Simulate & Save Scenario</span>
                </>
              )}
            </button>
          </form>

          {/* Active Scenario Impact Cards & Charts */}
          <div className="lg:col-span-7 space-y-6">
            {activeScenario && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B]">
                    <p className="text-[10px] text-slate-400 uppercase">Current Completed</p>
                    <h3 className="text-xl font-bold text-white font-mono mt-1">
                      {activeScenario.current_completed_rides.toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Baseline: {activeScenario.current_cancellation_rate}%
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                    <p className="text-[10px] text-emerald-400 uppercase font-bold">Additional Completed</p>
                    <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      +{activeScenario.additional_completed_rides.toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-emerald-300/80 mt-0.5">
                      +{activeScenario.percentage_improvement}% gain
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40">
                    <p className="text-[10px] text-cyan-400 uppercase font-bold">New Completed Rides</p>
                    <h3 className="text-xl font-bold text-cyan-300 font-mono mt-1">
                      {activeScenario.scenario_completed_rides.toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-cyan-300/80 mt-0.5">
                      Target Rate: {activeScenario.scenario_cancellation_rate}%
                    </p>
                  </div>
                </div>

                {/* Before vs After Chart */}
                <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Scenario Comparison (Completed Rides)</h4>
                      <p className="text-xs text-slate-400">Comparing saved scenarios against baseline</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={11} domain={[50000, 80000]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Current" fill="#64748B" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="With Reduction" fill="#10B981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Saved Scenarios Comparison Table */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Saved Scenario Portfolio</h3>
              <p className="text-xs text-slate-400">Detailed parameters and projected gains across investigated operational levers</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1322] text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="p-3 font-semibold">Scenario</th>
                  <th className="p-3 font-semibold">Bookings</th>
                  <th className="p-3 font-semibold">Current Rate</th>
                  <th className="p-3 font-semibold">Reduction Target</th>
                  <th className="p-3 font-semibold">Scenario Rate</th>
                  <th className="p-3 font-semibold">Additional Rides</th>
                  <th className="p-3 font-semibold">Improvement</th>
                  <th className="p-3 font-semibold">Strategy Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {scenarios.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#151E32]/50 transition-colors">
                    <td className="p-3 font-semibold text-white">{s.name}</td>
                    <td className="p-3 font-mono text-slate-300">{s.total_bookings.toLocaleString()}</td>
                    <td className="p-3 font-mono text-slate-300">{s.current_cancellation_rate}%</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">-{s.proposed_reduction_percent}%</td>
                    <td className="p-3 font-mono text-cyan-300">{s.scenario_cancellation_rate}%</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      +{s.additional_completed_rides.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-cyan-400">+{s.percentage_improvement}%</td>
                    <td className="p-3 text-slate-400 max-w-xs truncate">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
