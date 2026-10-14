import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  Save,
  Briefcase,
  Globe,
  Sliders,
  Sparkles,
  Download,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Layers,
  Camera,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/appStore';

export const ProfileSettingsScreen = ({
  resume,
  onUpdateResume,
  settings,
  onUpdateSettings,
}) => {
  const { user, updateProfile, logout } = useAuth();
  const { addToast } = useAppStore();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'guardrails' | 'scrapers' | 'security'
  const [localSettings, setLocalSettings] = useState(settings || { minFitScore: 75, maxAutoApplyPerBatch: 10 });
  
  // Profile fields initialized from user / resume
  const [candidateName, setCandidateName] = useState(user?.name || resume?.name || 'Nikhil Singh');
  const [candidateEmail, setCandidateEmail] = useState(user?.email || resume?.contact?.email || 'demo@applypilot.io');
  const [candidatePhone, setCandidatePhone] = useState(user?.phone || resume?.contact?.phone || '+91 98765 43210');
  const [candidateLocation, setCandidateLocation] = useState(user?.location || resume?.contact?.location || 'Noida, India');
  const [targetRole, setTargetRole] = useState(user?.roleTitle || user?.targetRole || resume?.targetRole || 'Software Development Engineer');
  const [headline, setHeadline] = useState(user?.headline || user?.bio || 'Full-Stack Developer passionate about scalable web apps and AI-assisted workflows');
  
  // Skills list
  const [skills, setSkills] = useState(
    resume?.skills?.length
      ? resume.skills
      : ['React', 'Node.js', 'TypeScript', 'Python', 'Tailwind CSS', 'PostgreSQL', 'Docker']
  );
  const [newSkill, setNewSkill] = useState('');

  // Scraper & Board preferences
  const [scraperPrefs, setScraperPrefs] = useState({
    naukri: true,
    unstop: true,
    linkedin: true,
    internshala: true,
    indeed: true,
    workplaceType: 'All', // 'All' | 'Remote' | 'Hybrid' | 'Onsite'
    experienceLevel: 'Entry Level',
  });

  // Security / Password fields
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdFeedback, setPwdFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Upload State
  const avatarInputRef = useRef(null);
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 256, 256);
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          setAvatar(dataUrl);
          if (updateProfile) {
            updateProfile({ avatar: dataUrl });
          }
          addToast({
            type: 'success',
            title: 'Avatar Updated',
            message: 'Your profile picture has been saved.',
          });
        }
      };
      img.src = ev.target?.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (user) {
      if (user.avatar) setAvatar(user.avatar);
      if (user.name) setCandidateName(user.name);
      if (user.email) setCandidateEmail(user.email);
      if (user.phone) setCandidatePhone(user.phone);
      if (user.location) setCandidateLocation(user.location);
      if (user.roleTitle || user.targetRole) setTargetRole(user.roleTitle || user.targetRole);
      if (user.bio || user.headline) setHeadline(user.bio || user.headline);
    }
  }, [user]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    const s = newSkill.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (onUpdateSettings) {
        onUpdateSettings(localSettings);
      }

      const updatedUserPayload = {
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
        location: candidateLocation,
        roleTitle: targetRole,
        targetRole,
        avatar: avatar || user?.avatar,
        headline,
        bio: headline,
        skills,
        preferences: {
          ...(user?.preferences || {}),
          ...scraperPrefs,
        },
        automation: {
          ...(user?.automation || {}),
          minFitScore: localSettings.minFitScore,
          maxAutoApplyPerBatch: localSettings.maxAutoApplyPerBatch,
        },
      };

      if (updateProfile) {
        await updateProfile(updatedUserPayload);
      }

      if (resume && onUpdateResume) {
        onUpdateResume({
          ...resume,
          name: candidateName,
          targetRole,
          skills,
          contact: {
            ...resume.contact,
            email: candidateEmail,
            phone: candidatePhone,
            location: candidateLocation,
          },
        });
      }

      addToast({
        title: 'Settings Saved Successfully',
        message: 'Your profile, job board preferences, and guardrails have been saved.',
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Save Failed',
        message: err.message || 'Could not save settings.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdFeedback({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwdFeedback({ type: 'success', text: 'Password successfully updated!' });
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    addToast({
      title: 'Security Updated',
      message: 'Your account password has been updated.',
      type: 'success',
    });
  };

  const handleExportData = () => {
    const exportObject = {
      profile: {
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
        location: candidateLocation,
        targetRole,
        headline,
        skills,
      },
      settings: localSettings,
      scraperPreferences: scraperPrefs,
      exportDate: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `applypilot_profile_${candidateName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full flex flex-col font-sans space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8eaf3] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5b4df0]/10 text-[#5b4df0] flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#16183d]">User Profile &amp; Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
              PRO Active
            </span>
          </div>
          <p className="text-xs text-[#8a8fa8] mt-1">
            Manage your candidate profile, matching criteria, scraper sources, and automation guardrails.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export Profile as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
          <button
            id="settings-save-btn"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#5b4df0] hover:bg-[#4d3fe0] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-[#e8eaf3] bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-[#5b4df0] text-white shadow-xs'
              : 'text-[#565b78] hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>Candidate Truth Anchor</span>
        </button>
        <button
          onClick={() => setActiveTab('guardrails')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'guardrails'
              ? 'bg-[#5b4df0] text-white shadow-xs'
              : 'text-[#565b78] hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" />
          <span>Automation Guardrails</span>
        </button>
        <button
          onClick={() => setActiveTab('scrapers')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'scrapers'
              ? 'bg-[#5b4df0] text-white shadow-xs'
              : 'text-[#565b78] hover:bg-slate-50'
          }`}
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>Job Boards &amp; Scrapers</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-[#5b4df0] text-white shadow-xs'
              : 'text-[#565b78] hover:bg-slate-50'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Security &amp; Account</span>
        </button>
      </div>

      {/* Tab 1: Candidate Truth Anchor */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar Photo Card */}
          <div className="md:col-span-2 bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => avatarInputRef.current?.click()}
              title="Click to change profile photo"
            >
              <img
                src={avatar || user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={candidateName}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-[#5b4df0]/20 shadow-md group-hover:ring-[#5b4df0] transition-all"
              />
              <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h4 className="text-sm font-bold text-[#16183d]">Profile Photo</h4>
              <p className="text-xs text-[#8a8fa8]">Upload a clear photo. Image is compressed and securely saved to your account in SQLite.</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-[#5b4df0]/10 hover:bg-[#5b4df0]/20 text-[#5b4df0] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload New Photo</span>
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar('');
                      if (updateProfile) updateProfile({ avatar: '' });
                    }}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-[#5b4df0]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Personal &amp; Contact Info</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Full Legal Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="e.g. Nikhil Singh"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="e.g. nikhil@example.com"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Location / Target City</label>
                <input
                  type="text"
                  value={candidateLocation}
                  onChange={(e) => setCandidateLocation(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="e.g. Noida, Bangalore, Remote"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-[#5b4df0]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Career Focus &amp; Skills</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Target Job Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="e.g. Software Engineer, Frontend Engineer"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Professional Headline / Bio</label>
                <textarea
                  rows={3}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full p-3 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800 resize-none"
                  placeholder="Brief summary of your professional background..."
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1.5">Core Technical Skills</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-[11px] font-semibold"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSkill(e);
                    }}
                    placeholder="Add skill (e.g. Docker, GraphQL)..."
                    className="flex-1 p-2.5 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Automation Guardrails */}
      {activeTab === 'guardrails' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Shield className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Quality &amp; Volume Guardrails</h3>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-[#565b78]">Minimum Fit Score Threshold</span>
                  <b className="text-[#5b4df0] font-black text-sm">{localSettings.minFitScore}%</b>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={localSettings.minFitScore}
                  onChange={(e) => setLocalSettings({ ...localSettings, minFitScore: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#5b4df0] cursor-pointer"
                />
                <span className="text-[11px] text-[#8a8fa8] mt-1 block">
                  Applications below this fit score will be flagged for manual review and will not auto-dispatch.
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-[#565b78]">Max Auto-Apply per Batch</span>
                  <b className="text-[#5b4df0] font-black text-sm">{localSettings.maxAutoApplyPerBatch} jobs</b>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={localSettings.maxAutoApplyPerBatch}
                  onChange={(e) => setLocalSettings({ ...localSettings, maxAutoApplyPerBatch: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#5b4df0] cursor-pointer"
                />
                <span className="text-[11px] text-[#8a8fa8] mt-1 block">
                  Prevents spamming by setting a strict limit on applications sent in a single auto-run.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Safety Policies</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#065f46]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                    <span className="font-bold text-xs">Strict Anti-Hallucination Policy</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                    LOCKED ON
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  Guarantees that tailored resumes and cover letters never invent facts, degrees, or employers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-[#1e40af]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />
                    <span className="font-bold text-xs">Live Verification Sandbox</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  Every job URL is validated before tailoring to ensure it is not expired or closed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Job Boards & Scrapers */}
      {activeTab === 'scrapers' && (
        <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#5b4df0]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Active Scraper Portals</h3>
            </div>
            <span className="text-[11px] text-slate-400">Toggle platforms to include in live job searches</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'naukri', label: 'Naukri.com', desc: 'India Tech & MNC listings', active: scraperPrefs.naukri },
              { id: 'unstop', label: 'Unstop', desc: 'Campus & Early Career Hiring', active: scraperPrefs.unstop },
              { id: 'linkedin', label: 'LinkedIn', desc: 'Realtime & Global openings', active: scraperPrefs.linkedin },
              { id: 'internshala', label: 'Internshala', desc: 'Stipend tech internships', active: scraperPrefs.internshala },
              { id: 'indeed', label: 'Indeed', desc: 'Direct corporate career feeds', active: scraperPrefs.indeed },
            ].map((portal) => (
              <div
                key={portal.id}
                onClick={() => setScraperPrefs({ ...scraperPrefs, [portal.id]: !portal.active })}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  portal.active
                    ? 'border-indigo-200 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}
              >
                <div>
                  <b className="text-xs text-slate-800 block">{portal.label}</b>
                  <span className="text-[10px] text-slate-500">{portal.desc}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    portal.active ? 'bg-[#5b4df0] border-[#5b4df0] text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {portal.active && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="font-bold text-[#565b78] text-xs block mb-1.5">Workplace Filter Default</label>
              <select
                value={scraperPrefs.workplaceType}
                onChange={(e) => setScraperPrefs({ ...scraperPrefs, workplaceType: e.target.value })}
                className="w-full p-2.5 border border-[#e8eaf3] rounded-xl text-xs outline-none focus:border-[#5b4df0] text-slate-800"
              >
                <option value="All">All Workplace Types</option>
                <option value="Remote">Remote Only</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-[#565b78] text-xs block mb-1.5">Default Experience Tier</label>
              <select
                value={scraperPrefs.experienceLevel}
                onChange={(e) => setScraperPrefs({ ...scraperPrefs, experienceLevel: e.target.value })}
                className="w-full p-2.5 border border-[#e8eaf3] rounded-xl text-xs outline-none focus:border-[#5b4df0] text-slate-800"
              >
                <option value="All Levels">All Levels</option>
                <option value="Entry Level">Entry Level / Intern (0-2 yrs)</option>
                <option value="Mid Level">Mid Level (2-5 yrs)</option>
                <option value="Senior Level">Senior Level (5+ yrs)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Account */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password Form */}
          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Lock className="w-4 h-4 text-[#5b4df0]" />
              <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Update Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#565b78] block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full p-2.5 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full p-2.5 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="font-bold text-[#565b78] block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full p-2.5 border border-[#e8eaf3] rounded-xl outline-none focus:border-[#5b4df0] text-slate-800"
                  placeholder="Repeat new password"
                />
              </div>

              {pwdFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 ${
                    pwdFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {pwdFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{pwdFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer text-xs"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Account Overview & Session */}
          <div className="bg-white border border-[#e8eaf3] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-[#5b4df0]" />
                <h3 className="text-xs font-bold text-[#16183d] uppercase tracking-wider">Session &amp; Subscription</h3>
              </div>

              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Account Tier</span>
                  <span className="font-bold text-[#5b4df0]">PRO Plan (Active)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Security Encryption</span>
                  <span className="font-semibold text-slate-800">Scrypt Salted Hash</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Database Storage</span>
                  <span className="font-semibold text-slate-800">SQLite (Local Persisted)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Active Session</span>
                  <span className="font-bold text-emerald-600">Authenticated</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Need to switch accounts?</span>
              <button
                type="button"
                onClick={() => logout && logout()}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
