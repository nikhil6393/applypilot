import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../store/db.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
  sessionToken?: string;
}

/**
 * Initialize SQLite tables for robust, persistent authentication
 */
export function initAuthTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role_title TEXT NOT NULL DEFAULT 'Software Engineer',
      tier TEXT NOT NULL DEFAULT 'pro',
      role TEXT NOT NULL DEFAULT 'candidate',
      avatar TEXT,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
  `);

  // Ensure role column exists if upgrading an existing db
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'candidate'`);
  } catch { }

  // Seed default demo accounts if not already present
  seedDemoAccounts();

  // Prune any already expired sessions or password resets
  pruneExpiredAuthData();
}

/**
 * Clean up expired sessions and consumed/expired password resets
 */
export function pruneExpiredAuthData(): { prunedSessions: number; prunedResets: number } {
  try {
    const db = getDb();
    const resSessions = db.prepare("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')").run();
    const resResets = db.prepare("DELETE FROM password_resets WHERE datetime(expires_at) < datetime('now') OR used = 1").run();
    return {
      prunedSessions: resSessions.changes,
      prunedResets: resResets.changes
    };
  } catch (err) {
    return { prunedSessions: 0, prunedResets: 0 };
  }
}

/**
 * Hash password with PBKDF2/scrypt and random salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Constant-time password verification to prevent timing attacks
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically secure session token (256-bit)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Build default UserProfile structure
 */
function createDefaultProfile(
  id: string,
  name: string,
  email: string,
  roleTitle: string,
  avatar?: string,
  role: 'admin' | 'candidate' = 'candidate',
  isDemo: boolean = false
): any {
  return {
    id,
    name,
    email,
    role,
    avatar:
      avatar ||
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    roleTitle: roleTitle || 'Software Engineer',
    bio: isDemo
      ? 'Building high-performance distributed systems, modern web apps, and machine learning scrapers.'
      : '',
    phone: isDemo ? '+91 6392737229' : '',
    location: isDemo ? 'Bangalore, India (Open to Remote / Global)' : '',
    linkedin: isDemo ? 'https://linkedin.com/in/nikhil-singh-swe' : '',
    github: isDemo ? 'https://github.com/nikhil-singh' : '',
    portfolio: isDemo ? 'https://nikhilportfolio.dev' : '',
    twitter: isDemo ? 'https://x.com/nikhildev' : '',
    tier: 'pro',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    preferences: {
      targetRoles: roleTitle ? [roleTitle] : ['Software Engineer'],
      targetLocations: isDemo
        ? ['Remote', 'India', 'United States', 'Europe', 'Singapore']
        : ['Remote'],
      remotePreference: 'any',
      minSalary: isDemo ? 85000 : 0,
      currency: 'USD',
      graduationBatch: isDemo ? '2024-2028' : '',
      noticePeriod: isDemo ? 'Immediate / 15 Days' : 'Immediate',
      visaSponsorship: false,
    },
    automation: {
      dailyApplyLimit: 50,
      minFitScoreThreshold: 75,
      autoTailorResume: true,
      autoGenerateCoverLetter: true,
      companyBlacklist: isDemo ? ['Revature', 'Infosys Staffing'] : [],
      priorityKeywords: isDemo
        ? [
            'TypeScript',
            'React',
            'Node.js',
            'PostgreSQL',
            'Docker',
            'Python',
            'FastAPI',
          ]
        : [],
    },
    notifications: {
      sseDesktopAlerts: true,
      emailDigest: 'realtime',
      soundEnabled: true,
      webhookUrl: '',
    },
    security: {
      twoFactorEnabled: false,
      loginCount: 1,
    },
  };
}

/**
 * Seed verified demo users for immediate and seamless zero-friction testing
 */
function seedDemoAccounts(): void {
  // Guard against seeding demo accounts in production unless explicitly opted in
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_ACCOUNTS !== 'true') {
    return;
  }

  const db = getDb();
  const demoUsers = [
    {
      id: 'usr_nikhil_singh',
      name: 'Nikhil Singh',
      email: 'nikhil900285@gmail.com',
      password: 'nikhil123',
      roleTitle: 'Senior Full Stack Engineer',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_demo_swe',
      name: 'Nikhil Singh',
      email: 'demo@applypilot.io',
      password: 'DemoPass123!',
      roleTitle: 'Senior Full Stack Engineer',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_demo_ml',
      name: 'Priya Sharma',
      email: 'priya.sharma@aiml.io',
      password: 'DemoPass123!',
      roleTitle: 'Machine Learning Engineer / 2027 Batch',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_demo_pm',
      name: 'Jordan Miller',
      email: 'jordan.m@productscale.com',
      password: 'DemoPass123!',
      roleTitle: 'Technical Product Manager',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
  ];

  for (const demo of demoUsers) {
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(demo.email.toLowerCase());
    const role = demo.id === 'usr_nikhil_singh' ? 'admin' : 'candidate';
    if (!existing) {
      const { hash, salt } = hashPassword(demo.password);
      const profile = createDefaultProfile(
        demo.id,
        demo.name,
        demo.email,
        demo.roleTitle,
        demo.avatar,
        role,
        true
      );
      db.prepare(
        `
        INSERT INTO users (id, name, email, password_hash, salt, role_title, tier, role, avatar, profile_json, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, 'pro', ?, ?, ?, datetime('now'), datetime('now'))
      `
      ).run(
        demo.id,
        demo.name,
        demo.email.toLowerCase(),
        hash,
        salt,
        demo.roleTitle,
        role,
        demo.avatar,
        JSON.stringify(profile)
      );
    } else {
      // Ensure admin users have role = 'admin'
      if (role === 'admin') {
        try {
          db.prepare(`UPDATE users SET role = 'admin' WHERE email = ?`).run(demo.email.toLowerCase());
        } catch { }
      }
    }
  }
}

/**
 * Verify session from Authorization header
 */
export function getSessionUser(token: string | undefined): any | null {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;

  const db = getDb();
  const session = db
    .prepare(
      `
    SELECT s.token, s.user_id, s.expires_at, u.profile_json, u.email, u.name, u.role, u.role_title, u.avatar
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `
    )
    .get(cleanToken) as any;

  if (!session) return null;

  try {
    const profile = JSON.parse(session.profile_json);
    profile.role = session.role || 'candidate';
    return profile;
  } catch {
    return null;
  }
}

/**
 * Express middleware to enforce authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in or register.' });
  }

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

/**
 * Express middleware to enforce Admin authorization (RBAC)
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : (req.query?.token as string);

  let user = req.user;
  if (!user && token) {
    user = getSessionUser(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }

  // If user is authenticated as an admin
  if (user && user.role === 'admin') {
    return next();
  }

  // If user is authenticated as a candidate without admin role
  if (user && user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
  }

  return res.status(401).json({ success: false, error: 'Authentication required. Please sign in with an administrator account.' });
}

/**
 * Express Auth Router
 */
import rateLimit from 'express-rate-limit';

export const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

export const authRouter = Router();

// Ensure tables exist on boot
initAuthTables();

// POST /api/auth/register
authRouter.post('/register', authActionLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, password, roleTitle } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRole = (roleTitle || 'Software Engineer').trim();

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const { hash, salt } = hashPassword(password);
    const profile = createDefaultProfile(userId, cleanName, cleanEmail, cleanRole);

    db.prepare(
      `
      INSERT INTO users (id, name, email, password_hash, salt, role_title, tier, avatar, profile_json, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, 'pro', ?, ?, datetime('now'), datetime('now'))
    `
    ).run(
      userId,
      cleanName,
      cleanEmail,
      hash,
      salt,
      cleanRole,
      profile.avatar,
      JSON.stringify(profile)
    );

    // Create session (7 days validity)
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    db.prepare(
      `
      INSERT INTO sessions (token, user_id, expires_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(token, userId, expiresAt, ip, userAgent);

    // Initialize candidate_profiles record for seamless resume and tailoring operations
    try {
      db.prepare(`
        INSERT OR IGNORE INTO candidate_profiles (id, profile_json, raw_text, target_role, created_at, updated_at)
        VALUES (?, ?, '', ?, datetime('now'), datetime('now'))
      `).run(userId, JSON.stringify(profile), cleanRole);
    } catch { }

    return res.status(201).json({
      success: true,
      token,
      user: profile,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', authActionLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT id, name, email, password_hash, salt, profile_json
      FROM users
      WHERE email = ?
    `
      )
      .get(cleanEmail) as any;

    if (!row) {
      return res
        .status(401)
        .json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const isValid = verifyPassword(password, row.password_hash, row.salt);
    if (!isValid) {
      return res
        .status(401)
        .json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    // Update last login and login count
    let profile = JSON.parse(row.profile_json);
    profile.lastLogin = new Date().toISOString();
    profile.security = {
      ...(profile.security || {}),
      loginCount: ((profile.security && profile.security.loginCount) || 0) + 1,
    };

    db.prepare(
      `
      UPDATE users
      SET last_login = datetime('now'), profile_json = ?
      WHERE id = ?
    `
    ).run(JSON.stringify(profile), row.id);

    // Issue new session token
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    db.prepare(
      `
      INSERT INTO sessions (token, user_id, expires_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(token, row.id, expiresAt, ip, userAgent);

    return res.json({
      success: true,
      token,
      user: profile,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication service encountered an error.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  return res.json({ success: true, user });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (token) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch { }
  }

  return res.json({ success: true });
});

// POST /api/auth/update-profile
authRouter.post('/update-profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    const updated = req.body || {};
    const effectiveRole = updated.roleTitle || updated.targetRole || currentUser.roleTitle || currentUser.targetRole || 'Software Engineer';
    const merged = {
      ...currentUser,
      ...updated,
      roleTitle: effectiveRole,
      targetRole: effectiveRole,
      preferences: {
        ...(currentUser.preferences || {}),
        ...(updated.preferences || {}),
      },
      automation: {
        ...(currentUser.automation || {}),
        ...(updated.automation || {}),
      },
      notifications: {
        ...(currentUser.notifications || {}),
        ...(updated.notifications || {}),
      },
      security: {
        ...(currentUser.security || {}),
        ...(updated.security || {}),
      },
    };

    const db = getDb();
    db.prepare(
      `
      UPDATE users
      SET name = ?, role_title = ?, profile_json = ?
      WHERE id = ?
    `
    ).run(merged.name, effectiveRole, JSON.stringify(merged), currentUser.id);

    // Synchronize to candidate_profiles table
    try {
      const existingCandidate = db.prepare('SELECT id FROM candidate_profiles WHERE id = ?').get(currentUser.id);
      if (existingCandidate) {
        db.prepare(`
          UPDATE candidate_profiles
          SET profile_json = ?, target_role = COALESCE(?, target_role), updated_at = datetime('now')
          WHERE id = ?
        `).run(JSON.stringify(merged), merged.roleTitle || null, currentUser.id);
      } else {
        db.prepare(`
          INSERT INTO candidate_profiles (id, profile_json, raw_text, target_role, created_at, updated_at)
          VALUES (?, ?, '', ?, datetime('now'), datetime('now'))
        `).run(currentUser.id, JSON.stringify(merged), merged.roleTitle || 'Software Engineer');
      }
    } catch { }

    return res.json({ success: true, user: merged });
  } catch (err: any) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/forgot-password (Generate reset token with enumeration protection)
authRouter.post('/forgot-password', authActionLimiter, (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(cleanEmail) as any;

    if (user) {
      const resetId = `rst_${crypto.randomBytes(8).toString('hex')}`;
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      db.prepare(`
        INSERT INTO password_resets (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(resetId, user.id, token, expiresAt);

      console.log(`[AUTH] Password reset requested for user ${user.id} (${cleanEmail}). Token: ${token}`);
    }

    // Always return uniform message to prevent user enumeration
    return res.json({
      success: true,
      message: 'If an account exists for this email address, password reset instructions have been sent.',
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password (Validate token and set new password)
authRouter.post('/reset-password', authActionLimiter, (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Password reset token is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const db = getDb();
    const record = db.prepare(`
      SELECT id, user_id, expires_at, used
      FROM password_resets
      WHERE token = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    `).get(token) as any;

    if (!record) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    }

    const { hash, salt } = hashPassword(newPassword);

    // Update password hash and salt
    db.prepare(`
      UPDATE users
      SET password_hash = ?, salt = ?
      WHERE id = ?
    `).run(hash, salt, record.user_id);

    // Mark token as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

    // Invalidate all active sessions for security (Session Revocation)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(record.user_id);

    return res.json({
      success: true,
      message: 'Password has been successfully updated. Please sign in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// GET /api/auth/google/config
authRouter.get('/google/config', (_req: Request, res: Response) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    enabled: true,
  });
});


// POST /api/auth/google (Google Login and Register)
authRouter.post('/google', authActionLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body || {};

    // Google ID Token credential is required from Google Identity Services
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Valid Google credential (ID token) is required.' });
    }

    // Verify cryptographic ID token directly with Google OAuth2 API
    let googleEmail = '';
    let googleName = '';
    let googleAvatar = '';
    let googleSub = '';

    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        return res.status(401).json({ error: 'Invalid or expired Google credential.' });
      }
      const verified = await verifyRes.json();
      if (!verified.email || !verified.email_verified) {
        return res.status(401).json({ error: 'Google account email must be verified.' });
      }

      // If GOOGLE_CLIENT_ID is configured, enforce audience match
      const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
      if (expectedClientId && verified.aud !== expectedClientId) {
        return res.status(401).json({ error: 'Google ID token audience mismatch.' });
      }

      googleEmail = verified.email;
      googleName = verified.name || verified.given_name || 'Google User';
      googleAvatar = verified.picture || '';
      googleSub = verified.sub || '';
    } catch (verifyErr) {
      console.error('Google token verification error:', verifyErr);
      return res.status(503).json({ error: 'Unable to reach Google verification service. Please try again.' });
    }

    if (!googleEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmail)) {
      return res.status(400).json({ error: 'Valid Google account email is required.' });
    }

    const cleanEmail = googleEmail.trim().toLowerCase();
    const cleanName = (googleName || cleanEmail.split('@')[0] || 'Google User').trim();
    const cleanAvatar =
      googleAvatar ||
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

    const db = getDb();
    const existing = db
      .prepare(
        `
      SELECT id, name, email, role_title, tier, avatar, profile_json
      FROM users
      WHERE email = ?
    `
      )
      .get(cleanEmail) as any;

    let userProfile: any;
    let isNewUser = false;
    let userId: string;

    if (existing) {
      // Existing user: log in with Google
      userProfile = JSON.parse(existing.profile_json);
      userProfile.lastLogin = new Date().toISOString();
      if (!userProfile.avatar && cleanAvatar) {
        userProfile.avatar = cleanAvatar;
      }
      userProfile.security = {
        ...(userProfile.security || {}),
        loginCount: ((userProfile.security && userProfile.security.loginCount) || 0) + 1,
        googleLinked: true,
      };

      db.prepare(
        `
        UPDATE users
        SET last_login = datetime('now'), avatar = ?, profile_json = ?
        WHERE id = ?
      `
      ).run(userProfile.avatar, JSON.stringify(userProfile), existing.id);

      userId = existing.id;
    } else {
      // New user: register account with Google identity
      isNewUser = true;
      userId = `usr_google_${crypto.randomBytes(8).toString('hex')}`;
      const { hash, salt } = hashPassword(
        `oauth:google:${googleSub || crypto.randomBytes(16).toString('hex')}`
      );
      userProfile = createDefaultProfile(
        userId,
        cleanName,
        cleanEmail,
        'Software Engineer',
        cleanAvatar
      );
      userProfile.security = {
        ...(userProfile.security || {}),
        googleLinked: true,
      };

      db.prepare(
        `
        INSERT INTO users (id, name, email, password_hash, salt, role_title, tier, avatar, profile_json, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, 'pro', ?, ?, datetime('now'), datetime('now'))
      `
      ).run(
        userId,
        cleanName,
        cleanEmail,
        hash,
        salt,
        'Software Engineer',
        cleanAvatar,
        JSON.stringify(userProfile)
      );
    }

    // Issue cryptographic session token
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    db.prepare(
      `
      INSERT INTO sessions (token, user_id, expires_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(token, userId, expiresAt, ip, userAgent);

    return res.json({
      success: true,
      token,
      user: userProfile,
      isNewUser,
      provider: 'google',
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return res
      .status(500)
      .json({ error: 'Google authentication encountered an error. Please try again.' });
  }
});
