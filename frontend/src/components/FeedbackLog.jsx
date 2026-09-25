import React, { useState, useEffect } from 'react';
import { Brain, Sliders, CheckCircle, Clock, Info, RefreshCw } from 'lucide-react';
import { fetchFeedback } from '../api';

export default function FeedbackLog() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await fetchFeedback();
      setFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 mt-1">
              <Brain className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">Institutional Memory & Feedback Log</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                SIH26122 Core Differentiator: Capturing human-in-the-loop decisions. When planners override or confirm
                AI match candidates, the system logs the dialect mapping, building project-specific semantic memory for future baseline iterations.
              </p>
            </div>
          </div>
          <button
            onClick={loadFeedback}
            className="self-start md:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Log</span>
          </button>
        </div>
      </div>

      {/* Explanatory Callout for SIH Judges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Brain className="w-4 h-4" />
            1. Slang Normalization
          </div>
          <p className="text-xs text-slate-400">
            Regional site dialects (Telugu, Hindi, Tamil, Hinglish) are mapped to construction entity ontologies without hallucinating schedule structure.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            2. Planner Override Filter
          </div>
          <p className="text-xs text-slate-400">
            Ambiguous observations (&lt;85% confidence) are gated for human review. If the planner overrides AI Rank #1, the discrepancy is preserved in audit memory.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            3. Project Memory Layer
          </div>
          <p className="text-xs text-slate-400">
            Overridden associations feed into site synonym dictionaries, boosting semantic matching accuracy on future contractor updates.
          </p>
        </div>
      </div>

      {/* Feedback Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Planner Decision Audit Log ({feedback.length} Entries)
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
            Loading feedback memory...
          </div>
        ) : feedback.length === 0 ? (
          <p className="text-xs text-slate-400 py-10 text-center italic">
            No feedback entries recorded yet. As you approve or override matches in the Planner Dashboard, the decisions will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Field Observation Phrase</th>
                  <th className="px-4 py-3">AI Top Suggestion</th>
                  <th className="px-4 py-3">Planner Chosen Activity</th>
                  <th className="px-3 py-3 text-center">Action</th>
                  <th className="px-4 py-3">Remarks / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {feedback.map((f) => {
                  const isOverride = f.action === 'OVERRIDDEN';
                  return (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {f.timestamp}
                      </td>
                      <td className="px-4 py-3 text-slate-200 italic font-medium max-w-xs">
                        "{f.report_text}"
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        <span className="text-sky-400 mr-1">{f.ai_top_code}</span>
                        <span className="text-[11px] text-slate-500">({f.ai_confidence}%)</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        <span className={isOverride ? 'text-purple-400' : 'text-emerald-400'}>
                          {f.chosen_code}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOverride
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {f.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {f.planner_notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
