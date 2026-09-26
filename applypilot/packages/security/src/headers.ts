import type { HelmetOptions } from 'helmet';

/**
 * Production-ready hardened Helmet options for ApplyPilot (§20).
 * Enforces clickjacking prevention, MIME type sniffing guard, referrer policy,
 * and HSTS while preserving local Vite and SPA client capabilities.
 */
export function getHardenedHelmetOptions(): HelmetOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    contentSecurityPolicy: false, // SPA bundled with Vite manages CSP / inline styles
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xFrameOptions: { action: 'deny' },
    xXssProtection: true,
    ...(isProd
      ? {
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
        }
      : { hsts: false }),
  };
}
