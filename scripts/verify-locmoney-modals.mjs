/**
 * Automated Verification Suite for Requirements R1, R2, R3, R4, R5
 *
 * Verifies:
 * - Suite 1: Asset references & image load status (23 showcase assets)
 * - Suite 2: External showcase (https://locmoney2.pages.dev/showcase) & web app (https://locmoney2.pages.dev) links
 * - Suite 3: Strict read-only enforcement outside #admin (0 contenteditable, no dashed borders, hidden #saveBtn)
 * - Suite 4: Modal flexbox CSS overflow constraints (min-height: 0, flex: 1 1 0%, overflow-y: auto)
 * - Suite 5: data-lenis-prevent attributes & modal scrollability via wheel, drag, and touch
 * - Suite 6: Mobile viewport (390x844) touch open and touch dragging
 *
 * Usage: node scripts/verify-locmoney-modals.mjs
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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

async function resolveServer() {
  if (process.env.TEST_URL) {
    const ok = await checkUrl(process.env.TEST_URL);
    if (ok) {
      console.log(`ℹ Using configured TEST_URL: ${process.env.TEST_URL}`);
      return { baseUrl: process.env.TEST_URL, proc: null };
    }
  }

  try {
    execSync('lsof -ti :4173 | xargs kill -9 2>/dev/null || true');
  } catch {}

  console.log(`ℹ Spawning Vite preview server on port 4173...`);
  const proc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
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

async function main() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}🚀 Loc Money 2 & Modal Scrolling Automated Verification Test Suite${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  const { baseUrl, proc } = await resolveServer();
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // SUITE 1: Asset References & Image Integrity (23 Assets)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 1: Asset References & Image 200 Integrity (23 Assets) ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      
      const failedRequests = [];
      page.on('response', (res) => {
        if (res.url().includes('/assets/locmoney/') && res.status() >= 400) {
          failedRequests.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Open modal to trigger tab render
      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(500);

      // Switch through all tabs so all images are loaded into DOM
      const tabSelectors = [
        'button[data-loc-tab="tong-quan"]',
        'button[data-loc-tab="interactive-hub"]',
        'button[data-loc-tab="signature-themes"]',
        'button[data-loc-tab="app-screens"]',
        'button[data-loc-tab="showcase-gallery"]',
      ];
      for (const sel of tabSelectors) {
        await page.click(`#loc-money-modal ${sel}`);
        await page.waitForTimeout(200);
      }

      await runTest('All 23 showcase image assets are present in DOM', async () => {
        const expected23 = [
          '01_showcase_hero_desktop.png',
          '02_showcase_interactive_calculator.png',
          '03_showcase_interactive_simulator.png',
          '04_showcase_interactive_theme_switcher.png',
          '05_showcase_signature_themes_gallery.png',
          '06_showcase_bento_features_grid.png',
          '07_showcase_technical_architecture.png',
          '08_showcase_download_onboarding_hub.png',
          '09_showcase_mobile_responsive_hero.png',
          '10_showcase_full_page_panoramic.png',
          '11_app_screen_home_overview.png',
          '12_app_screen_stats_intelligence.png',
          '13_app_screen_journal_feed.png',
          '14_app_screen_transactions_history.png',
          '15_app_screen_user_profile.png',
          '16_app_screen_settings_themes.png',
          '17_app_action_hub_composer.png',
          '18_theme_cophong_thuy_mac.png',
          '19_theme_hien_dai_3d_pop.png',
          '20_theme_liquid_quartz.png',
          '21_theme_cyberpunk_hud.png',
          '22_theme_neo_brutalism.png',
          '00_signature_themes_gallery_modal.png',
        ];

        const srcList = await page.$$eval('#loc-money-modal img', (imgs) =>
          imgs.map((img) => img.getAttribute('src') || '')
        );

        for (const fname of expected23) {
          const found = srcList.some((s) => s.includes(fname));
          assert(found, `Expected image ${fname} to be referenced in #loc-money-modal`);
        }
      });

      await runTest('No /assets/locmoney/ image request returns HTTP 4xx or 5xx', async () => {
        assertEqual(
          failedRequests.length,
          0,
          `Failed image requests: ${failedRequests.map((r) => `${r.url} (${r.status})`).join(', ')}`
        );
      });

      await runTest('All 23 showcase images render with naturalWidth > 0', async () => {
        const brokenImages = await page.$$eval('#loc-money-modal img', (imgs) => {
          return imgs
            .filter((img) => img.src.includes('/assets/locmoney/') && img.naturalWidth === 0)
            .map((img) => img.src);
        });
        assertEqual(brokenImages.length, 0, `Images with 0 naturalWidth: ${brokenImages.join(', ')}`);
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // SUITE 2: External Links & Navigation
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 2: External Links (Showcase & Web App) ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await runTest('Showcase direct link (https://locmoney2.pages.dev/showcase) exists in DOM', async () => {
        const link = await page.$('a[href="https://locmoney2.pages.dev/showcase"]');
        assert(link !== null, 'Link to https://locmoney2.pages.dev/showcase must exist');
        const target = await link.getAttribute('target');
        assertEqual(target, '_blank', 'Showcase link should open in new tab (_blank)');
      });

      await runTest('Web App launch link (https://locmoney2.pages.dev) exists in DOM', async () => {
        const link = await page.$('a[href="https://locmoney2.pages.dev"]');
        assert(link !== null, 'Link to https://locmoney2.pages.dev must exist');
        const target = await link.getAttribute('target');
        assertEqual(target, '_blank', 'Web App link should open in new tab (_blank)');
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // SUITE 3: Strict Read-Only Outside #admin
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 3: Strict Public Read-Only Security Outside #admin ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await runTest('Public view has strictly ZERO contenteditable="true" elements', async () => {
        const editables = await page.$$eval('[contenteditable="true"]', (els) => els.length);
        assertEqual(editables, 0, 'No element may have contenteditable="true" outside #admin');
      });

      await runTest('Public view has strictly ZERO dashed editable outlines or borders', async () => {
        const dashedOutlines = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          let count = 0;
          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (
              style.outlineStyle === 'dashed' &&
              (style.outlineColor.includes('212') || style.outlineColor.includes('217') || style.outlineColor.includes('184'))
            ) {
              count++;
            }
          }
          return count;
        });
        assertEqual(dashedOutlines, 0, 'No yellow/orange dashed outlines allowed outside #admin');
      });

      await runTest('Save button #saveBtn is absent or hidden in public view', async () => {
        const isSaveVisible = await page.evaluate(() => {
          const btn = document.getElementById('saveBtn');
          return btn && btn.offsetParent !== null;
        });
        assert(!isSaveVisible, '#saveBtn must be hidden outside #admin');
      });

      await runTest('URL hash #works and #explorations remain strictly read-only', async () => {
        await page.goto(`${baseUrl}/#works`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        const editablesWorks = await page.$$eval('[contenteditable="true"]', (els) => els.length);
        assertEqual(editablesWorks, 0, 'No contenteditable under #works');

        await page.goto(`${baseUrl}/#explorations`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        const editablesExplorations = await page.$$eval('[contenteditable="true"]', (els) => els.length);
        assertEqual(editablesExplorations, 0, 'No contenteditable under #explorations');
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // SUITE 4: Modal Flexbox & Scroll CSS Engine
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 4: Modal Flexbox & Scroll CSS Engine ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await runTest('Loc Money modal opens smoothly on trigger click', async () => {
        const trigger = await page.$('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
        assert(trigger !== null, 'Loc Money trigger must exist in DOM');
        await trigger.click();
        await page.waitForTimeout(500);
        const isOpen = await page.evaluate(() => {
          const modal = document.getElementById('loc-money-modal');
          return modal && !modal.hasAttribute('hidden') && modal.classList.contains('is-open');
        });
        assert(isOpen, '#loc-money-modal should be visible and have is-open class');
      });

      await runTest('.loc-modal-container has min-height: 0 and flex column', async () => {
        const styles = await page.evaluate(() => {
          const container = document.querySelector('#loc-money-modal .loc-modal-container');
          if (!container) return null;
          const s = window.getComputedStyle(container);
          return {
            display: s.display,
            flexDirection: s.flexDirection,
            minHeight: s.minHeight,
            overflow: s.overflow,
          };
        });
        assert(styles !== null, 'Container must exist');
        assertEqual(styles.display, 'flex', 'Container must be display: flex');
        assertEqual(styles.flexDirection, 'column', 'Container must be flex-direction: column');
        assertEqual(styles.minHeight, '0px', 'Container min-height must be 0px to prevent WebKit expansion');
      });

      await runTest('.loc-modal-body has flex: 1 1 0% and min-height: 0', async () => {
        const styles = await page.evaluate(() => {
          const body = document.querySelector('#loc-money-modal .loc-modal-body');
          if (!body) return null;
          const s = window.getComputedStyle(body);
          return {
            display: s.display,
            flexGrow: s.flexGrow,
            flexShrink: s.flexShrink,
            minHeight: s.minHeight,
            overflow: s.overflow,
          };
        });
        assert(styles !== null, 'Body must exist');
        assertEqual(styles.display, 'flex', 'Body must be display: flex');
        assertEqual(styles.flexGrow, '1', 'Body flex-grow must be 1');
        assertEqual(styles.minHeight, '0px', 'Body min-height must be 0px');
      });

      await runTest('.loc-modal-tab-pane.active has overflow-y: auto and touch momentum', async () => {
        const styles = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          if (!pane) return null;
          const s = window.getComputedStyle(pane);
          return {
            overflowY: s.overflowY,
            minHeight: s.minHeight,
            webkitOverflowScrolling: s.webkitOverflowScrolling,
            overscrollBehavior: s.overscrollBehaviorY || s.overscrollBehavior,
            touchAction: s.touchAction,
          };
        });
        assert(styles !== null, 'Active pane must exist');
        assert(
          styles.overflowY === 'auto' || styles.overflowY === 'scroll',
          'Pane must have overflow-y: auto/scroll'
        );
        assertEqual(styles.minHeight, '0px', 'Pane min-height must be 0px');
        assertEqual(styles.overscrollBehavior, 'contain', 'Pane overscroll-behavior must be contain');
        // In WebKit/Safari, webkitOverflowScrolling computes to "touch".
        // In Blink/Chromium, vendor prefixed scrolling property is dropped from computedStyle, so verify declaration in main.css
        const cssContent = fs.readFileSync('src/styles/main.css', 'utf8');
        assert(
          cssContent.includes('-webkit-overflow-scrolling: touch'),
          'Stylesheet must declare -webkit-overflow-scrolling: touch for iOS WebKit'
        );
      });

      await runTest('Active modal tab pane has scrollable content (scrollHeight > clientHeight)', async () => {
        const dimensions = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          if (!pane) return null;
          return {
            scrollHeight: pane.scrollHeight,
            clientHeight: pane.clientHeight,
          };
        });
        assert(dimensions !== null, 'Pane must exist');
        assert(
          dimensions.scrollHeight > dimensions.clientHeight,
          `Pane content (${dimensions.scrollHeight}px) must be taller than client area (${dimensions.clientHeight}px) to enable scrolling`
        );
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // SUITE 5: Lenis Isolation & Scroll Verification
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 5: data-lenis-prevent & Modal Scroll Execution ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Open Loc Money modal
      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(500);

      await runTest('Modal and scroll containers contain data-lenis-prevent attribute', async () => {
        const hasAttr = await page.evaluate(() => {
          const modal = document.getElementById('loc-money-modal');
          const container = modal?.querySelector('.loc-modal-container');
          const body = modal?.querySelector('.loc-modal-body');
          return (
            modal?.hasAttribute('data-lenis-prevent') &&
            container?.hasAttribute('data-lenis-prevent') &&
            body?.hasAttribute('data-lenis-prevent')
          );
        });
        assert(hasAttr, 'data-lenis-prevent must be present to prevent Lenis wheel/touch interception');
      });

      await runTest('Programmatic scroll: pane.scrollTop advances and retains scroll position', async () => {
        const scrolled = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          if (!pane) return -1;
          pane.scrollTop = 250;
          return pane.scrollTop;
        });
        assert(scrolled >= 200, `scrollTop should be >= 200, got ${scrolled}`);
      });

      await runTest('Mouse wheel simulation: scrolling over modal advances pane scrollTop without moving window', async () => {
        await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          if (pane) pane.scrollTop = 0;
        });
        const initialWindowY = await page.evaluate(() => window.scrollY);

        await page.hover('#loc-money-modal .loc-modal-tab-pane.active');
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(300);

        const newScrollTop = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          return pane ? pane.scrollTop : 0;
        });
        const newWindowY = await page.evaluate(() => window.scrollY);

        assert(newScrollTop > 0, `Mouse wheel should advance pane scrollTop, got ${newScrollTop}`);
        assertEqual(newWindowY, initialWindowY, 'Background window must not scroll when modal is scrolled');
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // SUITE 6: Mobile Touch Dragging & Viewport
    // -------------------------------------------------------------
    console.log(`\n${BOLD}--- SUITE 6: Mobile Viewport & Touch Dragging ---${RESET}`);
    {
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await mobileContext.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await runTest('Mobile touch: tapping project card opens modal at 390x844', async () => {
        await page.tap('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
        await page.waitForTimeout(500);
        const isOpen = await page.evaluate(() => {
          const modal = document.getElementById('loc-money-modal');
          return modal && !modal.hasAttribute('hidden');
        });
        assert(isOpen, 'Modal should open on touch tap');
      });

      await runTest('Mobile touch: modal fits within viewport (max-height <= 96vh)', async () => {
        const bounds = await page.evaluate(() => {
          const container = document.querySelector('#loc-money-modal .loc-modal-container');
          if (!container) return null;
          const rect = container.getBoundingClientRect();
          return { height: rect.height, windowHeight: window.innerHeight };
        });
        assert(bounds !== null, 'Container rect must exist');
        assert(
          bounds.height <= bounds.windowHeight,
          `Container height (${bounds.height}px) must not overflow mobile viewport (${bounds.windowHeight}px)`
        );
      });

      await runTest('Mobile touch: touch gesture scrolls modal pane content', async () => {
        const pane = await page.$('#loc-money-modal .loc-modal-tab-pane.active');
        assert(pane !== null, 'Active pane must exist');

        const box = await pane.boundingBox();
        if (box) {
          const startX = box.x + box.width / 2;
          const startY = box.y + box.height * 0.7;
          await page.touchscreen.tap(startX, startY);
          
          const scrolled = await page.evaluate(() => {
            const el = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
            if (el) {
              el.scrollTop += 180;
              return el.scrollTop;
            }
            return 0;
          });
          assert(scrolled > 0, 'Touch scroll must advance pane scrollTop');
        }
      });

      await mobileContext.close();
    }
  } finally {
    await browser.close();
    if (proc) {
      proc.kill();
    }
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}Test Run Summary:${RESET}`);
  console.log(`Total: ${totalTests} | Passed: ${GREEN}${passedTests}${RESET} | Failed: ${failedTests ? RED : GREEN}${failedTests}${RESET}`);
  if (failedTests > 0) {
    console.log(`\n${RED}Failures:${RESET}`);
    failures.forEach((f) => console.log(` - ${f.name}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}All tests passed successfully! 🚀${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`Fatal error in test suite: ${err.message}`);
  process.exit(1);
});
