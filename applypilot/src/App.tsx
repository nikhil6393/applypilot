import React, { useState, useEffect } from 'react';
import { Navbar, StepKey } from './components/Navbar';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ResumeStep } from './components/ResumeStep';
import { DiscoveryStep } from './components/DiscoveryStep';
import { ScoringStep } from './components/ScoringStep';
import { TailorStep } from './components/TailorStep';
import { JobDetailSplitPane } from './components/JobDetailSplitPane';
import { SavedJobsScreen } from './components/SavedJobsScreen';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
import { ScraperStatusPanel } from './components/ScraperStatusPanel';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AdminLayout } from './components/admin/AdminLayout';
import { SettingsModal } from './components/SettingsModal';
import { LinkedInConnectModal } from './components/LinkedInConnectModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { UserProfileSettingsModal } from './components/UserProfileSettingsModal';
import { LoadingTransition } from './components/LoadingTransition';
import { KineticAuroraBackground } from './components/3d/KineticAuroraBackground';
import { AnimatePresence, motion } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import { useAppStore, ClientScreenKey } from './store/appStore';

import {
  ParsedResume,
  JobPosting,
  JobFitResult,
  TailoredDocument,
  ApplicationRecord,
  GuardrailSettings,
  ApplicationStatus,
  LinkedInProfile,
} from './types';
import { SAMPLE_RESUMES } from './data/sampleResumes';

const DEFAULT_SETTINGS: GuardrailSettings = {
  minFitScore: 75,
  maxAutoApplyPerBatch: 15,
  autoSelectTopN: 15,
  enableEmailAutoDraft: true,
  enableStrictAtsFormatting: true,
  safeStrictAntiHallucination: true,
};

function MainApp() {
  const { isAuthenticated, isTransitioning, user, loginWithDemo, updateProfile } = useAuth();
  const {
    appMode,
    setAppMode,
    clientScreen,
    setClientScreen,
    selectedJob,
    setSelectedJob,
    toasts,
    removeToast,
  } = useAppStore();

  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [discoveredJobs, setDiscoveredJobs] = useState<JobPosting[]>([]);
  const [fitResults, setFitResults] = useState<Record<string, JobFitResult>>({});
  const [selectedJobsForTailoring, setSelectedJobsForTailoring] = useState<JobPosting[]>([]);
  const [tailoredDocs, setTailoredDocs] = useState<Record<string, TailoredDocument>>({});
  const [settings, setSettings] = useState<GuardrailSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);

  // Initialize from LocalStorage and active session
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('applypilot_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      const savedLinkedIn = localStorage.getItem('applypilot_linkedin_profile');
      if (savedLinkedIn) {
        setLinkedInProfile(JSON.parse(savedLinkedIn));
      } else {
        fetch('/api/auth/linkedin/session')
          .then((res) => res.json())
          .then((data) => {
            if (data.authenticated && data.profile) {
              setLinkedInProfile(data.profile);
            }
          })
          .catch(() => { });
      }

      if (user?.savedResume) {
        setResume(user.savedResume);
      } else {
        const savedResume = localStorage.getItem('applypilot_resume');
        if (savedResume) {
          setResume(JSON.parse(savedResume));
        } else {
          setResume(SAMPLE_RESUMES.batch_2028.data);
        }
      }
    } catch (e) {
      console.error('Error loading initial local storage state:', e);
    }
  }, [user]);

  // Synchronize URL hash with appMode (strictly restricted to administrators)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('admin')) {
        if (user?.role === 'admin') {
          setAppMode('admin');
        } else {
          window.location.hash = '';
          setAppMode('client');
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setAppMode, user]);

  const handleUpdateLinkedInProfile = (profile: LinkedInProfile | null) => {
    setLinkedInProfile(profile);
    if (profile) {
      localStorage.setItem('applypilot_linkedin_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('applypilot_linkedin_profile');
    }
  };

  const handleFindLinkedInInternships = async (profile: LinkedInProfile) => {
    setClientScreen('discovery');
    try {
      const res = await fetch('/api/linkedin/find-internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: profile.headline || '2028',
          skills: profile.skills || ['React', 'TypeScript', 'Node.js'],
          location: profile.location || 'India',
        }),
      });
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        setDiscoveredJobs(data.jobs);
      }
    } catch (err) {
      console.error('Failed to trigger LinkedIn batch scrape:', err);
    }
  };

  const handleUpdateResume = (newResume: ParsedResume) => {
    setResume(newResume);
    try {
      localStorage.setItem('applypilot_resume', JSON.stringify(newResume));
    } catch { }
    if (user) {
      updateProfile({ savedResume: newResume });
    }
  };

  const handleUpdateSettings = (newSettings: GuardrailSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('applypilot_settings', JSON.stringify(newSettings));
    } catch { }
  };

  // Step Transitions
  const handleConfirmAndDiscover = () => {
    setClientScreen('discovery');
  };

  const handleProceedToScoring = () => {
    setClientScreen('scoring');
  };

  const handleProceedToTailoring = (jobsToTailor: JobPosting[]) => {
    setSelectedJobsForTailoring(jobsToTailor);
    setClientScreen('tailor');
  };

  // Gate the app behind authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <LoadingTransition isLoading={isTransitioning} targetStepTitle="ApplyPilot Landing" />
        <LandingPage onLaunchApp={() => loginWithDemo('swe')} />
        <AuthModal />
        <UserProfileSettingsModal />
      </div>
    );
  }

  // Dual-app: If Admin mode active, render complete Admin Portal (Restricted to Admins)
  if (appMode === 'admin' && user?.role === 'admin') {
    return (
      <>
        <AdminLayout />
        {/* Global Toast Notifications Container */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className={`p-3.5 rounded-2xl shadow-xl border text-xs max-w-sm pointer-events-auto flex items-start justify-between gap-3 ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : toast.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : toast.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  <div className="font-bold">{toast.title}</div>
                  {toast.message && <div className="text-[11px] opacity-80 mt-0.5">{toast.message}</div>}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="opacity-50 hover:opacity-100 text-sm font-bold"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 -z-40 transition-colors duration-300 bg-[#F1F3F9]" />
      <KineticAuroraBackground />

      <div className="min-h-screen flex flex-col font-sans relative transition-colors duration-300 text-slate-900">
        <LoadingTransition isLoading={isTransitioning} targetStepTitle="ApplyPilot Workspace" />

        {/* Top Sticky Navigation */}
        <Navbar
          currentStep={clientScreen as any}
          onSelectStep={(step) => setClientScreen(step as any)}
          hasResume={!!resume}
          jobCount={discoveredJobs.length}
          scoredCount={Object.keys(fitResults).length}
          tailoredCount={Object.keys(tailoredDocs).length}
          linkedInProfile={linkedInProfile}
          onOpenLinkedInModal={() => setIsLinkedInModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 relative">
          <AnimatePresence mode="wait">
            {/* Screen 1: Landing */}
            {clientScreen === 'landing' && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LandingPage onLaunchApp={() => setClientScreen('discovery')} />
              </motion.div>
            )}

            {/* Screen 2: Dashboard */}
            {clientScreen === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsDashboard
                  resume={resume}
                  discoveredJobs={discoveredJobs}
                  fitResults={fitResults}
                  tailoredDocs={tailoredDocs}
                  onNavigateToStep={(step) => setClientScreen(step as any)}
                />
              </motion.div>
            )}

            {/* Screen 3: Job Discovery Feed */}
            {clientScreen === 'discovery' && resume && (
              <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DiscoveryStep
                  resume={resume}
                  discoveredJobs={discoveredJobs}
                  onJobsDiscovered={setDiscoveredJobs}
                  onProceedToScoring={handleProceedToScoring}
                  onSelectJobForDetail={(job) => {
                    setSelectedJob(job);
                    setClientScreen('job_detail');
                  }}
                  onSelectJobForTailoring={(job) => {
                    setSelectedJobsForTailoring([job]);
                    setClientScreen('tailor');
                  }}
                />
              </motion.div>
            )}

            {/* Screen 4: Job Detail Split-Pane */}
            {clientScreen === 'job_detail' && (
              <motion.div key="job_detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <JobDetailSplitPane
                  jobs={discoveredJobs}
                  selectedJob={selectedJob}
                  resume={resume}
                  onSelectJob={(j) => setSelectedJob(j)}
                  onTailorJob={(j) => {
                    setSelectedJobsForTailoring([j]);
                    setClientScreen('tailor');
                  }}
                  onBackToFeed={() => setClientScreen('discovery')}
                />
              </motion.div>
            )}

            {/* Screen 5: Resume Studio */}
            {clientScreen === 'resume' && (
              <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResumeStep
                  resume={resume}
                  onUpdateResume={handleUpdateResume}
                  onConfirmAndDiscover={handleConfirmAndDiscover}
                  linkedInProfile={linkedInProfile}
                  onOpenLinkedInModal={() => setIsLinkedInModalOpen(true)}
                />
              </motion.div>
            )}

            {/* Screen 6: Fit Scoring Matrix */}
            {clientScreen === 'scoring' && resume && (
              <motion.div key="scoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScoringStep
                  resume={resume}
                  jobs={discoveredJobs}
                  fitResults={fitResults}
                  onUpdateFitResults={setFitResults}
                  onProceedToTailoring={handleProceedToTailoring}
                />
              </motion.div>
            )}

            {/* Screen 7: Tailoring Suite */}
            {clientScreen === 'tailor' && resume && (
              <motion.div key="tailor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TailorStep
                  resume={resume}
                  selectedJobs={
                    selectedJobsForTailoring.length > 0
                      ? selectedJobsForTailoring
                      : discoveredJobs.slice(0, 10)
                  }
                  tailoredDocs={tailoredDocs}
                  onUpdateTailoredDocs={setTailoredDocs}
                />
              </motion.div>
            )}

            {/* Screen 8: Saved Jobs */}
            {clientScreen === 'saved_jobs' && (
              <motion.div key="saved_jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SavedJobsScreen
                  jobs={discoveredJobs}
                  onSelectJobForDetail={(j) => {
                    setSelectedJob(j);
                    setClientScreen('job_detail');
                  }}
                  onSelectJobForTailoring={(j) => {
                    setSelectedJobsForTailoring([j]);
                    setClientScreen('tailor');
                  }}
                />
              </motion.div>
            )}

            {/* Screen 9: Profile & Guardrail Settings */}
            {clientScreen === 'profile_settings' && (
              <motion.div key="profile_settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfileSettingsScreen
                  resume={resume}
                  onUpdateResume={handleUpdateResume}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />
              </motion.div>
            )}

            {/* Screen 10: Scraper Status Panel */}
            {clientScreen === 'scraper_status' && (
              <motion.div key="scraper_status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScraperStatusPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Overlays & Modals */}
        {/* Notification Drawer */}
        <NotificationDrawer />

        {/* LinkedIn Connect Modal */}
        <LinkedInConnectModal
          isOpen={isLinkedInModalOpen}
          onClose={() => setIsLinkedInModalOpen(false)}
          linkedInProfile={linkedInProfile}
          onUpdateLinkedInProfile={handleUpdateLinkedInProfile}
          onSyncResume={(synced) => {
            handleUpdateResume(synced);
          }}
          onFindInternships={handleFindLinkedInInternships}
        />

        {/* Global Auth & User Profile Modals */}
        <AuthModal />
        <UserProfileSettingsModal />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />

        {/* Global Toast Notifications Container */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className={`p-3.5 rounded-2xl shadow-xl border text-xs max-w-sm pointer-events-auto flex items-start justify-between gap-3 ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : toast.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : toast.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  <div className="font-bold">{toast.title}</div>
                  {toast.message && <div className="text-[11px] opacity-80 mt-0.5">{toast.message}</div>}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="opacity-50 hover:opacity-100 text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
