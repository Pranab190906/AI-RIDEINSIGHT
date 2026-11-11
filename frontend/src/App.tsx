import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { FingerprintPage } from './pages/FingerprintPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { PredictionPage } from './pages/PredictionPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { ForecastingPage } from './pages/ForecastingPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { InsightsPage } from './pages/InsightsPage';
import { DataAuditPage } from './pages/DataAuditPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ExportCenterPage } from './pages/ExportCenterPage';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeModel, setActiveModel] = useState<string>('Gradient Boosting');
  const [totalBookings, setTotalBookings] = useState<number>(103024);

  useEffect(() => {
    // Initial fetch of active model & dataset metadata for sidebar
    api.getModelComparison()
      .then((res) => {
        if (res.active_model) setActiveModel(res.active_model);
      })
      .catch(() => {});

    api.getSummary()
      .then((res) => {
        if (res.total_bookings) setTotalBookings(res.total_bookings);
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
        <Sidebar activeModel={activeModel} totalBookings={totalBookings} />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/fingerprint" element={<FingerprintPage />} />
            <Route path="/model-lab" element={<ModelLabPage />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/explainability" element={<ExplainabilityPage />} />
            <Route path="/forecasting" element={<ForecastingPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/audit" element={<DataAuditPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/exports" element={<ExportCenterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
