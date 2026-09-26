async function runAll() {
  const tests = [
    { query: 'software engineer', location: 'India', internshipsOnly: false, timeWindow: '24h' },
    { query: 'software engineer intern', location: 'Bangalore', internshipsOnly: true, timeWindow: '7d' },
    { query: 'frontend developer intern', location: 'Worldwide', internshipsOnly: true, timeWindow: 'all' },
    { query: 'python intern', location: 'India', internshipsOnly: true, timeWindow: '7d' },
  ];

  for (const t of tests) {
    try {
      const res = await fetch('http://localhost:3000/api/jobs/scrape-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      });
      const d = await res.json();
      console.log(`[${t.query} in ${t.location}] -> Count: ${d.jobs?.length}, Status: ${res.status}, Success: ${d.success}`);
      if (d.jobs && d.jobs.length > 0) {
        console.log(`   Top role: "${d.jobs[0].title}" at ${d.jobs[0].company} | Desc: ${d.jobs[0].description?.length} chars | Stipend: ${d.jobs[0].salary || 'N/A'}`);
      }
    } catch (err) {
      console.error(`Error testing ${t.query}:`, err.message);
    }
  }
}

runAll().catch(console.error);
