import * as cheerio from 'cheerio';

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

export function getRandomUserAgent() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

export function getCrawleeProxyConfig() {
  return undefined;
}

/**
 * Execute a high-performance, lightweight crawl using native fetch and Cheerio.
 * Zero heavy worker pools or persistent storage leaks.
 */
export async function runCheerioCrawl({
  urls,
  requestHandler,
  failedRequestHandler,
  maxConcurrency = 4,
  maxRequestsPerCrawl = 30,
  requestTimeoutSecs = 12,
}) {
  const targetList = (Array.isArray(urls) ? urls : [urls]).slice(0, maxRequestsPerCrawl);

  const fetchOne = async (rawUrl) => {
    const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl?.url || '');
    if (!url) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutSecs * 1000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      const $ = cheerio.load(html);
      await requestHandler({ $, request: { url } });
    } catch (err) {
      if (failedRequestHandler) {
        failedRequestHandler({ request: { url }, error: err });
      } else {
        console.warn(`[scrape-crawl] Request ${url} failed:`, err.message);
      }
    }
  };

  // Run with concurrency limit
  const queue = [...targetList];
  const workers = [];
  const workerCount = Math.min(maxConcurrency, targetList.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const nextUrl = queue.shift();
        if (nextUrl) await fetchOne(nextUrl);
      }
    })());
  }
  await Promise.all(workers);
}

/**
 * High-speed HTTP JSON / API crawler for structured endpoints
 */
export async function runHttpCrawl({
  urls,
  requestHandler,
  failedRequestHandler,
  maxConcurrency = 6,
  requestTimeoutSecs = 10,
}) {
  const targetList = Array.isArray(urls) ? urls : [urls];
  const fetchOne = async (rawUrl) => {
    const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl?.url || '');
    if (!url) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutSecs * 1000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json().catch(() => res.text());
      await requestHandler({ body, json: body, request: { url } });
    } catch (err) {
      if (failedRequestHandler) {
        failedRequestHandler({ request: { url }, error: err });
      } else {
        console.warn(`[http-crawl] Request ${url} failed:`, err.message);
      }
    }
  };

  const queue = [...targetList];
  const workers = [];
  const workerCount = Math.min(maxConcurrency, targetList.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const nextUrl = queue.shift();
        if (nextUrl) await fetchOne(nextUrl);
      }
    })());
  }
  await Promise.all(workers);
}

