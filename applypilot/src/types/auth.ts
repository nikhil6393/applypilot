export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleTitle: string;
  bio: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
  tier: 'free' | 'pro' | 'enterprise';
  role?: 'admin' | 'candidate';
  createdAt: string;
  lastLogin: string;
  savedResume?: any;

  // Search & Matching Preferences
  preferences: {
    targetRoles: string[];
    targetLocations: string[];
    remotePreference: 'remote-only' | 'hybrid' | 'onsite' | 'any';
    minSalary: number;
    currency: string;
    graduationBatch: string;
    noticePeriod: string;
    visaSponsorship: boolean;
  };

  // Automation & Scoring Rules
  automation: {
    dailyApplyLimit: number;
    minFitScoreThreshold: number; // e.g. 70
    autoTailorResume: boolean;
    autoGenerateCoverLetter: boolean;
    companyBlacklist: string[];
    priorityKeywords: string[];
  };

  // Notifications & Alerts
  notifications: {
    sseDesktopAlerts: boolean;
    emailDigest: 'realtime' | 'daily' | 'weekly' | 'off';
    soundEnabled: boolean;
    webhookUrl?: string;
  };

  // Security & Compliance
  security: {
    twoFactorEnabled: boolean;
    loginCount: number;
  };
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
