import React, { useState } from 'react';
import {
  Download,
  FileText,
  Table,
  Cpu,
  TrendingUp,
  Sliders,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { Header } from '../components/Header';

export const ExportCenterPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const exportCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportModelComparison = async () => {
    setDownloading('models');
    try {
      const comp = await api.getModelComparison();
      let csv = 'Algorithm,Accuracy,Precision,Recall,F1_Score,ROC_AUC,Duration_Seconds,Threshold\n';
      for (const [name, m] of Object.entries(comp.models)) {
        csv += `"${name}",${m.accuracy},${m.precision},${m.recall},${m.f1},${m.roc_auc},${m.duration_seconds},${m.threshold}\n`;
      }
      exportCSV('rideinsight_model_comparison.csv', csv);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportFingerprint = async () => {
    setDownloading('fingerprint');
    try {
      const fp = await api.getFingerprint();
      let csv = 'Dimension,Category,Total_Bookings,Cancelled_Bookings,Cancellation_Rate,Fingerprint_Score\n';
      const all = [
        ...fp.segments_by_vehicle,
        ...fp.segments_by_pickup,
        ...fp.segments_by_drop,
        ...fp.segments_by_hour,
        ...fp.segments_by_day,
      ];
      for (const s of all) {
        csv += `"${s.dimension}","${s.category}",${s.total_bookings},${s.cancelled_bookings},${s.cancellation_rate},${s.fingerprint_score}\n`;
      }
      exportCSV('rideinsight_cancellation_fingerprints.csv', csv);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportForecasting = async () => {
    setDownloading('forecast');
    try {
      const f = await api.getForecast(14);
      let csv = 'Date,Actual_Completed,Forecasted_Completed,Lower_Bound,Upper_Bound,Is_Future\n';
      for (const p of f.points) {
        csv += `"${p.date}",${p.actual_completed ?? ''},${p.forecasted_completed ?? ''},${p.lower_bound ?? ''},${p.upper_bound ?? ''},${p.is_future}\n`;
      }
      exportCSV('rideinsight_demand_forecast.csv', csv);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportScenarios = async () => {
    setDownloading('scenarios');
    try {
      const sc = await api.getScenarios();
      let csv = 'Scenario_Name,Total_Bookings,Current_Rate,Reduction_Target,Scenario_Rate,Current_Completed,Scenario_Completed,Additional_Completed,Gain_Percent\n';
      for (const s of sc) {
        csv += `"${s.name}",${s.total_bookings},${s.current_cancellation_rate},${s.proposed_reduction_percent},${s.scenario_cancellation_rate},${s.current_completed_rides},${s.scenario_completed_rides},${s.additional_completed_rides},${s.percentage_improvement}\n`;
      }
      exportCSV('rideinsight_scenario_simulations.csv', csv);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportRecommendations = async () => {
    setDownloading('insights');
    try {
      const rec = await api.getRecommendations();
      let csv = 'ID,Category,Title,Observed_Pattern,Supporting_Data,Suggested_Action,Confidence,Limitations\n';
      for (const r of rec.items) {
        csv += `"${r.id}","${r.category}","${r.title}","${r.observed_pattern.replace(/"/g, '""')}","${r.supporting_data.replace(/"/g, '""')}","${r.suggested_action.replace(/"/g, '""')}","${r.confidence}","${r.limitations.replace(/"/g, '""')}"\n`;
      }
      exportCSV('rideinsight_ai_recommendations.csv', csv);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const exportCards = [
    {
      id: 'summary',
      title: 'Dataset Executive Summary',
      description: 'Key platform operational KPIs: booking volume, completed rides, cancellation rates, and driver-not-found deficit.',
      icon: Table,
      format: 'CSV Format',
      action: () => api.downloadFile('/data/export', 'rideinsight_dataset_summary.csv'),
    },
    {
      id: 'fingerprint',
      title: 'Cancellation Fingerprints',
      description: 'Segment-level cancellation rates and statistical friction scores across vehicles, pickup locations, hours, and days.',
      icon: FileText,
      format: 'CSV Format',
      action: handleExportFingerprint,
    },
    {
      id: 'models',
      title: 'ML Model Comparison Report',
      description: 'Standardized benchmarking across Logistic Regression, Decision Tree, Random Forest, and Gradient Boosting.',
      icon: Cpu,
      format: 'CSV Format',
      action: handleExportModelComparison,
    },
    {
      id: 'forecast',
      title: 'Ride Demand Forecast Data',
      description: 'Daily completed rides time-series, historical values, Holt projections, and 95% confidence intervals.',
      icon: TrendingUp,
      format: 'CSV Format',
      action: handleExportForecasting,
    },
    {
      id: 'scenarios',
      title: 'What-If Simulation Portfolio',
      description: 'Saved operational sensitivity scenarios, target reduction rates, and projected additional completed rides.',
      icon: Sliders,
      format: 'CSV Format',
      action: handleExportScenarios,
    },
    {
      id: 'insights',
      title: 'AI Recommendations & Audit',
      description: 'Data-driven operational interventions, supporting metrics, confidence tiers, and methodology constraints.',
      icon: Lightbulb,
      format: 'CSV Format',
      action: handleExportRecommendations,
    },
  ];

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Export Center"
        subtitle="Generate and download audit-ready CSV reports and operational portfolios for management reviews"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportCards.map((card) => {
            const Icon = card.icon;
            const isDownloadingThis = downloading === card.id;

            return (
              <div
                key={card.id}
                className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">{card.format}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{card.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
                </div>

                <button
                  onClick={card.action}
                  disabled={isDownloadingThis}
                  className="w-full py-2.5 rounded-lg bg-[#151E32] hover:bg-[#1E293B] text-cyan-400 font-bold text-xs border border-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingThis ? 'Exporting...' : 'Download Export'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
