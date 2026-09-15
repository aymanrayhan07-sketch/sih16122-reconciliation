import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { importWBS } from '../api';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCount, setSuccessCount] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setSuccessCount(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select a CSV schedule file first.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await importWBS(file);
      setSuccessCount(res.imported_count);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `activity_id,activity_name,discipline,wbs_level,planned_start,planned_end,progress_percent,status\n` +
      `CIV-3010,Pour Foundations for Water Treatment Facility,Civil,5,2026-09-01,2026-09-10,0.0,NOT_STARTED\n` +
      `PIP-4020,Install 16 Inch Cooling Tower Riser Line,Piping,6,2026-09-05,2026-09-15,0.0,NOT_STARTED\n` +
      `ELE-5030,Erect 33kV Substation Gantry Structure,Electrical,5,2026-09-10,2026-09-20,0.0,NOT_STARTED\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'primavera_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-white">Import Primavera / MS Project CSV</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          <p className="text-xs text-slate-400">
            Upload your project baseline schedule in CSV format with columns: <br />
            <code className="text-[11px] text-sky-300 font-mono">activity_id, activity_name, discipline, wbs_level, planned_start, planned_end</code>
          </p>

          <div className="flex justify-end">
            <button
              onClick={downloadSampleCSV}
              className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample Template</span>
            </button>
          </div>

          {/* File Drag/Select Area */}
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-200">
              {file ? file.name : 'Click to select or drag CSV file'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Accepts .csv exports</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully imported {successCount} activities!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Upload Schedule</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
