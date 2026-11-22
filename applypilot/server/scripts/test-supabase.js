import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSupabase() {
  console.log(`[Supabase Check] Connecting to ${SUPABASE_URL}...`);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Supabase connected successfully! Tables are ready. Data sample:', data);
    } else {
      const err = await res.json();
      console.log(`⚠️ Supabase returned status ${res.status}:`, err.message || err);
      if (err.message && err.message.includes('Could not find the table')) {
        console.log('👉 ACTION NEEDED: Please run the SQL migration query in your Supabase SQL Editor.');
      }
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkSupabase();
