import { load } from 'cheerio';

const url = 'https://internshala.com/internships/keywords-software/';
console.log('Fetching', url);
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});
console.log('Status:', res.status, 'url:', res.url);
const html = await res.text();
const $ = load(html);
const list = [];
$('.individual_internship').each((_, el) => {
  const title = $(el).find('.job-internship-name').first().text().trim();
  const comp = $(el).find('.company-name').first().text().trim();
  const loc = $(el).find('.locations').first().text().trim();
  if (title) list.push({ title, comp, loc });
});
console.log('Total parsed jobs:', list.length);
console.log('Sample jobs:', list.slice(0, 5));
