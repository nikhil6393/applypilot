/**
 * LinkedIn Playwright Session Manager
 * Real LinkedIn login using credentials from .env
 * LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set
 *
 * WARNING: Use a dedicated/burner LinkedIn account for automation.
 * Heavy automation can trigger LinkedIn's anti-bot measures.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../../data/linkedin-session.json');
const SCREENSHOT_DIR = path.join(__dirname, '../../data/screenshots');

// Ensure directories exist
fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export interface LinkedInSessionProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  headline: string;
  location: string;
  picture?: string;
  profileUrl: string;
  skills: string[];
  graduationBatch?: string;
  connectedAt: string;
  isSimulated: false;
}

interface StoredSession {
  cookies: any[];
  profile: LinkedInSessionProfile;
  savedAt: string;
}

let _browser: any = null;
let _context: any = null;
let _cachedProfile: LinkedInSessionProfile | null = null;

async function getBrowser(): Promise<any> {
  if (_browser) {
    try {
      // Check if still alive
      const p = await _browser.newPage();
      await p.close();
      return _browser;
    } catch {
      _browser = null;
    }
  }
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--window-size=1366,768',
    ],
  });
  return _browser;
}

async function getOrCreateContext(cookies?: any[]): Promise<any> {
  if (_context) {
    try {
      await _context.pages();
      return _context;
    } catch {
      _context = null;
    }
  }
  const browser = await getBrowser();
  _context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
  });

  // Inject anti-detection scripts
  await _context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin' }] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  if (cookies && cookies.length > 0) {
    await _context.addCookies(cookies);
  }

  return _context;
}

function loadStoredSession(): StoredSession | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const session: StoredSession = JSON.parse(raw);
    // Session valid for 12 hours
    const age = Date.now() - new Date(session.savedAt).getTime();
    if (age > 12 * 60 * 60 * 1000) {
      fs.unlinkSync(SESSION_FILE);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(cookies: any[], profile: LinkedInSessionProfile): void {
  const session: StoredSession = {
    cookies,
    profile,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

export async function isLoggedIn(): Promise<boolean> {
  if (_cachedProfile) return true;
  const stored = loadStoredSession();
  if (stored) {
    _cachedProfile = stored.profile;
    return true;
  }
  return false;
}

export async function getProfile(): Promise<LinkedInSessionProfile | null> {
  if (_cachedProfile) return _cachedProfile;
  const stored = loadStoredSession();
  if (stored) {
    _cachedProfile = stored.profile;
    return stored.profile;
  }
  return null;
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{
  success: boolean;
  profile?: LinkedInSessionProfile;
  error?: string;
}> {
  try {
    const context = await getOrCreateContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Go to LinkedIn login page
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    // Fill credentials (handle standard, obfuscated, and dynamic LinkedIn login pages)
    const emailLocator = page
      .locator(
        'input[type="email"]:visible, input[name="session_key"]:visible, #username:visible, #session_key:visible, input[autocomplete="username"]:visible'
      )
      .first();
    await emailLocator.waitFor({ state: 'visible', timeout: 10000 });
    await emailLocator.fill(email);

    const passLocator = page
      .locator(
        'input[type="password"]:visible, input[name="session_password"]:visible, #password:visible, #session_password:visible, input[autocomplete="current-password"]:visible'
      )
      .first();
    await passLocator.waitFor({ state: 'visible', timeout: 10000 });
    await passLocator.fill(password);

    // Click sign in button
    const submitBtn = page
      .locator(
        'button:visible:has-text("Sign in"), button:visible:has-text("Sign In"), button[type="submit"]:visible, [type="submit"]:visible, button[aria-label="Sign in"]:visible'
      )
      .first();
    await submitBtn.click();

    // Wait for navigation - either home feed, security challenge, or login error
    const navResult = await Promise.race([
      page.waitForURL('**/feed/**', { timeout: 30000 }).then(() => 'feed'),
      page.waitForURL('**/checkpoint/**', { timeout: 30000 }).then(() => 'checkpoint'),
      page.waitForURL('**/login-challenge**', { timeout: 30000 }).then(() => 'checkpoint'),
      page.waitForURL('**/login-submit**', { timeout: 30000 }).then(() => 'wrong_creds'),
      page
        .waitForURL(
          (url: URL) =>
            url.href.includes('login.live.com') || url.href.includes('microsoftonline.com'),
          { timeout: 30000 }
        )
        .then(() => 'wrong_creds'),
      page
        .waitForSelector(
          '.error-for-username, .error-for-password, [id*="error"], div[role="alert"], .alert',
          { timeout: 30000 }
        )
        .then(() => 'wrong_creds'),
    ]).catch(() => 'timeout');

    if (navResult !== 'feed') {
      const errPath = path.join(SCREENSHOT_DIR, `login_error_${Date.now()}.png`);
      await page.screenshot({ path: errPath });
      console.warn(
        `[linkedin-session] Login failed with state: ${navResult}. Screenshot saved to ${errPath}`
      );
    }

    if (navResult === 'checkpoint') {
      await page.close();
      return {
        success: false,
        error:
          'LinkedIn requires a security verification. Please log in manually once and try again.',
      };
    }

    if (navResult === 'wrong_creds') {
      await page.close();
      return {
        success: false,
        error: 'Invalid LinkedIn email or password. Please check and try again.',
      };
    }

    if (navResult === 'timeout') {
      await page.close();
      return { success: false, error: 'LinkedIn login timed out. Please try again.' };
    }

    // Successfully logged in - extract profile
    const profile = await scrapeLinkedInProfile(page);

    // Save session cookies
    const cookies = await context.cookies('https://www.linkedin.com');
    saveSession(cookies, profile);
    _cachedProfile = profile;

    await page.close();
    return { success: true, profile };
  } catch (err: any) {
    try {
      const context = await getOrCreateContext();
      const pages = context.pages();
      if (pages.length > 0) {
        const errPath = path.join(SCREENSHOT_DIR, `login_catch_error_${Date.now()}.png`);
        await pages[0].screenshot({ path: errPath });
        console.warn(`[linkedin-session] Exception caught. Screenshot saved to ${errPath}`);
      }
    } catch {}
    return { success: false, error: err.message || 'Login failed' };
  }
}

async function scrapeLinkedInProfile(page: any): Promise<LinkedInSessionProfile> {
  try {
    // Navigate to profile
    await page.goto('https://www.linkedin.com/in/me/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for profile content
    await page
      .waitForSelector('[class*="profile-info"], [class*="pv-top-card"], .artdeco-card', {
        timeout: 10000,
      })
      .catch(() => {});

    const profileData = await page.evaluate(() => {
      const getName = () => {
        const el = document.querySelector(
          'h1[class*="text-heading"], [class*="pv-top-card"] h1, [class*="profile-info"] h1'
        );
        return el?.textContent?.trim() || '';
      };
      const getHeadline = () => {
        const el = document.querySelector(
          '[class*="text-body-medium"][class*="break-words"], [class*="pv-top-card"] [class*="text-body-medium"]'
        );
        return el?.textContent?.trim() || '';
      };
      const getLocation = () => {
        const el = document.querySelector(
          '[class*="text-body-small"][class*="inline"][class*="t-black"], [class*="pv-top-card"] [class*="pb2"]'
        );
        return el?.textContent?.trim() || '';
      };
      const getPicture = () => {
        const img = document.querySelector(
          '[class*="pv-top-card"] img[class*="profile-photo"], .profile-photo-edit img'
        );
        return (img as HTMLImageElement)?.src || '';
      };
      const getProfileUrl = () =>
        window.location.href.replace('/overlay/contact-info/', '').replace('?miniProfileUrn=', '');

      // Get skills from skills section
      const skillEls = document.querySelectorAll(
        '[class*="pv-skill-category-entity"] [class*="pv-skill-category-entity__name"], [class*="skill-item"] span[aria-hidden]'
      );
      const skills = Array.from(skillEls)
        .map((el) => el.textContent?.trim())
        .filter(Boolean) as string[];

      return {
        name: getName(),
        headline: getHeadline(),
        location: getLocation(),
        picture: getPicture(),
        profileUrl: getProfileUrl(),
        skills: skills.slice(0, 15),
      };
    });

    // Get email from settings page if needed
    let email = process.env.LINKEDIN_EMAIL || '';

    // Get profile URL properly
    const currentUrl = page.url();
    const profileUrl = currentUrl.includes('/in/')
      ? currentUrl.split('?')[0]
      : 'https://www.linkedin.com/in/me/';

    return {
      id: `li_real_${Date.now()}`,
      name: profileData.name || email.split('@')[0] || 'LinkedIn User',
      email,
      headline: profileData.headline || 'Software Engineering Professional',
      location: profileData.location || 'India',
      picture: profileData.picture || undefined,
      profileUrl: profileUrl,
      skills:
        profileData.skills.length > 0
          ? profileData.skills
          : ['Software Engineering', 'Python', 'JavaScript', 'TypeScript', 'React'],
      graduationBatch: '2024-2028',
      connectedAt: new Date().toISOString(),
      isSimulated: false,
    };
  } catch (err: any) {
    console.warn('[linkedin-session] Profile scrape failed:', err.message);
    return {
      id: `li_real_${Date.now()}`,
      name: (process.env.LINKEDIN_EMAIL || 'user').split('@')[0],
      email: process.env.LINKEDIN_EMAIL || '',
      headline: 'Software Engineering Professional',
      location: 'India',
      profileUrl: 'https://www.linkedin.com/in/me/',
      skills: ['Software Engineering', 'Python', 'JavaScript'],
      graduationBatch: '2024-2028',
      connectedAt: new Date().toISOString(),
      isSimulated: false,
    };
  }
}

export async function logoutLinkedIn(): Promise<void> {
  _cachedProfile = null;
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch {}
  if (_context) {
    try {
      await _context.clearCookies();
      await _context.close();
    } catch {}
    _context = null;
  }
}

export async function getSessionCookies(): Promise<any[]> {
  const stored = loadStoredSession();
  return stored?.cookies || [];
}
