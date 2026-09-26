import { linkedinRealtime } from '../scrape/linkedin-realtime.js';

async function diagnose() {
  console.log('--- TEST 1: Default search (Software Engineer Intern, India) ---');
  const res1 = await linkedinRealtime({
    query: 'Software Engineer Intern',
    location: 'India',
    internshipsOnly: true,
    timeWindow: '24h',
    maxPerSource: 25,
  });
  console.log(`Test 1 count: ${res1.length}`);
  if (res1.length > 0) {
    console.log('Sample Job 0:');
    console.log('  Title:', res1[0].title);
    console.log('  Company:', res1[0].company);
    console.log('  Location:', res1[0].location);
    console.log('  PostedAt:', res1[0].postedAt, 'Relative:', res1[0].postedRelative);
    console.log('  Description snippet:', res1[0].description.slice(0, 150));
    console.log('  Skills:', res1[0].skills);
    console.log('  ApplyUrl:', res1[0].applyUrl);
  }

  console.log('\n--- TEST 2: Bangalore Location ---');
  const res2 = await linkedinRealtime({
    query: 'Software Engineer Intern',
    location: 'Bangalore',
    internshipsOnly: true,
    timeWindow: '24h',
    maxPerSource: 25,
  });
  console.log(`Test 2 count: ${res2.length}`);

  console.log('\n--- TEST 3: Frontend Developer ---');
  const res3 = await linkedinRealtime({
    query: 'Frontend Developer',
    location: 'India',
    internshipsOnly: false,
    timeWindow: 'all',
    maxPerSource: 25,
  });
  console.log(`Test 3 count: ${res3.length}`);
}

diagnose().catch(console.error);
