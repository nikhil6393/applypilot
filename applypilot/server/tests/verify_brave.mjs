import { chromium } from 'playwright';

async function run() {
  console.log('Launching Brave Browser at C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe ...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Page Title:', await page.title());
  await page.waitForTimeout(1000);

  // If on landing page, click "Launch Dashboard Free"
  const launchBtn = page.locator('button:has-text("Launch Dashboard Free")');
  if (await launchBtn.count() > 0) {
    console.log('Clicking "Launch Dashboard Free"...');
    await launchBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Click instant demo login button #demo-login-swe-btn
  const demoBtn = page.locator('#demo-login-swe-btn');
  if (await demoBtn.count() > 0) {
    console.log('Clicking instant Demo Login (SWE)...');
    await demoBtn.first().click();
    console.log('Waiting 2.5s for smooth dashboard transition...');
    await page.waitForTimeout(2500);
  }

  // Click "Live Jobs" in Navbar
  const liveJobsNav = page.locator('nav button:has-text("Live Jobs"), button:has-text("Live Jobs")');
  if (await liveJobsNav.count() > 0) {
    console.log('Navigating to Live Jobs discovery tab...');
    await liveJobsNav.first().click();
    await page.waitForTimeout(1500);
  }

  // Verify Hot Hubs chips
  const indiaChip = page.locator('button:has-text("🇮🇳 India (All)")');
  const bangaloreChip = page.locator('button:has-text("📍 Bangalore")');
  console.log('Hot Hubs India Chip visible:', (await indiaChip.count()) > 0);
  console.log('Hot Hubs Bangalore Chip visible:', (await bangaloreChip.count()) > 0);

  // Click on "🇮🇳 India (All)" Hot Hub chip
  if (await indiaChip.count() > 0) {
    console.log('Clicking 🇮🇳 India (All) Hot Hub chip...');
    await indiaChip.first().click();
    await page.waitForTimeout(1000);
  }

  // Ensure target role is "Software Engineer Intern"
  const roleInput = page.locator('input[placeholder*="Software Engineer"]');
  if (await roleInput.count() > 0) {
    const currentVal = await roleInput.first().inputValue();
    if (!currentVal) {
      console.log('Setting target role to "Software Engineer Intern"...');
      await roleInput.first().fill('Software Engineer Intern');
    }
  }

  // Trigger search
  const searchBtn = page.locator('#search-live-jobs-submit-btn');
  if (await searchBtn.count() > 0) {
    console.log('Triggering Search Jobs button...');
    await searchBtn.first().click();
  }

  // Wait for real-time SSE stream to receive postings
  console.log('Waiting 14s for live multi-platform scrapers (LinkedIn, Internshala, Unstop, Simplify, ATS)...');
  await page.waitForTimeout(14000);

  // Check job cards
  const jobCards = page.locator('.card-3d, article, [class*="JobCard"]');
  const cardCount = await jobCards.count();
  console.log(`Discovered ${cardCount} cards on the page.`);

  // Check toast notification text
  const toast = page.locator('text=Live stream complete');
  if (await toast.count() > 0) {
    console.log('Toast notification:', await toast.first().innerText());
  }

  const screenshotPath = 'C:\\Users\\Nikhil Singh\\.gemini\\antigravity-ide\\brain\\559dcc7d-021b-4385-8727-6464e7fa6f15\\brave_discovery_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('Verification in Brave completed successfully!');
}

run().catch((err) => {
  console.error('Error in Brave verification:', err);
  process.exit(1);
});
