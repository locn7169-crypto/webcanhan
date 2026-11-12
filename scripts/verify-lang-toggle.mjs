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
  console.log(`${BOLD}${CYAN}🌐 BILINGUAL / LANGUAGE SWITCHER VERIFICATION TEST SUITE${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // Start Vite Preview server on port 4185
  const preview = spawn('npm', ['run', 'preview', '--', '--port', '4185'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const browser = await chromium.launch({ headless: true });
  
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
    // SUITE 1: Mobile Pill Header Placement & Visual Geometry
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 1: Mobile Header Pill & Button Alignment (390x844 iPhone) ---${RESET}`);
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:4185/');
    await mobilePage.waitForTimeout(1000);

    await test('Language toggle button #headerLangToggle exists and is visible on mobile', async () => {
      const btn = mobilePage.locator('#headerLangToggle');
      const isVisible = await btn.isVisible();
      assert.strictEqual(isVisible, true, 'Expected #headerLangToggle to be visible in mobile header');
    });

    await test('Button sits between brand monogram and hamburger button (exact user circle)', async () => {
      const brandBox = await mobilePage.locator('.brand-monogram').boundingBox();
      const langBox = await mobilePage.locator('#headerLangToggle').boundingBox();
      const burgerBox = await mobilePage.locator('.hamburger-toggle-btn').boundingBox();

      assert.ok(brandBox && langBox && burgerBox, 'All bounding boxes must exist');
      
      // X coordinates must strictly follow: brandBox.x < langBox.x < burgerBox.x
      assert.ok(
        brandBox.x + brandBox.width <= langBox.x + 20,
        `Expected langBox (${langBox.x}) to be right of brand text (${brandBox.x + brandBox.width})`
      );
      assert.ok(
        langBox.x + langBox.width <= burgerBox.x + 10,
        `Expected langBox (${langBox.x + langBox.width}) to be left of hamburger button (${burgerBox.x})`
      );
      console.log(`    Geometry verified: Monogram [${Math.round(brandBox.x)}, ${Math.round(brandBox.x + brandBox.width)}] -> Lang [${Math.round(langBox.x)}, ${Math.round(langBox.x + langBox.width)}] -> Hamburger [${Math.round(burgerBox.x)}, ${Math.round(burgerBox.x + burgerBox.width)}]`);
    });

    await test('Take screenshot of mobile pill header with VI/EN toggle', async () => {
      const header = mobilePage.locator('.site-header');
      await header.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/mobile_header_pill_lang.png' });
      await mobilePage.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/mobile_full_view_lang.png' });
    });

    // -------------------------------------------------------------
    // SUITE 2: Default VI Mode & Language Hiding
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 2: Default Vietnamese State (data-lang="vi") ---${RESET}`);
    await test('Root document has data-lang="vi"', async () => {
      const dataLang = await mobilePage.getAttribute('html', 'data-lang');
      assert.strictEqual(dataLang, 'vi', 'Expected default data-lang="vi"');
    });

    await test('VI chip has active class, EN chip does not', async () => {
      const viActive = await mobilePage.locator('#headerLangToggle .lang-chip-vi').evaluate(el => el.classList.contains('active'));
      const enActive = await mobilePage.locator('#headerLangToggle .lang-chip-en').evaluate(el => el.classList.contains('active'));
      assert.strictEqual(viActive, true, 'VI chip must be active');
      assert.strictEqual(enActive, false, 'EN chip must NOT be active');
    });

    await test('In VI mode: English text elements are hidden (display: none)', async () => {
      const enDisplay = await mobilePage.locator('.hero-editorial-eyebrow .lang-text-en').evaluate(el => window.getComputedStyle(el).display);
      const viDisplay = await mobilePage.locator('.hero-editorial-eyebrow .lang-text-vi').evaluate(el => window.getComputedStyle(el).display);
      assert.strictEqual(enDisplay, 'none', 'English eyebrow must be hidden');
      assert.notStrictEqual(viDisplay, 'none', 'Vietnamese eyebrow must be visible');
    });

    // -------------------------------------------------------------
    // SUITE 3: Interactive Toggle to EN
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 3: Interactive Toggle to English (EN) ---${RESET}`);
    await test('Clicking #headerLangToggle switches to data-lang="en"', async () => {
      await mobilePage.click('#headerLangToggle');
      await mobilePage.waitForTimeout(300);

      const dataLang = await mobilePage.getAttribute('html', 'data-lang');
      assert.strictEqual(dataLang, 'en', 'Expected data-lang to switch to "en"');
    });

    await test('EN chip becomes active, VI chip becomes inactive', async () => {
      const viActive = await mobilePage.locator('#headerLangToggle .lang-chip-vi').evaluate(el => el.classList.contains('active'));
      const enActive = await mobilePage.locator('#headerLangToggle .lang-chip-en').evaluate(el => el.classList.contains('active'));
      assert.strictEqual(viActive, false, 'VI chip must NOT be active');
      assert.strictEqual(enActive, true, 'EN chip must be active');
    });

    await test('In EN mode: Vietnamese text is hidden, English text is visible', async () => {
      const enDisplay = await mobilePage.locator('.hero-editorial-eyebrow .lang-text-en').evaluate(el => window.getComputedStyle(el).display);
      const viDisplay = await mobilePage.locator('.hero-editorial-eyebrow .lang-text-vi').evaluate(el => window.getComputedStyle(el).display);
      assert.notStrictEqual(enDisplay, 'none', 'English eyebrow must be visible');
      assert.strictEqual(viDisplay, 'none', 'Vietnamese eyebrow must be hidden');
    });

    await test('Preference is persisted to localStorage as "en"', async () => {
      const stored = await mobilePage.evaluate(() => localStorage.getItem('loc_portfolio_lang'));
      assert.strictEqual(stored, 'en', 'Expected localStorage to have "en"');
    });

    await test('Take screenshot of English mode header & hero', async () => {
      await mobilePage.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/mobile_en_mode_view.png' });
    });

    // -------------------------------------------------------------
    // SUITE 4: Toggle back to VI & Mobile Drawer Sync
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 4: Toggle Back to VI & Drawer Menu Sync ---${RESET}`);
    await test('Opening mobile menu drawer shows synced language button', async () => {
      await mobilePage.click('.hamburger-toggle-btn');
      await mobilePage.waitForTimeout(400);

      const menuToggle = mobilePage.locator('#menuLangToggle');
      assert.strictEqual(await menuToggle.isVisible(), true, 'Expected #menuLangToggle to be visible in drawer');
      
      const enActive = await mobilePage.locator('#menuLangToggle .lang-chip-en').evaluate(el => el.classList.contains('active'));
      assert.strictEqual(enActive, true, 'Drawer menu button must also reflect EN active');
    });

    await test('Clicking #menuLangToggle inside drawer switches back to VI', async () => {
      await mobilePage.click('#menuLangToggle');
      await mobilePage.waitForTimeout(300);

      const dataLang = await mobilePage.getAttribute('html', 'data-lang');
      assert.strictEqual(dataLang, 'vi', 'Expected data-lang="vi" after drawer click');

      const headerViActive = await mobilePage.locator('#headerLangToggle .lang-chip-vi').evaluate(el => el.classList.contains('active'));
      assert.strictEqual(headerViActive, true, 'Header button must synchronize to VI');
    });

    await mobileContext.close();

    // -------------------------------------------------------------
    // SUITE 5: Desktop Navigation Bar Verification
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 5: Desktop Navigation Bar (1440x900) ---${RESET}`);
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:4185/');
    await desktopPage.waitForTimeout(800);

    await test('Desktop nav displays concise single-language links (no dual slashes)', async () => {
      const worksText = await desktopPage.locator('.nav-link[href="#works"]').innerText();
      // In VI mode, it should be just 'Dự án' (not 'Works · Dự án')
      assert.strictEqual(worksText.trim(), 'Dự án', `Expected 'Dự án', got '${worksText}'`);
      
      const journeyText = await desktopPage.locator('.nav-link[href="#synthesis"]').innerText();
      assert.strictEqual(journeyText.trim(), 'Hành trình', `Expected 'Hành trình', got '${journeyText}'`);
    });

    await test('Toggling on Desktop updates nav links to clean English', async () => {
      await desktopPage.click('#headerLangToggle');
      await desktopPage.waitForTimeout(300);

      const worksText = await desktopPage.locator('.nav-link[href="#works"]').innerText();
      assert.strictEqual(worksText.trim(), 'Works', `Expected 'Works', got '${worksText}'`);

      const journeyText = await desktopPage.locator('.nav-link[href="#synthesis"]').innerText();
      assert.strictEqual(journeyText.trim(), 'Journey', `Expected 'Journey', got '${journeyText}'`);
    });

    await test('Take desktop header screenshot in EN & VI', async () => {
      await desktopPage.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/desktop_en_header.png' });
      // Reset back to VI
      await desktopPage.click('#headerLangToggle');
      await desktopPage.waitForTimeout(200);
      await desktopPage.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/desktop_vi_header.png' });
    });

    await desktopContext.close();

  } finally {
    await browser.close();
    preview.kill('SIGTERM');
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}Test Run Summary:${RESET}`);
  console.log(`Total: ${passCount + failCount} | ${GREEN}Passed: ${passCount}${RESET} | ${failCount > 0 ? RED : GREEN}Failed: ${failCount}${RESET}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
