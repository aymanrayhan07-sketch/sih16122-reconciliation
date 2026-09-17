import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Activity, CheckCircle, Clock, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { fetchWBS, fetchLocations } from '../api';

const DISCIPLINES = ['All', 'Civil', 'Piping', 'Electrical', 'Instrumentation', 'HSE'];
const STATUSES = ['All', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export default function ScheduleView() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discipline, setDiscipline] = useState('All');
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('All');
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLocations()
      .then((data) => setLocations(data.locations || []))
      .catch((err) => console.error('Failed to load locations', err));
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await fetchWBS({ discipline, status, search, location });
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [discipline, status, search, location]);

  const getDisciplineBadge = (disc) => {
    const map = {
      'Civil': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Piping': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      'Electrical': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Instrumentation': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'HSE': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return map[disc] || 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getStatusBadge = (stat) => {
    if (stat === 'COMPLETED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }
    if (stat === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Not Started
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Activity className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">Primavera / MS Project Baseline WBS Schedule</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Hierarchical Level 5 & Level 6 work activities tracking physical installation on site.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/api/wbs/export/csv"
            download="primavera_wbs_export.csv"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row gap-4 justify-between items-center">
        {/* Discipline Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
          {DISCIPLINES.map(d => (
            <button
              key={d}
              onClick={() => setDiscipline(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                discipline === d
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {locations.length > 0 && (
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="All">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Activity ID</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-4 py-3.5">Discipline</th>
                <th className="px-4 py-3.5">Location / Zone</th>
                <th className="px-3 py-3.5 text-center">WBS Lvl</th>
                <th className="px-4 py-3.5">Planned Dates</th>
                <th className="px-5 py-3.5">Progress %</th>
                <th className="px-4 py-3.5">Installed Qty</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading baseline schedule...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">
                    No activities found matching criteria.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">
                      {act.code}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-100 max-w-xs">
                      {act.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getDisciplineBadge(act.discipline)}`}>
                        {act.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {act.location ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-sky-300">
                          <MapPin className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                          <span>{act.location}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono text-slate-400">
                      L{act.wbs_level}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {act.planned_start} → {act.planned_end}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-36">
                        <div className="flex justify-between items-center text-[11px] mb-1 font-semibold">
                          <span className="text-white">{act.progress_percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              act.progress_percent >= 100
                                ? 'bg-emerald-500'
                                : act.progress_percent > 0
                                ? 'bg-sky-500'
                                : 'bg-transparent'
                            }`}
                            style={{ width: `${act.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {act.installed_qty} / {act.planned_qty} {act.unit}
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(act.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
