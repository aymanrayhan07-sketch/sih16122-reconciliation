import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Camera, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { submitReport, uploadPhoto, fetchLocations } from '../api';

const SAMPLE_PRESETS = [
  {
    lang: 'Telugu',
    label: '24" Spool Erection (Telugu)',
    text: '24 inch spool erection aipoyindi',
    reporter: 'Rao (Piping Lead)'
  },
  {
    lang: 'Hindi / Hinglish',
    label: 'Pedestal Concrete 80% (Hinglish)',
    text: 'Turbine pedestal concrete pouring 80% ho gaya',
    reporter: 'Vikram (Civil Supervisor)'
  },
  {
    lang: 'English',
    label: '11kV Feeder Cable (English)',
    text: 'Pulling 11kV cable to SWGR-01 finished today',
    reporter: 'Deepak (Electrical Foreman)'
  },
  {
    lang: 'Tamil / English',
    label: 'Drainage Trench 50m (Tamil)',
    text: 'Perimeter drainage trench 50m excavation mudichachu near yard',
    reporter: 'Murugan (Civil Lead)'
  },
  {
    lang: 'Site Slang',
    label: 'Transformer Mud Pour (Slang)',
    text: 'Mud poured on transformer yard pad area',
    reporter: 'Rajesh (Site Supervisor)'
  },
  {
    lang: 'Technical Slang',
    label: 'JB-101 Box Mounting (Tag)',
    text: 'JB-101 box mounting done, cable glanding pending in Area 20',
    reporter: 'Suresh (Instrumentation Tech)'
  },
  {
    lang: 'Telugu / English',
    label: 'Line 24 Radiographic NDT (Telugu)',
    text: 'Line 24 butt weld radiographic NDT testing aipoyindi',
    reporter: 'Kalyan (QC Inspector)'
  },
  {
    lang: 'Ambiguous / Informal',
    label: 'Vague Pipe Work (Ambiguity Demo)',
    text: 'Pipe work started today in block 2',
    reporter: 'Amit (Field Engineer)'
  }
];

export default function SupervisorPortal({ onReportSubmitted }) {
  const [reporterName, setReporterName] = useState('Rao (Piping Lead)');
  const [language, setLanguage] = useState('Telugu');
  const [rawText, setRawText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  const recognitionRef = useRef(null);

  // Fetch dynamic WBS locations
  useEffect(() => {
    fetchLocations()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.locations || []);
        setLocations(list);
      })
      .catch((err) => {
        console.error('Failed to fetch locations:', err);
        setLocations([]);
      });
  }, []);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;

      // Match recognition language
      const langMap = {
        'English': 'en-IN',
        'Telugu': 'te-IN',
        'Hindi / Hinglish': 'hi-IN',
        'Tamil / English': 'ta-IN',
        'Site Slang': 'en-IN',
        'Technical Slang': 'en-IN',
        'Telugu / English': 'te-IN',
      };
      recognizer.lang = langMap[language] || 'en-IN';

      recognizer.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRawText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognizer.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsRecording(false);
      };

      recognizer.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognizer;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [language]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Web Speech API is not supported in this browser. Please type or use sample presets.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleApplyPreset = (preset) => {
    setLanguage(preset.lang);
    setRawText(preset.text);
    setReporterName(preset.reporter);
    setSelectedLocation(preset.location || '');
    setErrorMsg('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Please enter or dictate a field progress observation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let photoUrl = null;
      if (photoFile) {
        const uploadRes = await uploadPhoto(photoFile);
        photoUrl = uploadRes.url;
      }

      const result = await submitReport({
        raw_text: rawText.trim(),
        language,
        location: selectedLocation || null,
        reporter_name: reporterName.trim() || 'Site Supervisor',
        photo_url: photoUrl
      });

      setLastSubmissionResult(result);
      setRawText('');
      setSelectedLocation('');
      setPhotoFile(null);
      setPhotoPreview(null);
      if (onReportSubmitted) onReportSubmitted(result);
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header Banner */}
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white">Field Supervisor Daily Progress Portal</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Speak or message informal field updates in any regional language (Telugu, Hindi, Tamil, Hinglish, or site slang).
              The AI reconciliation engine automatically maps it to Primavera WBS activities.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
              Semantic Engine Ready
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Reporting Form (Mobile-first feel) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Reporter, Language, and Location Row */}
            <div className={`grid grid-cols-1 ${locations.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Supervisor Name / Role
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  placeholder="e.g. Rao (Piping Lead)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Input Language / Dialect
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Hindi / Hinglish">Hindi / Hinglish (हिन्दी)</option>
                  <option value="English">English</option>
                  <option value="Tamil / English">Tamil (தமிழ்)</option>
                  <option value="Site Slang">Construction Site Slang</option>
                  <option value="Technical Slang">Engineering Tag / Code</option>
                  <option value="Ambiguous / Informal">Ambiguous Observation</option>
                </select>
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Location / Zone
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">All Locations / Unspecified</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Input Text Area with Speech-to-Text Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Site Observation / Shift Diary
                </label>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  Web Speech API Voice Input
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder='e.g. "24 inch spool erection aipoyindi" or "Turbine pedestal concrete pouring 80% ho gaya"'
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none pr-14"
                />

                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop Recording' : 'Start Voice-to-Text'}
                  className={`absolute right-3 bottom-4 p-3 rounded-xl transition-all shadow-lg ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                      : 'bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-500/30'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {isRecording && (
                <div className="mt-2 flex items-center space-x-2 text-xs text-rose-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Listening in {language}... Speak clearly into your microphone.</span>
                </div>
              )}
            </div>

            {/* Photo Upload Preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Physical Evidence Photo (Optional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 rounded-xl cursor-pointer text-xs text-slate-300 transition">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Attach Site Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
                {photoPreview && (
                  <div className="relative group">
                    <img src={photoPreview} alt="Evidence preview" className="w-14 h-14 object-cover rounded-lg border border-slate-700" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Semantic Matching in Progress...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit to Planner Review Queue</span>
                </>
              )}
            </button>
          </form>

          {/* Submission Feedback Toast */}
          {lastSubmissionResult && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-sky-500/30 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>AI Reconciliation Analysis Complete</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  lastSubmissionResult.top_confidence >= 85
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  Confidence: {lastSubmissionResult.top_confidence}%
                </span>
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-white">Normalized Intent:</strong> {lastSubmissionResult.normalized_text}
              </p>
              {lastSubmissionResult.location && (
                <p className="text-xs text-slate-300">
                  <strong className="text-white">Location / Zone:</strong>{' '}
                  <span className="text-sky-300 font-semibold">📍 {lastSubmissionResult.location}</span>
                </p>
              )}
              {lastSubmissionResult.candidates?.[0] && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="text-sky-400 font-mono font-bold mr-2">
                    {lastSubmissionResult.candidates[0].wbs_code}
                  </span>
                  {lastSubmissionResult.candidates[0].wbs_name}
                </div>
              )}
              <div className="text-[11px] text-slate-400">
                Routed directly to the <strong className="text-sky-400">Planner Review Dashboard</strong> for human approval.
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Hackathon Presets Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                1-Click Demo Scenarios
              </h2>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">SIH16122 Test Pack</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Click any scenario to instantly load realistic multilingual field phrases and observe the AI matching performance:
            </p>

            <div className="space-y-2.5">
              {SAMPLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition">
                      {preset.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-sky-500/10 group-hover:text-sky-300">
                      {preset.lang}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic truncate font-mono">
                    "{preset.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
