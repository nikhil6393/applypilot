import { test, expect } from '@playwright/test';

test.describe('Live Jobs Filter Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard or discovery page where Live Jobs resides
    // Mock the backend API response to provide deterministic data
    await page.route('**/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 2,
          items: [
            {
              id: 'job-1',
              title: 'Software Engineer Intern',
              company: 'Tech Corp',
              location: 'Bangalore, India',
              roleType: 'Internship',
              workplace: 'Remote',
              matchScore: 95,
              postedAgo: '10m ago',
              postedAt: new Date(Date.now() - 10 * 60000).toISOString(),
            },
            {
              id: 'job-2',
              title: 'Backend Developer',
              company: 'Startup Inc',
              location: 'San Francisco, CA',
              roleType: 'Full Time',
              workplace: 'Onsite',
              matchScore: 90,
              postedAgo: '2d ago',
              postedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('http://localhost:3000/');
    const openBtn = page.getByRole('button', { name: /Launch Free Workspace|Open Workspace|Sign in/i }).first();
    await openBtn.waitFor({ state: 'visible', timeout: 5000 });
    await openBtn.click();

    const demoBtn = page.locator('#demo-login-swe-btn');
    await demoBtn.waitFor({ state: 'visible', timeout: 5000 });
    await demoBtn.click();

    // Navigate to Job Feed in workspace
    const jobFeedBtn = page.getByRole('button', { name: /Job Feed/i }).first();
    await jobFeedBtn.waitFor({ state: 'visible', timeout: 10000 });
    await jobFeedBtn.click();
    await page.waitForTimeout(500);
  });

  test('Location filter successfully hides non-matching jobs client-side', async ({ page }) => {
    const locationInput = page.getByPlaceholder(/Enter location/i);
    await locationInput.fill('San Francisco');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Assert that 'Tech Corp' (Bangalore) is hidden and 'Startup Inc' (SF) is visible
    await expect(page.getByText('Tech Corp')).not.toBeVisible();
    await expect(page.getByText('Startup Inc')).toBeVisible();
  });

  test('Internships Only filter toggle', async ({ page }) => {
    // Select Internship from Job Type dropdown
    const jobTypeSelect = page.locator('.fdrop select').first();
    await jobTypeSelect.selectOption('Internship');

    await page.waitForTimeout(500);

    // Job 1 is internship, Job 2 is full-time
    await expect(page.getByText('Tech Corp')).toBeVisible();
    await expect(page.getByText('Startup Inc')).not.toBeVisible();
  });

  test('Empty state triggers when no jobs match search criteria', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search job title, company/i);
    await searchInput.fill('NonExistentRole999');

    await page.waitForTimeout(500);

    // Assert empty state is shown
    await expect(page.getByText('No jobs found matching active criteria')).toBeVisible();
  });
});
