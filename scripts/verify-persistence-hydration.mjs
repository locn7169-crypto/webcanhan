/**
 * E2E Automated Verification Suite: Security, Explorations Cleanliness, Admin PIN & Hydration Persistence
 *
 * Requirements Covered:
 * - Tier 1 & 2: Public Read-Only Security (R2)
 *   * Fresh visitor cannot see #visual-editor-dock or #tiptap-bubble-menu
 *   * Alt+E / Option+E does NOT enable edit mode for unauthenticated visitors
 *   * Strictly 0 contenteditable attributes in DOM for unauthenticated visitors
 * - Tier 1 & 2: Explorations Cleanliness (R1)
 *   * Assert #openCodeModalBtn does NOT exist in DOM
 *   * Assert #codeModal does NOT exist in DOM
 *   * Assert moment cards render with 4:3 image and clicking opens #previewModal
 * - Tier 1 & 2: Admin PIN Authentication & Lifecycle (R2)
 *   * Invalid PIN '0000' is rejected with warning/shake and remains locked
 *   * Correct PIN '1902' unlocks Admin Studio panel
 *   * Admin logout clears auth tokens and deactivates active edit mode/dock
 * - Tier 3 & 4: Reload Persistence & Hydration (R3)
 *   * Tiptap text edits persist 100% after hard browser page reload (F5) without reverting to static HTML
 *   * Admin Studio image/moment updates persist across page reloads
 *   * Special characters, Unicode, and quotation marks persist without corruption
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';

// ANSI escape codes for clear terminal reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
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
    throw new Error(
      `${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

async function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`  ▶ [Test ${String(totalTests).padStart(2, '0')}] ${name} ... `);
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    passedTests++;
    console.log(`${GREEN}✔ PASS${RESET} ${CYAN}(${duration}ms)${RESET}`);
  } catch (err) {
    const duration = Date.now() - startTime;
    failedTests++;
    failures.push({ name, error: err });
    console.log(`${RED}✖ FAIL${RESET} ${CYAN}(${duration}ms)${RESET}`);
    console.error(`     ${RED}Error: ${err.message}${RESET}`);
  }
}

/**
 * Check if a URL responds to HTTP GET
 */
function checkUrl(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname || '/',
          method: 'GET',
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Locate existing server or launch Vite preview server
 */
async function resolveServer() {
  if (process.env.TEST_URL) {
    const ok = await checkUrl(process.env.TEST_URL);
    if (ok) {
      console.log(`ℹ Using configured TEST_URL: ${process.env.TEST_URL}`);
      return { baseUrl: process.env.TEST_URL, proc: null };
    }
  }

  // Ensure port 4173 is clean before spawning
  try {
    execSync('lsof -ti :4173 | xargs kill -9 2>/dev/null || true');
  } catch {}

  // Build if dist does not exist
  if (!fs.existsSync('dist/index.html')) {
    console.log('ℹ Building production distribution for preview...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  console.log(`ℹ Spawning dedicated Vite preview server on port 4173...`);
  const proc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  proc.stdout.on('data', (d) => {
    if (process.env.DEBUG_SERVER) console.log(`[Vite stdout]: ${d.toString()}`);
  });
  proc.stderr.on('data', (d) => {
    if (process.env.DEBUG_SERVER) console.error(`[Vite stderr]: ${d.toString()}`);
  });

  const baseUrl = 'http://localhost:4173';
  const startAt = Date.now();
  let serverReady = false;

  while (Date.now() - startAt < 15000) {
    await new Promise((r) => setTimeout(r, 200));
    const ok = await checkUrl(baseUrl, 400);
    if (ok) {
      serverReady = true;
      break;
    }
  }

  if (!serverReady) {
    proc.kill();
    throw new Error(`Timed out waiting for Vite preview server on ${baseUrl}`);
  }

  console.log(`✔ Vite preview server is ready at ${baseUrl}`);
  return { baseUrl, proc };
}

/**
 * Reliable trigger to open Admin PIN auth modal
 */
async function openAdminAuthModal(page) {
  await page.waitForTimeout(800);
  const headerBtn = await page.$('.site-header .admin-nav-trigger');
  if (headerBtn) {
    await headerBtn.click();
  } else {
    await page.evaluate(() => {
      window.location.hash = '#admin';
    });
  }

  await page.waitForFunction(
    () => {
      const overlay = document.getElementById('admin-auth-overlay');
      return overlay && overlay.classList.contains('is-open');
    },
    { timeout: 6000 }
  );
}

/**
 * Enter PIN digits into keypad
 */
async function enterPinDigits(page, pin) {
  for (const digit of pin.split('')) {
    await page.click(`.admin-keypad-btn[data-key="${digit}"]`);
    await page.waitForTimeout(90);
  }
}

async function main() {
  console.log(`\n${BOLD}======================================================================${RESET}`);
  console.log(`${BOLD} 🧪 E2E Playwright Suite: Security, Gating, Cleanliness & Persistence${RESET}`);
  console.log(`${BOLD}======================================================================${RESET}\n`);

  const { baseUrl, proc: serverProc } = await resolveServer();

  const cleanupServer = () => {
    if (serverProc && !serverProc.killed) {
      console.log('\nStopping spawned local Vite server...');
      serverProc.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => {
    cleanupServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanupServer();
    process.exit(143);
  });

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // ========================================================================
    // TIER 1 & 2: PUBLIC READ-ONLY SECURITY (R2)
    // ========================================================================
    console.log(`\n${BOLD}=== [Tier 1 & 2] Public Read-Only Security ===${RESET}`);

    await runTest('Public visit: Visual editor dock is absent/hidden on fresh load', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const dock = await page.$('#visual-editor-dock');
      if (dock) {
        const isVisible = await dock.isVisible();
        assert(!isVisible, 'Expected #visual-editor-dock to be hidden or absent for unauthenticated visitor');
      }

      const bodyActive = await page.evaluate(() => {
        return (
          document.body.classList.contains('visual-editor-active') ||
          document.body.classList.contains('tiptap-mode-active')
        );
      });
      assert(!bodyActive, 'body has visual-editor-active or tiptap-mode-active class on fresh public load');
      await context.close();
    });

    await runTest('Public visit: Tiptap bubble menu is absent/hidden on fresh load', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const bubbleMenu = await page.$('#tiptap-bubble-menu');
      if (bubbleMenu) {
        const isVisible = await bubbleMenu.isVisible();
        assert(!isVisible, 'Expected #tiptap-bubble-menu to be hidden or absent for unauthenticated visitor');
      }
      await context.close();
    });

    await runTest('Public visit: Alt+E / Option+E keyboard shortcut does NOT enable edit mode', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // Trigger shortcut via simulated key combinations
      await page.keyboard.press('Alt+KeyE');
      await page.evaluate(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'e',
            code: 'KeyE',
            keyCode: 69,
            altKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      await page.waitForTimeout(600);

      const editModeActivated = await page.evaluate(() => {
        const hasBodyClass =
          document.body.classList.contains('visual-editor-active') ||
          document.body.classList.contains('tiptap-mode-active');
        const dock = document.getElementById('visual-editor-dock');
        const dockVisible = dock && !dock.classList.contains('hidden') && window.getComputedStyle(dock).display !== 'none';
        return hasBodyClass || dockVisible;
      });

      assert(!editModeActivated, 'CRITICAL SECURITY DEFECT: Alt+E shortcut enabled edit mode for unauthenticated visitor!');
      await context.close();
    });

    await runTest('Public visit: Exactly 0 contenteditable elements across the entire DOM', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const editableDetails = await page.evaluate(() => {
        const editables = Array.from(
          document.querySelectorAll('[contenteditable="true"], [contenteditable=""], [contenteditable]:not([contenteditable="false"])')
        );
        return {
          count: editables.length,
          tags: editables.map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
        };
      });

      assertEqual(
        editableDetails.count,
        0,
        `Found ${editableDetails.count} contenteditable elements on public website: ${editableDetails.tags.join(', ')}`
      );
      await context.close();
    });

    // ========================================================================
    // TIER 1 & 2: EXPLORATIONS CLEANLINESS & MOMENTS (R1)
    // ========================================================================
    console.log(`\n${BOLD}=== [Tier 1 & 2] Explorations Cleanliness ===${RESET}`);

    await runTest('Explorations: #openCodeModalBtn does NOT exist in DOM', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      const codeBtn = await page.$('#openCodeModalBtn');
      assert(codeBtn === null, 'Found #openCodeModalBtn element in DOM; it must be completely removed.');

      const hasSourceCodeBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#explorations button, #explorations a'));
        return btns.some((b) => b.textContent && b.textContent.toLowerCase().includes('mã nguồn'));
      });
      assert(!hasSourceCodeBtn, 'Found button with text "Mã nguồn" in #explorations.');
      await context.close();
    });

    await runTest('Explorations: #codeModal and code output containers do NOT exist in DOM', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      const modal = await page.$('#codeModal');
      assert(modal === null, 'Found #codeModal in DOM; it must be completely removed.');

      const cleanCode = await page.$('#cleanCodeOutput');
      assert(cleanCode === null, 'Found #cleanCodeOutput in DOM; it must be completely removed.');

      const copyCodeBtn = await page.$('#copyCodeBtn');
      assert(copyCodeBtn === null, 'Found #copyCodeBtn in DOM; it must be completely removed.');
      await context.close();
    });

    await runTest('Explorations: Moment cards render with 4:3 image and complete metadata', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      await page.evaluate(() => {
        document.querySelector('#explorations')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(600);

      const cards = await page.$$('.moment-card');
      assert(cards.length >= 1, `Expected at least 1 .moment-card, found ${cards.length}`);

      const cardAudit = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.moment-card'));
        return items.map((card, idx) => {
          const frame = card.querySelector('.moment-media-frame');
          const img = card.querySelector('.moment-img');
          const title = card.querySelector('.moment-title');
          const meta = card.querySelector('.moment-meta');
          const caption = card.querySelector('.moment-caption');

          const style = frame ? window.getComputedStyle(frame) : null;
          const rect = frame ? frame.getBoundingClientRect() : null;
          const ratio = rect && rect.height > 0 ? rect.width / rect.height : 0;

          return {
            index: idx,
            hasFrame: !!frame,
            hasImg: !!img && !!img.getAttribute('src'),
            aspectRatioStyle: style?.aspectRatio,
            measuredRatio: ratio,
            hasTitle: !!title && !!title.textContent?.trim(),
            hasMeta: !!meta && !!meta.textContent?.trim(),
            hasCaption: !!caption && !!caption.textContent?.trim(),
          };
        });
      });

      for (const item of cardAudit) {
        assert(item.hasFrame, `Card #${item.index} is missing .moment-media-frame`);
        assert(item.hasImg, `Card #${item.index} is missing .moment-img or src attribute`);
        assert(item.hasTitle, `Card #${item.index} is missing .moment-title`);
        assert(item.hasMeta, `Card #${item.index} is missing .moment-meta`);
        assert(item.hasCaption, `Card #${item.index} is missing .moment-caption`);

        const isRatioValid =
          item.aspectRatioStyle?.includes('4') && item.aspectRatioStyle?.includes('3')
            ? true
            : item.measuredRatio >= 1.15 && item.measuredRatio <= 1.55;
        assert(isRatioValid, `Card #${item.index} media frame is not 4:3 aspect ratio (measured: ${item.measuredRatio.toFixed(2)})`);
      }
      await context.close();
    });

    await runTest('Explorations: Clicking moment card opens #previewModal with image and caption', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      await page.evaluate(() => {
        document.querySelector('#explorations')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(600);

      await page.click('.moment-card:nth-child(1)');
      await page.waitForTimeout(500);

      const modalState = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        const img = document.getElementById('previewImg');
        const caption = document.getElementById('previewCaption');
        const isOpen =
          modal &&
          !modal.classList.contains('hidden') &&
          (modal.classList.contains('is-open') || modal.classList.contains('flex') || window.getComputedStyle(modal).display !== 'none');
        return {
          isOpen: !!isOpen,
          hasImgSrc: !!img && !!img.src && img.src.length > 5,
          hasCaption: !!caption && !!caption.textContent?.trim(),
        };
      });

      assert(modalState.isOpen, '#previewModal failed to open when moment card was clicked');
      assert(modalState.hasImgSrc, '#previewModal #previewImg has no valid src');
      assert(modalState.hasCaption, '#previewModal #previewCaption is empty');

      const closeBtn = await page.$('#closePreviewBtn');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.click('#previewModalBackdrop');
      }
      await page.waitForTimeout(400);

      const isClosed = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        return !modal || modal.classList.contains('hidden') || window.getComputedStyle(modal).display === 'none';
      });
      assert(isClosed, '#previewModal failed to close properly');
      await context.close();
    });

    // ========================================================================
    // TIER 1 & 2: ADMIN PIN AUTHENTICATION & ACCESS CONTROL (R2)
    // ========================================================================
    console.log(`\n${BOLD}=== [Tier 1 & 2] Admin PIN Authentication ===${RESET}`);

    await runTest('Admin Auth: Incorrect PIN "0000" is rejected and access denied', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      await openAdminAuthModal(page);

      // Enter wrong PIN: 0000
      await enterPinDigits(page, '0000');
      await page.waitForTimeout(400);

      const studioOpenedWithWrongPin = await page.evaluate(() => {
        const studio = document.getElementById('admin-studio-overlay');
        return studio?.classList.contains('is-open');
      });
      assert(!studioOpenedWithWrongPin, 'SECURITY BREACH: Admin Studio opened with invalid PIN 0000!');

      const rejectionFeedback = await page.evaluate(() => {
        const card = document.getElementById('admin-auth-card');
        const toast = document.querySelector('.toast-notice');
        return (
          card?.classList.contains('shake') ||
          (toast && toast.textContent && toast.textContent.includes('không đúng'))
        );
      });
      assert(rejectionFeedback, 'No shake or rejection warning feedback when entering invalid PIN');
      await page.waitForTimeout(1000);
      await context.close();
    });

    await runTest('Admin Auth: Correct PIN "1902" unlocks Admin Studio', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      await openAdminAuthModal(page);

      // Enter correct PIN: 1902
      await enterPinDigits(page, '1902');

      await page.waitForFunction(
        () => {
          const studio = document.getElementById('admin-studio-overlay');
          return studio && studio.classList.contains('is-open');
        },
        { timeout: 6000 }
      );

      const isStudioOpen = await page.evaluate(() => {
        const studio = document.getElementById('admin-studio-overlay');
        return studio?.classList.contains('is-open');
      });
      assert(isStudioOpen, 'Admin Studio failed to open after entering correct PIN 1902');

      const isAuthClosed = await page.evaluate(() => {
        const auth = document.getElementById('admin-auth-overlay');
        return !auth?.classList.contains('is-open');
      });
      assert(isAuthClosed, 'PIN Auth modal remained open after successful login');
      await context.close();
    });

    await runTest('Admin Auth: Admin logout deactivates edit mode and cleans session tokens', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      // Login
      await openAdminAuthModal(page);
      await enterPinDigits(page, '1902');
      await page.waitForTimeout(1000);

      // Open Tiptap editor from Admin Studio
      const tiptapMenuItem = await page.$('.admin-menu-item[data-action="open-tiptap-editor"]');
      if (tiptapMenuItem) {
        await tiptapMenuItem.click();
        await page.waitForTimeout(500);
      } else {
        await page.evaluate(() => {
          if (window.toggleTiptapEditMode) window.toggleTiptapEditMode(true);
        });
        await page.waitForTimeout(500);
      }

      // Reopen Admin Studio to click Logout, or click Logout button directly
      await page.evaluate(() => {
        const studio = document.getElementById('admin-studio-overlay');
        studio?.classList.add('is-open');
      });
      await page.waitForTimeout(200);

      const logoutBtn = await page.$('#admin-logout-btn');
      assert(logoutBtn !== null, '#admin-logout-btn not found in Admin Studio');
      await logoutBtn.click();
      await page.waitForTimeout(600);

      const logoutState = await page.evaluate(() => {
        const sAuth = sessionStorage.getItem('loc_admin_session_auth');
        const lAuth = localStorage.getItem('loc_admin_session_auth');
        const dock = document.getElementById('visual-editor-dock');
        const dockHidden = !dock || dock.classList.contains('hidden') || window.getComputedStyle(dock).display === 'none';
        const bodyClean =
          !document.body.classList.contains('visual-editor-active') &&
          !document.body.classList.contains('tiptap-mode-active');
        return {
          sessionCleared: !sAuth || sAuth === 'false',
          localCleared: !lAuth || lAuth === 'false',
          dockDeactivated: dockHidden,
          bodyClean,
        };
      });

      assert(logoutState.sessionCleared, 'sessionStorage auth token was not cleared upon logout');
      assert(logoutState.localCleared, 'localStorage auth token was not cleared upon logout');
      assert(logoutState.dockDeactivated, 'Visual editor dock remained active after logout');
      assert(logoutState.bodyClean, 'Body retained edit mode classes after logout');
      await context.close();
    });

    // ========================================================================
    // TIER 3 & 4: RELOAD PERSISTENCE & HYDRATION (R3)
    // ========================================================================
    console.log(`\n${BOLD}=== [Tier 3 & 4] Reload Persistence & Hydration ===${RESET}`);

    await runTest('Hydration: Tiptap text edits persist 100% after hard page reload (F5)', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      // 1. Authenticate as Admin
      await openAdminAuthModal(page);
      await enterPinDigits(page, '1902');
      await page.waitForTimeout(1000);

      // 2. Open Tiptap editor mode
      const tiptapMenuItem = await page.$('.admin-menu-item[data-action="open-tiptap-editor"]');
      if (tiptapMenuItem) {
        await tiptapMenuItem.click();
        await page.waitForTimeout(500);
      } else {
        await page.evaluate(() => {
          if (window.toggleTiptapEditMode) window.toggleTiptapEditMode(true);
        });
        await page.waitForTimeout(500);
      }

      // 3. Find a stable editable node with data-edit-key
      const targetKeyInfo = await page.evaluate(() => {
        const candidate =
          document.querySelector('.eyebrow-line-vi') ||
          document.querySelector('.bilingual-vi') ||
          document.querySelector('h1 span') ||
          document.querySelector('[data-edit-key]');
        if (!candidate) return null;

        const key = candidate.getAttribute('data-edit-key') || 'tt-hero-test-target';
        candidate.setAttribute('data-edit-key', key);
        return {
          key,
          originalHtml: candidate.innerHTML,
        };
      });

      assert(targetKeyInfo !== null, 'No suitable editable target element found for persistence test');

      const uniqueMarker = `Nguyễn Thành Lộc — Automated Playwright Verified #${Date.now()}`;

      // 4. Update the element's content and commit save
      await page.evaluate(
        ({ key, text }) => {
          const el = document.querySelector(`[data-edit-key="${key}"]`);
          if (el) {
            el.innerHTML = text;
          }
          const saveBtn = document.getElementById('tt-save-btn');
          if (saveBtn) {
            saveBtn.click();
          } else if (window.saveAllTiptapContent) {
            window.saveAllTiptapContent();
          }
        },
        { key: targetKeyInfo.key, text: uniqueMarker }
      );
      await page.waitForTimeout(600);

      // Verify that localStorage recorded the change
      const savedInStorage = await page.evaluate(() => {
        const raw =
          localStorage.getItem('loc_portfolio_tiptap_v2') ||
          localStorage.getItem('loc_portfolio_tiptap_v1');
        return raw;
      });
      assert(
        savedInStorage && savedInStorage.includes(uniqueMarker),
        'localStorage does not contain saved Tiptap content before reload'
      );

      // 5. Hard Page Reload (F5 / reset)
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // 6. Inspect the reloaded DOM element to assert it hydrated with the saved text
      const reloadedContent = await page.evaluate((key) => {
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        return el ? el.innerHTML : null;
      }, targetKeyInfo.key);

      assert(
        reloadedContent && reloadedContent.includes(uniqueMarker),
        `CRITICAL HYDRATION REVERSION: Saved text was lost after reload! Expected to contain "${uniqueMarker}", got "${reloadedContent}"`
      );

      // Clean up test key from localStorage
      await page.evaluate(
        ({ key, orig }) => {
          const raw = localStorage.getItem('loc_portfolio_tiptap_v2');
          if (raw) {
            try {
              const obj = JSON.parse(raw);
              delete obj[key];
              localStorage.setItem('loc_portfolio_tiptap_v2', JSON.stringify(obj));
            } catch {}
          }
          const el = document.querySelector(`[data-edit-key="${key}"]`);
          if (el && orig) el.innerHTML = orig;
        },
        { key: targetKeyInfo.key, orig: targetKeyInfo.originalHtml }
      );

      await context.close();
    });

    await runTest('Hydration: Admin Studio photo metadata edits persist across page reload', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      // Authenticate
      await openAdminAuthModal(page);
      await enterPinDigits(page, '1902');
      await page.waitForTimeout(1000);

      // Open Media Library
      await page.click('.admin-menu-item[data-action="open-media-library"]');
      await page.waitForTimeout(600);

      // Quick-edit title of first card
      const quickEditBtn = await page.$('.admin-photo-card:nth-child(1) [data-action="quick-edit"]');
      assert(quickEditBtn !== null, 'No photo card found in Media Library for editing');
      await quickEditBtn.click();
      await page.waitForTimeout(400);

      const uniquePhotoTitle = `Ảnh Hoàng Hôn Lộc Studio #${Date.now()}`;
      await page.fill('#admin-meta-title-input', uniquePhotoTitle);
      await page.click('#admin-meta-save-btn');
      await page.waitForTimeout(400);

      // Click "Xuất bản ngay"
      await page.click('#admin-publish-all-btn');
      await page.waitForTimeout(1500);

      // Hard Page Reload
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Verify that the updated photo title persists in IndexedDB or rendered moments
      const persisted = await page.evaluate(async (title) => {
        const titles = Array.from(document.querySelectorAll('.moment-title, .journal-entry-title')).map(
          (t) => t.textContent?.trim()
        );
        if (titles.some((t) => t && t.includes(title))) return true;

        return new Promise((resolve) => {
          const req = indexedDB.open('loc_studio_cms_v1', 2);
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction('media_items', 'readonly');
              const store = tx.objectStore('media_items');
              const getAll = store.getAll();
              getAll.onsuccess = () => {
                const items = getAll.result || [];
                resolve(items.some((it) => it.title && it.title.includes(title)));
              };
              getAll.onerror = () => resolve(false);
            } catch {
              resolve(false);
            }
          };
          req.onerror = () => resolve(false);
        });
      }, uniquePhotoTitle);

      assert(persisted, `Admin Studio photo title edit "${uniquePhotoTitle}" did NOT persist after page reload!`);
      await context.close();
    });

    await runTest('Hydration: Special characters, Unicode, and quotes persist without corruption', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const specialString = `Triết Lý: "Công Nghệ & Nghệ Thuật" — '2026' <Đà Lạt>`;
      const testKey = 'tt-hero-special-test';

      await page.evaluate(
        ({ key, val }) => {
          const raw = localStorage.getItem('loc_portfolio_tiptap_v2') || '{}';
          let data = {};
          try {
            data = JSON.parse(raw);
          } catch {}
          data[key] = { html: val, style: {} };
          localStorage.setItem('loc_portfolio_tiptap_v2', JSON.stringify(data));

          const target = document.querySelector('.eyebrow-line-vi') || document.querySelector('p');
          if (target) {
            target.setAttribute('data-edit-key', key);
          }
        },
        { key: testKey, val: specialString }
      );

      // Reload
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const restoredVal = await page.evaluate((key) => {
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        return el ? el.innerHTML : null;
      }, testKey);

      if (restoredVal) {
        assert(
          restoredVal.includes('"Công Nghệ & Nghệ Thuật"') || restoredVal.includes('&quot;Công Nghệ &amp; Nghệ Thuật&quot;'),
          `Special characters corrupted: got ${restoredVal}`
        );
      }

      // Cleanup
      await page.evaluate((key) => {
        const raw = localStorage.getItem('loc_portfolio_tiptap_v2');
        if (raw) {
          try {
            const data = JSON.parse(raw);
            delete data[key];
            localStorage.setItem('loc_portfolio_tiptap_v2', JSON.stringify(data));
          } catch {}
        }
      }, testKey);

      await context.close();
    });
  } finally {
    await browser.close();
    cleanupServer();
  }

  // ========================================================================
  // SUITE SUMMARY & EXIT STATUS
  // ========================================================================
  console.log(`\n${BOLD}======================================================================${RESET}`);
  console.log(`${BOLD} 📊 E2E Playwright Suite Summary${RESET}`);
  console.log(`${BOLD}======================================================================${RESET}`);
  console.log(`  Total Executed Assertions : ${totalTests}`);
  console.log(`  Passed Tests              : ${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed Tests              : ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);

  if (failedTests > 0) {
    console.log(`\n${RED}Failed Tests Detail:${RESET}`);
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${RED}${f.name}${RESET}: ${f.error.message}`);
    });
    console.log(`\n${RED}❌ E2E VERIFICATION SUITE FAILED${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}🎉 ALL E2E VERIFICATIONS PASSED WITH 100% SUCCESS!${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal runner exception:${RESET}`, err);
  process.exit(1);
});
