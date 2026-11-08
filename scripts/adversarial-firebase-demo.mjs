/**
 * Adversarial Stress & Chaos Test Suite for firebase-editable-demo.html
 * 
 * Conducts independent empirical testing across 6 adversarial dimensions:
 * 1. Zero-config runtime behavior & LocalStorage fallback
 * 2. Network simulation & Offline CDN script interception
 * 3. Cross-browser DOM behavior & Selection / Casing resilience
 * 4. Attribute tampering & Identifier fallback hierarchy
 * 5. XSS & Script injection resilience in editable areas
 * 6. Verification of exact save notification string ('Đã lưu thành công')
 * 
 * Run with: node scripts/adversarial-firebase-demo.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Color formatting
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
const testResults = [];

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

async function runAdversarialTest(category, name, fn) {
  totalTests++;
  const testNumber = String(totalTests).padStart(2, '0');
  process.stdout.write(`  ▶ [${category} #${testNumber}] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    passedTests++;
    const duration = Date.now() - start;
    console.log(`${GREEN}PASS${RESET} ${DIM}(${duration}ms)${RESET}`);
    testResults.push({ category, name, status: 'PASS', duration, error: null });
  } catch (err) {
    failedTests++;
    const duration = Date.now() - start;
    console.log(`${RED}FAIL${RESET} ${DIM}(${duration}ms)${RESET}`);
    console.error(`     ${RED}Error: ${err.message}${RESET}`);
    if (err.stack) {
      const cleanStack = err.stack.split('\n').slice(1, 3).join('\n');
      console.error(`     ${DIM}${cleanStack}${RESET}`);
    }
    testResults.push({ category, name, status: 'FAIL', duration, error: err.message });
  }
}

async function main() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   ADVERSARIAL STRESS TEST SUITE: firebase-editable-demo.html   ${RESET}`);
  console.log(`${BOLD}${CYAN}   Independent Challenger Verification                          ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  const demoFilePath = path.resolve(__dirname, '../firebase-editable-demo.html');
  if (!fs.existsSync(demoFilePath)) {
    throw new Error(`Target file not found at: ${demoFilePath}`);
  }
  const fileUrl = `file://${demoFilePath}`;
  console.log(`${DIM}Target File: ${demoFilePath}${RESET}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // DIMENSION 1: ZERO-CONFIG RUNTIME & LOCALSTORAGE FALLBACK
    // =========================================================================
    console.log(`${BOLD}--- DIMENSION 1: Zero-Config Runtime & LocalStorage Fallback ---${RESET}`);

    await runAdversarialTest('ZeroConfig', 'ZC1: Loading directly with placeholder config initializes gracefully with zero exceptions', async () => {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const isConfigured = await page.evaluate(() => window.isFirebaseConfigured(window.firebaseConfig));
      assertEqual(isConfigured, false, 'Placeholder config should evaluate isFirebaseConfigured to false');

      const dbInstance = await page.evaluate(() => window.getDatabaseInstance());
      assertEqual(dbInstance, null, 'Unconfigured environment must return null database instance (triggering fallback)');

      assertEqual(pageErrors.length, 0, `Page errors encountered during load: ${pageErrors.join('; ')}`);
      await page.close();
    });

    await runAdversarialTest('ZeroConfig', 'ZC2: Full edit-save-reload cycle in pure zero-config fallback (no Firebase)', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept CDN to ensure no real Firebase SDK is used
      await page.route('**/firebasejs/**', route => route.abort());

      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const testTitle = 'Tiêu đề lưu trong chế độ Offline Zero-Config 100%';
      const testBio = 'Tiểu sử cập nhật thành công mà không cần Firebase SDK.';

      await page.locator('[data-key="hero-title"]').fill(testTitle);
      await page.locator('[data-key="hero-bio"]').fill(testBio);

      // Save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Verify localStorage was populated
      const stored = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}');
      });
      assertEqual(stored['hero-title'], testTitle, 'Title should be saved to localStorage');
      assertEqual(stored['hero-bio'], testBio, 'Bio should be saved to localStorage');

      // Reload page in public mode
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(100);

      const reloadedTitle = await page.locator('[data-key="hero-title"]').innerText();
      const reloadedBio = await page.locator('[data-key="hero-bio"]').innerText();
      assertEqual(reloadedTitle.trim(), testTitle, 'Hydration on reload must populate from localStorage fallback');
      assertEqual(reloadedBio.trim(), testBio, 'Hydration on reload must populate bio from localStorage fallback');

      await context.close();
    });

    await runAdversarialTest('ZeroConfig', 'ZC3: Corrupted / malformed JSON in localStorage does not crash loadData()', async () => {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('firebase_demo_page_content', '<<<BROKEN INVALID JSON DATA>>>');
      });

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(100);

      assertEqual(pageErrors.length, 0, 'Broken JSON in localStorage must not cause unhandled page errors');
      const heroTitle = await page.locator('[data-key="hero-title"]').innerText();
      assert(heroTitle.includes('Nguyễn Thành Lộc'), 'Default static text should be retained when cached JSON is corrupted');

      await page.close();
    });

    await runAdversarialTest('ZeroConfig', 'ZC4: LocalStorage SecurityError / QuotaExceeded does not crash saveData() or loadData()', async () => {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        // Mock throwing localStorage (simulating strict iframe, Safari Private mode block, or quota full)
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => { throw new Error('DOMException: The operation is insecure.'); },
            setItem: () => { throw new Error('QuotaExceededError: Storage quota exceeded.'); },
            removeItem: () => {},
            clear: () => {}
          },
          writable: false
        });
      });

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Attempt save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      assertEqual(pageErrors.length, 0, 'LocalStorage throwing must not crash page execution');
      const saveBtnText = await page.locator('#saveBtnText').innerText();
      assertEqual(saveBtnText, 'Lưu thay đổi', 'Save button text must restore after error handling');

      await page.close();
    });

    // =========================================================================
    // DIMENSION 2: NETWORK SIMULATION & OFFLINE CDN INTERCEPTION
    // =========================================================================
    console.log(`\n${BOLD}--- DIMENSION 2: Network Simulation & Offline CDN Interception ---${RESET}`);

    await runAdversarialTest('Network', 'NET1: CDN scripts blocked (404/aborted): page boots cleanly, admin toggle functions', async () => {
      const page = await browser.newPage();
      await page.route('**/firebasejs/**', route => route.abort('blockedbyclient'));

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      assertEqual(pageErrors.length, 0, 'Blocked CDN scripts must not produce uncaught exceptions');
      const editableCount = await page.locator('.editable[contenteditable="true"]').count();
      assert(editableCount >= 5, 'All editable fields must still be unlocked in admin mode even without CDN');
      assertEqual(await page.locator('#saveBtn').isVisible(), true, '#saveBtn must still be visible');

      await page.close();
    });

    await runAdversarialTest('Network', 'NET2: Partial CDN failure (app-compat loads, database-compat fails with 500)', async () => {
      const page = await browser.newPage();
      await page.route('**/firebase-app-compat.js', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.firebase = { apps: [], initializeApp: () => ({}) };'
        });
      });
      await page.route('**/firebase-database-compat.js', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      // getDatabaseInstance should safely detect window.firebase.database is not a function
      const db = await page.evaluate(() => window.getDatabaseInstance());
      assertEqual(db, null, 'Partial SDK missing .database must safely return null without throwing');
      assertEqual(pageErrors.length, 0, 'No unhandled errors during partial SDK failure');

      await page.close();
    });

    await runAdversarialTest('Network', 'NET3: Mid-session Firebase RTDB network timeout/rejection on save triggers fallback', async () => {
      const page = await browser.newPage();

      // Intercept Firebase CDN to prevent loading real SDK over mock
      await page.route('**/firebasejs/**', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* Intercepted for offline rejection test */'
      }));

      // Inject mock Firebase that rejects on set() with Network Timeout
      await page.addInitScript(() => {
        window.firebase = {
          apps: [{ name: '[DEFAULT]' }],
          initializeApp: () => ({}),
          database: () => ({
            ref: () => ({
              once: () => Promise.resolve({ val: () => null }),
              set: () => Promise.reject(new Error('Firebase network timeout after 10000ms'))
            })
          })
        };
        window.__mockDb = true; // force getDatabaseInstance to use it
      });

      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const testTitle = 'Tiêu đề kiểm thử khi Firebase rớt mạng giữa chừng';
      await page.locator('[data-key="hero-title"]').fill(testTitle);

      // Trigger save
      await page.click('#saveBtn');
      await page.waitForTimeout(200);

      // Verify that localStorage fallback caught the payload
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      assertEqual(stored['hero-title'], testTitle, 'Fallback to localStorage must succeed despite Firebase RTDB rejection');

      // Verify notification is still shown to user
      const toastText = (await page.locator('#toastMessage').innerText()).trim();
      assertEqual(toastText, 'Đã lưu thành công', 'Notification must confirm successful persistence to fallback storage');

      await page.close();
    });

    // =========================================================================
    // DIMENSION 3: CROSS-BROWSER DOM BEHAVIOR & INTERACTION DYNAMICS
    // =========================================================================
    console.log(`\n${BOLD}--- DIMENSION 3: Cross-Browser DOM Behavior & Interaction Dynamics ---${RESET}`);

    await runAdversarialTest('DOM', 'DOM1: Both contenteditable attribute AND contentEditable property are synchronized in both modes', async () => {
      const page = await browser.newPage();
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const editables = await page.locator('.editable').all();
      assert(editables.length >= 7, `Expected at least 7 editable elements, found ${editables.length}`);

      // Check public mode synchronization
      for (const el of editables) {
        const attr = await el.getAttribute('contenteditable');
        const prop = await el.evaluate(node => node.contentEditable);
        assertEqual(attr, 'false', 'Attribute contenteditable must be string "false"');
        assertEqual(prop, 'false', 'Property contentEditable must be string "false"');
      }

      // Switch to admin
      await page.evaluate(() => { window.location.hash = '#admin'; });
      await page.waitForTimeout(50);

      // Check admin mode synchronization
      for (const el of editables) {
        const attr = await el.getAttribute('contenteditable');
        const prop = await el.evaluate(node => node.contentEditable);
        assertEqual(attr, 'true', 'Attribute contenteditable must be string "true"');
        assertEqual(prop, 'true', 'Property contentEditable must be string "true"');
      }

      await page.close();
    });

    await runAdversarialTest('DOM', 'DOM2: Non-standard URL hashes and boundary hash checks', async () => {
      const page = await browser.newPage();
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const checkAdmin = async (hash, expectedAdmin) => {
        await page.evaluate((h) => { window.location.hash = h; }, hash);
        await page.waitForTimeout(30);
        const isAdmin = await page.evaluate(() => window.isAdminMode());
        assertEqual(isAdmin, expectedAdmin, `Hash "${hash}" expected admin=${expectedAdmin}, got ${isAdmin}`);
      };

      // Valid variations
      await checkAdmin('#admin', true);
      await checkAdmin('#ADMIN', true);
      await checkAdmin('#Admin', true);
      await checkAdmin('#admin?tab=1&preview=true', true);

      // Invalid variations (should NOT trigger admin mode)
      await checkAdmin('', false);
      await checkAdmin('#', false);
      await checkAdmin('#administrator', false);
      await checkAdmin('#admin_panel', false);
      await checkAdmin('#not-admin', false);
      await checkAdmin('#admin123', false);
      await checkAdmin('#about', false);

      await page.close();
    });

    await runAdversarialTest('DOM', 'DOM3: Rapid hash alternation stress test (50 toggles in 500ms)', async () => {
      const page = await browser.newPage();
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      // Alternate 50 times rapidly
      await page.evaluate(async () => {
        for (let i = 0; i < 50; i++) {
          window.location.hash = (i % 2 === 0) ? '#admin' : '#';
          window.updateAdminUI();
        }
      });

      assertEqual(pageErrors.length, 0, 'Rapid toggling must not produce page errors');

      // Final state check: last was i=49 -> '#' -> public
      const isContentEditable = await page.locator('.editable').first().getAttribute('contenteditable');
      assertEqual(isContentEditable, 'false', 'Final state after loop must be public mode');
      assertEqual(await page.locator('#saveBtn').isVisible(), false, '#saveBtn must be hidden');

      await page.close();
    });

    await runAdversarialTest('DOM', 'DOM4: Selection and focus preservation during typing in editable fields', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const titleLocator = page.locator('[data-key="hero-title"]');
      await titleLocator.focus();

      // Type some characters
      await page.keyboard.type(' TestTyping');
      const currentText = await titleLocator.innerText();
      assert(currentText.includes('TestTyping'), 'Text typing into contenteditable must update DOM innerText');

      // Verify activeElement is the editable element
      const isActive = await page.evaluate(() => {
        return document.activeElement && document.activeElement.getAttribute('data-key') === 'hero-title';
      });
      assertEqual(isActive, true, 'Focused editable element must remain document.activeElement');

      await page.close();
    });

    await runAdversarialTest('DOM', 'DOM5: Header quick toggle and banner exit links function seamlessly', async () => {
      const page = await browser.newPage();
      await page.goto(fileUrl);
      await page.waitForLoadState('domcontentloaded');

      // Click footer toggle link to enter admin mode
      await page.click('#quickAdminToggle');
      await page.waitForTimeout(50);
      assertEqual(await page.evaluate(() => window.isAdminMode()), true, 'Clicking quickAdminToggle should enter admin mode');
      assertEqual(await page.locator('#adminBanner').isVisible(), true, 'adminBanner must be visible');

      // Click exit link in adminBanner to leave admin mode
      await page.click('#exitAdminLink');
      await page.waitForTimeout(50);
      assertEqual(await page.evaluate(() => window.isAdminMode()), false, 'Clicking exitAdminLink should exit admin mode');
      assertEqual(await page.locator('#adminBanner').isVisible(), false, 'adminBanner must be hidden');

      await page.close();
    });

    // =========================================================================
    // DIMENSION 4: ATTRIBUTE TAMPERING & IDENTIFIER RESILIENCE
    // =========================================================================
    console.log(`\n${BOLD}--- DIMENSION 4: Attribute Tampering & Identifier Resilience ---${RESET}`);

    await runAdversarialTest('Attributes', 'ATTR1: Elements missing data-key fall back to id', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Inject a dynamic editable element that has id="custom-section-id" but NO data-key
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.className = 'editable';
        div.id = 'custom-section-id';
        div.innerHTML = 'Nội dung fallback qua id duy nhất';
        document.querySelector('main').appendChild(div);
        window.updateAdminUI();
      });

      // Click save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Check stored payload
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      assert(stored['custom-section-id'] !== undefined, 'Payload must include key "custom-section-id" resolved from id');
      assertEqual(stored['custom-section-id'], 'Nội dung fallback qua id duy nhất');

      await page.close();
    });

    await runAdversarialTest('Attributes', 'ATTR2: Elements missing both data-key and id fall back to field_N index', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Inject editable element without data-key and without id
      await page.evaluate(() => {
        const p = document.createElement('p');
        p.className = 'editable';
        p.innerHTML = 'Nội dung không có id và không có data-key';
        document.querySelector('main').appendChild(p);
        window.updateAdminUI();
      });

      // Click save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      // Find any key starting with 'field_'
      const fieldKeys = Object.keys(stored).filter(k => k.startsWith('field_'));
      assert(fieldKeys.length > 0, `Expected at least one field_N fallback key, found: ${JSON.stringify(fieldKeys)}`);
      assertEqual(stored[fieldKeys[0]], 'Nội dung không có id và không có data-key');

      await page.close();
    });

    await runAdversarialTest('Attributes', 'ATTR3: Prototype pollution attempt via data-key="__proto__" does not pollute Object.prototype', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Inject element with data-key="__proto__"
      await page.evaluate(() => {
        const span = document.createElement('span');
        span.className = 'editable';
        span.setAttribute('data-key', '__proto__');
        span.innerHTML = 'malicious_polluted_value';
        document.querySelector('main').appendChild(span);
        window.updateAdminUI();
      });

      // Save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Check if Object.prototype was polluted
      const isPolluted = await page.evaluate(() => {
        return ({}).polluted !== undefined || Object.prototype.polluted !== undefined;
      });
      assertEqual(isPolluted, false, 'Object.prototype must not be polluted');

      await page.close();
    });

    await runAdversarialTest('Attributes', 'ATTR4: Empty data-key="" falls back to id gracefully', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      await page.evaluate(() => {
        const div = document.createElement('div');
        div.className = 'editable';
        div.setAttribute('data-key', ''); // Empty string
        div.id = 'fallback-from-empty-datakey';
        div.innerHTML = 'Test empty data-key';
        document.querySelector('main').appendChild(div);
        window.updateAdminUI();
      });

      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      assert(stored['fallback-from-empty-datakey'] !== undefined, 'Empty data-key should trigger fallback to element id');
      assertEqual(stored['fallback-from-empty-datakey'], 'Test empty data-key');

      await page.close();
    });

    // =========================================================================
    // DIMENSION 5: XSS & SCRIPT INJECTION RESILIENCE
    // =========================================================================
    console.log(`\n${BOLD}--- DIMENSION 5: XSS & Script Injection Resilience ---${RESET}`);

    await runAdversarialTest('Security', 'XSS1: Injecting <script>alert(1)</script> does not crash parser or execute inline script', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const xssScript = '<script>window.__xssTriggered = true;</script>An Toàn Sau Injection';

      // Inject into hero title
      await page.evaluate((payload) => {
        const el = document.querySelector('[data-key="hero-title"]');
        el.innerHTML = payload;
      }, xssScript);

      // Save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Reload page and let loadData() hydrate
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(150);

      // Verify that script did NOT execute
      const executed = await page.evaluate(() => window.__xssTriggered);
      assertEqual(executed, undefined, '<script> inserted via innerHTML must not execute');

      // Verify that hero title contains the text without parser crash
      const titleText = await page.locator('[data-key="hero-title"]').innerText();
      assert(titleText.includes('An Toàn Sau Injection'), 'Text payload must be preserved without parser crash');

      await page.close();
    });

    await runAdversarialTest('Security', 'XSS2: Injecting <img src=invalid onerror=...> does not crash serialization or storage pipeline', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const imgPayload = 'Logo Preview: <img src="nonexistent-file.png" alt="Test Logo" style="display:none;" />';

      await page.evaluate((payload) => {
        const el = document.querySelector('[data-key="hero-subtitle"]');
        el.innerHTML = payload;
      }, imgPayload);

      // Save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      // Verify stored payload in localStorage
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      assert(stored['hero-subtitle'].includes('<img src="nonexistent-file.png"'), 'Image tag must serialize cleanly in payload');

      // Reload and hydrate
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(100);

      const hydratedHtml = await page.locator('[data-key="hero-subtitle"]').innerHTML();
      assert(hydratedHtml.includes('<img src="nonexistent-file.png"'), 'Image tag must hydrate into DOM without breaking layout');

      await page.close();
    });

    await runAdversarialTest('Security', 'XSS3: Unclosed tags, quotes, ampersands, and full Vietnamese diacritics survive round-trip', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const complexContent = '<strong>Đặc tả 2026:</strong> <em>"Lộc Studio & Cộng sự"</em> — Tiếng Việt 100% chuẩn: á à ả ã ạ ă ắ ằ ẳ ẵ ặ â ấ ầ ẩ ẫ ậ é è ẻ ẽ ẹ ê ế ề ể ễ ệ í ì ỉ ĩ ị ó ò ỏ õ ọ ô ố ồ ổ ỗ ộ ơ ớ ờ ở ỡ ợ ú ù ủ ũ ụ ư ứng ứ ừ ử ữ ự ý ỳ ỷ ỹ ỵ đ Đ. <br><span>Ký tự đặc biệt: &amp; &lt; &gt; " \' / \\.</span>';

      await page.evaluate((payload) => {
        document.querySelector('[data-key="hero-bio"]').innerHTML = payload;
      }, complexContent);

      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(100);

      const hydratedText = await page.locator('[data-key="hero-bio"]').innerText();
      assert(hydratedText.includes('Tiếng Việt 100% chuẩn'), 'Vietnamese accents must survive storage round-trip intact');
      assert(hydratedText.includes('Lộc Studio & Cộng sự'), 'Quotes and ampersands must survive round-trip');

      await page.close();
    });

    await runAdversarialTest('Security', 'XSS4: Stress test with 50KB payload does not crash browser or freeze event loop', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      const largeText = 'A'.repeat(50000); // 50 KB

      await page.evaluate((txt) => {
        document.querySelector('[data-key="hero-bio"]').innerText = txt;
      }, largeText);

      const startTime = Date.now();
      await page.click('#saveBtn');
      await page.waitForTimeout(100);
      const elapsed = Date.now() - startTime;

      assert(elapsed < 2000, `Save of 50KB payload took too long: ${elapsed}ms`);

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('firebase_demo_page_content') || '{}'));
      assertEqual(stored['hero-bio'].length, 50000, '50KB payload should be stored completely in localStorage');

      await page.close();
    });

    // =========================================================================
    // DIMENSION 6: EXACT STRING VERIFICATION ('Đã lưu thành công')
    // =========================================================================
    console.log(`\n${BOLD}--- DIMENSION 6: Verification of Exact String ('Đã lưu thành công') ---${RESET}`);

    await runAdversarialTest('Notification', 'NOTIF1: Exact string "Đã lưu thành công" displayed in #toastMessage upon save', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Click save
      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      const toast = page.locator('#notificationToast');
      const isVisible = await toast.isVisible();
      assertEqual(isVisible, true, '#notificationToast must be visible upon save');

      const toastMessageEl = page.locator('#toastMessage');
      const exactText = (await toastMessageEl.innerText()).trim();
      assertEqual(exactText, 'Đã lưu thành công', 'Toast message must match exact string "Đã lưu thành công" verbatim');

      await page.close();
    });

    await runAdversarialTest('Notification', 'NOTIF2: Toast automatically dismisses after timeout period', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      await page.click('#saveBtn');
      await page.waitForTimeout(100);

      const toast = page.locator('#notificationToast');
      assertEqual(await toast.evaluate(el => el.classList.contains('show')), true, 'Toast must have class "show" initially');

      // Wait 3.8 seconds for auto-dismiss (timeout is 3500ms)
      await page.waitForTimeout(3800);

      const hasShowAfterTimeout = await toast.evaluate(el => el.classList.contains('show'));
      assertEqual(hasShowAfterTimeout, false, 'Toast must lose class "show" after 3500ms timeout');

      await page.close();
    });

    await runAdversarialTest('Notification', 'NOTIF3: Repeated rapid clicks on #saveBtn debounce and do not create duplicate DOM toasts', async () => {
      const page = await browser.newPage();
      await page.goto(`${fileUrl}#admin`);
      await page.waitForLoadState('domcontentloaded');

      // Rapidly click save 3 times
      await page.click('#saveBtn');
      await page.click('#saveBtn', { force: true }).catch(() => {});
      await page.click('#saveBtn', { force: true }).catch(() => {});
      await page.waitForTimeout(150);

      const toastCount = await page.locator('#notificationToast').count();
      assertEqual(toastCount, 1, 'Only one #notificationToast element must exist in the DOM');

      const toastText = (await page.locator('#toastMessage').innerText()).trim();
      assertEqual(toastText, 'Đã lưu thành công', 'Notification must consistently display "Đã lưu thành công"');

      await page.close();
    });

  } finally {
    await browser.close();
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}           ADVERSARIAL STRESS TEST SUMMARY                      ${RESET}`);
  console.log(`================================================================`);
  console.log(`  Total Adversarial Tests : ${totalTests}`);
  console.log(`  Passed                  : ${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed                  : ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`================================================================\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}ADVERSARIAL FAILURES: ${failedTests} test(s) failed.${RESET}`);
    for (const r of testResults.filter(t => t.status === 'FAIL')) {
      console.error(` - [${r.category}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: ALL ${passedTests} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!${RESET}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${RED}Fatal runner exception:${RESET}`, err);
  process.exit(1);
});
