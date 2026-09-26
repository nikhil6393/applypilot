import dns from 'node:dns/promises';
import net from 'node:net';

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfSecurityError';
  }
}

/**
 * Checks if an IPv4 or IPv6 address belongs to private, loopback, or metadata ranges.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // Check IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Invalid format treated as unsafe
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private RFC 1918)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Carrier-grade NAT RFC 6598)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // Check IPv6
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Loopback ::1 or Unspecified ::
    if (normalized === '::1' || normalized === '::') return true;

    // IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (normalized.startsWith('::ffff:')) {
      const ipv4Part = normalized.substring(7);
      if (net.isIPv4(ipv4Part)) {
        return isPrivateOrReservedIp(ipv4Part);
      }
    }

    // Unique Local Addresses fc00::/7 (fc00:: to fdff::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-Local Addresses fe80::/10 (fe80:: to febf::)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    return false;
  }

  return true; // Non-IP string treated as unsafe when evaluating IP
}

export interface ValidateUrlOptions {
  allowLocal?: boolean;
  allowedProtocols?: string[];
}

/**
 * Validates a URL to prevent SSRF against private networks, cloud metadata, and arbitrary schemes.
 */
export async function validateSafeUrl(
  urlString: string,
  options: ValidateUrlOptions = {}
): Promise<{ safe: boolean; reason?: string; resolvedIp?: string }> {
  try {
    const parsed = new URL(urlString);
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
      return {
        safe: false,
        reason: `Unsupported protocol '${parsed.protocol}'. Allowed: ${allowedProtocols.join(', ')}`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block common internal/cloud metadata hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'metadata.goog' ||
      hostname === 'instance-data'
    ) {
      if (!options.allowLocal) {
        return { safe: false, reason: `Forbidden internal hostname '${hostname}'` };
      }
    }

    // If hostname is directly an IP literal
    if (net.isIP(hostname)) {
      if (!options.allowLocal && isPrivateOrReservedIp(hostname)) {
        return { safe: false, reason: `Private or reserved IP address '${hostname}' is prohibited` };
      }
      return { safe: true, resolvedIp: hostname };
    }

    // Resolve DNS lookup
    const lookupResult = await dns.lookup(hostname);
    const resolvedIp = lookupResult.address;

    if (!options.allowLocal && isPrivateOrReservedIp(resolvedIp)) {
      return {
        safe: false,
        reason: `Hostname '${hostname}' resolved to prohibited IP '${resolvedIp}'`,
        resolvedIp,
      };
    }

    return { safe: true, resolvedIp };
  } catch (err: any) {
    return { safe: false, reason: err.message || 'URL resolution failed' };
  }
}

/**
 * Asserts that a URL is safe from SSRF. Throws an SsrfSecurityError if unsafe.
 */
export async function assertSafeUrl(urlString: string, options?: ValidateUrlOptions): Promise<string> {
  const result = await validateSafeUrl(urlString, options);
  if (!result.safe) {
    throw new SsrfSecurityError(result.reason || 'URL violates SSRF security policy');
  }
  return result.resolvedIp || '';
}
