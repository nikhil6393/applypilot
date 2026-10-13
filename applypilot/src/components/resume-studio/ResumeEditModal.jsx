import React, { useState } from 'react';
import {
  X, Save, User, Briefcase, GraduationCap, Code2, FolderGit2,
  FileText, Plus, Trash2, CheckCircle2, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/appStore';

export default function ResumeEditModal({
  resume,
  isOpen,
  onClose,
  onSave,
}) {
  const { updateProfile } = useAuth();
  const { addToast } = useAppStore();

  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState(() => {
    return JSON.parse(JSON.stringify(resume || {}));
  });

  if (!isOpen) return null;

  const handleFieldChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value,
      }
    }));
  };

  const handleRootChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Experience Handlers
  const handleAddExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        {
          company: 'New Company',
          role: 'Software Engineer',
          title: 'Software Engineer',
          dates: '2024 – Present',
          location: 'Remote',
          bullets: ['Engineered scalable microservices handling user requests.'],
        }
      ]
    }));
  };

  const handleUpdateExperience = (idx, field, value) => {
    setFormData(prev => {
      const exp = [...(prev.experience || [])];
      exp[idx] = { ...exp[idx], [field]: value };
      if (field === 'role') exp[idx].title = value;
      if (field === 'title') exp[idx].role = value;
      return { ...prev, experience: exp };
    });
  };

  const handleAddBullet = (expIdx) => {
    setFormData(prev => {
      const exp = [...(prev.experience || [])];
      const bullets = [...(exp[expIdx].bullets || []), 'Delivered feature enhancements boosting user retention.'];
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...prev, experience: exp };
    });
  };

  const handleUpdateBullet = (expIdx, bIdx, text) => {
    setFormData(prev => {
      const exp = [...(prev.experience || [])];
      const bullets = [...(exp[expIdx].bullets || [])];
      bullets[bIdx] = text;
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...prev, experience: exp };
    });
  };

  const handleRemoveBullet = (expIdx, bIdx) => {
    setFormData(prev => {
      const exp = [...(prev.experience || [])];
      const bullets = (exp[expIdx].bullets || []).filter((_, i) => i !== bIdx);
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...prev, experience: exp };
    });
  };

  const handleRemoveExperience = (idx) => {
    setFormData(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== idx)
    }));
  };

  // Education Handlers
  const handleAddEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...(prev.education || []),
        {
          school: 'University',
          degree: 'Bachelor of Science in Computer Science',
          graduationDate: '2024',
          gpa: '3.8',
        }
      ]
    }));
  };

  const handleUpdateEducation = (idx, field, value) => {
    setFormData(prev => {
      const edu = [...(prev.education || [])];
      edu[idx] = { ...edu[idx], [field]: value };
      return { ...prev, education: edu };
    });
  };

  const handleRemoveEducation = (idx) => {
    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== idx)
    }));
  };

  // Project Handlers
  const handleAddProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        {
          name: 'Project Name',
          tech: 'React, Node.js, TypeScript',
          link: 'https://github.com/example/project',
          description: 'High-performance web application designed for developer productivity.',
          bullets: ['Built real-time telemetry pipelines.', 'Achieved 99.9% uptime.']
        }
      ]
    }));
  };

  const handleUpdateProject = (idx, field, value) => {
    setFormData(prev => {
      const proj = [...(prev.projects || [])];
      proj[idx] = { ...proj[idx], [field]: value };
      return { ...prev, projects: proj };
    });
  };

  const handleRemoveProject = (idx) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== idx)
    }));
  };

  // Skills Handlers
  const handleSkillsStringChange = (val) => {
    const list = val.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      skills: list,
    }));
  };

  const handleSave = () => {
    onSave(formData);
    if (updateProfile) {
      updateProfile({ savedResume: formData });
    }
    try {
      localStorage.setItem('applypilot_resume', JSON.stringify(formData));
    } catch {}
    if (addToast) {
      addToast({
        type: 'success',
        title: 'Resume Saved',
        message: 'Your resume has been updated and saved to your account in SQLite.',
      });
    }
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    onClose();
  };

  const contact = formData.contact || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-text">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Resume Content</h2>
              <p className="text-xs text-slate-500">Changes update your account in SQLite and refresh the exact template canvas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Update Canvas</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 overflow-x-auto gap-2">
          {[
            { id: 'contact', label: 'Contact & Header', icon: User },
            { id: 'summary', label: 'Summary', icon: FileText },
            { id: 'experience', label: 'Experience', icon: Briefcase },
            { id: 'education', label: 'Education', icon: GraduationCap },
            { id: 'projects', label: 'Projects', icon: FolderGit2 },
            { id: 'skills', label: 'Skills', icon: Code2 },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
          {/* TAB 1: CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.fullName || formData.name || ''}
                  onChange={(e) => {
                    handleRootChange('fullName', e.target.value);
                    handleRootChange('name', e.target.value);
                  }}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                  placeholder="e.g. Nikhil Singh"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone || contact.phone || ''}
                    onChange={(e) => {
                      handleRootChange('phone', e.target.value);
                      handleFieldChange('contact', 'phone', e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || contact.email || ''}
                    onChange={(e) => {
                      handleRootChange('email', e.target.value);
                      handleFieldChange('contact', 'email', e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                    placeholder="nikhil@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Location / Target City</label>
                  <input
                    type="text"
                    value={formData.location || contact.location || ''}
                    onChange={(e) => {
                      handleRootChange('location', e.target.value);
                      handleFieldChange('contact', 'location', e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                    placeholder="Noida, India"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.linkedin || contact.linkedin || (formData.links?.[0]) || ''}
                    onChange={(e) => {
                      handleRootChange('linkedin', e.target.value);
                      handleFieldChange('contact', 'linkedin', e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                    placeholder="linkedin.com/in/nikhil"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">GitHub / Portfolio URL</label>
                <input
                  type="text"
                  value={formData.github || contact.github || (formData.links?.[1]) || ''}
                  onChange={(e) => {
                    handleRootChange('github', e.target.value);
                    handleFieldChange('contact', 'github', e.target.value);
                  }}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                  placeholder="github.com/nikhil6393"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Executive Summary / Objective</label>
                <textarea
                  rows={6}
                  value={formData.summary || ''}
                  onChange={(e) => handleRootChange('summary', e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500 leading-relaxed"
                  placeholder="High-impact 2-3 sentence overview highlighting your engineering experience and key accomplishments."
                />
              </div>
            </div>
          )}

          {/* TAB 3: EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Work History ({formData.experience?.length || 0})</span>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {(formData.experience || []).map((exp, expIdx) => (
                <div key={expIdx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Role #{expIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(expIdx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="Delete this role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Company</label>
                      <input
                        type="text"
                        value={exp.company || ''}
                        onChange={(e) => handleUpdateExperience(expIdx, 'company', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Job Title / Role</label>
                      <input
                        type="text"
                        value={exp.role || exp.title || ''}
                        onChange={(e) => handleUpdateExperience(expIdx, 'role', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Dates</label>
                      <input
                        type="text"
                        value={exp.dates || exp.period || ''}
                        onChange={(e) => handleUpdateExperience(expIdx, 'dates', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="e.g. Jan 2023 – Present"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Location</label>
                      <input
                        type="text"
                        value={exp.location || ''}
                        onChange={(e) => handleUpdateExperience(expIdx, 'location', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="Noida, India / Remote"
                      />
                    </div>
                  </div>

                  {/* Bullet points */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-600 dark:text-slate-400">Accomplishment Bullets</label>
                      <button
                        type="button"
                        onClick={() => handleAddBullet(expIdx)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet</span>
                      </button>
                    </div>

                    {(exp.bullets || []).map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2">
                        <span className="text-slate-400">•</span>
                        <input
                          type="text"
                          value={b}
                          onChange={(e) => handleUpdateBullet(expIdx, bIdx, e.target.value)}
                          className="flex-1 p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBullet(expIdx, bIdx)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: EDUCATION */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Education ({formData.education?.length || 0})</span>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add School</span>
                </button>
              </div>

              {(formData.education || []).map((edu, eduIdx) => (
                <div key={eduIdx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Degree #{eduIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(eduIdx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">University / College</label>
                      <input
                        type="text"
                        value={edu.school || edu.institution || ''}
                        onChange={(e) => handleUpdateEducation(eduIdx, 'school', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Degree &amp; Major</label>
                      <input
                        type="text"
                        value={edu.degree || ''}
                        onChange={(e) => handleUpdateEducation(eduIdx, 'degree', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="B.Tech in Computer Science"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Graduation Date</label>
                      <input
                        type="text"
                        value={edu.graduationDate || edu.endDate || edu.dates || ''}
                        onChange={(e) => handleUpdateEducation(eduIdx, 'graduationDate', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="2024"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">GPA / Marks</label>
                      <input
                        type="text"
                        value={edu.gpa || ''}
                        onChange={(e) => handleUpdateEducation(eduIdx, 'gpa', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="8.8 / 10 or 3.8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Projects ({formData.projects?.length || 0})</span>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              {(formData.projects || []).map((proj, projIdx) => (
                <div key={projIdx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Project #{projIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(projIdx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Project Name</label>
                      <input
                        type="text"
                        value={proj.name || proj.title || ''}
                        onChange={(e) => handleUpdateProject(projIdx, 'name', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Tech Stack</label>
                      <input
                        type="text"
                        value={Array.isArray(proj.tech) ? proj.tech.join(', ') : (proj.tech || '')}
                        onChange={(e) => handleUpdateProject(projIdx, 'tech', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="Node.js, Playwright, Redis"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Repository / Live Link</label>
                      <input
                        type="text"
                        value={proj.link || ''}
                        onChange={(e) => handleUpdateProject(projIdx, 'link', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Description / Summary</label>
                      <input
                        type="text"
                        value={proj.description || ''}
                        onChange={(e) => handleUpdateProject(projIdx, 'description', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Core Technical Skills (Comma-separated)
                </label>
                <textarea
                  rows={5}
                  value={
                    Array.isArray(formData.skills)
                      ? formData.skills.join(', ')
                      : (formData.skills && typeof formData.skills === 'object'
                          ? Object.values(formData.skills).flat().join(', ')
                          : String(formData.skills || ''))
                  }
                  onChange={(e) => handleSkillsStringChange(e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-indigo-500 leading-relaxed font-mono"
                  placeholder="JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Separate skills by commas. ATS algorithms parse skills directly to match job keywords.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <span className="text-xs text-slate-500">Live preview reflects immediately upon saving.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
