import * as cheerio from 'cheerio';

async function testDetail() {
  const url = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4468450392';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  console.log('HTTP Status:', res.status);
  const html = await res.text();
  console.log('HTML Length:', html.length);

  const $ = cheerio.load(html);
  const title = $('.top-card-layout__title, h1.topcard__title').first().text().trim();
  const company = $('.topcard__org-name-link, .topcard__flavor--black-link').first().text().trim();
  const location = $('.topcard__flavor--bullet, .topcard__flavor').last().text().trim();
  const desc = $('.show-more-less-html__markup, .description__text').text().trim();
  
  const criteria = [];
  $('.description__job-criteria-item').each((_, el) => {
    const header = $(el).find('h3').text().trim();
    const val = $(el).find('span').text().trim();
    if (header || val) criteria.push(`${header}: ${val}`);
  });

  console.log('\n--- EXTRACTED DATA ---');
  console.log('Title:', title);
  console.log('Company:', company);
  console.log('Location:', location);
  console.log('Criteria:', criteria);
  console.log('Description Length:', desc.length);
  console.log('Description Snippet:\n', desc.slice(0, 400));
}

testDetail().catch(console.error);
