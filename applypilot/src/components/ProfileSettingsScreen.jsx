import React, { useState } from 'react';
import { User, Shield, ShieldCheck, Save, } from 'lucide-react';
import { useAppStore } from '../store/appStore';
export const ProfileSettingsScreen = ({ resume, onUpdateResume, settings, onUpdateSettings, }) => {
    const { addToast } = useAppStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [candidateName, setCandidateName] = useState(resume?.name || '');
    const [candidateEmail, setCandidateEmail] = useState(resume?.contact?.email || '');
    const [candidateLocation, setCandidateLocation] = useState(resume?.contact?.location || '');
    const handleSaveAll = () => {
        onUpdateSettings(localSettings);
        if (resume) {
            onUpdateResume({
                ...resume,
                name: candidateName,
                contact: {
                    ...resume.contact,
                    email: candidateEmail,
                    location: candidateLocation,
                },
            });
        }
        addToast({
            title: 'Settings Persisted',
            message: 'Candidate profile and guardrail thresholds saved',
            type: 'success',
        });
    };
    return (<div className="w-full flex flex-col font-sans -mt-4 space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <User className="w-5 h-5 text-[#5B7BE8]"/>
            <span>Profile &amp; Guardrail Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict anti-hallucination policies, API credentials, and submission thresholds.
          </p>
        </div>
        <button onClick={handleSaveAll} className="px-4 py-2 bg-[#5B7BE8] hover:bg-[#3D5FD9] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
          <Save className="w-4 h-4"/>
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Candidate Profile Details */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-[#5B7BE8]"/>
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Candidate Truth Anchor</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
              <input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#5B7BE8]"/>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Email</label>
              <input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#5B7BE8]"/>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Location / Target Hub</label>
              <input type="text" value={candidateLocation} onChange={(e) => setCandidateLocation(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#5B7BE8]"/>
            </div>
          </div>
        </div>

        {/* Guardrail Policy Controls */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-[#10B981]"/>
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Automation Guardrails</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700">Minimum Fit Score Threshold</span>
                <b className="text-[#5B7BE8] font-bold">{localSettings.minFitScore}%</b>
              </div>
              <input type="range" min={50} max={95} value={localSettings.minFitScore} onChange={(e) => setLocalSettings({ ...localSettings, minFitScore: parseInt(e.target.value) })} className="w-full accent-[#5B7BE8] cursor-pointer"/>
              <span className="text-[10px] text-slate-400">Applications below this fit score will not auto-dispatch.</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700">Max Auto-Apply per Batch</span>
                <b className="text-[#5B7BE8] font-bold">{localSettings.maxAutoApplyPerBatch} jobs</b>
              </div>
              <input type="range" min={5} max={20} value={localSettings.maxAutoApplyPerBatch} onChange={(e) => setLocalSettings({ ...localSettings, maxAutoApplyPerBatch: parseInt(e.target.value) })} className="w-full accent-[#5B7BE8] cursor-pointer"/>
            </div>

            {/* Hardcoded strict anti-hallucination toggle (always true as per safety mandate) */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#065F46] flex items-center justify-between">
              <div>
                <span className="font-bold block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]"/>
                  <span>Strict Anti-Hallucination Policy</span>
                </span>
                <span className="text-[10px] opacity-80">Hardcoded active: prevents any fabricated claims in tailoring.</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">LOCKED ON</span>
            </div>
          </div>
        </div>
      </div>
    </div>);
};
