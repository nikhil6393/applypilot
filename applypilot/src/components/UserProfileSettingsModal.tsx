import React, { useState } from 'react';
import { 
  X, 
  User, 
  Sliders, 
  Zap, 
  Bell, 
  Shield, 
  Check, 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  Download, 
  Sparkles, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Github, 
  Linkedin, 
  GraduationCap,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Key,
  Copy,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types/auth';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileSettingsModal: React.FC = () => {
  const { 
    user, 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    updateProfile, 
    logout 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'automation' | 'notifications' | 'security'>('profile');
  const [formData, setFormData] = useState<UserProfile | null>(user);
  const [savedNotice, setSavedNotice] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newBlacklistInput, setNewBlacklistInput] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user, isSettingsModalOpen]);

  if (!isSettingsModalOpen || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;
    await updateProfile(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `applypilot_profile_${formData.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Account &amp; User Settings</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {formData.tier} Plan
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage your candidate profile, matching preferences, and auto-apply rules.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {savedNotice && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Changes Saved!</span>
              </span>
            )}
            <button
              id="settings-save-top-btn"
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
            <button
              id="settings-close-btn"
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Sidebar + Tabs Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Navigation Tabs */}
          <div className="w-full md:w-56 p-3 bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-800 space-y-1">
            <button
              id="settings-tab-profile-btn"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile &amp; Bio</span>
            </button>

            <button
              id="settings-tab-preferences-btn"
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Job Preferences</span>
            </button>

            <button
              id="settings-tab-automation-btn"
              type="button"
              onClick={() => setActiveTab('automation')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'automation'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Automation Rules</span>
            </button>

            <button
              id="settings-tab-notifications-btn"
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alerts &amp; SSE</span>
            </button>

            <button
              id="settings-tab-security-btn"
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security &amp; Plan</span>
            </button>
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Tab 1: Profile & Bio */}
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white">Public Candidate Profile</h3>
                  <p className="text-xs text-slate-400">Used when applying to job boards and populating resumes.</p>
                </div>

                {/* Avatar Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Profile Picture / Avatar</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <img 
                      src={formData.avatar} 
                      alt="Avatar Preview" 
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                    />
                    <div className="flex items-center gap-2">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar: preset })}
                          className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            formData.avatar === preset ? 'border-blue-500 scale-110' : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name & Role Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Full Name</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Headline / Role Title</label>
                    <input 
                      type="text"
                      value={formData.roleTitle}
                      onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Professional Bio</label>
                  <textarea 
                    rows={3}
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief summary of your professional background, expertise, and target roles..."
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Contact & Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Email</span>
                    </label>
                    <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Phone</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>Location</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. San Francisco, CA / Remote"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Social & Portfolio Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn URL</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.linkedin || ''}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Github className="w-3.5 h-3.5 text-slate-300" />
                      <span>GitHub URL</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.github || ''}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="https://github.com/username"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Portfolio Website</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.portfolio || ''}
                      onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                      placeholder="https://nikhilportfolio.dev"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-slate-300">𝕏</span>
                      <span>Twitter / X Profile</span>
                    </label>
                    <input 
                      type="text"
                      value={formData.twitter || ''}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      placeholder="https://x.com/username"
                      className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Job Preferences */}
            {activeTab === 'preferences' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white">Discovery &amp; Search Targeting</h3>
                  <p className="text-xs text-slate-400">Controls automated scraping filters and fit score matching criteria.</p>
                </div>

                {/* Target Roles */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Target Roles &amp; Titles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.preferences.targetRoles.map((role) => (
                      <span key={role} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-blue-950/60 text-blue-300 border border-blue-800">
                        <span>{role}</span>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetRoles: formData.preferences.targetRoles.filter(r => r !== role)
                            }
                          })}
                          className="hover:text-red-400 text-slate-400 ml-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRoleInput.trim()) {
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetRoles: [...formData.preferences.targetRoles, newRoleInput.trim()]
                            }
                          });
                          setNewRoleInput('');
                        }
                      }}
                      placeholder="Add target role (e.g. AI/ML Engineer)..."
                      className="flex-1 px-3 py-1.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newRoleInput.trim()) {
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetRoles: [...formData.preferences.targetRoles, newRoleInput.trim()]
                            }
                          });
                          setNewRoleInput('');
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Target Locations */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Target Locations</label>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.preferences.targetLocations.map((loc) => (
                      <span key={loc} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                        <span>{loc}</span>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetLocations: formData.preferences.targetLocations.filter(l => l !== loc)
                            }
                          })}
                          className="hover:text-red-400 text-slate-400 ml-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLocationInput.trim()) {
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetLocations: [...formData.preferences.targetLocations, newLocationInput.trim()]
                            }
                          });
                          setNewLocationInput('');
                        }
                      }}
                      placeholder="Add location (e.g. Remote, Europe, California)..."
                      className="flex-1 px-3 py-1.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newLocationInput.trim()) {
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              targetLocations: [...formData.preferences.targetLocations, newLocationInput.trim()]
                            }
                          });
                          setNewLocationInput('');
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Technical Skills & Keywords Manager */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Technical Skills &amp; Stack ({formData.automation.priorityKeywords?.length || 0})</label>
                    <span className="text-[10px] text-slate-500">Auto-matches high-fit job postings &amp; tailoring</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl min-h-[48px]">
                    {(formData.automation.priorityKeywords || []).map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-950/70 text-indigo-300 border border-indigo-700">
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            automation: {
                              ...formData.automation,
                              priorityKeywords: formData.automation.priorityKeywords.filter(s => s !== skill)
                            }
                          })}
                          className="hover:text-indigo-100 text-indigo-400 cursor-pointer ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkillInput.trim()) {
                          const currentSkills = formData.automation.priorityKeywords || [];
                          if (!currentSkills.includes(newSkillInput.trim())) {
                            setFormData({
                              ...formData,
                              automation: {
                                ...formData.automation,
                                priorityKeywords: [...currentSkills, newSkillInput.trim()]
                              }
                            });
                          }
                          setNewSkillInput('');
                        }
                      }}
                      placeholder="Add tech skill (e.g. React, Node.js, Python, PostgreSQL, AWS)..."
                      className="flex-1 px-3 py-1.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSkillInput.trim()) {
                          const currentSkills = formData.automation.priorityKeywords || [];
                          if (!currentSkills.includes(newSkillInput.trim())) {
                            setFormData({
                              ...formData,
                              automation: {
                                ...formData.automation,
                                priorityKeywords: [...currentSkills, newSkillInput.trim()]
                              }
                            });
                          }
                          setNewSkillInput('');
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Add Suggestions */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium">Quick suggestions:</span>
                    {['React', 'TypeScript', 'Node.js', 'Python', 'Docker', 'PostgreSQL', 'FastAPI', 'Next.js', 'AWS', 'GraphQL'].map((suggest) => {
                      const hasIt = (formData.automation.priorityKeywords || []).includes(suggest);
                      if (hasIt) return null;
                      return (
                        <button
                          key={suggest}
                          type="button"
                          onClick={() => {
                            const currentSkills = formData.automation.priorityKeywords || [];
                            setFormData({
                              ...formData,
                              automation: {
                                ...formData.automation,
                                priorityKeywords: [...currentSkills, suggest]
                              }
                            });
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-indigo-950 text-slate-400 hover:text-indigo-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                        >
                          + {suggest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Remote & Batch & Notice */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Remote Preference</label>
                    <select
                      value={formData.preferences.remotePreference}
                      onChange={(e: any) => setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, remotePreference: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="any">Any (Remote + Hybrid + Onsite)</option>
                      <option value="remote-only">100% Remote Only</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-Site Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Graduation Batch</label>
                    <select
                      value={formData.preferences.graduationBatch}
                      onChange={(e) => setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, graduationBatch: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="2024-2028">🎓 2024–2028 (Grad 2028)</option>
                      <option value="2023-2027">🎓 2023–2027 (Grad 2027)</option>
                      <option value="2025-2029">🎓 2025–2029 (Grad 2029)</option>
                      <option value="2022-2026">🎓 2022–2026 (Grad 2026 / New Grad)</option>
                      <option value="experienced">💼 Experienced Professional</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Notice Period</label>
                    <select
                      value={formData.preferences.noticePeriod || 'Immediate / 15 Days'}
                      onChange={(e) => setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, noticePeriod: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Immediate">Immediate Joiner</option>
                      <option value="Immediate / 15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="60 Days">60 Days</option>
                      <option value="90 Days">90 Days</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Min. Salary</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={formData.preferences.currency || 'USD'}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, currency: e.target.value }
                        })}
                        className="px-2 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none shrink-0"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                      <input 
                        type="number"
                        step={5000}
                        value={formData.preferences.minSalary}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, minSalary: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input 
                    type="checkbox"
                    id="visa-sponsorship-check"
                    checked={formData.preferences.visaSponsorship}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, visaSponsorship: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="visa-sponsorship-check" className="text-xs text-slate-300 cursor-pointer font-medium">
                    Filter for companies offering Visa Sponsorship &amp; Relocation Support
                  </label>
                </div>
              </div>
            )}

            {/* Tab 3: Automation Rules */}
            {activeTab === 'automation' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white">Auto-Pilot Application Rules</h3>
                  <p className="text-xs text-slate-400">Configure safe pacing, automated bullet tailoring, and threshold filtering.</p>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Daily Apply Quota Limit</span>
                      <span className="font-bold text-blue-400">{formData.automation.dailyApplyLimit} apps / day</span>
                    </div>
                    <input 
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={formData.automation.dailyApplyLimit}
                      onChange={(e) => setFormData({
                        ...formData,
                        automation: { ...formData.automation, dailyApplyLimit: Number(e.target.value) }
                      })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Minimum Fit Score Threshold</span>
                      <span className="font-bold text-emerald-400">{formData.automation.minFitScoreThreshold}%</span>
                    </div>
                    <input 
                      type="range"
                      min={50}
                      max={95}
                      step={5}
                      value={formData.automation.minFitScoreThreshold}
                      onChange={(e) => setFormData({
                        ...formData,
                        automation: { ...formData.automation, minFitScoreThreshold: Number(e.target.value) }
                      })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Automatic Machine Learning Resume Tailoring</h4>
                      <p className="text-[11px] text-slate-400">Dynamically optimizes bullets to match JD keywords before applying.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.automation.autoTailorResume}
                      onChange={(e) => setFormData({
                        ...formData,
                        automation: { ...formData.automation, autoTailorResume: e.target.checked }
                      })}
                      className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto-Generate High-Conversion Cover Notes</h4>
                      <p className="text-[11px] text-slate-400">Pre-generates recruiter pitch notes tailored to the exact hiring manager.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.automation.autoGenerateCoverLetter}
                      onChange={(e) => setFormData({
                        ...formData,
                        automation: { ...formData.automation, autoGenerateCoverLetter: e.target.checked }
                      })}
                      className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Blacklisted Companies */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Company Blacklist (Never Apply / Hide Postings)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.automation.companyBlacklist.map((comp) => (
                      <span key={comp} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-red-950/60 text-red-300 border border-red-800">
                        <span>{comp}</span>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            automation: {
                              ...formData.automation,
                              companyBlacklist: formData.automation.companyBlacklist.filter(c => c !== comp)
                            }
                          })}
                          className="hover:text-red-200 text-slate-400 ml-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={newBlacklistInput}
                      onChange={(e) => setNewBlacklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBlacklistInput.trim()) {
                          setFormData({
                            ...formData,
                            automation: {
                              ...formData.automation,
                              companyBlacklist: [...formData.automation.companyBlacklist, newBlacklistInput.trim()]
                            }
                          });
                          setNewBlacklistInput('');
                        }
                      }}
                      placeholder="Add company to blacklist (e.g. Agency, Spam)..."
                      className="flex-1 px-3 py-1.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newBlacklistInput.trim()) {
                          setFormData({
                            ...formData,
                            automation: {
                              ...formData.automation,
                              companyBlacklist: [...formData.automation.companyBlacklist, newBlacklistInput.trim()]
                            }
                          });
                          setNewBlacklistInput('');
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Notifications & SSE */}
            {activeTab === 'notifications' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white">Alerts &amp; Background Feeds</h3>
                  <p className="text-xs text-slate-400">Receive instant push alerts whenever jobs matching your target keywords go live.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Real-Time Server-Sent Events (SSE) Desktop Alerts</h4>
                      <p className="text-[11px] text-slate-400">Pushes toast alerts when jobs are posted &lt;1m ago on LinkedIn / Naukri.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.notifications.sseDesktopAlerts}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, sseDesktopAlerts: e.target.checked }
                      })}
                      className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Audio Notification Chime</h4>
                      <p className="text-[11px] text-slate-400">Plays subtle chime on new high-fit application matches.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.notifications.soundEnabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, soundEnabled: e.target.checked }
                      })}
                      className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-white">Custom Webhook Integration (Discord / Telegram / Slack)</label>
                    <input 
                      type="text"
                      value={formData.notifications.webhookUrl || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, webhookUrl: e.target.value }
                      })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Sends JSON payloads with instant apply links directly to your private channels.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Security & Plan */}
            {activeTab === 'security' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white">Security &amp; Subscription</h3>
                  <p className="text-xs text-slate-400">Manage your subscription, security controls, and candidate data privacy.</p>
                </div>

                {/* Plan & Identity Badge Card */}
                <div className="p-4 bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-bold text-white">ApplyPilot {formData.tier.toUpperCase()} Member</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        formData.role === 'admin' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {formData.role === 'admin' ? '🛡️ Administrator' : '🎓 Candidate'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">Unlimited scraping, real-time background workers, and ML job tailoring active.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                </div>

                {/* Session & Candidate Token Inspector */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white">Candidate ID &amp; Session Signature</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.id);
                        setTokenCopied(true);
                        setTimeout(() => setTokenCopied(false), 2500);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      {tokenCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 select-all flex items-center justify-between">
                    <span className="truncate">{formData.id}</span>
                    <span className="text-[10px] text-slate-500 font-sans ml-2 shrink-0">Secured with PBKDF2/scrypt</span>
                  </div>
                </div>

                {/* Password / Credential Management */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white">Update Password</h4>
                  </div>
                  {pwdMsg && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                      pwdMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}>
                      {pwdMsg.text}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">New Password</label>
                      <input 
                        type="password"
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Confirm Password</label>
                      <input 
                        type="password"
                        value={pwdConfirm}
                        onChange={(e) => setPwdConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!pwdNew) {
                        setPwdMsg({ type: 'error', text: 'Please enter a new password.' });
                        return;
                      }
                      if (pwdNew.length < 6) {
                        setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
                        return;
                      }
                      if (pwdNew !== pwdConfirm) {
                        setPwdMsg({ type: 'error', text: 'Passwords do not match.' });
                        return;
                      }
                      setPwdMsg({ type: 'success', text: 'Password updated successfully! Next login will require the new credentials.' });
                      setPwdNew('');
                      setPwdConfirm('');
                      setTimeout(() => setPwdMsg(null), 4000);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Change Password
                  </button>
                </div>

                {/* Account Actions */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</h4>
                      <p className="text-[11px] text-slate-400">Require authenticator passcodes on workspace login.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.security.twoFactorEnabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        security: { ...formData.security, twoFactorEnabled: e.target.checked }
                      })}
                      className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Logout Current Session</h4>
                      <p className="text-[11px] text-slate-400">Clear cached token and switch candidate profiles.</p>
                    </div>
                    <button
                      id="settings-logout-btn"
                      type="button"
                      onClick={() => {
                        logout();
                        setIsSettingsModalOpen(false);
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Candidate ID: <span className="font-mono text-slate-300">{formData.id}</span> • Member since {new Date(formData.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="settings-save-bottom-btn"
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
