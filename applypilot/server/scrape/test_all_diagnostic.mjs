import { linkedinRealtime } from './linkedin-realtime.js';
import { naukriAdvanced } from './naukri-advanced.js';
import { internshala } from './internshala.js';
import { unstop } from './unstop.js';
import { simplifyJobs } from './simplify-jobs.js';
import { arbeitnow } from './arbeitnow.js';
import { remoteok } from './remoteok.js';
import { weworkremotely } from './weworkremotely.js';
import { yc } from './yc.js';
import { greenhouse } from './greenhouse.js';
import { lever } from './lever.js';
import { ashby } from './ashby.js';
import { himalayas } from './himalayas.js';
import { jobicy } from './jobicy.js';
import { remotive } from './remotive.js';
import { validateAndFilterJobs, filterJobsByCriteria } from './validator.js';

const scrapers = {
  arbeitnow,
  remoteok,
  weworkremotely,
  yc,
  internshala,
  unstop,
  simplifyJobs,
  himalayas,
  jobicy,
  remotive,
  greenhouse,
  lever,
  ashby,
  linkedin: linkedinRealtime,
  naukari: naukriAdvanced,
};

const req = {
  query: 'Software Engineer',
  location: 'Worldwide',
  jobType: 'any',
  timeWindow: '24h',
  remoteOnly: false,
  internshipsOnly: false,
  maxPerSource: 10,
};

const filterCriteria = {
  query: 'Software Engineer',
  location: 'Worldwide',
  jobType: 'any',
  remoteOnly: false,
  internshipsOnly: false,
};

console.log('Testing scrapers with:', req);

for (const [name, fn] of Object.entries(scrapers)) {
  const t0 = Date.now();
  try {
    const raw = await fn(req);
    const ms = Date.now() - t0;
    const validated = validateAndFilterJobs(raw);
    const filtered = filterJobsByCriteria(validated, filterCriteria);
    console.log(`[${name}] ${ms}ms: raw=${raw?.length || 0}, validated=${validated.length}, filtered=${filtered.length}`);
    if (raw?.length > 0 && filtered.length === 0) {
      console.log(`   Sample raw title: "${raw[0].title}", location: "${raw[0].location}", type: "${raw[0].type || raw[0].employmentType}"`);
    }
  } catch (err) {
    console.log(`[${name}] ${Date.now() - t0}ms: ERROR: ${err.message}`);
  }
}
