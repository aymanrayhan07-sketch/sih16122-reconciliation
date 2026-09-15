import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SupervisorPortal from './components/SupervisorPortal';
import PlannerDashboard from './components/PlannerDashboard';
import ScheduleView from './components/ScheduleView';
import ProgressCharts from './components/ProgressCharts';
import FeedbackLog from './components/FeedbackLog';
import ImportModal from './components/ImportModal';
import { fetchPendingReports, resetWBS, seedDemoReports } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const [pendingCount, setPendingCount] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const refreshPendingCount = async () => {
    try {
      const reports = await fetchPendingReports();
      setPendingCount(reports.length);
    } catch (err) {
      console.warn('Backend not yet reachable:', err.message);
    }
  };

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    if (!confirm('Reset WBS baseline activities and populate realistic multilingual demo reports?')) return;
    setResetting(true);
    try {
      await resetWBS();
      await seedDemoReports();
      await refreshPendingCount();
      alert('Demo scenario successfully reset!');
      window.location.reload();
    } catch (err) {
      alert(`Failed to reset scenario: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onResetDemo={handleResetDemo}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'supervisor' && (
          <SupervisorPortal
            onReportSubmitted={() => {
              refreshPendingCount();
            }}
          />
        )}
        {activeTab === 'planner' && (
          <PlannerDashboard
            onReconciled={() => {
              refreshPendingCount();
            }}
          />
        )}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'analytics' && <ProgressCharts />}
        {activeTab === 'feedback' && <FeedbackLog />}
      </main>

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={() => {
          setIsImportOpen(false);
          refreshPendingCount();
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-4 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">SIH16122 Prototype</span>
            <span>•</span>
            <span>AI-Powered Construction Progress Reconciliation</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>FastAPI + SQLite</span>
            <span>•</span>
            <span>sentence-transformers / TF-IDF Semantic Cosine Engine</span>
            <span>•</span>
            <span>Web Speech API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
