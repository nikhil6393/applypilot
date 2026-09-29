const url = 'http://127.0.0.1:3000/api/jobs/stream-search?roles=Software%20Engineer&location=Worldwide&timeWindow=24h&remoteOnly=false&jobType=any';
console.log('Fetching', url);
const start = Date.now();
try {
  const res = await fetch(url);
  console.log('Status:', res.status, res.headers.get('content-type'));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let count = 0;
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        console.log(`[${((Date.now() - start)/1000).toFixed(1)}s] Event: ${line.slice(7)}`);
      }
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.job) {
            count++;
            console.log(`[${((Date.now() - start)/1000).toFixed(1)}s] Job #${count}: "${parsed.job.title}" at "${parsed.job.company}" (${parsed.job.source})`);
          } else if (parsed.totalJobs !== undefined) {
            console.log(`[${((Date.now() - start)/1000).toFixed(1)}s] Complete:`, parsed);
          } else if (parsed.source && parsed.count !== undefined) {
            console.log(`[${((Date.now() - start)/1000).toFixed(1)}s] Source done: ${parsed.source} (${parsed.count} verified)`);
          } else if (parsed.source && parsed.error) {
            console.log(`[${((Date.now() - start)/1000).toFixed(1)}s] Source error: ${parsed.source}: ${parsed.error}`);
          }
        } catch (e) {
          // not json or keepalive
        }
      }
    }
  }
  console.log(`Finished in ${((Date.now() - start)/1000).toFixed(1)}s. Total jobs: ${count}`);
} catch (err) {
  console.error('Test error:', err);
}
