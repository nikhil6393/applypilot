#!/usr/bin/env -S node --import tsx
import { bootstrap, shutdown } from '../server/app.js';
import { scrapeOrchestrator } from '../server/scrape/orchestrator.js';
import type { ScrapeRequest } from '../shared/types.ts';

const req: ScrapeRequest = {
  sources: (process.env.SOURCES?.split(',') as any) || undefined,
  query: process.env.QUERY || 'software engineer',
  location: process.env.LOCATION || '',
  remoteOnly: process.env.REMOTE_ONLY === '1',
  postedWithinHours: process.env.POSTED_WITHIN_HOURS ? Number(process.env.POSTED_WITHIN_HOURS) : 24,
  maxPerSource: process.env.MAX_PER_SOURCE ? Number(process.env.MAX_PER_SOURCE) : 30,
};

const once = process.argv.includes('--once');

await bootstrap();

async function run() {
  try {
    const summary = await scrapeOrchestrator.scrapeOnce(req);
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error('[scraper] failed:', err);
    process.exitCode = 1;
  }
}

if (once) {
  await run();
  await shutdown();
  process.exit(process.exitCode ?? 0);
} else {
  await run();
  setInterval(() => run().catch(() => {}), 5 * 60 * 1000);
}
