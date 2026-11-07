/**
 * Milestone M1 Adversarial Stress Test Harness
 * Author: Empirical Challenger 2 (Milestone M1)
 *
 * Verifies:
 * 1. Strict absence of #codeModal, #cleanCodeOutput, #openCodeModalBtn, .btn-clean-code in DOM
 * 2. Explorations header layout & moment card 4:3 structure
 * 3. Rapid click stress on moment cards
 * 4. Escape key dismissal while open and when closed
 * 5. High-frequency repeated open/close cycle (25 iterations) across varied triggers (btn, backdrop, Escape)
 * 6. Body scroll-lock integrity (overflow restored properly every cycle)
 * 7. Window object pollution / orphan DOM nodes check
 * 8. Album button transition from preview modal to journal modal
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedCount = 0;
let failedCount = 0;
const failureDetails = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function test(name, fn) {
  process.stdout.write(`  [CHALLENGE TEST] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const elapsed = Date.now() - start;
    console.log(`${GREEN}PASS${RESET} (${elapsed}ms)`);
    passedCount++;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`${RED}FAIL${RESET} (${elapsed}ms)`);
    console.error(`    ${RED}Reason: ${err.message}${RESET}`);
    failedCount++;
    failureDetails.push({ name, err: err.message, stack: err.stack });
  }
}

function checkPort(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname,
          port: u.port,
          path: u.pathname || '/',
          method: 'GET',
          timeout: timeoutMs,
        },
        (res) => resolve(res.statusCode >= 200 && res.statusCode < 500)
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

async function startServer() {
  if (process.env.TEST_URL) {
    if (await checkPort(process.env.TEST_URL, 800)) {
      console.log(`ℹ Using configured TEST_URL: ${process.env.TEST_URL}`);
      return { url: process.env.TEST_URL, proc: null };
    }
  }

  const ports = [4173, 5173, 3000];
  for (const p of ports) {
    if (await checkPort(`http://127.0.0.1:${p}`, 800)) {
      console.log(`ℹ Reusing existing server on port ${p}`);
      return { url: `http://127.0.0.1:${p}`, proc: null };
    }
  }

  console.log(`ℹ Spawning Vite dev server on 127.0.0.1:3000...`);
  const proc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '3000'], { stdio: 'pipe' });
  proc.stdout.on('data', (d) => {
    if (process.env.DEBUG) console.log(`[Vite stdout]: ${d}`);
  });
  proc.stderr.on('data', (d) => {
    if (process.env.DEBUG) console.error(`[Vite stderr]: ${d}`);
  });

  const url = 'http://127.0.0.1:3000';
  const startAt = Date.now();
  let ok = false;
  while (Date.now() - startAt < 20000) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkPort(url, 400)) {
      ok = true;
      break;
    }
  }
  if (!ok) {
    proc.kill();
    throw new Error('Vite server failed to start within 20 seconds');
  }
  console.log(`✔ Vite server active at ${url}`);
  return { url, proc };
}

async function runAll() {
  console.log(`\n======================================================`);
  console.log(`🔥 EMPIRICAL CHALLENGER 2: Milestone M1 Stress Suite`);
  console.log(`======================================================\n`);

  // Static checks first
  console.log(`--- [STATIC AUDIT] ---`);
  await test('Static: Verify index.html does not contain codeModal or openCodeModalBtn', async () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert(!html.includes('id="codeModal"'), 'index.html contains id="codeModal"');
    assert(!html.includes('id="cleanCodeOutput"'), 'index.html contains id="cleanCodeOutput"');
    assert(!html.includes('id="openCodeModalBtn"'), 'index.html contains id="openCodeModalBtn"');
    assert(!html.includes('class="btn-clean-code"'), 'index.html contains class="btn-clean-code"');
    assert(!html.includes('btn-copy-code'), 'index.html contains btn-copy-code');
    assert(!html.includes('moment-code-dialog'), 'index.html contains moment-code-dialog');
  });

  await test('Static: Verify src/styles/main.css has no dead code modal classes', async () => {
    const css = fs.readFileSync(path.resolve('src/styles/main.css'), 'utf8');
    assert(!css.includes('.btn-clean-code'), 'main.css contains .btn-clean-code');
    assert(!css.includes('.moment-code-dialog'), 'main.css contains .moment-code-dialog');
    assert(!css.includes('.btn-copy-code'), 'main.css contains .btn-copy-code');
    assert(!css.includes('.moment-code-pre'), 'main.css contains .moment-code-pre');
  });

  await test('Static: Verify explorations-moments.ts has no code modal functions or handlers', async () => {
    const ts = fs.readFileSync(path.resolve('src/scripts/explorations-moments.ts'), 'utf8');
    assert(!ts.includes('openCodeModal'), 'explorations-moments.ts still defines or calls openCodeModal');
    assert(!ts.includes('closeCodeModal'), 'explorations-moments.ts still defines or calls closeCodeModal');
    assert(!ts.includes('copyCleanCode'), 'explorations-moments.ts still defines or calls copyCleanCode');
    assert(!ts.includes('cleanCodeOutput'), 'explorations-moments.ts still references cleanCodeOutput');
  });

  console.log(`\n--- [RUNTIME & LIVE BROWSER STRESS TESTS] ---`);
  const { url, proc } = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Listen for uncaught page errors
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#moments-grid .moment-card', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Test 1: DOM queries must return null
    await test('DOM queries: #codeModal, #cleanCodeOutput, #openCodeModalBtn, .btn-clean-code return null', async () => {
      const res = await page.evaluate(() => {
        return {
          codeModal: document.querySelector('#codeModal'),
          cleanCodeOutput: document.querySelector('#cleanCodeOutput'),
          openCodeModalBtn: document.querySelector('#openCodeModalBtn'),
          btnCleanCode: document.querySelector('.btn-clean-code'),
          btnCleanCodeAll: document.querySelectorAll('.btn-clean-code').length,
          codeModalBackdrop: document.querySelector('#codeModalBackdrop'),
          copyCodeBtn: document.querySelector('#copyCodeBtn'),
          closeCodeBtn: document.querySelector('#closeCodeBtn'),
          windowOpenCode: (window).openCodeModal,
          windowCloseCode: (window).closeCodeModal,
          windowCopyCleanCode: (window).copyCleanCode,
        };
      });

      assertEqual(res.codeModal, null, '#codeModal is not null');
      assertEqual(res.cleanCodeOutput, null, '#cleanCodeOutput is not null');
      assertEqual(res.openCodeModalBtn, null, '#openCodeModalBtn is not null');
      assertEqual(res.btnCleanCode, null, '.btn-clean-code is not null');
      assertEqual(res.btnCleanCodeAll, 0, '.btn-clean-code count > 0');
      assertEqual(res.codeModalBackdrop, null, '#codeModalBackdrop is not null');
      assertEqual(res.copyCodeBtn, null, '#copyCodeBtn is not null');
      assertEqual(res.closeCodeBtn, null, '#closeCodeBtn is not null');
      assertEqual(res.windowOpenCode, undefined, 'window.openCodeModal is defined');
      assertEqual(res.windowCloseCode, undefined, 'window.closeCodeModal is defined');
      assertEqual(res.windowCopyCleanCode, undefined, 'window.copyCleanCode is defined');
    });

    // Test 2: Explorations Section layout & 4:3 cards
    await test('Explorations layout: Only .explorations-header-left in header, 4 cards with 4:3 media', async () => {
      const audit = await page.evaluate(() => {
        const headerRow = document.querySelector('.explorations-header-row');
        const headerLeft = headerRow?.querySelector('.explorations-header-left');
        const headerActions = headerRow?.querySelector('.explorations-header-actions');
        const cards = Array.from(document.querySelectorAll('#moments-grid .moment-card'));

        const cardDetails = cards.map((card, i) => {
          const frame = card.querySelector('.moment-media-frame');
          const img = card.querySelector('.moment-img');
          const title = card.querySelector('.moment-title');
          const meta = card.querySelector('.moment-meta');
          const caption = card.querySelector('.moment-caption');
          const style = frame ? window.getComputedStyle(frame) : null;
          const rect = frame ? frame.getBoundingClientRect() : null;
          return {
            index: i,
            hasFrame: !!frame,
            hasImg: !!img && !!img.src,
            hasTitle: !!title && !!title.textContent.trim(),
            hasMeta: !!meta && !!meta.textContent.trim(),
            hasCaption: !!caption && !!caption.textContent.trim(),
            aspectRatioStyle: style?.aspectRatio,
            measuredRatio: rect && rect.height > 0 ? rect.width / rect.height : 0,
          };
        });

        return {
          hasHeaderLeft: !!headerLeft,
          hasHeaderActions: !!headerActions,
          cardCount: cards.length,
          cardDetails,
        };
      });

      assert(audit.hasHeaderLeft, 'Missing .explorations-header-left');
      assert(!audit.hasHeaderActions, 'Orphan .explorations-header-actions found in header');
      assertEqual(audit.cardCount, 4, 'Expected exactly 4 moment cards in #moments-grid');

      for (const c of audit.cardDetails) {
        assert(c.hasFrame, `Card ${c.index} missing media frame`);
        assert(c.hasImg, `Card ${c.index} missing img or src`);
        assert(c.hasTitle, `Card ${c.index} missing title`);
        assert(c.hasMeta, `Card ${c.index} missing meta`);
        assert(c.hasCaption, `Card ${c.index} missing caption`);
        const ratioValid =
          c.aspectRatioStyle?.includes('4') && c.aspectRatioStyle?.includes('3')
            ? true
            : c.measuredRatio >= 1.2 && c.measuredRatio <= 1.5;
        assert(ratioValid, `Card ${c.index} does not have 4:3 aspect ratio (ratio: ${c.measuredRatio})`);
      }
    });

    // Test 3: Normal Preview Modal Open & Close + Scroll-lock verification
    await test('Preview Modal: Open by clicking card, verify content & body scroll-lock, close via close btn', async () => {
      // Scroll to explorations
      await page.evaluate(() => {
        document.querySelector('#explorations')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(300);

      // Click first card
      await page.click('#moments-grid .moment-card:nth-child(1)');
      await page.waitForTimeout(300);

      const openState = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        const img = document.getElementById('previewImg');
        const caption = document.getElementById('previewCaption');
        const meta = document.getElementById('previewMeta');
        const isOpen =
          modal &&
          !modal.classList.contains('hidden') &&
          (modal.classList.contains('flex') || modal.classList.contains('is-open'));
        return {
          isOpen: !!isOpen,
          display: modal ? window.getComputedStyle(modal).display : 'none',
          bodyOverflow: document.body.style.overflow,
          imgSrc: img ? img.src : null,
          caption: caption ? caption.textContent.trim() : null,
          meta: meta ? meta.textContent.trim() : null,
        };
      });

      assert(openState.isOpen, 'Preview modal failed to open upon card click');
      assertEqual(openState.bodyOverflow, 'hidden', 'Body overflow was not set to "hidden" when modal opened');
      assert(openState.imgSrc && openState.imgSrc.length > 5, 'Preview image src is missing');
      assert(openState.caption && openState.caption.length > 0, 'Preview caption is empty');

      // Click close button
      await page.click('#closePreviewBtn');
      await page.waitForTimeout(300);

      const closedState = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        const isHidden = modal && modal.classList.contains('hidden');
        return {
          isHidden: !!isHidden,
          bodyOverflow: document.body.style.overflow,
        };
      });

      assert(closedState.isHidden, 'Preview modal did not gain "hidden" class upon close button click');
      assertEqual(closedState.bodyOverflow, '', 'Body overflow was not restored to empty string upon modal close');
    });

    // Test 4: Escape Key dismissal behavior
    await test('Edge Case: Pressing Escape while preview modal is open closes it; Escape when closed is safe', async () => {
      // Click card 2
      await page.click('#moments-grid .moment-card:nth-child(2)');
      await page.waitForTimeout(300);

      let modalOpen = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        return modal && !modal.classList.contains('hidden');
      });
      assert(modalOpen, 'Modal did not open on card 2 click');

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      let modalClosed = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        return modal && modal.classList.contains('hidden') && document.body.style.overflow === '';
      });
      assert(modalClosed, 'Modal did not close on Escape key');

      // Press Escape again when already closed
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      const stillClean = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        return modal && modal.classList.contains('hidden') && document.body.style.overflow === '';
      });
      assert(stillClean, 'Pressing Escape while modal was closed caused regression in state or scroll lock');
    });

    // Test 5: Rapid Concurrent Clicking Stress
    await test('Edge Case: Rapid burst clicking across multiple moment cards without delay', async () => {
      // Rapid fire clicks on cards 1, 2, 3, 4 with minimal delays
      const burstClicks = async () => {
        await page.evaluate(() => {
          const cards = document.querySelectorAll('#moments-grid .moment-card');
          // Fire synthetic clicks in micro-burst
          cards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          cards[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          cards[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          cards[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
      };

      await burstClicks();
      await page.waitForTimeout(400);

      const modalState = await page.evaluate(() => {
        const modal = document.getElementById('previewModal');
        const img = document.getElementById('previewImg');
        const caption = document.getElementById('previewCaption');
        return {
          isOpen: modal && !modal.classList.contains('hidden'),
          bodyOverflow: document.body.style.overflow,
          imgSrc: img ? img.src : null,
          caption: caption ? caption.textContent.trim() : null,
        };
      });

      assert(modalState.isOpen, 'Preview modal failed to open after burst clicks');
      assertEqual(modalState.bodyOverflow, 'hidden', 'Scroll lock missing after burst clicks');
      assert(modalState.imgSrc && modalState.imgSrc.length > 5, 'Preview image src missing after burst');

      // Close cleanly
      await page.click('#closePreviewBtn');
      await page.waitForTimeout(300);

      const closed = await page.evaluate(() => {
        const m = document.getElementById('previewModal');
        return m && m.classList.contains('hidden') && document.body.style.overflow === '';
      });
      assert(closed, 'Modal failed to close cleanly after burst click test');
    });

    // Test 6: High Frequency Repeated Open/Close Cycles (25 iterations)
    await test('Stress: 25 rapid open/close cycles alternating CloseBtn, Backdrop, and Escape', async () => {
      const iterations = 25;
      for (let i = 0; i < iterations; i++) {
        const cardIndex = (i % 4) + 1;
        // Click card
        await page.click(`#moments-grid .moment-card:nth-child(${cardIndex})`);
        await page.waitForTimeout(60);

        // Verify open
        const isOpen = await page.evaluate(() => {
          const m = document.getElementById('previewModal');
          return m && !m.classList.contains('hidden') && document.body.style.overflow === 'hidden';
        });
        if (!isOpen) {
          throw new Error(`Cycle ${i + 1}: modal failed to open on card ${cardIndex}`);
        }

        // Close by alternating method
        const method = i % 3;
        if (method === 0) {
          await page.click('#closePreviewBtn');
        } else if (method === 1) {
          // Backdrop click at (15, 15) to hit the visible backdrop outside the centered dialog
          await page.click('#previewModalBackdrop', { position: { x: 15, y: 15 } });
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(60);

        // Verify closed
        const isClosed = await page.evaluate(() => {
          const m = document.getElementById('previewModal');
          return m && m.classList.contains('hidden') && document.body.style.overflow === '';
        });
        if (!isClosed) {
          throw new Error(`Cycle ${i + 1}: modal failed to close cleanly using method ${method}`);
        }
      }
    });

    // Test 7: DOM Integrity & Orphan Nodes Assertions
    await test('DOM Integrity: Exactly 1 #previewModal, no orphaned backdrops or modal clones', async () => {
      const domStats = await page.evaluate(() => {
        return {
          previewModalCount: document.querySelectorAll('#previewModal').length,
          previewBackdropCount: document.querySelectorAll('#previewModalBackdrop').length,
          previewCloseBtnCount: document.querySelectorAll('#closePreviewBtn').length,
          orphanCodeModals: document.querySelectorAll('[id*="codeModal"]').length,
          orphanCodePre: document.querySelectorAll('.moment-code-pre').length,
          orphanBackdrops: document.querySelectorAll('.moment-modal-backdrop').length,
          // Total modals in entire app: previewModal + journalModal + adminStudioOverlay + adminAuthOverlay + (optional other modals)
          totalModalsWithRoleDialog: document.querySelectorAll('[role="dialog"]').length,
        };
      });

      assertEqual(domStats.previewModalCount, 1, 'Duplicate #previewModal nodes found');
      assertEqual(domStats.previewBackdropCount, 1, 'Duplicate #previewModalBackdrop nodes found');
      assertEqual(domStats.previewCloseBtnCount, 1, 'Duplicate #closePreviewBtn nodes found');
      assertEqual(domStats.orphanCodeModals, 0, 'Found orphan elements with id containing codeModal');
      assertEqual(domStats.orphanCodePre, 0, 'Found orphan .moment-code-pre elements');
    });

    // Test 8: Full Album button inside Preview Modal transitions smoothly to Journal Modal
    await test('Transition: #previewViewAlbumBtn inside PreviewModal closes preview and opens Journal', async () => {
      // Open preview modal on card 1
      await page.click('#moments-grid .moment-card:nth-child(1)');
      await page.waitForTimeout(300);

      // Click "Mở toàn bộ album"
      await page.click('#previewViewAlbumBtn');
      await page.waitForTimeout(500);

      const transitionState = await page.evaluate(() => {
        const previewModal = document.getElementById('previewModal');
        const journalModal = document.getElementById('exploration-journal-modal');
        return {
          previewHidden: previewModal?.classList.contains('hidden'),
          journalVisible:
            journalModal &&
            !journalModal.hasAttribute('hidden') &&
            journalModal.classList.contains('is-open'),
        };
      });

      assert(transitionState.previewHidden, 'Preview modal was not hidden when view album was clicked');
      assert(transitionState.journalVisible, 'Journal modal failed to open from preview modal view album trigger');

      // Close journal modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      const allClosed = await page.evaluate(() => {
        const p = document.getElementById('previewModal');
        const j = document.getElementById('exploration-journal-modal');
        return p?.classList.contains('hidden') && (!j?.classList.contains('is-open') || j?.hasAttribute('hidden'));
      });
      assert(allClosed, 'Modals failed to close after Escape key');
    });

    // Check for runtime exceptions during all operations
    await test('Runtime: No uncaught console errors or page exceptions occurred during tests', async () => {
      assertEqual(pageErrors.length, 0, `Captured page errors: ${JSON.stringify(pageErrors)}`);
    });

    await context.close();
  } finally {
    await browser.close();
    if (proc) {
      proc.kill('SIGTERM');
      console.log(`ℹ Killed test Vite process`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 ADVERSARIAL STRESS RESULTS:`);
  console.log(`   Passed: ${GREEN}${passedCount}${RESET}`);
  console.log(`   Failed: ${failedCount > 0 ? RED : GREEN}${failedCount}${RESET}`);
  console.log(`======================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
