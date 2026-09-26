import { validateSafeUrl, assertSafeUrl, isPrivateOrReservedIp, SsrfSecurityError } from '@applypilot/security';

export { validateSafeUrl, assertSafeUrl, isPrivateOrReservedIp, SsrfSecurityError };

/**
 * URL validation helper to protect against Server-Side Request Forgery (SSRF).
 * Blocks requests to internal IP ranges, loopback addresses, cloud metadata (169.254.169.254),
 * and non-HTTP protocols.
 */
export async function validatePublicUrl(urlString: string): Promise<boolean> {
  const result = await validateSafeUrl(urlString);
  return result.safe;
}
