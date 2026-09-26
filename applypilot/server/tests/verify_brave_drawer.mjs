import { chromium } from 'playwright';

async function verifyDrawerInBrave() {
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

  // Click on "Nikhil Singh" demo account card
  const nikhilBtn = page.locator('button:has-text("Nikhil Singh")').first();
  if (await nikhilBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Clicking "Nikhil Singh" demo login button...');
    await nikhilBtn.click();
    await page.waitForTimeout(1500);
  } else {
    const launchBtn = page.locator('button:has-text("Launch Dashboard Free")').first();
    if (await launchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await launchBtn.click();
      await page.waitForTimeout(1000);
      const nikhilBtnModal = page.locator('button:has-text("Nikhil Singh")').first();
      if (await nikhilBtnModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nikhilBtnModal.click();
        await page.waitForTimeout(1500);
      }
    }
  }

  // Navigate to Live Jobs
  console.log('Navigating to Live Jobs...');
  const discoveryTab = page.locator('#nav-step-discovery, button:has-text("Live Jobs")').first();
  await discoveryTab.click();
  await page.waitForTimeout(1500);

  // Click View Details & Fit on the first job card
  console.log('Clicking "View Details & Fit ->"...');
  const detailsBtn = page.locator('button:has-text("View Details & Fit"), span:has-text("View Details & Fit")').first();
  if (await detailsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailsBtn.click();
  } else {
    const firstCard = page.locator('.group.relative.rounded-2xl, div[class*="rounded-2xl border"]').first();
    await firstCard.click();
  }
  await page.waitForTimeout(2500);

  const screenshotPath =
    'C:\\Users\\Nikhil Singh\\.gemini\\antigravity-ide\\brain\\559dcc7d-021b-4385-8727-6464e7fa6f15\\brave_linkedin_drawer_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Full Job Details Drawer screenshot saved successfully to:', screenshotPath);

  await browser.close();
}

verifyDrawerInBrave().catch((err) => {
  console.error('Error during Brave drawer verification:', err);
  process.exit(1);
});
