import { chromium } from 'playwright';

async function verifyDrawerScroll() {
  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const browser = await chromium.launch({
    executablePath: bravePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Sign in with demo account if modal appears
  const nikhilBtn = page.locator('button:has-text("Nikhil Singh")').first();
  if (await nikhilBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nikhilBtn.click();
    await page.waitForTimeout(1000);
  }

  // Go to Live Jobs
  await page.locator('#nav-step-discovery, button:has-text("Live Jobs")').first().click();
  await page.waitForTimeout(1500);

  // Trigger LinkedIn scrape
  await page.locator('#scrape-realtime-linkedin-btn').click();
  console.log('Scraping LinkedIn live...');
  await page.waitForTimeout(8000);

  // Scroll down to the job cards section
  console.log('Scrolling to cards...');
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1000);

  // Click on the first card
  const card = page.locator('.group.relative.rounded-2xl, div[class*="rounded-2xl border"]').first();
  if (await card.isVisible()) {
    console.log('Clicking card to open full details drawer...');
    await card.click();
    await page.waitForTimeout(2500);
  }

  const screenshotPath =
    'C:\\Users\\Nikhil Singh\\.gemini\\antigravity-ide\\brain\\559dcc7d-021b-4385-8727-6464e7fa6f15\\brave_linkedin_drawer_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Drawer screenshot saved to:', screenshotPath);

  await browser.close();
}

verifyDrawerScroll().catch(console.error);
