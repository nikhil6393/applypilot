async function testApi() {
  const res = await fetch('http://localhost:3000/api/jobs/scrape-linkedin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Full Stack Developer Intern',
      location: 'India',
      internshipsOnly: true,
      timeWindow: '7d',
      limit: 5,
    }),
  });
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Success:', data.success);
  console.log('Jobs returned:', data.jobs?.length);
  if (data.jobs && data.jobs.length > 0) {
    for (let i = 0; i < Math.min(3, data.jobs.length); i++) {
      const j = data.jobs[i];
      console.log(`\n=== Job ${i + 1} ===`);
      console.log('Title:', j.title);
      console.log('Company:', j.company);
      console.log('Location:', j.location);
      console.log('Description Length:', j.description?.length);
      console.log('Description Snippet:', j.description?.slice(0, 250) + '...');
      console.log('Skills:', j.skills);
      console.log('Tags:', j.tags);
      console.log('URL:', j.applyUrl);
    }
  }
}

testApi().catch(console.error);
