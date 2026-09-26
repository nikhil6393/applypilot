import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Briefcase,
  GraduationCap,
  UserCheck,
  Zap,
  LogOut,
  Key,
  RefreshCw,
  Search,
  Send,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { LinkedInProfile, ParsedResume } from '../types';

interface LinkedInConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkedInProfile: LinkedInProfile | null;
  onUpdateLinkedInProfile: (profile: LinkedInProfile | null) => void;
  onSyncResume: (syncedResume: ParsedResume) => void;
  onFindInternships: (profile: LinkedInProfile) => void;
}

export const LinkedInConnectModal: React.FC<LinkedInConnectModalProps> = ({
  isOpen,
  onClose,
  linkedInProfile,
  onUpdateLinkedInProfile,
  onSyncResume,
  onFindInternships,
}) => {
  const [isLoadingAuthUrl, setIsLoadingAuthUrl] = useState(false);
  const [authConfig, setAuthConfig] = useState<{
    configured: boolean;
    url: string | null;
    redirectUri: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customBatch, setCustomBatch] = useState('2024-2028');
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Fetch Auth status when opened
  useEffect(() => {
    if (isOpen) {
      fetchAuthConfig();
    }
  }, [isOpen]);

  // Listen for OAuth postMessage
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const expectedOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      if (event.origin !== expectedOrigin) {
        return;
      }

      if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS' && event.data.profile) {
        onUpdateLinkedInProfile(event.data.profile);
        setSyncSuccessMsg(`Connected successfully as ${event.data.profile.name}!`);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onUpdateLinkedInProfile]);

  const fetchAuthConfig = async () => {
    try {
      setIsLoadingAuthUrl(true);
      const res = await fetch('/api/auth/linkedin/url');
      const data = await res.json();
      setAuthConfig(data);
    } catch (e) {
      console.error('Failed to get auth config:', e);
    } finally {
      setIsLoadingAuthUrl(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!authConfig?.url) {
      // Fast fallback direct connect
      handleDirectConnect();
      return;
    }

    const authWindow = window.open(
      authConfig.url,
      'linkedin_oauth_popup',
      'width=600,height=720,status=no,toolbar=no,menubar=no'
    );

    if (!authWindow) {
      alert(
        'Popup blocker prevented opening the LinkedIn login window. Please allow popups for this site.'
      );
    }
  };

  const handleDirectConnect = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/auth/linkedin/connect-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: customName.trim() || undefined,
          customEmail: customEmail.trim() || undefined,
          customBatch,
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        onUpdateLinkedInProfile(data.profile);
        setSyncSuccessMsg(
          `Profile connected and ready: ${data.profile.name} (${data.profile.graduationBatch || '2024-2028'} Batch)!`
        );
      }
    } catch (e) {
      console.error('Direct connect failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToResume = async () => {
    if (!linkedInProfile) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/auth/linkedin/sync-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: linkedInProfile }),
      });
      const data = await res.json();
      if (data.success && data.syncedResume) {
        onSyncResume(data.syncedResume);
        setSyncSuccessMsg('LinkedIn profile synced to Resume builder!');
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/linkedin/disconnect', { method: 'POST' });
      onUpdateLinkedInProfile(null);
      setSyncSuccessMsg(null);
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };

  const copyCallbackUrl = () => {
    if (authConfig?.redirectUri) {
      navigator.clipboard.writeText(authConfig.redirectUri);
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        id="linkedin-connect-modal"
        className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-sky-950/40 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0077b5] flex items-center justify-center shadow-lg shadow-[#0077b5]/30">
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>LinkedIn Account & Auto-Apply</span>
                {linkedInProfile && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Active Session
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Login with LinkedIn to discover matched internships & auto-apply with 1 click
              </p>
            </div>
          </div>
          <button
            id="close-linkedin-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center space-x-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {linkedInProfile ? (
            /* Connected View */
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    {linkedInProfile.picture ? (
                      <img
                        src={linkedInProfile.picture}
                        alt={linkedInProfile.name}
                        className="w-12 h-12 rounded-full border-2 border-sky-500/40 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-300 font-bold text-base">
                        {linkedInProfile.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">
                          {linkedInProfile.name}
                        </span>
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          {linkedInProfile.graduationBatch || '2024-2028'} Batch
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {linkedInProfile.headline}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {linkedInProfile.email} • {linkedInProfile.location || 'Remote'}
                      </p>
                    </div>
                  </div>
                  <button
                    id="disconnect-linkedin-btn"
                    onClick={handleDisconnect}
                    className="text-xs text-red-400 hover:text-red-300 p-2 hover:bg-red-950/30 rounded-lg transition-colors flex items-center space-x-1"
                    title="Disconnect LinkedIn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                {/* Skills tags */}
                {linkedInProfile.skills && linkedInProfile.skills.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {linkedInProfile.skills.slice(0, 7).map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-900 border border-slate-700/70 text-slate-300 text-[10px] px-2 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="find-internships-linkedin-action-btn"
                  onClick={() => {
                    onFindInternships(linkedInProfile);
                    onClose();
                  }}
                  className="p-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-600/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Matched Internships</span>
                </button>

                <button
                  id="sync-linkedin-resume-btn"
                  disabled={isSyncing}
                  onClick={handleSyncToResume}
                  className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-sky-400" />
                  )}
                  <span>Sync Profile to Resume</span>
                </button>
              </div>

              {/* Automated Apply Features Info */}
              <div className="p-4 bg-sky-950/20 border border-sky-800/30 rounded-xl space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-sky-400 flex items-center space-x-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Automated LinkedIn Features Unlocked</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-slate-200">Internship Prioritization:</strong> Early
                    applicant filtering (&lt;25 applicants) matching your graduation year (
                    {linkedInProfile.graduationBatch || '2024-2028'}).
                  </li>
                  <li>
                    <strong className="text-slate-200">LinkedIn Easy Apply Assistant:</strong>{' '}
                    1-Click generation of tailored screening answers, cover note, and verified ATS
                    application packets.
                  </li>
                  <li>
                    <strong className="text-slate-200">Live Status Tracker:</strong> Automatic
                    confirmation logging and application receipt export.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Disconnected / Login View */
            <div className="space-y-5">
              <div className="text-center py-4 space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0077b5]/20 border border-[#0077b5]/40 flex items-center justify-center text-[#0077b5]">
                  <svg className="w-9 h-9 fill-[#0077b5]" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">Connect Your LinkedIn Account</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sign in with LinkedIn to import your education, skills, and headline,
                  auto-discover matching tech internships, and enable automated 1-click
                  applications.
                </p>
              </div>

              {/* Primary Sign In Button */}
              <div className="space-y-3">
                <button
                  id="linkedin-oauth-sign-in-btn"
                  onClick={handleOAuthConnect}
                  disabled={isLoadingAuthUrl}
                  className="w-full py-3 px-4 bg-[#0077b5] hover:bg-[#006097] text-white font-bold rounded-xl shadow-lg shadow-[#0077b5]/25 flex items-center justify-center space-x-2.5 transition-all hover:scale-[1.01]"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
                  </svg>
                  <span>Sign in with LinkedIn (OAuth 2.0)</span>
                </button>

                {/* Instant 1-Click Fast Connect (No developer keys needed) */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant 1-Click Profile Connect</span>
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Immediate Mode
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Your Full Name
                      </label>
                      <input
                        id="linkedin-direct-name-input"
                        type="text"
                        placeholder="Nikhil Kumar"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-white text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Graduation Cohort
                      </label>
                      <select
                        id="linkedin-direct-batch-select"
                        value={customBatch}
                        onChange={(e) => setCustomBatch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-white text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="2024-2028">2024–2028 Cohort (Summer 2026/2027/2028)</option>
                        <option value="2023-2027">2023–2027 Cohort</option>
                        <option value="2022-2026">2022–2026 Cohort</option>
                        <option value="2025-2029">2025–2029 Cohort</option>
                      </select>
                    </div>
                  </div>

                  <button
                    id="linkedin-direct-fast-connect-btn"
                    onClick={handleDirectConnect}
                    disabled={isSyncing}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold text-xs rounded-lg border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Connect Profile & Start Finding Internships</span>
                  </button>
                </div>
              </div>

              {/* Developer OAuth Redirect URL info */}
              {authConfig?.redirectUri && (
                <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between text-slate-300 font-medium">
                    <span className="flex items-center space-x-1">
                      <Key className="w-3 h-3 text-sky-400" />
                      <span>LinkedIn Developer OAuth Redirect URI</span>
                    </span>
                    <button
                      onClick={copyCallbackUrl}
                      className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                    >
                      {copiedRedirect ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedRedirect ? 'Copied!' : 'Copy URI'}</span>
                    </button>
                  </div>
                  <code className="block p-1.5 bg-slate-900/90 rounded border border-slate-800 text-[10px] text-slate-300 font-mono break-all">
                    {authConfig.redirectUri}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Real-time AI Match + LinkedIn Easy Apply Packet Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
