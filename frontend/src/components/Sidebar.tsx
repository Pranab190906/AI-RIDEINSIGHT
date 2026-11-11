import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Fingerprint,
  Cpu,
  Zap,
  Network,
  TrendingUp,
  Sliders,
  Lightbulb,
  ShieldAlert,
  Activity,
  Download,
  Car
} from 'lucide-react';

interface SidebarProps {
  activeModel?: string;
  totalBookings?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModel = 'Gradient Boosting', totalBookings = 103024 }) => {
  const navItems = [
    { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
    { to: '/fingerprint', label: 'Cancellation Fingerprint', icon: Fingerprint },
    { to: '/model-lab', label: 'ML Model Lab', icon: Cpu },
    { to: '/prediction', label: 'Smart Risk Prediction', icon: Zap },
    { to: '/explainability', label: 'Explainable AI (SHAP)', icon: Network },
    { to: '/forecasting', label: 'Ride Forecasting', icon: TrendingUp },
    { to: '/simulator', label: 'What-If Simulator', icon: Sliders },
    { to: '/insights', label: 'AI Recommendations', icon: Lightbulb },
    { to: '/audit', label: 'Data Leakage Audit', icon: ShieldAlert },
    { to: '/monitoring', label: 'Model Monitoring', icon: Activity },
    { to: '/exports', label: 'Export Center', icon: Download },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#0D1322] border-r border-[#1E293B] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1E293B]/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              RIDEINSIGHT <span className="text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">2.0</span>
            </h1>
            <p className="text-[11px] text-slate-400">Mobility Intelligence</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#151E32]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1E293B] space-y-2 bg-[#090E1A]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Active Pipeline</span>
          <span className="font-semibold text-cyan-400 truncate max-w-[120px]">{activeModel}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Records Loaded</span>
          <span className="font-mono text-emerald-400 font-semibold">{totalBookings.toLocaleString()}</span>
        </div>
        <div className="pt-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-slate-400">Engine Online • Port 8000</span>
        </div>
      </div>
    </aside>
  );
};
