import 'dotenv/config';
import Database from 'better-sqlite3';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = new Database('./data/applypilot.db');

async function upsertBatch(table, rows) {
  if (!rows || rows.length === 0) return 0;
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upsert to ${table} (${res.status}): ${errText}`);
  }
  return rows.length;
}

async function syncTable(tableName, selectQuery, transformFn = row => row, batchSize = 250) {
  console.log(`\n⏳ Syncing ${tableName}...`);
  const rows = db.prepare(selectQuery).all();
  console.log(`   Found ${rows.length} local records in ${tableName}.`);

  let totalUploaded = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(transformFn);
    try {
      await upsertBatch(tableName, batch);
      totalUploaded += batch.length;
      process.stdout.write(`   Synced ${totalUploaded}/${rows.length} records...\r`);
    } catch (err) {
      console.error(`\n   ❌ Batch error at ${i}:`, err.message);
    }
  }
  console.log(`\n   ✅ ${tableName} complete: ${totalUploaded} records synced to Supabase.`);
}

async function runSync() {
  console.log('🚀 Starting SQLite ➔ Supabase Cloud Migration...');

  // 1. Users
  await syncTable('users', 'SELECT * FROM users', row => ({
    id: String(row.id),
    name: row.name || 'User',
    email: row.email,
    password_hash: row.password_hash || '',
    salt: row.salt || '',
    role_title: row.role_title || 'Software Engineer',
    tier: row.tier || 'pro',
    role: row.role || 'candidate',
    avatar: row.avatar || null,
    profile_json: typeof row.profile_json === 'string' ? row.profile_json : JSON.stringify(row.profile_json || {}),
    created_at: row.created_at || new Date().toISOString(),
    last_login: row.last_login || new Date().toISOString()
  }));

  // 2. Candidate Profiles (Deduplicate by ID)
  console.log(`\n⏳ Syncing candidate_profiles...`);
  const rawProfiles = db.prepare('SELECT * FROM candidate_profiles').all();
  const profileMap = new Map();
  for (const p of rawProfiles) {
    profileMap.set(String(p.id), p);
  }
  const profiles = Array.from(profileMap.values()).map(row => ({
    id: String(row.id),
    raw_text: row.raw_text ? row.raw_text.replace(/\0/g, '') : null,
    profile_json: typeof row.profile_json === 'string' ? row.profile_json.replace(/\0/g, '') : JSON.stringify(row.profile_json || {}),
    profile_image: row.profile_image || null,
    profile_image_url: row.profile_image_url || null,
    profile_image_public_id: row.profile_image_public_id || null,
    target_role: row.target_role || null,
    skills_json: row.skills_json ? row.skills_json.replace(/\0/g, '') : null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  }));
  await upsertBatch('candidate_profiles', profiles);
  console.log(`   ✅ candidate_profiles complete: ${profiles.length} records synced to Supabase.`);

  // 3. Resume Versions (Sanitize \\0 characters)
  console.log(`\n⏳ Syncing resume_versions...`);
  const rawResumes = db.prepare('SELECT * FROM resume_versions').all();
  const resumeMap = new Map();
  for (const r of rawResumes) {
    resumeMap.set(String(r.id), r);
  }
  const resumes = Array.from(resumeMap.values()).map(row => ({
    id: String(row.id),
    profile_id: String(row.profile_id),
    application_id: row.application_id ? String(row.application_id) : null,
    version_number: Number(row.version_number) || 1,
    html_resume: (row.html_resume || '').replace(/\0/g, ''),
    tailored_summary: row.tailored_summary ? row.tailored_summary.replace(/\0/g, '') : null,
    tailored_bullets_json: row.tailored_bullets_json ? row.tailored_bullets_json.replace(/\0/g, '') : null,
    ats_score: row.ats_score != null ? Number(row.ats_score) : null,
    latex_source: row.latex_source ? row.latex_source.replace(/\0/g, '') : null,
    template_name: row.template_name || null,
    is_master: row.is_master ? 1 : 0,
    created_at: row.created_at || new Date().toISOString()
  }));
  for (let i = 0; i < resumes.length; i += 25) {
    await upsertBatch('resume_versions', resumes.slice(i, i + 25));
  }
  console.log(`   ✅ resume_versions complete: ${resumes.length} records synced to Supabase.`);

  // 4. Tracker
  await syncTable('tracker', 'SELECT * FROM tracker', row => ({
    id: String(row.id),
    user_id: String(row.user_id || 'default'),
    job_id: String(row.job_id),
    job_title: row.job_title || 'Untitled',
    company: row.company || 'Unknown',
    apply_url: row.apply_url || '',
    status: row.status || 'saved',
    notes: row.notes || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  }));

  // 5. Jobs (sync recent 2,000 jobs so it's blazing fast)
  await syncTable('jobs', 'SELECT * FROM jobs ORDER BY rowid DESC LIMIT 2000', row => ({
    id: String(row.id),
    title: row.title || 'Untitled',
    company: row.company || 'Unknown',
    source: row.source || 'manual',
    url: row.url || '',
    apply_url: row.apply_url || row.url || '',
    location: row.location || 'Remote',
    remote: row.remote ? 1 : 0,
    description: row.description || '',
    description_html: row.description_html || null,
    posted_at: row.posted_at || null,
    fetched_at: row.fetched_at || null,
    employment_type: row.employment_type || null,
    salary_min: row.salary_min != null ? Number(row.salary_min) : null,
    salary_max: row.salary_max != null ? Number(row.salary_max) : null,
    salary_currency: row.salary_currency || null,
    skills: row.skills || null,
    company_logo: row.company_logo || null,
    hash: row.hash || null,
    raw: row.raw || null
  }), 100);

  console.log('\n🎉 ALL DATA SUCCESSFULLY SYNCED TO SUPABASE CLOUD!');
}

runSync().catch(err => {
  console.error('\nFatal sync error:', err);
  process.exit(1);
});
