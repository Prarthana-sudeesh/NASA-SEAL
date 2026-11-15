import { test, expect } from '@playwright/test';

// Regression: on a slow connection the LAUNCH-tap "prime" resolved after the cutscene had started and
// paused it at 0:00. Every video response is delayed here so that ordering is forced.
const OUTCOMES = ['no_thrust', 'explosion', 'out_of_fuel', 'signal_lost', 'planet_fail', 'return_fail', 'success'];

test.describe('cutscenes on a slow connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*.mp4', async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
  });

  for (const o of OUTCOMES) {
    test(`${o} plays to the end`, async ({ page }) => {
      await page.goto('/?debug=1');
      await page.getByTestId(`debug-play-${o}`).click();
      await expect(page.getByTestId('cutscene-test')).toHaveAttribute('data-ended', 'true', { timeout: 40_000 });
      // The video really advanced (not stuck paused at 0).
      const t = await page.evaluate(() => document.querySelector('video')?.currentTime ?? 0);
      expect(t).toBeGreaterThan(1);
    });
  }

  test('a real launch plays its cutscene after the countdown', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start').click();
    await page.getByText('Skip briefing').click();
    await page.getByTestId('name-input').fill('Slow Net');
    await page.getByTestId('name-submit').click();
    await page.getByTestId('difficulty-easy').click();
    await page.getByTestId('pick-proxima-cen-b').click();
    await page.getByTestId('to-workshop').click();
    await page.getByTestId('add-pod-probe').click(); // incomplete rocket is fine: blockers stop launch, so build minimal
    await page.getByTestId('tab-thrusters').click();
    await page.getByTestId('add-eng-hydro2').click();
    await page.getByTestId('add-drv-hop').click();
    await page.getByTestId('tab-tanks').click();
    await page.getByTestId('add-tank-hydro').click();
    await page.getByTestId('tab-comms').click();
    await page.getByTestId('add-com-whisper').click();
    await page.getByTestId('to-prelaunch').click();
    await page.getByTestId('launch').click();
    await expect(page.getByTestId('countdown')).toBeVisible();
    await page.getByText('Skip countdown').click();
    // One tank can't reach orbit: the "Out of fuel" sequence must play through to its overlay.
    await expect(page.getByTestId('overlay')).toHaveText('Out of fuel', { timeout: 40_000 });
  });
});
