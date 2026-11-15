import { test, expect, type Page } from '@playwright/test';
import { flyThroughHazards } from './hazards.ts';

async function buildGoodRocket(page: Page) {
  // Clear whatever is fitted, then build a rocket that wins Proxima Cen b at Cadet.
  for (const slot of ['pod', 'engine', 'drive', 'tank0', 'tank1', 'tank2', 'comms', 'pressure', 'shield']) {
    const btn = page.getByTestId(`remove-${slot}`);
    if (await btn.count()) await btn.click();
  }
  await page.getByTestId('tab-payload').click();
  await page.getByTestId('add-pod-probe').click();
  await page.getByTestId('tab-thrusters').click();
  await page.getByTestId('add-eng-hydro2').click();
  await page.getByTestId('add-drv-hop').click();
  await page.getByTestId('tab-tanks').click();
  await page.getByTestId('add-tank-hydro').click();
  await page.getByTestId('add-tank-hydro').click();
  await page.getByTestId('add-tank-hydro-s').click();
  await page.getByTestId('tab-comms').click();
  await page.getByTestId('add-com-whisper').click();
}

test('a full 10-launch Cadet run ends on the leaderboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByTestId('start').click();
  await page.getByText('Skip briefing').click();
  await page.getByTestId('name-input').fill('Smoke Tester');
  await page.getByTestId('name-submit').click();
  await page.getByTestId('difficulty-easy').click();
  await page.getByTestId('pick-proxima-cen-b').click();
  await page.getByTestId('to-workshop').click();

  // Drag one part with the mouse to prove drag-and-drop works, then build the rest.
  await page.getByTestId('tab-payload').click();
  const card = page.getByTestId('part-pod-probe');
  const slot = page.getByTestId('slot-pod');
  const a = (await card.boundingBox())!;
  const b = (await slot.boundingBox())!;
  await page.mouse.move(a.x + 40, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + 40, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByTestId('slot-pod')).toContainText('Peekaboo Probe');

  await buildGoodRocket(page);
  await expect(page.getByTestId('stat-dv_deep')).toHaveAttribute('data-level', /good|warn/);

  for (let n = 1; n <= 10; n++) {
    if (n === 10) {
      // Last launch: deliberately underpowered (one tank) to exercise a failure path.
      await page.getByTestId('remove-tank2').click();
      await page.getByTestId('remove-tank1').click();
    }
    await page.getByTestId('to-prelaunch').click();
    await page.getByTestId('launch').click();
    await expect(page.getByTestId('launch-screen')).toBeVisible();
    if (n === 1) {
      // Watch the first launch all the way to the splashdown.
      await page.getByText('Skip countdown').click();
      await flyThroughHazards(page, page.getByTestId('splashdown'));
      await page.getByTestId('to-report').click();
    } else {
      await expect(page.getByTestId('countdown')).toBeVisible();
      await page.keyboard.press('Escape'); // skip countdown
      await expect(page.getByRole('button', { name: /Skip ⏭/ })).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape'); // skip cutscene
    }
    await expect(page.getByTestId('stamp')).toHaveText(n === 10 ? 'MISSION LOST' : 'MISSION SUCCESS');
    await page.getByTestId('next').click();
    if (n < 10) {
      await expect(page.getByTestId('run-average')).toBeVisible();
      await page.getByTestId('next-launch').click();
    }
  }

  await expect(page.getByTestId('final-average')).toBeVisible();
  await page.getByTestId('submit-score').click();
  await expect(page.getByTestId('offline-badge')).toBeVisible();
  const rows = page.getByTestId('lb-rows');
  await expect(rows).toContainText('Smoke Tester');
  await expect(rows).toContainText('Cadet');
  expect(errors).toEqual([]);
});

for (const [diff, planet] of [
  ['medium', 'k2-18-b'],
  ['hard', 'hd-189733-b'],
] as const) {
  test(`a full 10-launch ${diff} run completes and posts`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByTestId('start').click();
    await page.getByText('Skip briefing').click();
    await page.getByTestId('name-input').fill(`Tester ${diff}`);
    await page.getByTestId('name-submit').click();
    await page.getByTestId(`difficulty-${diff}`).click();
    await page.getByTestId(`pick-${planet}`).click();
    await page.getByTestId('to-workshop').click();
    // Winning build found by the exhaustive balance search.
    await page.getByTestId('add-pod-probe').click();
    await page.getByTestId('tab-thrusters').click();
    await page.getByTestId('add-eng-hydro2').click();
    await page.getByTestId('add-drv-stride').click();
    await page.getByTestId('tab-tanks').click();
    for (const t of ['tank-hydro-s', 'tank-hydro', 'tank-hydro-s']) await page.getByTestId(`add-${t}`).click();
    await page.getByTestId('tab-comms').click();
    await page.getByTestId('add-com-bigear').click();
    await page.getByTestId('tab-pressure').click();
    await page.getByTestId('add-prs-helium').click();
    await page.getByTestId('tab-shield').click();
    await page.getByTestId('add-shd-cork').click();
    for (let n = 1; n <= 10; n++) {
      await page.getByTestId('to-prelaunch').click();
      await page.getByTestId('launch').click();
      await expect(page.getByTestId('countdown')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: /Skip ⏭/ })).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('stamp')).toHaveText('MISSION SUCCESS');
      await page.getByTestId('next').click();
      if (n < 10) await page.getByTestId('next-launch').click();
    }
    await page.getByTestId('submit-score').click();
    await expect(page.getByTestId('lb-rows')).toContainText(`Tester ${diff}`);
    await expect(page.getByTestId('lb-rows')).toContainText(diff === 'medium' ? 'Engineer' : 'Flight Director');
    expect(errors).toEqual([]);
  });
}
