import type { Locator, Page } from '@playwright/test';

/**
 * Space hazards pause the flight cutscene with a quiz or a mini-game. Answer quizzes (first option)
 * and let mini-games run out their clock, clicking "Continue flight" each time, until `until` shows.
 */
export async function flyThroughHazards(page: Page, until: Locator, timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await until.isVisible()) return;
    if (await page.getByTestId('hazard').isVisible()) {
      const opt = page.getByTestId('hazard-option-0');
      if ((await opt.isVisible()) && (await opt.isEnabled())) await opt.click().catch(() => {});
      const cont = page.getByTestId('hazard-continue');
      if (await cont.isVisible()) await cont.click().catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  throw new Error('Timed out flying through hazards');
}
