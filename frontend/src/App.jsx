import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SupervisorPortal from './components/SupervisorPortal';
import PlannerDashboard from './components/PlannerDashboard';
import ScheduleView from './components/ScheduleView';
import ProgressCharts from './components/ProgressCharts';
import FeedbackLog from './components/FeedbackLog';
import ImportModal from './components/ImportModal';
import RoleSelectModal, { ROLE_CONFIG, ROLES } from './components/RoleSelectModal';
import { fetchPendingReports, resetWBS, seedDemoReports } from './api';

export default function App() {
  const [currentRole, setCurrentRole] = useState(() => {
    return sessionStorage.getItem('sih26122_role') || ROLES.SUPERVISOR;
  });
  const [showRoleModal, setShowRoleModal] = useState(() => {
    return !sessionStorage.getItem('sih26122_role_chosen');
  });

  const roleConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG[ROLES.SUPERVISOR];
  const [activeTab, setActiveTab] = useState(() => roleConfig.defaultTab);
  const [pendingCount, setPendingCount] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleRoleChange = (newRole) => {
    if (!ROLE_CONFIG[newRole]) return;
    setCurrentRole(newRole);
    sessionStorage.setItem('sih26122_role', newRole);
    sessionStorage.setItem('sih26122_role_chosen', 'true');
    const targetConfig = ROLE_CONFIG[newRole];
    if (!targetConfig.allowedTabs.includes(activeTab)) {
      setActiveTab(targetConfig.defaultTab);
    }
  };

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

  const allowedTabs = roleConfig.allowedTabs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Role Selection Modal (Welcome / Switcher) */}
      <RoleSelectModal
        isOpen={showRoleModal}
        onClose={() => {
          sessionStorage.setItem('sih26122_role_chosen', 'true');
          setShowRoleModal(false);
        }}
        currentRole={currentRole}
        onSelectRole={handleRoleChange}
      />

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onResetDemo={handleResetDemo}
        onOpenImport={() => setIsImportOpen(true)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenRoleModal={() => setShowRoleModal(true)}
        allowedTabs={allowedTabs}
        canImportReset={roleConfig.canImportReset}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {(activeTab === 'submit' || activeTab === 'supervisor') && allowedTabs.includes('submit') && (
          <SupervisorPortal
            currentRole={currentRole}
            onReportSubmitted={() => {
              refreshPendingCount();
            }}
          />
        )}
        {activeTab === 'planner' && allowedTabs.includes('planner') && (
          <PlannerDashboard
            onReconciled={() => {
              refreshPendingCount();
            }}
          />
        )}
        {activeTab === 'schedule' && allowedTabs.includes('schedule') && <ScheduleView />}
        {activeTab === 'analytics' && allowedTabs.includes('analytics') && <ProgressCharts />}
        {activeTab === 'feedback' && allowedTabs.includes('feedback') && <FeedbackLog />}
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
            <span className="font-semibold text-slate-400">SIH26122 Prototype</span>
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
