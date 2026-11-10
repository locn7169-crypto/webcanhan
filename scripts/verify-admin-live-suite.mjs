import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function runTestSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 VERIFY 4 ADMIN REQUIREMENTS TEST SUITE${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // Start Vite Preview server
  const preview = spawn('npm', ['run', 'preview', '--', '--port', '4179'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passCount = 0;
  let failCount = 0;

  async function test(name, fn) {
    try {
      await fn();
      passCount++;
      console.log(`  ▶ ${GREEN}✔ PASS${RESET} — ${name}`);
    } catch (err) {
      failCount++;
      console.error(`  ▶ ${RED}✖ FAIL${RESET} — ${name}`);
      console.error(`    ${RED}Reason: ${err.message}${RESET}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Requirement 4: Public URL is strictly read-only
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- REQUIREMENT 4: Public Site Read-Only Firewall ---${RESET}`);

    await page.goto('http://localhost:4179/');
    await page.waitForTimeout(1000);

    await test('Public site has zero contenteditable elements', async () => {
      const editables = await page.locator('[contenteditable="true"]').count();
      assert.strictEqual(editables, 0, `Expected 0 contenteditable, found ${editables}`);
    });

    await test('Public site hides #saveBtn', async () => {
      const saveBtn = await page.locator('#saveBtn').count();
      if (saveBtn > 0) {
        const isVisible = await page.locator('#saveBtn').isVisible();
        assert.strictEqual(isVisible, false, 'Expected #saveBtn to be invisible');
      }
    });

    await test('Public site hides #visual-editor-dock', async () => {
      const dock = await page.locator('#visual-editor-dock').count();
      if (dock > 0) {
        const isVisible = await page.locator('#visual-editor-dock').isVisible();
        assert.strictEqual(isVisible, false, 'Expected dock to be hidden');
      }
    });

    // -------------------------------------------------------------
    // Requirement 1: Each entrance to #admin prompts for PIN
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- REQUIREMENT 1: Every entrance to #admin requires PIN ---${RESET}`);

    await page.goto('http://localhost:4179/#admin');
    await page.waitForTimeout(1200);

    await test('Navigating to #admin displays PIN prompt modal', async () => {
      const modal = page.locator('#admin-auth-overlay');
      const isVisible = await modal.isVisible();
      assert.strictEqual(isVisible, true, 'Expected PIN prompt modal to be visible');
    });

    // Enter PIN 4321
    console.log(`\n${BOLD}--- REQUIREMENT 2 & 3: Unlock Admin & Verify Tools ---${RESET}`);
    for (const d of ['4', '3', '2', '1']) {
      await page.click(`.admin-keypad-btn[data-key="${d}"]`);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(800);

    await test('Entering PIN 4321 unlocks editor & displays Visual Editor Dock', async () => {
      const dock = page.locator('#visual-editor-dock');
      const isVisible = await dock.isVisible();
      assert.strictEqual(isVisible, true, 'Expected #visual-editor-dock to be visible');
    });

    await test('Floating Save button #saveBtn is visible in authenticated Admin mode', async () => {
      const saveBtn = page.locator('#saveBtn');
      const isVisible = await saveBtn.isVisible();
      assert.strictEqual(isVisible, true, 'Expected #saveBtn to be visible');
    });

    await test('Kiểu chữ (Font Family) selector is present in dock', async () => {
      const fontSelect = page.locator('#tt-font-family-select');
      const isPresent = await fontSelect.count();
      assert.strictEqual(isPresent, 1, 'Expected #tt-font-family-select in dock');
    });

    await test('Cỡ chữ (Font Size) selector is present in dock', async () => {
      const sizeSelect = page.locator('#tt-font-size-select');
      const isPresent = await sizeSelect.count();
      assert.strictEqual(isPresent, 1, 'Expected #tt-font-size-select in dock');
    });

    await test('Tô màu chữ & Tô màu nền color inputs are present in dock', async () => {
      const textColor = page.locator('#tt-custom-text-color');
      const bgColor = page.locator('#tt-custom-bg-color');
      assert.strictEqual(await textColor.count(), 1, 'Expected #tt-custom-text-color');
      assert.strictEqual(await bgColor.count(), 1, 'Expected #tt-custom-bg-color');
    });

    await test('Block management buttons (+ Đoạn văn, + Tiêu đề, 📋 Nhân bản, 🗑️ Xóa khối) are present', async () => {
      const addP = page.locator('[data-tt-action="add-paragraph"]');
      const addH = page.locator('[data-tt-action="add-heading"]');
      const dup = page.locator('[data-tt-action="duplicate-node"]');
      const del = page.locator('[data-tt-action="delete-node"]');
      assert.strictEqual(await addP.count(), 1, 'Expected add-paragraph button');
      assert.strictEqual(await addH.count(), 1, 'Expected add-heading button');
      assert.strictEqual(await dup.count(), 1, 'Expected duplicate-node button');
      assert.ok((await del.count()) >= 1, 'Expected at least 1 delete-node button in dock and bubble menu');
    });

    // -------------------------------------------------------------
    // Requirement 1 & 4: Re-entering #admin requires PIN again
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- REQUIREMENT 1 VERIFICATION: Navigating away and back requires PIN ---${RESET}`);

    // Navigate to #works
    await page.goto('http://localhost:4179/#works');
    await page.waitForTimeout(600);

    await test('Navigating to #works immediately clears admin session & locks down', async () => {
      const dock = await page.locator('#visual-editor-dock').count();
      const isDockVisible = dock > 0 ? await page.locator('#visual-editor-dock').isVisible() : false;
      assert.strictEqual(isDockVisible, false, 'Expected dock to be hidden on #works');
    });

    // Re-enter #admin
    await page.goto('http://localhost:4179/#admin');
    await page.waitForTimeout(800);

    await test('Re-entering #admin immediately prompts for PIN again', async () => {
      const modal = page.locator('#admin-auth-overlay');
      const isVisible = await modal.isVisible();
      assert.strictEqual(isVisible, true, 'Expected PIN prompt modal to appear again');
    });

  } finally {
    await browser.close();
    preview.kill();
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`Total: ${passCount + failCount} | ${GREEN}Passed: ${passCount}${RESET} | ${failCount > 0 ? RED : GREEN}Failed: ${failCount}${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
