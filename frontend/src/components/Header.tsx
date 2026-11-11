import React from 'react';
import { RefreshCw, Database, Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isLoading = false }) => {
  return (
    <header className="border-b border-[#1E293B] bg-[#0B0F19]/80 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>July 2024 Bengaluru Bookings</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real ML & SHAP</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-slate-200 text-xs font-medium border border-[#1E293B] transition-all disabled:opacity-50"
            title="Reload dataset and metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};
