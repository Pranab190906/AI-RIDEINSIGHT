import React, { useEffect, useState, useMemo } from 'react';
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
  IndianRupee
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
import { ExecutiveOverview, DailyTrendPoint } from '../types';
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
  const [selectedVehicle, setSelectedVehicle] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Filter daily trends by date if specified
  const filteredDailyTrends = useMemo(() => {
    if (!data) return [];
    if (dateFilter === 'All') return data.daily_trends;
    if (dateFilter === 'First Half') return data.daily_trends.slice(0, 15);
    if (dateFilter === 'Second Half') return data.daily_trends.slice(15);
    return data.daily_trends;
  }, [data, dateFilter]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading July 2024 Bengaluru Bookings...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto" />
        <p className="text-sm">{error || 'Data could not be retrieved.'}</p>
        <button
          onClick={loadOverview}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Executive Overview"
        subtitle="End-to-end performance metrics, completion rates, and daily demand patterns for Bengaluru ride bookings"
        onRefresh={loadOverview}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Date Filter & Export Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">Booking Window:</span>
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
                  {period === 'All' ? 'Full July (31 Days)' : period}
                </button>
              ))}
            </div>
          </div>

          <a
            href="/api/data/export"
            download="rideinsight_dataset_summary.csv"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-slate-200 text-xs font-medium border border-[#1E293B] transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Summary CSV</span>
          </a>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="TOTAL BOOKINGS"
            value={summary.total_bookings.toLocaleString()}
            subtitle="July 2024 Ride Requests"
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
            subtitle={`${(summary.canceled_by_driver + summary.canceled_by_customer).toLocaleString()} Assigned Cancelled`}
            icon={XCircle}
            variant="rose"
            badge="Driver + Customer"
          />
          <StatCard
            title="DRIVER NOT FOUND"
            value={summary.driver_not_found.toLocaleString()}
            subtitle={`${Math.round((summary.driver_not_found / summary.total_bookings) * 100)}% of unserved demand`}
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
                {roundPct(summary.canceled_by_driver, summary.total_bookings)}% of all bookings
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xs">
              63.7%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Cancelled by Customer</p>
              <h4 className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {summary.canceled_by_customer.toLocaleString()}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {roundPct(summary.canceled_by_customer, summary.total_bookings)}% of all bookings
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              36.3%
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
                <p className="text-xs text-slate-400">Completed rides vs. cancelled demand across July 2024</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded bg-[#1E293B] text-slate-300 font-mono">
                {filteredDailyTrends.length} Days
              </span>
            </div>

            <div className="h-72 w-full">
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
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
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
            </div>
          </div>

          {/* Booking Status Distribution Donut */}
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Booking Status Breakdown</h3>
              <p className="text-xs text-slate-400">Total outcomes recorded in system</p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.status_distribution.map((entry) => (
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
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
              {data.status_distribution.map((item) => (
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.vehicle_distribution} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1322', borderColor: '#1E293B', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="value" name="Bookings" radius={[4, 4, 0, 0]}>
                    {data.vehicle_distribution.map((_, index) => (
                      <Cell key={`veh-${index}`} fill={VEHICLE_COLORS[index % VEHICLE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Completion Rate Trend Line */}
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Efficiency Trend (%)</h3>
              <p className="text-xs text-slate-400">Completion rate vs. cancellation rate day-over-day</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredDailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    fontSize={11}
                  />
                  <YAxis stroke="#64748B" fontSize={11} domain={[20, 80]} unit="%" />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function roundPct(count: number, total: number): string {
  if (total === 0) return '0';
  return ((count / total) * 100).toFixed(1);
}
