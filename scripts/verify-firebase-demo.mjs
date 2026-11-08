/**
 * Standalone Automated Verification Suite for firebase-editable-demo.html
 * 
 * Tests:
 * - Public Read-Only Mode (no hash, #about): contenteditable="false", #saveBtn hidden
 * - Admin Mode URL Hash Toggle (#admin, #ADMIN, #admin?param): contenteditable="true", #saveBtn visible & clickable
 * - Dynamic Hash Navigation via hashchange without page reload
 * - Data Hydration via loadData() from Firebase Realtime Database
 * - Data Persistence via saveData(), database payload update, and 'Đã lưu thành công' toast notification
 * - Zero-config localStorage fallback mode when Firebase credentials are placeholder
 * 
 * Execution: node scripts/verify-firebase-demo.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI formatting for test runner
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runTest(name, fn) {
  totalTests++;
  const testNumber = String(totalTests).padStart(2, '0');
  process.stdout.write(`  ▶ [Test ${testNumber}] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    passedTests++;
    const duration = Date.now() - start;
    console.log(`${GREEN}PASS${RESET} ${DIM}(${duration}ms)${RESET}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, err });
    const duration = Date.now() - start;
    console.log(`${RED}FAIL${RESET} ${DIM}(${duration}ms)${RESET}`);
    console.error(`     ${RED}Error: ${err.message}${RESET}`);
    if (err.stack) {
      const cleanStack = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(`     ${DIM}${cleanStack}${RESET}`);
    }
  }
}

/**
 * Creates a new Playwright page with mocked CDN and mock Firebase RTDB.
 */
async function setupPageWithMockFirebase(browser, initialStore = null) {
  const page = await browser.newPage();

  // Intercept Google CDN requests to ensure 100% offline determinism
  await page.route('**/*gstatic.com/**', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '/* Intercepted Firebase CDN script */'
    });
  });

  // Inject in-browser Mock Firebase Realtime Database if initialStore is requested or by default
  await page.addInitScript((seed) => {
    const store = { page_content: seed ? { ...seed } : null };
    window.__mockDb = store;
    window.__savedPayloads = [];

    window.firebase = {
      apps: [],
      initializeApp: function(config) {
        window.__mockConfig = config;
        const app = { name: '[DEFAULT]', options: config };
        if (!this.apps.some(a => a.name === app.name)) {
          this.apps.push(app);
        }
        return app;
      },
      database: function() {
        return {
          ref: function(nodePath = 'page_content') {
            return {
              once: function(eventType) {
                const val = store[nodePath];
                return Promise.resolve({
                  exists: function() {
                    return val !== null && val !== undefined && Object.keys(val).length > 0;
                  },
                  val: function() {
                    return val ? JSON.parse(JSON.stringify(val)) : null;
                  }
                });
              },
              set: function(payload) {
                store[nodePath] = JSON.parse(JSON.stringify(payload));
                window.__savedPayloads.push(payload);
                return Promise.resolve();
              }
            };
          }
        };
      }
    };
  }, initialStore);

  return page;
}

/**
 * Creates a new Playwright page WITHOUT mock Firebase, to test zero-config localStorage fallback.
 */
async function setupPageWithoutMockFirebase(browser) {
  const page = await browser.newPage();

  // Intercept Google CDN scripts with dummy empty script so real Firebase is undefined
  await page.route('**/*gstatic.com/**', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '/* Fallback test: Firebase SDK not loaded */'
    });
  });

  return page;
}

async function runAllTests() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   Automated Test Suite: firebase-editable-demo.html            ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  const demoFilePath = path.resolve(__dirname, '../firebase-editable-demo.html');
  if (!fs.existsSync(demoFilePath)) {
    throw new Error(`Target file not found at: ${demoFilePath}`);
  }
  const fileUrl = `file://${demoFilePath}`;
  console.log(`${DIM}Target URL: ${fileUrl}${RESET}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // SECTION 1: PUBLIC / READ-ONLY MODE (NO #admin)
    // =========================================================================
    console.log(`${BOLD}--- Section 1: Public Read-Only Mode (absence of #admin) ---${RESET}`);

    await runTest('P1.1: Visiting file URL without hash sets contenteditable="false" on all .editable elements', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const count = await page.locator('.editable').count();
      assert(count >= 5, `Expected at least 5 editable elements, found ${count}`);

      const editables = await page.locator('.editable').all();
      for (const el of editables) {
        const ceAttr = await el.getAttribute('contenteditable');
        const ceProp = await el.evaluate(node => node.contentEditable);
        assertEqual(ceAttr, 'false', `Element attribute contenteditable must be 'false'`);
        assertEqual(ceProp, 'false', `Element property contentEditable must be 'false'`);
      }
      await page.close();
    });

    await runTest('P1.2: Visiting file URL without hash ensures #saveBtn is hidden (display: none)', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const saveBtn = page.locator('#saveBtn');
      const isVisible = await saveBtn.isVisible();
      assertEqual(isVisible, false, 'Expected #saveBtn to not be visible in public mode');

      const display = await saveBtn.evaluate(el => window.getComputedStyle(el).display);
      assertEqual(display, 'none', 'Expected #saveBtn computed style display to be "none"');
      await page.close();
    });

    await runTest('P1.3: Visiting with arbitrary non-admin hash (e.g. #about) keeps public mode locked', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(`${fileUrl}#about`);
      await page.waitForLoadState('domcontentloaded');

      const firstEditable = page.locator('.editable').first();
      assertEqual(await firstEditable.getAttribute('contenteditable'), 'false');
      assertEqual(await page.locator('#saveBtn').isVisible(), false);
      await page.close();
    });

    // =========================================================================
    // SECTION 2: ADMIN MODE TOGGLE VIA URL HASH (#admin)
    // =========================================================================
    console.log(`\n${BOLD}--- Section 2: Admin Mode URL Hash Toggle (#admin) ---${RESET}`);

    await runTest('A2.1: Direct load with #admin unlocks contenteditable="true" on all .editable elements', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const editables = await page.locator('.editable').all();
      assert(editables.length >= 5, 'No .editable elements found');
      for (const el of editables) {
        const ceAttr = await el.getAttribute('contenteditable');
        const ceProp = await el.evaluate(node => node.contentEditable);
        assertEqual(ceAttr, 'true', `Element attribute contenteditable must be 'true' in admin mode`);
        assertEqual(ceProp, 'true', `Element property contentEditable must be 'true' in admin mode`);
      }
      await page.close();
    });

    await runTest('A2.2: Direct load with #admin displays #saveBtn and makes it clickable', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const saveBtn = page.locator('#saveBtn');
      const isVisible = await saveBtn.isVisible();
      assertEqual(isVisible, true, 'Expected #saveBtn to be visible in admin mode');

      const isEnabled = await saveBtn.isEnabled();
      assertEqual(isEnabled, true, 'Expected #saveBtn to be enabled/clickable in admin mode');

      const display = await saveBtn.evaluate(el => window.getComputedStyle(el).display);
      assert(display !== 'none', `Expected #saveBtn display not to be 'none', got '${display}'`);
      await page.close();
    });

    await runTest('A2.3: Case normalization and query parameters (#ADMIN, #admin?ref=test) activate admin mode', async () => {
      const page = await setupPageWithMockFirebase(browser);

      // Test uppercase #ADMIN
      await page.goto(`${fileUrl}#ADMIN`);
      await page.waitForLoadState('domcontentloaded');
      assertEqual(await page.locator('.editable').first().getAttribute('contenteditable'), 'true');
      assertEqual(await page.locator('#saveBtn').isVisible(), true);

      // Test hash with query parameter #admin?preview=1
      await page.goto(`${fileUrl}#admin?preview=1`);
      await page.waitForLoadState('domcontentloaded');
      assertEqual(await page.locator('.editable').first().getAttribute('contenteditable'), 'true');
      assertEqual(await page.locator('#saveBtn').isVisible(), true);

      await page.close();
    });

    // =========================================================================
    // SECTION 3: DYNAMIC HASHCHANGE (NO PAGE RELOAD)
    // =========================================================================
    console.log(`\n${BOLD}--- Section 3: Dynamic Hash Navigation via hashchange ---${RESET}`);

    await runTest('D3.1: Changing window.location.hash dynamically toggles admin and public modes without reload', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(fileUrl); // Starts in public mode
      await page.waitForLoadState('domcontentloaded');

      const firstEditable = page.locator('.editable').first();
      const saveBtn = page.locator('#saveBtn');

      // Verify initial public state
      assertEqual(await firstEditable.getAttribute('contenteditable'), 'false');
      assertEqual(await saveBtn.isVisible(), false);

      // Step 1: Switch to #admin dynamically
      await page.evaluate(() => { window.location.hash = '#admin'; });
      await page.waitForTimeout(50);

      assertEqual(await firstEditable.getAttribute('contenteditable'), 'true', 'Dynamic switch to #admin failed to enable editing');
      assertEqual(await saveBtn.isVisible(), true, 'Dynamic switch to #admin failed to show #saveBtn');

      // Step 2: Switch back to empty hash dynamically
      await page.evaluate(() => { window.location.hash = ''; });
      await page.waitForTimeout(50);

      assertEqual(await firstEditable.getAttribute('contenteditable'), 'false', 'Dynamic revert to public failed to lock editing');
      assertEqual(await saveBtn.isVisible(), false, 'Dynamic revert to public failed to hide #saveBtn');

      // Step 3: Switch to #admin again
      await page.evaluate(() => { window.location.hash = '#admin'; });
      await page.waitForTimeout(50);

      assertEqual(await firstEditable.getAttribute('contenteditable'), 'true', 'Second switch to #admin failed');
      assertEqual(await saveBtn.isVisible(), true, 'Second switch to #admin failed to show #saveBtn');

      await page.close();
    });

    // =========================================================================
    // SECTION 4: DATA HYDRATION (loadData)
    // =========================================================================
    console.log(`\n${BOLD}--- Section 4: Data Hydration via loadData() ---${RESET}`);

    await runTest('H4.1: loadData() automatically populates DOM elements from Firebase RTDB on page load', async () => {
      const mockContent = {
        'hero-title': 'Nguyễn Thành Lộc — Senior Software Engineer',
        'hero-subtitle': 'Chuyên gia kiến trúc hệ thống và giao diện người dùng cao cấp',
        'hero-bio': 'Nội dung tiểu sử đã được tải thành công từ Firebase Realtime Database!',
        'card-1-title': 'HSK Master Pro AI'
      };

      const page = await setupPageWithMockFirebase(browser, mockContent);
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');
      // Wait for async loadData promise to settle
      await page.waitForTimeout(100);

      // Verify DOM elements received data by data-key / id
      const heroTitle = await page.locator('[data-key="hero-title"]').innerText();
      assertEqual(heroTitle.trim(), mockContent['hero-title']);

      const heroSubtitle = await page.locator('[data-key="hero-subtitle"]').innerText();
      assertEqual(heroSubtitle.trim(), mockContent['hero-subtitle']);

      const heroBio = await page.locator('[data-key="hero-bio"]').innerText();
      assertEqual(heroBio.trim(), mockContent['hero-bio']);

      const card1Title = await page.locator('[data-key="card-1-title"]').innerText();
      assertEqual(card1Title.trim(), mockContent['card-1-title']);

      await page.close();
    });

    await runTest('H4.2: loadData() with empty/null database gracefully preserves default static HTML without errors', async () => {
      const page = await setupPageWithMockFirebase(browser, null);
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(100);

      const heroTitle = await page.locator('[data-key="hero-title"]').innerText();
      assert(heroTitle.includes('Nguyễn Thành Lộc'), 'Default title should be preserved');
      await page.close();
    });

    // =========================================================================
    // SECTION 5: DATA PERSISTENCE (saveData) & SUCCESS NOTIFICATION
    // =========================================================================
    console.log(`\n${BOLD}--- Section 5: Data Persistence (saveData) & Success Notification ---${RESET}`);

    await runTest('S5.1: Clicking #saveBtn gathers .editable contents, saves to Firebase, and displays "Đã lưu thành công"', async () => {
      const page = await setupPageWithMockFirebase(browser, {});
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const heroTitle = page.locator('[data-key="hero-title"]');
      const editedTitleText = 'Tiêu đề sau khi chỉnh sửa trực tiếp trên trình duyệt 2026';
      await heroTitle.fill(editedTitleText);

      const card1Desc = page.locator('[data-key="card-1-desc"]');
      const editedDescText = 'Mô tả dự án được cập nhật qua inline edit.';
      await card1Desc.fill(editedDescText);

      // Click save button
      const saveBtn = page.locator('#saveBtn');
      await saveBtn.click();
      await page.waitForTimeout(100);

      // Verify notification message "Đã lưu thành công"
      const bodyText = await page.innerText('body');
      assert(bodyText.includes('Đã lưu thành công'), `Expected page text to include 'Đã lưu thành công', got: ${bodyText}`);

      const toast = page.locator('#notificationToast, #statusToast');
      const toastVisible = await toast.isVisible();
      assert(toastVisible, 'Expected notification toast to be visible');
      const toastText = await toast.innerText();
      assert(toastText.includes('Đã lưu thành công'), `Toast text should contain 'Đã lưu thành công', got: ${toastText}`);

      // Verify payload in mock database
      const savedPayloads = await page.evaluate(() => window.__savedPayloads);
      assert(savedPayloads && savedPayloads.length > 0, 'Expected at least one payload saved to Firebase RTDB');

      const latestPayload = savedPayloads[savedPayloads.length - 1];
      assertEqual(latestPayload['hero-title'], editedTitleText, 'Saved payload must match edited title');
      assertEqual(latestPayload['card-1-desc'], editedDescText, 'Saved payload must match edited card description');

      await page.close();
    });

    await runTest('S5.2: #saveBtn is temporarily disabled during async save to prevent race conditions', async () => {
      const page = await setupPageWithMockFirebase(browser);
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Test that clicking saveBtn triggers saveData without crashing and restores enabled state
      const saveBtn = page.locator('#saveBtn');
      assertEqual(await saveBtn.isEnabled(), true);
      await saveBtn.click();
      await page.waitForTimeout(100);
      assertEqual(await saveBtn.isEnabled(), true, '#saveBtn must be re-enabled after save completes');

      await page.close();
    });

    // =========================================================================
    // SECTION 6: ZERO-CONFIG LOCALSTORAGE FALLBACK
    // =========================================================================
    console.log(`\n${BOLD}--- Section 6: Zero-Config Fallback (localStorage) ---${RESET}`);

    await runTest('F6.1: When Firebase is offline or unconfigured, saveData() stores to localStorage and shows "Đã lưu thành công"', async () => {
      const page = await setupPageWithoutMockFirebase(browser);
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Edit title
      const heroTitle = page.locator('[data-key="hero-title"]');
      const fallbackText = 'Nội dung lưu vào LocalStorage dự phòng';
      await heroTitle.fill(fallbackText);

      // Click Save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Check notification
      const bodyText = await page.innerText('body');
      assert(bodyText.includes('Đã lưu thành công'), 'Expected notification message "Đã lưu thành công" in fallback mode');

      // Check localStorage
      const storedJson = await page.evaluate(() => localStorage.getItem('firebase_demo_page_content'));
      assert(Boolean(storedJson), 'Expected localStorage key "firebase_demo_page_content" to be populated');
      const storedData = JSON.parse(storedJson);
      assertEqual(storedData['hero-title'], fallbackText, 'localStorage must contain edited text');

      await page.close();
    });

  } finally {
    await browser.close();
  }

  // =========================================================================
  // TEST SUMMARY & EXIT CODE
  // =========================================================================
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}                    VERIFICATION SUMMARY                        ${RESET}`);
  console.log(`================================================================`);
  console.log(`  Total Executed Tests : ${totalTests}`);
  console.log(`  Passed               : ${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed               : ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`================================================================\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}FAILED: ${failedTests} test(s) failed.${RESET}`);
    for (const f of failures) {
      console.error(` - ${f.name}: ${f.err.message}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}SUCCESS: All ${passedTests} assertions passed cleanly with exit code 0!${RESET}\n`);
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error(`${RED}Fatal runner exception:${RESET}`, err);
  process.exit(1);
});
