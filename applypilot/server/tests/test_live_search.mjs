import * as cheerio from 'cheerio';

async function testSearch() {
  const url = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Software%20Engineer%20Intern&location=India&sortBy=DD&start=0';
  console.log('Fetching search:', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  console.log('Search HTTP Status:', res.status);
  const text = await res.text();
  console.log('Search text length:', text.length);
  const $ = cheerio.load(text);
  const cards = $('.base-card, .job-search-card, li').toArray();
  console.log('Found cards:', cards.length);
  for (let i = 0; i < Math.min(6, cards.length); i++) {
    const card = cards[i];
    const title = $(card).find('.base-search-card__title, h3').first().text().trim();
    const comp = $(card).find('.base-search-card__subtitle, h4').first().text().trim();
    const loc = $(card).find('.job-search-card__location').first().text().trim();
    const time = $(card).find('time, .job-search-card__listdate').first().text().trim();
    const link = $(card).find('a.base-card__full-link, a[href*="/jobs/view/"]').attr('href');
    if (title) console.log({ title, comp, loc, time, link: link?.slice(0, 80) });
  }
}
testSearch().catch(console.error);
