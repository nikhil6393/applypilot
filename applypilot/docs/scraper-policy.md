# ApplyPilot — Scraper & Extraction Policy

> **Specification Reference:** ApplyPilot Production Architecture & Build Plan v2.0 (§1, §3, §23, §33)  
> **Status:** ACTIVE GOVERNANCE CONTRACT

---

## 1. Ethical Standards & Legal Boundaries

ApplyPilot is designed to operate strictly as an honest, respectful, and transparent search aggregation engine. To protect both users and host services, the following rules are non-negotiable:

1. **No CAPTCHA Bypass:** The system shall never attempt to circumvent CAPTCHAs, Cloudflare Turnstile, or bot challenges. If a source presents a challenge, extraction fails explicitly with an audible warning.
2. **No Credential Harvesting:** ApplyPilot never stores, intercepts, or logs plain-text third-party account credentials.
3. **No Stealth Anti-Detection Kits:** We do not employ stealth evasion techniques designed solely to defeat access controls.
4. **Public & Official Interfaces First:** Wherever an official JSON API (e.g. Greenhouse, Lever, Ashby, Hacker News / YC) or public RSS feed (WeWorkRemotely) exists, it is strictly prioritized over HTML scraping.
5. **No Data Fabrication:** Under no circumstances may an adapter invent or synthesize applicant counts, posting dates, batch years, or job details. If a field is not provided by the upstream source, it must be set to `undefined` or `null`.

---

## 2. Rate Limiting, Backoff & Circuit Breakers

To prevent denial-of-service or undue load on upstream platforms:

1. **Per-Source Concurrency Caps:** Outbound requests to any single domain are capped (maximum 8–10 concurrent requests).
2. **In-Memory TTL Caching:** All search queries are hashed and cached for a minimum of 3 minutes (`server/scrape/cache.ts`). Repeat requests return from memory in under 15ms.
3. **Request Timeouts:** Outbound fetches are bound by strict 6-second to 15-second `AbortController` timeouts.
4. **Circuit Breaker Pattern:** If a source produces 5 consecutive network or parsing failures, the circuit breaker trips into `OPEN` state, serving cached or empty results while backing off for 15 minutes before attempting half-open recovery.
5. **Jitter & Backoff:** Scheduled background workers apply exponential backoff with randomized jitter to prevent thundering herd spikes.

---

## 3. SSRF Defense & URL Ingestion Guardrails

For arbitrary URL scraping (`POST /api/jobs/scrape-url`):

1. **Strict Scheme Enforcement:** Only `http:` and `https:` schemes are permitted.
2. **Private Network Blocklist:** Destination hostnames resolving to RFC 1918 private IP spaces (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), or link-local (`169.254.169.254` AWS/cloud metadata) are immediately rejected with `400 Bad Request`.
3. **Download Size Limiting:** Response bodies are capped at 5 MB to prevent memory exhaustion attacks.
4. **Content-Type Validation:** Only `text/html`, `application/json`, and `application/xml` MIME types are parsed.
