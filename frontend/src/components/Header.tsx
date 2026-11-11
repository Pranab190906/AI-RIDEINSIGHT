import React, { useEffect, useState } from 'react';
import { RefreshCw, Database, Sparkles, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, API_BASE } from '../services/api';
import { HealthResponse } from '../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isLoading = false }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    try {
      const res = await api.getHealth();
      setHealth(res);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[#1E293B] bg-[#0B0F19]/90 backdrop-blur-md px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Backend Online/Offline Status Indicator */}
        <div
          onClick={checkConnectivity}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
            isOnline === true
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/60'
              : isOnline === false
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-950/60'
              : 'bg-[#111827] border-[#1E293B] text-slate-400'
          }`}
          title={`Backend URL: ${API_BASE}. Click to test connection.`}
        >
          {isOnline === true ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>API Online</span>
            </>
          ) : isOnline === false ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>API Offline</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 animate-pulse text-slate-400" />
              <span>Checking API...</span>
            </>
          )}
        </div>

        {/* Active Dataset Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="max-w-[180px] truncate" title={health?.dataset_name || 'Bookings.csv'}>
            {health?.dataset_name || 'Active Dataset'}
          </span>
        </div>

        {/* Feature Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real ML & SHAP</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={() => {
              checkConnectivity();
              onRefresh();
            }}
            disabled={isLoading || isChecking}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-slate-200 text-xs font-medium border border-[#1E293B] transition-all disabled:opacity-50"
            title="Reload dataset and metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading || isChecking ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};
