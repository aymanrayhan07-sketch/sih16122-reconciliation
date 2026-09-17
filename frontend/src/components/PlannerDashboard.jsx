import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, 
  HelpCircle, Eye, Sliders, MessageSquare, Image, RefreshCw, Check, MapPin
} from 'lucide-react';
import { fetchPendingReports, reconcileReport, fetchLocations } from '../api';

export default function PlannerDashboard({ onReconciled }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, AUTO, AMBIGUOUS
  const [locations, setLocations] = useState([]);
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [progressAdjustments, setProgressAdjustments] = useState({});
  const [plannerNotes, setPlannerNotes] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [viewPhotoUrl, setViewPhotoUrl] = useState(null);

  const loadPendingReports = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingReports();
      setReports(data);
      
      // Initialize candidate selections with rank 1
      const initialSelected = {};
      const initialAdjustments = {};
      data.forEach(r => {
        if (r.candidates && r.candidates.length > 0) {
          initialSelected[r.id] = r.candidates[0].wbs_id;
        }
        // Default progress delta from extracted intent or 25%
        const intentPct = r.extracted_intent?.progress_percent;
        initialAdjustments[r.id] = intentPct !== undefined ? intentPct : 25;
      });
      setSelectedCandidates(initialSelected);
      setProgressAdjustments(initialAdjustments);
    } catch (err) {
      console.error('Failed to load pending reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingReports();
    fetchLocations()
      .then((data) => setLocations(data.locations || []))
      .catch((err) => console.error('Failed to load locations', err));
  }, []);

  const handleReconcile = async (reportId, action = 'APPROVE') => {
    setActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const selectedWbsId = selectedCandidates[reportId];
      const deltaPercent = Number(progressAdjustments[reportId] || 25);
      const notes = plannerNotes[reportId] || '';

      await reconcileReport(reportId, {
        selected_wbs_id: selectedWbsId,
        delta_percent: deltaPercent,
        action: action,
        planner_notes: notes
      });

      // Remove from list
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (onReconciled) onReconciled();
    } catch (err) {
      alert(`Error reconciling report: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'AUTO' && r.top_confidence < 85) return false;
    if (filter === 'AMBIGUOUS' && r.top_confidence >= 85) return false;
    if (locationFilter !== 'ALL' && r.location !== locationFilter) return false;
    return true;
  });

  const autoCount = reports.filter(r => r.top_confidence >= 85).length;
  const ambiguousCount = reports.filter(r => r.top_confidence < 85).length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Dashboard Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">Planner Reconciliation Dashboard</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Human-in-the-Loop review: Auto-approve high-confidence AI matches or resolve ambiguous field reports.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls: Location Dropdown + Status Pills */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {locations.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Locations ({reports.length})
                </option>
                {locations.map((loc) => {
                  const count = reports.filter((r) => r.location === loc).length;
                  return (
                    <option key={loc} value={loc} className="bg-slate-900 text-slate-200">
                      {loc} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'ALL' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Pending ({reports.length})
            </button>
            <button
              onClick={() => setFilter('AUTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                filter === 'AUTO' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Auto-Suggest (≥85%)</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-200">
                {autoCount}
              </span>
            </button>
            <button
              onClick={() => setFilter('AMBIGUOUS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                filter === 'AMBIGUOUS' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              <span>Ambiguous (&lt;85%)</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-200">
                {ambiguousCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
          <p className="text-sm font-medium">Loading incoming supervisor reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">All Clear! Queue Reconciled</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            There are no pending supervisor reports matching this filter. Switch to the Field Supervisor portal to submit new progress notes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReports.map((report) => {
            const isAmbiguous = report.top_confidence < 85;
            const chosenWbsId = selectedCandidates[report.id];
            const topCandidate = report.candidates?.[0];
            const isOverriding = topCandidate && chosenWbsId !== topCandidate.wbs_id;
            const currentAdjustment = progressAdjustments[report.id] || 25;

            return (
              <div
                key={report.id}
                className={`bg-slate-900 border rounded-2xl p-6 shadow-xl transition-all ${
                  isAmbiguous
                    ? 'border-amber-500/40 hover:border-amber-500/70 shadow-amber-500/5'
                    : 'border-emerald-500/40 hover:border-emerald-500/70 shadow-emerald-500/5'
                }`}
              >
                {/* Header Row: Reporter & Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-slate-800 text-slate-300">
                      #{report.id}
                    </span>
                    <span className="text-sm font-bold text-white">{report.reporter_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {report.language}
                    </span>
                    {report.location && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        <span>{report.location}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">{report.created_at}</span>
                    {report.photo_url && (
                      <button
                        onClick={() => setViewPhotoUrl(report.photo_url)}
                        className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20"
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Observation & AI Normalization Section */}
                <div className="my-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Raw Supervisor Voice / Message:
                    </div>
                    <p className="text-sm text-slate-100 font-medium italic">
                      "{report.raw_text}"
                    </p>
                  </div>

                  <div className="md:col-span-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 mb-1 flex items-center justify-between">
                      <span>Normalized Construction Intent:</span>
                      {report.extracted_intent?.inferred_discipline && (
                        <span className="text-[10px] px-2 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          {report.extracted_intent.inferred_discipline}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      {report.normalized_text}
                    </p>
                    {report.extracted_intent?.equipment_tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {report.extracted_intent.equipment_tags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20 font-mono">
                            🏷️ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ambiguity Alert or Auto-Suggest Banner */}
                {isAmbiguous ? (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <span>AMBIGUOUS MATCH DETECTED ({report.top_confidence}% &lt; 85% Threshold)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                          Planner Verification Required
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Multiple candidate WBS activities have overlapping semantics. Please select the correct activity from the candidates below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>HIGH CONFIDENCE AUTO-SUGGESTION ({report.top_confidence}%)</span>
                    </div>
                    <span className="text-[11px] text-emerald-300 font-medium">
                      One-Click Schedule Approval Ready
                    </span>
                  </div>
                )}

                {/* Top 3 Candidate Matches (Radio Selection) */}
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Ranked Candidate WBS Activities (Top 3)</span>
                    <span className="text-[11px] text-slate-500">Select to assign</span>
                  </div>

                  <div className="space-y-2.5">
                    {report.candidates?.map((candidate) => {
                      const isSelected = chosenWbsId === candidate.wbs_id;
                      const isRank1 = candidate.rank === 1;

                      return (
                        <div
                          key={candidate.wbs_id}
                          onClick={() => setSelectedCandidates(prev => ({ ...prev, [report.id]: candidate.wbs_id }))}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/40'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <input
                                type="radio"
                                name={`candidate_${report.id}`}
                                checked={isSelected}
                                onChange={() => setSelectedCandidates(prev => ({ ...prev, [report.id]: candidate.wbs_id }))}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                              />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-mono font-bold text-sky-400">
                                  {candidate.wbs_code}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {candidate.wbs_name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {candidate.wbs_discipline}
                                </span>
                                {candidate.location && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-medium">
                                    <MapPin className="w-2.5 h-2.5 text-sky-400" />
                                    <span>Zone: {candidate.location}</span>
                                  </span>
                                )}
                                {isRank1 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                    AI Rank #1
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <span className="text-slate-500 font-mono">Reason:</span> {candidate.reasoning}
                              </p>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 flex items-center sm:flex-col justify-between">
                            <span className={`text-sm font-extrabold ${
                              candidate.confidence_score >= 85
                                ? 'text-emerald-400'
                                : candidate.confidence_score >= 60
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }`}>
                              {candidate.confidence_score}%
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">confidence</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Planner Override Notification Badge */}
                {isOverriding && (
                  <div className="mb-4 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center space-x-2 text-xs text-indigo-300">
                    <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      Planner Override Active: You selected an alternative activity. This action will be recorded in the <strong>Institutional Memory Log</strong> to train future heuristics.
                    </span>
                  </div>
                )}

                {/* Progress Adjustment Controls & Action Row */}
                <div className="pt-4 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Progress Delta Input & Quick Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">Progress Update:</span>
                    {['+10%', '+25%', '+50%', '100% (Done)'].map((pill) => {
                      const val = pill.includes('100%') ? 100 : parseInt(pill.replace('+', '').replace('%', ''));
                      const isActive = currentAdjustment === val;
                      return (
                        <button
                          key={pill}
                          type="button"
                          onClick={() => setProgressAdjustments(prev => ({ ...prev, [report.id]: val }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isActive
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {pill}
                        </button>
                      );
                    })}
                    <div className="flex items-center space-x-1 ml-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={currentAdjustment}
                        onChange={(e) => setProgressAdjustments(prev => ({ ...prev, [report.id]: Number(e.target.value) }))}
                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Planner Notes & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Optional planner remarks..."
                      value={plannerNotes[report.id] || ''}
                      onChange={(e) => setPlannerNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full sm:w-56"
                    />

                    <button
                      type="button"
                      disabled={actionLoading[report.id]}
                      onClick={() => handleReconcile(report.id, 'REJECT')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 rounded-lg transition disabled:opacity-50"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading[report.id]}
                      onClick={() => handleReconcile(report.id, 'APPROVE')}
                      className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition disabled:opacity-50 ${
                        isAmbiguous
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      }`}
                    >
                      {actionLoading[report.id] ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Reconciling...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isOverriding ? 'Confirm Override & Update' : 'Approve & Update WBS'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewPhotoUrl(null)}>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Physical Evidence Preview</span>
              <button onClick={() => setViewPhotoUrl(null)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <img src={viewPhotoUrl} alt="Field Evidence" className="w-full h-auto max-h-96 object-contain rounded-xl border border-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}
