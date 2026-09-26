import { test, expect } from '@playwright/test';

test.describe('Live Jobs Filter Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard or discovery page where Live Jobs resides
    // Mock the backend API response to provide deterministic data
    await page.route('/api/jobs/scrape-all', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          jobs: [
            {
              id: 'job-1',
              title: 'Software Engineer Intern',
              company: 'Tech Corp',
              location: 'Bangalore, India',
              isInternship: true,
              applicantCount: 5, // Few applicants
              postedRelative: '10m ago',
              postedDate: new Date(Date.now() - 10 * 60000).toISOString(),
            },
            {
              id: 'job-2',
              title: 'Backend Developer',
              company: 'Startup Inc',
              location: 'San Francisco, CA',
              isInternship: false,
              applicantCount: 50, // High applicants
              postedRelative: '2d ago',
              postedDate: new Date(Date.now() - 48 * 3600000).toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('http://localhost:3000/'); // Replace with actual Discovery path if different
  });

  test('Location filter successfully hides non-matching jobs client-side', async ({ page }) => {
    // Assuming there's an input with placeholder "Location: India, Remote"
    const locationInput = page.getByPlaceholder(/Location: India, Remote/i);
    await locationInput.fill('San Francisco');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Assert that 'Tech Corp' (Bangalore) is hidden and 'Startup Inc' (SF) is visible
    await expect(page.getByText('Tech Corp')).not.toBeVisible();
    await expect(page.getByText('Startup Inc')).toBeVisible();
  });

  test('Internships Only filter toggle', async ({ page }) => {
    // Check the "Internships only" checkbox
    const internCheckbox = page.getByLabel(/Internships only/i);
    await internCheckbox.check();

    await page.waitForTimeout(500);

    // Job 1 is internship, Job 2 is not
    await expect(page.getByText('Tech Corp')).toBeVisible();
    await expect(page.getByText('Startup Inc')).not.toBeVisible();
  });

  test('Empty state triggers when no jobs match location', async ({ page }) => {
    const locationInput = page.getByPlaceholder(/Location: India, Remote/i);
    await locationInput.fill('Tokyo'); // No jobs match Tokyo

    await page.waitForTimeout(500);

    // Assert empty state is shown
    await expect(page.getByText(/No matching jobs yet/i)).toBeVisible();
  });
});
