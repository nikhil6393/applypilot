import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ScoringStep } from './components/ScoringStep';
import { JobDetailSplitPane } from './components/JobDetailSplitPane';
import { SavedJobsScreen } from './components/SavedJobsScreen';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
import { ScraperStatusPanel } from './components/ScraperStatusPanel';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SettingsModal } from './components/SettingsModal';
import { LinkedInConnectModal } from './components/LinkedInConnectModal';
import { AuthModal } from './components/AuthModal';
import { LoadingTransition } from './components/LoadingTransition';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { DashboardHome } from './components/DashboardHome';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAppStore } from './store/appStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { FeedbackWidget } from './components/FeedbackWidget';

// Lazy-loaded heavy components for instant initial page loading & optimal bundle splitting
const ResumeStep = lazy(() => import('./components/ResumeStep').then(m => ({ default: m.ResumeStep })));
const DiscoveryStep = lazy(() => import('./components/DiscoveryStep').then(m => ({ default: m.DiscoveryStep })));
const TailorStep = lazy(() => import('./components/TailorStep').then(m => ({ default: m.TailorStep })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const UserProfileSettingsModal = lazy(() => import('./components/UserProfileSettingsModal').then(m => ({ default: m.UserProfileSettingsModal })));
const SkillGapExact = lazy(() => import('./components/SkillGapExact').then(m => ({ default: m.SkillGapExact })));

const ScreenSuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 py-16">
    <div className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
    <span className="text-xs font-semibold text-slate-500 tracking-wide">Loading module...</span>
  </div>
);

const createEmptyResume = (currentUser) => ({
  name: currentUser?.name || '',
  summary: '',
  contact: {
    email: currentUser?.email || '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  education: [],
  experience: [],
  skills: {
    languages: [],
    frameworks: [],
    tools: [],
    domain: [],
  },
  projects: [],
  certifications: [],
  target_roles: [],
  target_keywords: [],
});

const DEFAULT_SETTINGS = {
  minFitScore: 75,
  maxAutoApplyPerBatch: 15,
  autoSelectTopN: 15,
  enableEmailAutoDraft: true,
  enableStrictAtsFormatting: true,
  safeStrictAntiHallucination: true,
};

function MainApp() {
  const { isAuthenticated, isTransitioning, user, setIsAuthModalOpen, updateProfile } = useAuth();
  const { appMode, setAppMode, clientScreen, setClientScreen, selectedJob, setSelectedJob, toasts, removeToast } = useAppStore();
  const [resume, setResume] = useState(null);
  const [discoveredJobs, setDiscoveredJobs] = useState([]);
  const [fitResults, setFitResults] = useState({});
  const [selectedJobsForTailoring, setSelectedJobsForTailoring] = useState([]);
  const [tailoredDocs, setTailoredDocs] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [discoverySearchTerm, setDiscoverySearchTerm] = useState('');

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
          .catch(() => {});
      }
      if (user?.savedResume) {
        setResume(user.savedResume);
      } else {
        const savedResume = localStorage.getItem('applypilot_resume');
        if (savedResume) {
          try {
            setResume(JSON.parse(savedResume));
          } catch {
            setResume(createEmptyResume(user));
          }
        } else {
          fetch('/api/resume')
            .then((res) => res.json())
            .then((data) => {
              if (data?.resume) {
                setResume(data.resume);
                localStorage.setItem('applypilot_resume', JSON.stringify(data.resume));
              } else {
                setResume(createEmptyResume(user));
              }
            })
            .catch(() => {
              setResume(createEmptyResume(user));
            });
        }
      }
    } catch (e) {
      console.error('Error loading initial local storage state:', e);
    }
  }, [user]);

  // Automatically load past verified jobs into global discoveredJobs so Dashboard & Feed are immediately populated
  useEffect(() => {
    const loadInitialPastJobs = async () => {
      try {
        const res = await fetch('/api/jobs?limit=500');
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const tagged = data.items.map((j) => ({ ...j, isQueue: true, isLive: false }));
          setDiscoveredJobs((prev) => {
            if (!prev || prev.length === 0) return tagged;
            const map = new Map();
            for (const item of prev) {
              const k = item.id || item.applyUrl || item.title;
              map.set(k, item);
            }
            for (const item of tagged) {
              const k = item.id || item.applyUrl || item.title;
              if (!map.has(k)) map.set(k, item);
            }
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('Initial jobs preloader error:', err);
      }
    };
    loadInitialPastJobs();
  }, [user]);


  const handleUpdateLinkedInProfile = (profile) => {
    setLinkedInProfile(profile);
    if (profile) {
      localStorage.setItem('applypilot_linkedin_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('applypilot_linkedin_profile');
    }
  };

  const handleFindLinkedInInternships = async (profile) => {
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

  const handleUpdateResume = (newResume) => {
    setResume(newResume);
    try {
      localStorage.setItem('applypilot_resume', JSON.stringify(newResume));
    } catch {}
    if (user) {
      updateProfile({ savedResume: newResume });
    }
  };

  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('applypilot_settings', JSON.stringify(newSettings));
    } catch {}
  };

  // Step Transitions
  const handleConfirmAndDiscover = () => setClientScreen('discovery');
  const handleProceedToScoring = () => setClientScreen('scoring');
  const handleProceedToTailoring = (jobsToTailor) => {
    setSelectedJobsForTailoring(jobsToTailor);
    setClientScreen('resume');
  };

  // Shared toast renderer
  const ToastContainer = () => (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            className={`p-3.5 rounded-2xl shadow-xl border text-xs max-w-sm pointer-events-auto flex items-start justify-between gap-3 ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900'
              : toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div>
              <div className="font-bold">{toast.title}</div>
              {toast.message && <div className="text-[11px] opacity-80 mt-0.5">{toast.message}</div>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100 text-sm font-bold cursor-pointer">×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  // Gate the app behind authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <LoadingTransition isLoading={isTransitioning} targetStepTitle="ApplyPilot Landing" />
        <Suspense fallback={null}>
          <LandingPage onLaunchApp={() => setIsAuthModalOpen(true)} />
        </Suspense>
        <AuthModal />
        <Suspense fallback={null}><UserProfileSettingsModal /></Suspense>
      </div>
    );
  }


  // Main Client App — New Sidebar Layout
  return (
    <SidebarLayout
      currentScreen={clientScreen}
      onSelectScreen={(step) => setClientScreen(step)}
      onSearch={(term) => {
        setDiscoverySearchTerm(term);
        setClientScreen('discovery');
      }}
      jobCount={discoveredJobs.length}
      tailoredCount={Object.keys(tailoredDocs).length}
    >
      <NetworkStatusBanner />
      <LoadingTransition isLoading={isTransitioning} targetStepTitle="ApplyPilot Workspace" />

      <ErrorBoundary onNavigateHome={() => setClientScreen('analytics')}>
        <Suspense fallback={<ScreenSuspenseFallback />}>
          <AnimatePresence mode="wait">

            {/* Screen 1: Landing */}
            {clientScreen === 'landing' && (
              <motion.div key="landing" className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LandingPage onLaunchApp={() => setClientScreen('discovery')} />
              </motion.div>
            )}

            {/* Screen 2: Dashboard — New PRO UI */}
            {clientScreen === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                <DashboardHome
                  resume={resume}
                  discoveredJobs={discoveredJobs}
                  fitResults={fitResults}
                  tailoredDocs={tailoredDocs}
                  onNavigateToStep={(step) => setClientScreen(step)}
                />
              </motion.div>
            )}

            {/* Screen 3: Job Discovery Feed */}
            {clientScreen === 'discovery' && (
              <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
                <DiscoveryStep
                  resume={resume || createEmptyResume(user)}
                  discoveredJobs={discoveredJobs}
                  onJobsDiscovered={setDiscoveredJobs}
                  onProceedToScoring={handleProceedToScoring}
                  onSelectJobForDetail={(job) => { setSelectedJob(job); setClientScreen('job_detail'); }}
                  onSelectJobForTailoring={(job) => { setSelectedJobsForTailoring([job]); setClientScreen('resume'); }}
                  initialSearchTerm={discoverySearchTerm}
                  onUpdateResume={handleUpdateResume}
                  onNavigateToResume={() => setClientScreen('resume')}
                />
              </motion.div>
            )}

            {/* Screen 4: Job Detail Split-Pane */}
            {clientScreen === 'job_detail' && (
              <motion.div key="job_detail" className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <JobDetailSplitPane
                  jobs={discoveredJobs}
                  selectedJob={selectedJob}
                  resume={resume}
                  onSelectJob={(j) => setSelectedJob(j)}
                  onTailorJob={(j) => { setSelectedJobsForTailoring([j]); setClientScreen('resume'); }}
                  onBackToFeed={() => setClientScreen('discovery')}
                />
              </motion.div>
            )}

            {/* Screen 5: Resume Studio (Merged with Job Tailoring) */}
            {(clientScreen === 'resume' || clientScreen === 'tailor') && (
              <motion.div key="resume" className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResumeStep
                  resume={resume}
                  onUpdateResume={handleUpdateResume}
                  onConfirmAndDiscover={handleConfirmAndDiscover}
                  linkedInProfile={linkedInProfile}
                  onOpenLinkedInModal={() => setIsLinkedInModalOpen(true)}
                  discoveredJobs={discoveredJobs}
                  targetJob={selectedJobsForTailoring[0] || null}
                  onClearTargetJob={() => setSelectedJobsForTailoring([])}
                />
              </motion.div>
            )}

            {/* Screen 6: Skill Gap Analysis — Exact Template */}
            {clientScreen === 'scoring' && (
              <motion.div key="scoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
                <SkillGapExact
                  onNavigateToFeed={(companyName) => {
                    setDiscoverySearchTerm(companyName || '');
                    setClientScreen('discovery');
                  }}
                />
              </motion.div>
            )}

            {/* Screen 7: Saved Jobs */}
            {clientScreen === 'saved_jobs' && (
              <motion.div key="saved_jobs" className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SavedJobsScreen
                  jobs={discoveredJobs}
                  onSelectJobForDetail={(j) => { setSelectedJob(j); setClientScreen('job_detail'); }}
                  onSelectJobForTailoring={(j) => { setSelectedJobsForTailoring([j]); setClientScreen('resume'); }}
                />
              </motion.div>
            )}

            {/* Screen 9: Profile & Guardrail Settings */}
            {(clientScreen === 'profile_settings' || clientScreen === 'settings') && (
              <motion.div key="profile_settings" className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              <motion.div key="scraper_status" className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScraperStatusPanel />
              </motion.div>
            )}

          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>

      {/* Global Overlays & Modals */}
      <NotificationDrawer />
      <LinkedInConnectModal
        isOpen={isLinkedInModalOpen}
        onClose={() => setIsLinkedInModalOpen(false)}
        linkedInProfile={linkedInProfile}
        onUpdateLinkedInProfile={handleUpdateLinkedInProfile}
        onSyncResume={(synced) => handleUpdateResume(synced)}
        onFindInternships={handleFindLinkedInInternships}
      />
      <AuthModal />
      <FeedbackWidget />
      <Suspense fallback={null}><UserProfileSettingsModal /></Suspense>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
      <ToastContainer />
    </SidebarLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
