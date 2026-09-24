import React from 'react';
import { HardHat, ShieldCheck, Compass, BarChart3, Check, X } from 'lucide-react';

export const ROLES = {
  FOREMAN: 'Foreman',
  SUPERVISOR: 'Supervisor',
  CIVIL_ENGINEER: 'Civil Engineer',
  PROJECT_MANAGER: 'Project Manager',
};

export const ROLE_CONFIG = {
  [ROLES.FOREMAN]: {
    id: ROLES.FOREMAN,
    title: 'Foreman',
    icon: HardHat,
    color: 'amber',
    badge: 'Field Voice & Slang Reporting',
    description: 'Submit raw site observations, voice notes in vernacular dialects, and attach photo evidence.',
    allowedTabs: ['submit', 'schedule', 'analytics', 'feedback'],
    defaultTab: 'submit',
    canImportReset: false,
    permissionsText: 'Submit Reports • View WBS Schedule • Analytics & Audit',
  },
  [ROLES.SUPERVISOR]: {
    id: ROLES.SUPERVISOR,
    title: 'Supervisor',
    icon: ShieldCheck,
    color: 'sky',
    badge: 'Site Diary & Initial Review',
    description: 'Log daily team progress, submit observations, and review/approve incoming field reports in the queue.',
    allowedTabs: ['submit', 'planner', 'schedule', 'analytics', 'feedback'],
    defaultTab: 'submit',
    canImportReset: false,
    permissionsText: 'Submit Reports • Planner Review & Approval • Shared Views',
  },
  [ROLES.CIVIL_ENGINEER]: {
    id: ROLES.CIVIL_ENGINEER,
    title: 'Civil Engineer',
    icon: Compass,
    color: 'indigo',
    badge: 'Technical Verification & Schedule Sign-off',
    description: 'Review reconciled activities against Primavera L5/L6 baseline, verify AI scoring, and grant final sign-off.',
    allowedTabs: ['planner', 'schedule', 'analytics', 'feedback'],
    defaultTab: 'planner',
    canImportReset: true,
    permissionsText: 'Planner Review & Override • Baseline Schedule • Analytics & Audit',
  },
  [ROLES.PROJECT_MANAGER]: {
    id: ROLES.PROJECT_MANAGER,
    title: 'Project Manager',
    icon: BarChart3,
    color: 'purple',
    badge: 'Executive View-Only',
    description: 'Monitor high-level project completion %, discipline progress charts, and baseline schedule health.',
    allowedTabs: ['analytics', 'schedule'],
    defaultTab: 'analytics',
    canImportReset: false,
    permissionsText: 'View-Only • Analytics & Baseline Schedule (No Submission / No Approval)',
  },
};

export default function RoleSelectModal({ isOpen, onClose, currentRole, onSelectRole }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close role selector"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
            SIH16122 Role-Based Demonstration
          </span>
          <h2 className="text-2xl font-black text-white mt-3">Select Your Role</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Experience how the reconciliation system adapts permissions and navigation for different project stakeholders.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {Object.values(ROLE_CONFIG).map((role) => {
            const Icon = role.icon;
            const isSelected = currentRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  onSelectRole(role.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-white">{role.title}</span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    {role.badge}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {role.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  {role.permissionsText}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/80">
          <span>You can switch roles at any time using the selector in the top navigation bar.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
