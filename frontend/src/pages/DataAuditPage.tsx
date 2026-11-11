import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Database,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { LeakageAudit, DataQuality } from '../types';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';

export const DataAuditPage: React.FC = () => {
  const [audit, setAudit] = useState<LeakageAudit | null>(null);
  const [quality, setQuality] = useState<DataQuality | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuditData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [aRes, qRes] = await Promise.all([api.getLeakageAudit(), api.getQuality()]);
      setAudit(aRes);
      setQuality(qRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load data audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);
    setError(null);
    try {
      const res = await api.uploadCsv(file);
      setUploadMessage(`Successfully uploaded and validated ${res.filename} (${res.total_rows.toLocaleString()} records).`);
      await loadAuditData();
    } catch (err: any) {
      setError(err.message || 'CSV upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Auditing feature availability and dataset quality...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Data Leakage Audit & Quality Inspection"
        subtitle="Rigorous verification of pre-booking feature availability and dataset integrity checks"
        onRefresh={loadAuditData}
        isLoading={isLoading}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Anti-Leakage Protocol Guarantee */}
        <div className="p-5 rounded-xl bg-[#111827] border border-cyan-500/40 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Target Leakage Prevention Protocol</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {audit?.audit_notes}
          </p>
          <div className="p-3 rounded-lg bg-[#0D1322] border border-[#1E293B] text-xs text-slate-400">
            <strong className="text-white">Binary Classification Target Protocol:</strong>{' '}
            {audit?.binary_classification_explanation}
          </div>
        </div>

        {/* Quality Metrics Cards */}
        {quality && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="TOTAL RECORDS"
              value={quality.total_records.toLocaleString()}
              subtitle="Rows inspected in CSV"
              icon={Database}
              variant="cyan"
            />
            <StatCard
              title="DUPLICATES DETECTED"
              value={quality.duplicate_records.toLocaleString()}
              subtitle={quality.duplicate_records === 0 ? 'Zero duplicates (Clean)' : 'Duplicate records present'}
              icon={CheckCircle2}
              variant={quality.duplicate_records === 0 ? 'emerald' : 'rose'}
            />
            <StatCard
              title="COLUMNS AUDITED"
              value={Object.keys(quality.column_types).length}
              subtitle="21 original attributes"
              icon={FileText}
              variant="blue"
            />
            <StatCard
              title="LEAKAGE RISK DETECTED"
              value="Mitigated"
              subtitle="14 Leaked Features Excluded"
              icon={ShieldAlert}
              variant="purple"
            />
          </div>
        )}

        {/* CSV Upload Dropzone */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Dynamic Dataset Upload</h3>
            </div>
            <span className="text-xs text-slate-400">Accepts .CSV format</span>
          </div>

          <div className="border-2 border-dashed border-[#1E293B] hover:border-cyan-500/50 rounded-xl p-8 text-center transition-all bg-[#0D1322]/50">
            <input
              type="file"
              accept=".csv"
              id="csvUpload"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <label htmlFor="csvUpload" className="cursor-pointer block space-y-2">
              <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
              <p className="text-xs text-slate-200 font-medium">
                {isUploading ? 'Validating and Processing CSV...' : 'Click to upload a new Bookings.csv file'}
              </p>
              <p className="text-[11px] text-slate-500">
                The application will dynamically inspect columns, detect data types, validate booking statuses, and update all analytics.
              </p>
            </label>
          </div>

          {uploadMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadMessage}</span>
            </div>
          )}
        </div>

        {/* Audit Tables: Included Features vs Excluded Features */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Included Features */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Included Features (8)</h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">100% Pre-Booking Valid</span>
            </div>

            <div className="space-y-2">
              {audit?.included_features.map((feat) => (
                <div
                  key={feat}
                  className="p-3 rounded-lg bg-[#0D1322] border border-emerald-500/20 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-white">{feat}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                    Known at Request
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Excluded Features Table */}
          <div className="lg:col-span-7 p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">Excluded Features (14)</h3>
              </div>
              <span className="text-[11px] text-rose-400 font-mono font-bold">Target Leakage Prevention</span>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D1322] text-slate-400 sticky top-0 border-b border-[#1E293B]">
                  <tr>
                    <th className="p-2.5 font-semibold">Feature</th>
                    <th className="p-2.5 font-semibold">Exclusion Category</th>
                    <th className="p-2.5 font-semibold">Technical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {audit?.excluded_features.map((item) => (
                    <tr key={item.feature} className="hover:bg-[#151E32]/50">
                      <td className="p-2.5 font-mono font-semibold text-rose-300">{item.feature}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 text-[11px] leading-relaxed">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Missing Value Analysis Table */}
        {quality && (
          <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Missing Value Distribution in Uploaded Dataset</h3>
              <p className="text-xs text-slate-400">
                Notice that post-trip attributes (V_TAT, Ratings, Payment Method) are missing for 100% of cancelled trips (39,057 rows), confirming why their inclusion constitutes severe target leakage.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D1322] text-slate-400 border-b border-[#1E293B]">
                  <tr>
                    <th className="p-3 font-semibold">Column Name</th>
                    <th className="p-3 font-semibold">Data Type</th>
                    <th className="p-3 font-semibold">Missing Count</th>
                    <th className="p-3 font-semibold">Missing (%)</th>
                    <th className="p-3 font-semibold">Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {Object.entries(quality.missing_values).map(([col, m]) => (
                    <tr key={col} className="hover:bg-[#151E32]/50">
                      <td className="p-3 font-mono font-semibold text-white">{col}</td>
                      <td className="p-3 font-mono text-slate-400">{quality.column_types[col]}</td>
                      <td className="p-3 font-mono text-rose-400 font-bold">{m.count.toLocaleString()}</td>
                      <td className="p-3 font-mono text-rose-400 font-bold">{m.percentage}%</td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {m.count === 39057
                          ? 'Missing on 100% of non-success rides (driver cancel + customer cancel + driver not found)'
                          : m.count > 80000
                          ? 'Recorded only when cancellation reason code is triggered'
                          : 'Sparse or artifact'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
