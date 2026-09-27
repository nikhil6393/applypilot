import React from 'react';
import { SlidersHorizontal, ShieldCheck, Mail, FileCheck } from 'lucide-react';
export const SettingsModal = ({ isOpen, onClose, settings, onUpdateSettings, }) => {
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4"/>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Application Guardrails & Settings
              </h3>
              <p className="text-[11px] text-slate-500">
                Safety parameters ensuring targeted, authentic, and high-conversion applications
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl font-bold p-1 cursor-pointer">
            &times;
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Max Batch Cap */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Max Positions Processed Per Run
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {settings.maxAutoApplyPerBatch} positions
              </span>
            </div>
            <input type="range" min="5" max="20" step="1" value={settings.maxAutoApplyPerBatch} onChange={(e) => onUpdateSettings({ ...settings, maxAutoApplyPerBatch: Number(e.target.value) })} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
            <p className="text-[11px] text-slate-400">
              Batch size for tailoring packets and cover letters without degradation
            </p>
          </div>

          {/* Min Fit Score */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Minimum Match Score for Auto-Selection
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {settings.minFitScore}%
              </span>
            </div>
            <input type="range" min="60" max="95" step="5" value={settings.minFitScore} onChange={(e) => onUpdateSettings({ ...settings, minFitScore: Number(e.target.value) })} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"/>
            <p className="text-[11px] text-slate-400">
              Filters out roles below this qualification threshold
            </p>
          </div>

          {/* Strict ATS Formatting Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <FileCheck className="w-4 h-4 text-blue-600"/>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Strict ATS Format Compliance
                </span>
                <span className="text-[11px] text-slate-400">
                  Standard headings, bullet metrics, and plain-text ATS parseability
                </span>
              </div>
            </div>
            <input type="checkbox" checked={settings.enableStrictAtsFormatting} onChange={(e) => onUpdateSettings({ ...settings, enableStrictAtsFormatting: e.target.checked })} className="w-4 h-4 text-blue-600 rounded cursor-pointer"/>
          </div>

          {/* Email Auto-Draft Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-indigo-600"/>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Auto-Draft Recruiter Emails
                </span>
                <span className="text-[11px] text-slate-400">
                  Prepare pre-filled mailto pitches for recruiter contacts
                </span>
              </div>
            </div>
            <input type="checkbox" checked={settings.enableEmailAutoDraft} onChange={(e) => onUpdateSettings({ ...settings, enableEmailAutoDraft: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded cursor-pointer"/>
          </div>

          {/* Anti-Hallucination Policy */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"/>
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Strict Anti-Hallucination Guarantee
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Resume tailoring re-weights real candidate achievements to match job descriptions
                without fabricating fake degrees, unheld titles, or false technologies.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-all">
            Save Settings
          </button>
        </div>
      </div>
    </div>);
};
