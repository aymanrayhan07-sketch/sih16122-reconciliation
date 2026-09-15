import React from 'react';
import { HardHat, Activity, ClipboardCheck, BarChart3, Brain, RotateCcw, UploadCloud } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, pendingCount, onResetDemo, onOpenImport }) {
  const navItems = [
    { id: 'supervisor', label: 'Field Supervisor', icon: HardHat },
    { id: 'planner', label: 'Planner Review', icon: ClipboardCheck, badge: pendingCount },
    { id: 'schedule', label: 'WBS Schedule', icon: Activity },
    { id: 'analytics', label: 'Analytics & Audit', icon: BarChart3 },
    { id: 'feedback', label: 'Institutional Memory', icon: Brain },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  ReconAI
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/30">
                  SIH16122
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multilingual Site Diary ↔ Primavera L5/L6 Reconciliation
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-xs font-bold rounded-full bg-amber-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenImport}
              title="Import Primavera/MS Project CSV"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
            <button
              onClick={onResetDemo}
              title="Reset Demo Scenario"
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
