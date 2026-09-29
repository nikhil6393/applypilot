import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

/**
 * ResumeUploadGateway.jsx
 * Screen 1: Clean, distraction-free hero upload screen.
 * Shows only the upload button and drag-drop interface before a resume is processed.
 */
export default function ResumeUploadGateway({
  onFileUpload,
  onTextUpload,
  onLoadSample
}) {
  const [dragActive, setDragActive] = useState(false);
  const [showPasteText, setShowPasteText] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Resume Review & Scoring Studio</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Upload Your Resume for Instant Review
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
          Get an immediate ATS benchmark score, line-by-line recruiter feedback, and 1-click fixes with zero formatting changes.
        </p>

        {/* Drag and Drop Zone */}
        {!showPasteText ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 transition-all cursor-pointer flex flex-col items-center justify-center group ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 hover:bg-indigo-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Drag & drop your resume file here
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Supports PDF, DOCX, DOC, or TXT (up to 10MB)
            </p>

            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 pointer-events-none"
            >
              <FileText className="w-4 h-4" />
              <span>Browse Resume File</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <textarea
              rows={8}
              placeholder="Paste the full text of your resume here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (pastedText.trim().length > 30) onTextUpload(pastedText);
                }}
                disabled={pastedText.trim().length < 30}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Analyze Pasted Text</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowPasteText(false)}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-500">
          {!showPasteText && (
            <button
              onClick={() => setShowPasteText(true)}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Or paste resume text directly
            </button>
          )}

          {onLoadSample && (
            <>
              <span>•</span>
              <button
                onClick={onLoadSample}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Try with Nikhil Singh's Sample Resume</span>
              </button>
            </>
          )}
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 text-left">
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">100% Private</h4>
              <p className="text-[11px] text-slate-400">Processed securely, never sold</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">ATS Benchmarked</h4>
              <p className="text-[11px] text-slate-400">Scored against 1M+ resumes</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Format Preserved</h4>
              <p className="text-[11px] text-slate-400">Exact PDF & Word export</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
