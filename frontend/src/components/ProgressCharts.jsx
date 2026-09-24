import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart3, TrendingUp, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
import { fetchStats, fetchHistory } from '../api';

const STATUS_COLORS = ['#10b981', '#f59e0b', '#475569'];

export default function ProgressCharts() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, hData] = await Promise.all([fetchStats(), fetchHistory()]);
      setStats(sData);
      setHistory(hData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-500" />
        <p className="text-sm font-medium">Loading project analytics & audit trail...</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Completed', value: stats?.completed_activities || 0 },
    { name: 'In Progress', value: stats?.in_progress_activities || 0 },
    { name: 'Not Started', value: stats?.not_started_activities || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
            <BarChart3 className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Project Progress Analytics & Audit Trail</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live physical completion rollups by engineering discipline and chronological field reconciliation history.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Progress</div>
          <div className="mt-2 text-3xl font-extrabold text-white flex items-baseline gap-1">
            <span>{stats?.overall_progress_percent}%</span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats?.overall_progress_percent}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed Activities
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {stats?.completed_activities} <span className="text-xs text-slate-500 font-normal">/ {stats?.total_activities}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">100% physically installed</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            In Progress
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {stats?.in_progress_activities} <span className="text-xs text-slate-500 font-normal">activities</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active on-site erection</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Not Started</div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {stats?.not_started_activities} <span className="text-xs text-slate-500 font-normal">activities</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting predecessor completion</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Discipline Completion Bar Chart */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Progress % by Engineering Discipline
            </h2>
            <span className="text-[11px] text-slate-400">Primavera L5/L6 Aggregations</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.discipline_stats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="discipline" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                  formatter={(val) => [`${val}%`, 'Avg Completion']}
                />
                <Bar dataKey="avg_progress" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Activity Status Split</h2>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Progress Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Approved Progress Audit Trail
            </h2>
          </div>
          <span className="text-xs text-slate-400">{history.length} records logged</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">
            No progress reconciliation updates have been approved yet. Approve incoming reports in the Planner Dashboard to populate the audit log.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">WBS Activity</th>
                  <th className="px-4 py-3">Field Reporter</th>
                  <th className="px-3 py-3 text-center">Previous %</th>
                  <th className="px-3 py-3 text-center">Delta %</th>
                  <th className="px-3 py-3 text-center">New Total %</th>
                  <th className="px-4 py-3">Planner Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {h.timestamp}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      <span className="text-sky-400 font-mono mr-2">{h.wbs_code}</span>
                      {h.wbs_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {h.reporter_name || 'Field Reporter'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-400">
                      {h.previous_percent}%
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-emerald-400">
                      +{h.delta_percent}%
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-white">
                      {h.new_percent}%
                    </td>
                    <td className="px-4 py-3 text-slate-400 italic">
                      {h.planner_notes || 'Approved'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
