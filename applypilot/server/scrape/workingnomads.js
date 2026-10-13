import { createHash } from 'crypto';

export async function scrapeWorkingNomads(req) {
    const { query = '', maxPerSource = 50 } = req;
    const results = [];

    try {
        const response = await fetch('https://www.workingnomads.com/api/exposed_jobs/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch WorkingNomads API: ${response.status}`);
        }

        const data = await response.json();
        const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        for (const job of data) {
            if (query && !searchRegex.test(job.title) && !searchRegex.test(job.company_name) && !searchRegex.test(job.tags)) {
                continue;
            }

            results.push({
                id: `wn_${job.id || createHash('sha1').update(job.url || job.title).digest('hex').slice(0, 16)}`,
                title: job.title,
                company: job.company_name,
                location: job.location || 'Remote',
                url: job.url,
                applyUrl: job.url,
                tags: (job.tags || '').split(',').map(t => t.trim()).filter(Boolean),
                postedAt: job.pub_date ? new Date(job.pub_date).toISOString() : new Date().toISOString(),
                source: 'workingnomads',
                type: 'remote',
                logo: job.company_logo || null
            });

            if (results.length >= maxPerSource) {
                break;
            }
        }
        
        return results;
    } catch (err) {
        console.warn('[workingnomads] Scrape failed:', err.message);
        return [];
    }
}
