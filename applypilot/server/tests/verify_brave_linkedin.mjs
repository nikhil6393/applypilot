import { chromium } from 'playwright';

async function verifyInBrave() {
  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  console.log('Launching Brave Browser at:', bravePath);

  const browser = await chromium.launch({
    executablePath: bravePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  // If Auth modal is open or triggers, sign in with demo SWE profile
  const demoSweBtn = page.locator('#demo-login-swe-btn');
  if (await demoSweBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Signing in with demo SWE account...');
    await demoSweBtn.click();
    await page.waitForTimeout(1500);
  } else {
    // If on landing page, click Launch Dashboard
    const launchBtn = page.locator('button:has-text("Launch Dashboard Free")').first();
    if (await launchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking "Launch Dashboard Free"...');
      await launchBtn.click();
      await page.waitForTimeout(1000);
      if (await demoSweBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Signing in with demo SWE account from modal...');
        await demoSweBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  }

  // Navigate to Live Jobs
  console.log('Switching to "Live Jobs" step...');
  const discoveryTab = page.locator('#nav-step-discovery');
  if (await discoveryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await discoveryTab.click();
    await page.waitForTimeout(1000);
  }

  // Trigger Real-Time LinkedIn Scraper
  const linkedinBtn = page.locator('#scrape-realtime-linkedin-btn');
  console.log('Triggering #scrape-realtime-linkedin-btn...');
  await linkedinBtn.click();

  // Wait for LinkedIn scraper to complete hydration and render cards
  console.log('Waiting for LinkedIn jobs to be scraped and rendered...');
  await page.waitForTimeout(10000);

  // Check matching cards count
  const cards = page.locator('div:has-text("Crossing Infotech"), div:has-text("Hewlett Packard"), div:has-text("Intern")');
  const count = await cards.count();
  console.log(`Rendered matching job cards count: ${count}`);

  // Click on a job card to open the Job Details Drawer
  const targetCard = page.locator('div:has-text("Crossing Infotech")').first();
  if (await targetCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Opening drawer for Crossing Infotech job card...');
    await targetCard.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('Clicking first available job card...');
    const anyCard = page.locator('.group.relative.rounded-2xl, div[class*="rounded-2xl border"]').first();
    if (await anyCard.isVisible()) {
      await anyCard.click();
      await page.waitForTimeout(3000);
    }
  }

  const screenshotPath =
    'C:\\Users\\Nikhil Singh\\.gemini\\antigravity-ide\\brain\\559dcc7d-021b-4385-8727-6464e7fa6f15\\brave_linkedin_jd_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Brave Browser screenshot successfully saved to:', screenshotPath);

  await browser.close();
}

verifyInBrave().catch((err) => {
  console.error('Error during Brave verification:', err);
  process.exit(1);
});
