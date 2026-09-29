import React, { createContext, useContext, useState, useEffect } from 'react';
const DEMO_CREDENTIALS = {
    swe: { email: 'nikhil900285@gmail.com', pass: 'nikhil123' },
    ml: { email: 'priya.sharma@aiml.io', pass: 'DemoPass123!' },
    pm: { email: 'jordan.m@productscale.com', pass: 'DemoPass123!' },
};
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('applypilot_user');
            return stored ? JSON.parse(stored) : null;
        }
        catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => {
        return localStorage.getItem('applypilot_token') || null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState('login');
    // Verify stored session with backend on initial boot
    useEffect(() => {
        const verifySession = async () => {
            const storedToken = localStorage.getItem('applypilot_token');
            if (!storedToken) {
                setUser(null);
                setToken(null);
                return;
            }
            try {
                const res = await fetch('/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        setUser(data.user);
                        setToken(storedToken);
                        localStorage.setItem('applypilot_user', JSON.stringify(data.user));
                    }
                    else {
                        // Invalid session
                        setUser(null);
                        setToken(null);
                        localStorage.removeItem('applypilot_user');
                        localStorage.removeItem('applypilot_token');
                    }
                }
                else {
                    // Token expired or invalid
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem('applypilot_user');
                    localStorage.removeItem('applypilot_token');
                }
            }
            catch (err) {
                console.warn('Session verification fallback to cached state:', err);
            }
        };
        verifySession();

        const handleAuthExpired = () => {
            setUser(null);
            setToken(null);
            localStorage.removeItem('applypilot_user');
            localStorage.removeItem('applypilot_token');
            setIsAuthModalOpen(true);
            setAuthModalTab('login');
        };
        window.addEventListener('applypilot:auth-expired', handleAuthExpired);
        return () => window.removeEventListener('applypilot:auth-expired', handleAuthExpired);
    }, []);
    // Sync token and user to localStorage
    useEffect(() => {
        if (user) {
            localStorage.setItem('applypilot_user', JSON.stringify(user));
        }
        else {
            localStorage.removeItem('applypilot_user');
        }
    }, [user]);
    useEffect(() => {
        if (token) {
            localStorage.setItem('applypilot_token', token);
        }
        else {
            localStorage.removeItem('applypilot_token');
        }
    }, [token]);
    // Synchronize authentication status across multiple browser tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'applypilot_token') {
                if (!e.newValue) {
                    setUser(null);
                    setToken(null);
                }
                else if (e.newValue !== token) {
                    setToken(e.newValue);
                    const storedUser = localStorage.getItem('applypilot_user');
                    if (storedUser) {
                        try {
                            setUser(JSON.parse(storedUser));
                        }
                        catch { }
                    }
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [token]);
    // Real backend login with salted scrypt cryptographic verification
    const login = async (email, pass) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setIsLoading(false);
                return { success: false, error: data.error || 'Invalid email or password.' };
            }
            // Smooth stable loading transition into dashboard
            setIsTransitioning(true);
            setUser(data.user);
            setToken(data.token);
            setIsAuthModalOpen(false);
            setIsLoading(false);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 1500);
            return { success: true };
        }
        catch (err) {
            setIsLoading(false);
            return { success: false, error: err.message || 'Connection error. Please try again.' };
        }
    };
    // Real backend registration with secure password hashing
    const register = async (name, email, pass, roleTitle) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password: pass, roleTitle }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setIsLoading(false);
                return { success: false, error: data.error || 'Registration failed.' };
            }
            // Smooth transition into dashboard
            setIsTransitioning(true);
            setUser(data.user);
            setToken(data.token);
            setIsAuthModalOpen(false);
            setIsLoading(false);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 1500);
            return { success: true };
        }
        catch (err) {
            setIsLoading(false);
            return { success: false, error: err.message || 'Connection error. Please try again.' };
        }
    };
    // Google Login & Registration via backend
    const loginWithGoogle = async (googlePayload) => {
        if (!googlePayload?.credential) {
            return { success: false, error: 'Google credential token is required.' };
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: googlePayload.credential }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setIsLoading(false);
                return { success: false, error: data.error || 'Google authentication failed.' };
            }
            setIsTransitioning(true);
            setUser(data.user);
            setToken(data.token);
            setIsAuthModalOpen(false);
            setIsLoading(false);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 1500);
            return { success: true };
        }
        catch (err) {
            setIsLoading(false);
            return { success: false, error: err.message || 'Failed to connect to Google Auth.' };
        }
    };
    // Request password reset link
    const forgotPassword = async (email) => {
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                return { success: false, error: data.error || 'Failed to request password reset.' };
            }
            return { success: true, message: data.message };
        }
        catch (err) {
            return { success: false, error: err.message || 'Connection error.' };
        }
    };
    // Logout and revoke token on backend
    const logout = async () => {
        const currentToken = token;
        setIsTransitioning(true);
        if (currentToken) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${currentToken}` },
                });
            }
            catch { }
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('applypilot_user');
        localStorage.removeItem('applypilot_token');
        setTimeout(() => {
            setIsTransitioning(false);
        }, 600);
    };
    // Authenticate demo account via actual backend cryptographic verification
    const loginWithDemo = async (roleType) => {
        const creds = DEMO_CREDENTIALS[roleType] || DEMO_CREDENTIALS.swe;
        return await login(creds.email, creds.pass);
    };
    // Update profile via backend
    const updateProfile = async (updated) => {
        if (!user)
            return;
        const updatedUser = { ...user, ...updated };
        setUser(updatedUser);
        try {
            localStorage.setItem('applypilot_user', JSON.stringify(updatedUser));
        }
        catch { }
        if (updated.savedResume) {
            try {
                localStorage.setItem('applypilot_resume', JSON.stringify(updated.savedResume));
            }
            catch { }
        }
        if (!token)
            return;
        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updated),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    const merged = { ...updatedUser, ...data.user };
                    setUser(merged);
                    localStorage.setItem('applypilot_user', JSON.stringify(merged));
                }
            }
        }
        catch (err) {
            console.error('Failed to sync profile update with server:', err);
        }
    };
    return (<AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!user && !!token,
            isLoading,
            login,
            register,
            logout,
            updateProfile,
            loginWithDemo,
            loginWithGoogle,
            forgotPassword,
            isAuthModalOpen,
            setIsAuthModalOpen,
            isSettingsModalOpen,
            setIsSettingsModalOpen,
            authModalTab,
            setAuthModalTab,
            isTransitioning,
            setIsTransitioning,
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
