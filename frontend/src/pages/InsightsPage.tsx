import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Car,
  MapPin,
  Clock,
  Cpu,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { RecommendationItem, RecommendationsResponse } from '../types';
import { Header } from '../components/Header';

export const InsightsPage: React.FC = () => {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const loadRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendations();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Synthesizing evidence-based recommendations from platform analytics...</p>
        </div>
      </div>
    );
  }

  const items = data ? data.items : [];
  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems =
    filterCategory === 'All' ? items : items.filter((i) => i.category === filterCategory);

  return (
    <div className="flex-1 pb-16">
      <Header
        title="AI Operational Recommendations"
        subtitle="Empirical decision-support intelligence derived directly from booking friction patterns and model feature attributions"
        onRefresh={loadRecommendations}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Anti-Hallucination Methodology Notice */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-cyan-300">Evidence-Based Generation Guarantee</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every recommendation below is mathematically grounded in measured dataset statistics and machine learning metrics.
              No arbitrary text generation or fabricated operational causes are used. Each entry details its underlying empirical evidence and analytical limitations.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-[#111827] p-3 rounded-xl border border-[#1E293B]">
          <span className="text-xs text-slate-400 font-medium px-2">Filter Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Recommendations Cards Grid */}
        <div className="space-y-6">
          {filteredItems.map((rec) => (
            <div
              key={rec.id}
              className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/30 transition-all space-y-5"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                      {rec.id} • {rec.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">{rec.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                      rec.confidence === 'High'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Confidence: {rec.confidence}
                  </span>
                </div>
              </div>

              {/* Observed Pattern & Supporting Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                    Observed Empirical Pattern
                  </span>
                  <p className="text-slate-300 leading-relaxed">{rec.observed_pattern}</p>
                </div>

                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                    Supporting Data & Metrics
                  </span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{rec.supporting_data}</p>
                </div>
              </div>

              {/* Why It Matters & Suggested Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-[#0D1322] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    Operational Significance
                  </span>
                  <p className="text-slate-300 leading-relaxed">{rec.why_it_matters}</p>
                </div>

                <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-500/40 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">
                    Recommended Actionable Intervention
                  </span>
                  <p className="text-cyan-100 font-medium leading-relaxed">{rec.suggested_action}</p>
                </div>
              </div>

              {/* Limitations footer */}
              <div className="p-3 rounded-lg bg-[#090E1A] border border-[#1E293B] text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Analytical Limitation:</strong> {rec.limitations}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
