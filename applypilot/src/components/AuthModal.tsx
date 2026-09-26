import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApplyPilotLogo } from './ApplyPilotLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    loginWithDemo,
    forgotPassword,
    isLoading
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('Software Engineer');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (authModalTab === 'forgot') {
        if (!email) {
          setErrorMsg('Please enter your email address.');
          return;
        }
        const res = await forgotPassword(email);
        if (res.success) {
          setSuccessMsg(res.message || 'Password reset instructions have been dispatched.');
        } else {
          setErrorMsg(res.error || 'Failed to request password reset.');
        }
      } else if (authModalTab === 'login') {
        if (!email || !password) {
          setErrorMsg('Please provide both email and password.');
          return;
        }
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Invalid login credentials. Please try again or use a 1-Click Demo account.');
        }
      } else {
        if (!name || !email || !password) {
          setErrorMsg('Please fill in your name, email, and password.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password should be at least 6 characters.');
          return;
        }
        const res = await register(name, email, password, roleTitle);
        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed. Please try again.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-b-full blur-xs" />

        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          type="button"
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo & Header Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <ApplyPilotLogo size={40} showText={true} textClassName="text-xl text-white" badgeText="Portal" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {authModalTab === 'forgot'
              ? 'Reset Your Password'
              : authModalTab === 'login'
                ? 'Welcome Back, Job Hunter'
                : 'Create Your Candidate Account'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {authModalTab === 'forgot'
              ? 'Enter your registered email and we will send you secure instructions to reset your password.'
              : authModalTab === 'login'
                ? 'Access real-time scraped job postings, automated ATS tailoring, and track your applications.'
                : 'Unlock universal resume parsing, 100/100 ATS scanner, and auto-discovery across all job boards.'}
          </p>
        </div>

        {/* Tab Switcher */}
        {authModalTab !== 'forgot' ? (
          <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              id="auth-tab-login-btn"
              type="button"
              onClick={() => {
                setAuthModalTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authModalTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-register-btn"
              type="button"
              onClick={() => {
                setAuthModalTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authModalTab === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Register
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Full Name</span>
              </label>
              <input
                id="auth-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nikhil Singh"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Email Address</span>
            </label>
            <input
              id="auth-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@domain.com"
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {authModalTab !== 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Password</span>
                </span>
                {authModalTab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Forgot Password?
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {authModalTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Primary Target Role</span>
              </label>
              <select
                id="auth-role-select"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Software Engineer">Software Engineer (Full Stack / Backend)</option>
                <option value="Frontend Developer">Frontend Developer (React / Next.js)</option>
                <option value="AI / ML Engineer">AI / Machine Learning Engineer</option>
                <option value="DevOps & Cloud Engineer">DevOps &amp; Cloud Engineer</option>
                <option value="Product Manager">Technical Product Manager</option>
                <option value="Software Engineering Intern">Software Engineering Intern (2024-2028)</option>
              </select>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading || isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authModalTab === 'forgot'
                    ? 'Send Password Reset Link'
                    : authModalTab === 'login'
                      ? 'Sign In to Workspace'
                      : 'Create Account & Start Applying'}
                </span>
                {authModalTab === 'forgot' ? (
                  <KeyRound className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Demo Logins */}
        {authModalTab !== 'forgot' && (
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Or 1-Click Instant Demo Login:</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                id="demo-login-swe-btn"
                type="button"
                onClick={() => loginWithDemo('swe')}
                className="p-2.5 rounded-xl border border-slate-800 hover:border-blue-500/50 bg-slate-950/60 text-left transition-all hover:bg-blue-950/20 group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">
                  Alex Chen
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  Sr. Full-Stack SWE
                </div>
              </button>

              <button
                id="demo-login-ml-btn"
                type="button"
                onClick={() => loginWithDemo('ml')}
                className="p-2.5 rounded-xl border border-slate-800 hover:border-purple-500/50 bg-slate-950/60 text-left transition-all hover:bg-purple-950/20 group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-purple-400">
                  Priya Sharma
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  AI/ML Engineer '27
                </div>
              </button>

              <button
                id="demo-login-pm-btn"
                type="button"
                onClick={() => loginWithDemo('pm')}
                className="p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 text-left transition-all hover:bg-emerald-950/20 group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-emerald-400">
                  Jordan Miller
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  Technical PM
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
