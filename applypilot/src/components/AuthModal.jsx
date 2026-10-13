import React, { useState } from 'react';
import { X, Lock, Mail, User, Briefcase, ArrowRight, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApplyPilotLogo } from './ApplyPilotLogo';

export const AuthModal = () => {
    const { isAuthModalOpen, setIsAuthModalOpen, authModalTab, setAuthModalTab, login, register, forgotPassword, resetPassword, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [name, setName] = useState('');
    const [roleTitle, setRoleTitle] = useState('Software Engineer');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isAuthModalOpen)
        return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || isLoading)
            return;
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
                }
                else {
                    setErrorMsg(res.error || 'Failed to request password reset.');
                }
            }
            else if (authModalTab === 'reset') {
                if (!resetToken || !password) {
                    setErrorMsg('Please enter both the reset token and your new password.');
                    return;
                }
                if (password.length < 6) {
                    setErrorMsg('New password should be at least 6 characters.');
                    return;
                }
                const res = await resetPassword(resetToken, password);
                if (res.success) {
                    setSuccessMsg('Your password has been reset successfully! Redirecting to sign in...');
                    setPassword('');
                    setResetToken('');
                    setTimeout(() => {
                        setAuthModalTab('login');
                        setSuccessMsg(null);
                    }, 2000);
                }
                else {
                    setErrorMsg(res.error || 'Password reset failed. Token may be invalid or expired.');
                }
            }
            else if (authModalTab === 'login') {
                if (!email || !password) {
                    setErrorMsg('Please provide both email and password.');
                    return;
                }
                const res = await login(email, password);
                if (!res.success) {
                    setErrorMsg(res.error || 'Invalid email or password. Please check your credentials.');
                }
            }
            else {
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
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.2),0_0_1px_rgba(0,0,0,0.1)] overflow-hidden p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Vibrant Top Accent Line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-b-full" />

                {/* Close Button */}
                <button
                    id="auth-modal-close-btn"
                    type="button"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Logo & Header Title */}
                <div className="text-center space-y-2 pt-1">
                    <div className="flex justify-center mb-1">
                        <ApplyPilotLogo size={42} showText={true} textClassName="text-xl font-display font-extrabold text-slate-900" badgeText="Portal" />
                    </div>
                    <h2 className="text-2xl font-display font-extrabold tracking-tight text-slate-900">
                        {authModalTab === 'forgot'
                            ? 'Reset Your Password'
                            : authModalTab === 'reset'
                                ? 'Set New Password'
                                : authModalTab === 'login'
                                    ? 'Welcome Back, Job Hunter'
                                    : 'Create Your Candidate Account'}
                    </h2>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {authModalTab === 'forgot'
                            ? 'Enter your registered email and we will send you secure instructions to reset your password.'
                            : authModalTab === 'reset'
                                ? 'Enter your verification token and your new password to restore account access.'
                                : authModalTab === 'login'
                                    ? 'Access real-time scraped job postings, automated ATS tailoring, and track your applications.'
                                    : 'Unlock universal resume parsing, 100/100 ATS scanner, and auto-discovery across all job boards.'}
                    </p>
                </div>

                {/* Tab Switcher */}
                {authModalTab !== 'forgot' && authModalTab !== 'reset' ? (
                    <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                        <button
                            id="auth-tab-login-btn"
                            type="button"
                            onClick={() => {
                                setAuthModalTab('login');
                                setErrorMsg(null);
                                setSuccessMsg(null);
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authModalTab === 'login'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'}`}
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
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'}`}
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
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                        >
                            ← Back to Sign In
                        </button>
                        {authModalTab === 'forgot' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthModalTab('reset');
                                    setErrorMsg(null);
                                    setSuccessMsg(null);
                                }}
                                className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                            >
                                Have a reset token?
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthModalTab('forgot');
                                    setErrorMsg(null);
                                    setSuccessMsg(null);
                                }}
                                className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                            >
                                Request new token
                            </button>
                        )}
                    </div>
                )}

                {/* Success Notice */}
                {successMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Error Notice */}
                {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        {errorMsg}
                    </div>
                )}

                {/* Form Inputs */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {authModalTab === 'register' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                                <span>Full Name</span>
                            </label>
                            <input
                                id="auth-name-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Nikhil Singh"
                                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
                                required
                            />
                        </div>
                    )}

                    {authModalTab === 'reset' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                                <span>Reset Token</span>
                            </label>
                            <input
                                id="auth-reset-token-input"
                                type="text"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value.trim())}
                                placeholder="Paste the token sent to your email"
                                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-mono"
                                required
                            />
                        </div>
                    )}

                    {authModalTab !== 'reset' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                <span>Email Address</span>
                            </label>
                            <input
                                id="auth-email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="candidate@domain.com"
                                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
                                required
                            />
                        </div>
                    )}

                    {authModalTab !== 'forgot' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                <span className="flex items-center space-x-1.5">
                                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{authModalTab === 'reset' ? 'New Password' : 'Password'}</span>
                                </span>
                                {authModalTab === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthModalTab('forgot');
                                            setErrorMsg(null);
                                            setSuccessMsg(null);
                                        }}
                                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer bg-transparent border-none p-0"
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
                                    placeholder={authModalTab === 'reset' ? 'Enter minimum 6 characters' : '••••••••'}
                                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {authModalTab === 'register' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                                <span>Primary Target Role</span>
                            </label>
                            <select
                                id="auth-role-select"
                                value={roleTitle}
                                onChange={(e) => setRoleTitle(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs text-slate-900 outline-none transition-all cursor-pointer"
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
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.005] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-1"
                    >
                        {isLoading || isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>
                                    {authModalTab === 'forgot'
                                        ? 'Send Password Reset Link'
                                        : authModalTab === 'reset'
                                            ? 'Update Password & Sign In'
                                            : authModalTab === 'login'
                                                ? 'Sign In to Workspace'
                                                : 'Create Account & Start Applying'}
                                </span>
                                {authModalTab === 'forgot' || authModalTab === 'reset' ? (<KeyRound className="w-4 h-4" />) : (<ArrowRight className="w-4 h-4" />)}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
