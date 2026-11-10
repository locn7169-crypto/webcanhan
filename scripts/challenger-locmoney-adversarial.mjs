/**
 * Adversarial Challenger Verification Suite
 * Milestone 1: LỘC MONEY 2 Showcase, External Links, Tab Switching,
 * Interactive Engine, Modal Scroll, and Strict Read-Only Security
 *
 * Agent: teamwork_challenger_m1_6
 * Roles: critic, specialist (Empirical Challenger)
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

// 23 Showcase Assets List
const SHOWCASE_23_ASSETS = [
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

async function main() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}🛡  EMPIRICAL CHALLENGER: ADVERSARIAL AUDIT & STRESS HARNESS (M1) 🛡${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  // ==========================================================================
  // SUITE 1: Binary Inspection & Disk Integrity (Public & Dist)
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 1: Binary Inspection & Disk Integrity (Public vs Dist) ---${RESET}`);

  await runTest('All 23 showcase files exist on disk in public/assets/locmoney/', async () => {
    for (const f of SHOWCASE_23_ASSETS) {
      const p = path.join(process.cwd(), 'public/assets/locmoney', f);
      assert(fs.existsSync(p), `Missing in public: ${f}`);
      const stats = fs.statSync(p);
      assert(stats.size > 10000, `File ${f} suspiciously small (${stats.size} bytes)`);
    }
  });

  await runTest('All 23 showcase files exist on disk in dist/assets/locmoney/', async () => {
    for (const f of SHOWCASE_23_ASSETS) {
      const p = path.join(process.cwd(), 'dist/assets/locmoney', f);
      assert(fs.existsSync(p), `Missing in dist: ${f}`);
      const stats = fs.statSync(p);
      assert(stats.size > 10000, `File ${f} in dist suspiciously small (${stats.size} bytes)`);
    }
  });

  await runTest('Byte-for-byte fidelity: public and dist assets are 100% identical', async () => {
    for (const f of SHOWCASE_23_ASSETS) {
      const pPub = path.join(process.cwd(), 'public/assets/locmoney', f);
      const pDist = path.join(process.cwd(), 'dist/assets/locmoney', f);
      const bufPub = fs.readFileSync(pPub);
      const bufDist = fs.readFileSync(pDist);
      assert(bufPub.equals(bufDist), `Byte mismatch between public and dist for ${f}`);
    }
  });

  await runTest('All 23 showcase files have valid PNG 8-byte magic header and positive IHDR dimensions', async () => {
    const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const f of SHOWCASE_23_ASSETS) {
      const p = path.join(process.cwd(), 'public/assets/locmoney', f);
      const fd = fs.openSync(p, 'r');
      const headerBuf = Buffer.alloc(24);
      fs.readSync(fd, headerBuf, 0, 24, 0);
      fs.closeSync(fd);

      // Check 8-byte magic
      assert(headerBuf.subarray(0, 8).equals(PNG_HEADER), `File ${f} is NOT a valid PNG file!`);
      // Check IHDR chunk type
      const chunkType = headerBuf.subarray(12, 16).toString('ascii');
      assertEqual(chunkType, 'IHDR', `File ${f} missing IHDR chunk!`);
      // Read width & height (big-endian 32-bit int at offsets 16 and 20)
      const width = headerBuf.readUInt32BE(16);
      const height = headerBuf.readUInt32BE(20);
      assert(width > 0, `File ${f} width <= 0`);
      assert(height > 0, `File ${f} height <= 0`);
    }
  });

  await runTest('logo-dragon.jpg exists in public and dist with valid JPEG magic header', async () => {
    const pPub = path.join(process.cwd(), 'public/assets/locmoney/logo-dragon.jpg');
    const pDist = path.join(process.cwd(), 'dist/assets/locmoney/logo-dragon.jpg');
    assert(fs.existsSync(pPub), 'Missing public logo-dragon.jpg');
    assert(fs.existsSync(pDist), 'Missing dist logo-dragon.jpg');
    const buf = fs.readFileSync(pPub);
    assert(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'Invalid JPEG magic bytes for logo-dragon.jpg');
  });

  // ==========================================================================
  // SUITE 2: HTTP Direct Network Verification
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 2: HTTP Direct Network Verification (Vite Preview Server) ---${RESET}`);

  const { baseUrl, proc } = await resolveServer();

  await runTest('Direct HTTP GET for every asset returns HTTP 200, matching Content-Length and Content-Type', async () => {
    for (const f of SHOWCASE_23_ASSETS) {
      const url = `${baseUrl}/assets/locmoney/${f}`;
      const res = await fetch(url);
      assertEqual(res.status, 200, `Expected HTTP 200 for ${url}, got ${res.status}`);
      const ctype = res.headers.get('content-type') || '';
      assert(ctype.includes('image/png'), `Expected image/png content-type for ${f}, got ${ctype}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const localSize = fs.statSync(path.join(process.cwd(), 'dist/assets/locmoney', f)).size;
      assertEqual(buf.length, localSize, `Network buffer size mismatch for ${f}`);
    }
  });

  // Launch browser for end-to-end adversarial assertions
  const browser = await chromium.launch({ headless: true });

  try {
    // ==========================================================================
    // SUITE 3: In-Browser Asset Rendering (naturalWidth > 0 & HTTP 200)
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 3: In-Browser Asset Rendering & DOM Image Status ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      const failedUrls = [];
      page.on('response', (res) => {
        if (res.url().includes('/assets/locmoney/') && res.status() >= 400) {
          failedUrls.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      // Open Modal
      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(400);

      // Visit each tab to trigger lazy/eager rendering
      const tabs = ['tong-quan', 'interactive-hub', 'signature-themes', 'app-screens', 'showcase-gallery'];
      for (const t of tabs) {
        await page.click(`#loc-money-modal button[data-loc-tab="${t}"]`);
        await page.waitForTimeout(150);
      }

      await runTest('Zero asset requests failed with 4xx or 5xx in browser session', async () => {
        assertEqual(failedUrls.length, 0, `Assets failed to load: ${JSON.stringify(failedUrls)}`);
      });

      await runTest('All 23 showcase images in #loc-money-modal render with naturalWidth > 0 & naturalHeight > 0', async () => {
        const imageStatuses = await page.evaluate((expectedAssets) => {
          const imgs = Array.from(document.querySelectorAll('#loc-money-modal img'));
          return expectedAssets.map((fname) => {
            const found = imgs.find((img) => (img.src || '').includes(fname));
            return {
              asset: fname,
              present: !!found,
              naturalWidth: found ? found.naturalWidth : 0,
              naturalHeight: found ? found.naturalHeight : 0,
            };
          });
        }, SHOWCASE_23_ASSETS);

        for (const status of imageStatuses) {
          assert(status.present, `Asset ${status.asset} not found as <img> in modal!`);
          assert(
            status.naturalWidth > 0 && status.naturalHeight > 0,
            `Asset ${status.asset} has invalid natural dimensions (${status.naturalWidth}x${status.naturalHeight})`
          );
        }
      });

      await context.close();
    }

    // ==========================================================================
    // SUITE 4: External Links & Event Propagation Shielding (Adversarial)
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 4: External Links & Event Propagation Shielding ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      await runTest('Works card CTA 1 strictly links to https://locmoney2.pages.dev/showcase with _blank & noopener', async () => {
        const link = await page.$('.loc-money-card .loc-card-action-bar a.showcase-cta');
        assert(link !== null, 'Card showcase CTA not found');
        const href = await link.getAttribute('href');
        assertEqual(href, 'https://locmoney2.pages.dev/showcase', 'Card showcase CTA URL mismatch');
        const target = await link.getAttribute('target');
        assertEqual(target, '_blank', 'Card showcase CTA target must be _blank');
        const rel = await link.getAttribute('rel');
        assert(rel.includes('noopener'), 'Card showcase CTA rel must include noopener');
      });

      await runTest('Works card CTA 2 strictly links to https://locmoney2.pages.dev with _blank & noopener', async () => {
        const link = await page.$('.loc-money-card .loc-card-action-bar a.live-cta');
        assert(link !== null, 'Card live CTA not found');
        const href = await link.getAttribute('href');
        assertEqual(href, 'https://locmoney2.pages.dev', 'Card live CTA URL mismatch');
        const target = await link.getAttribute('target');
        assertEqual(target, '_blank', 'Card live CTA target must be _blank');
        const rel = await link.getAttribute('rel');
        assert(rel.includes('noopener'), 'Card live CTA rel must include noopener');
      });

      await runTest('Modal header CTAs strictly link to showcase & web app URLs with _blank & noopener', async () => {
        const modalShowcase = await page.$('#loc-money-modal .loc-modal-header a.showcase-cta');
        const modalLive = await page.$('#loc-money-modal .loc-modal-header a.live-cta');
        assert(modalShowcase !== null, 'Modal header showcase CTA not found');
        assert(modalLive !== null, 'Modal header live CTA not found');

        const hrefShowcase = await modalShowcase.getAttribute('href');
        assertEqual(hrefShowcase, 'https://locmoney2.pages.dev/showcase');

        const hrefLive = await modalLive.getAttribute('href');
        assertEqual(hrefLive, 'https://locmoney2.pages.dev');
      });

      await runTest('ADVERSARIAL: Clicking card CTA buttons stops propagation and DOES NOT open modal', async () => {
        // Assert modal is closed initially
        let isModalOpen = await page.evaluate(() => {
          const m = document.getElementById('loc-money-modal');
          return m && !m.hasAttribute('hidden') && m.classList.contains('is-open');
        });
        assert(!isModalOpen, 'Modal should be closed initially');

        // Click on Showcase CTA button inside card
        await page.click('.loc-money-card .loc-card-action-bar a.showcase-cta');
        await page.waitForTimeout(300);

        // Verify modal did NOT open
        isModalOpen = await page.evaluate(() => {
          const m = document.getElementById('loc-money-modal');
          return m && !m.hasAttribute('hidden') && m.classList.contains('is-open');
        });
        assert(!isModalOpen, 'Clicking Showcase CTA inside card must NOT open the modal (stopPropagation required)');

        // Click on Web App CTA button inside card
        await page.click('.loc-money-card .loc-card-action-bar a.live-cta');
        await page.waitForTimeout(300);

        // Verify modal did NOT open
        isModalOpen = await page.evaluate(() => {
          const m = document.getElementById('loc-money-modal');
          return m && !m.hasAttribute('hidden') && m.classList.contains('is-open');
        });
        assert(!isModalOpen, 'Clicking Live Web App CTA inside card must NOT open the modal (stopPropagation required)');

        // Now click on the card header/body area (not the buttons) -> Modal MUST open!
        await page.click('.loc-money-card .project-details h3');
        await page.waitForTimeout(400);

        isModalOpen = await page.evaluate(() => {
          const m = document.getElementById('loc-money-modal');
          return m && !m.hasAttribute('hidden') && m.classList.contains('is-open');
        });
        assert(isModalOpen, 'Clicking card title/body MUST open the modal');
      });

      await context.close();
    }

    // ==========================================================================
    // SUITE 5: Modal 5-Tab Lifecycle & Rapid Switching Stress Harness
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 5: Modal 5-Tab Switching & Rapid Stress Harness ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      // Open Modal
      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(400);

      const tabIds = ['tong-quan', 'interactive-hub', 'signature-themes', 'app-screens', 'showcase-gallery'];

      await runTest('Sequential switching across all 5 tabs activates correct pane and deactivates others', async () => {
        for (const tab of tabIds) {
          await page.click(`#loc-money-modal button[data-loc-tab="${tab}"]`);
          await page.waitForTimeout(100);

          const state = await page.evaluate((targetTab) => {
            const btn = document.querySelector(`#loc-money-modal button[data-loc-tab="${targetTab}"]`);
            const pane = document.querySelector(`#loc-money-modal .loc-modal-tab-pane[data-loc-pane="${targetTab}"]`);
            const otherActivePanes = Array.from(
              document.querySelectorAll(`#loc-money-modal .loc-modal-tab-pane.active`)
            ).filter((p) => p.getAttribute('data-loc-pane') !== targetTab);

            return {
              btnActive: btn?.classList.contains('active') && btn?.getAttribute('aria-selected') === 'true',
              paneActive: pane?.classList.contains('active'),
              otherActiveCount: otherActivePanes.length,
            };
          }, tab);

          assert(state.btnActive, `Tab button ${tab} should have active class and aria-selected=true`);
          assert(state.paneActive, `Tab pane ${tab} should have active class`);
          assertEqual(state.otherActiveCount, 0, `Expected 0 other active panes when ${tab} is active`);
        }
      });

      await runTest('RAPID STRESS: 25 rapid random tab switches execute with ZERO errors', async () => {
        for (let i = 0; i < 25; i++) {
          const randomTab = tabIds[Math.floor(Math.random() * tabIds.length)];
          await page.click(`#loc-money-modal button[data-loc-tab="${randomTab}"]`);
          await page.waitForTimeout(30); // Very fast click stream
        }

        // Settle on Tab 5
        await page.click(`#loc-money-modal button[data-loc-tab="showcase-gallery"]`);
        await page.waitForTimeout(300);

        assertEqual(consoleErrors.length, 0, `Console errors during rapid tab switching: ${consoleErrors.join(', ')}`);

        const isGalleryActive = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane[data-loc-pane="showcase-gallery"]');
          return pane && pane.classList.contains('active');
        });
        assert(isGalleryActive, 'Gallery tab pane should be active after settling');
      });

      await context.close();
    }

    // ==========================================================================
    // SUITE 6: Tab 2 Interactive Playground Switching & Stress Harness
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 6: Tab 2 Interactive Playground Modes & Stress Harness ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      // Open Modal to Tab 2
      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(300);
      await page.click('#loc-money-modal button[data-loc-tab="interactive-hub"]');
      await page.waitForTimeout(300);

      const modes = [
        {
          mode: 'calc',
          expectedFile: '02_showcase_interactive_calculator.png',
          titleSnippet: '01. Máy Tính Tự Động Phân Bổ',
        },
        {
          mode: 'sim',
          expectedFile: '03_showcase_interactive_simulator.png',
          titleSnippet: '02. Giả Lập Giao Dịch Tức Thì',
        },
        {
          mode: 'theme',
          expectedFile: '04_showcase_interactive_theme_switcher.png',
          titleSnippet: '03. Bộ Chuyển Đổi Chủ Đề',
        },
        {
          mode: 'composer',
          expectedFile: '17_app_action_hub_composer.png',
          titleSnippet: '04. Action Hub & Soạn Thảo',
        },
      ];

      for (const m of modes) {
        await runTest(`Switching interactive mode to "${m.mode}" updates preview image (${m.expectedFile}) and title`, async () => {
          await page.click(`#loc-money-modal .loc-engine-btn[data-engine-mode="${m.mode}"]`);
          await page.waitForTimeout(250); // allow crossfade timeout (120ms)

          const data = await page.evaluate(() => {
            const img = document.getElementById('loc-money-engine-preview-img');
            const title = document.getElementById('loc-money-engine-preview-title');
            const desc = document.getElementById('loc-money-engine-preview-desc');
            return {
              src: img ? img.src : '',
              naturalWidth: img ? img.naturalWidth : 0,
              opacity: img ? img.style.opacity : '',
              title: title ? title.textContent : '',
              desc: desc ? desc.textContent : '',
            };
          });

          assert(data.src.includes(m.expectedFile), `Expected preview image src to include ${m.expectedFile}, got ${data.src}`);
          assert(data.naturalWidth > 0, `Expected image naturalWidth > 0, got ${data.naturalWidth}`);
          assert(data.title.includes(m.titleSnippet), `Expected title snippet "${m.titleSnippet}", got "${data.title}"`);
          assert(data.desc.length > 20, 'Expected non-empty description');
          assertEqual(data.opacity, '1', 'Image opacity should restore to 1 after crossfade');
        });
      }

      await runTest('RAPID STRESS: 30 rapid clicks across interactive engine modes settle cleanly', async () => {
        const modeKeys = ['calc', 'sim', 'theme', 'composer'];
        for (let i = 0; i < 30; i++) {
          const k = modeKeys[i % modeKeys.length];
          await page.click(`#loc-money-modal .loc-engine-btn[data-engine-mode="${k}"]`);
          await page.waitForTimeout(25);
        }

        // Wait 300ms for last crossfade to settle
        await page.waitForTimeout(300);

        assertEqual(consoleErrors.length, 0, `Errors during rapid engine mode switching: ${consoleErrors.join(', ')}`);

        const finalStatus = await page.evaluate(() => {
          const img = document.getElementById('loc-money-engine-preview-img');
          return {
            opacity: img ? img.style.opacity : '',
            naturalWidth: img ? img.naturalWidth : 0,
          };
        });

        assertEqual(finalStatus.opacity, '1', 'Final opacity must be 1 after rapid switching settles');
        assert(finalStatus.naturalWidth > 0, 'Final image must render with naturalWidth > 0');
      });

      await context.close();
    }

    // ==========================================================================
    // SUITE 7: Modal Scrolling, Flexbox & Lenis Shielding
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 7: Modal Scroll Engine & Lenis Shielding ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      await page.click('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
      await page.waitForTimeout(400);

      await runTest('data-lenis-prevent is present on #loc-money-modal, container, body, and all 5 panes', async () => {
        const check = await page.evaluate(() => {
          const m = document.getElementById('loc-money-modal');
          const container = m?.querySelector('.loc-modal-container');
          const body = m?.querySelector('.loc-modal-body');
          const panes = Array.from(m?.querySelectorAll('.loc-modal-tab-pane') || []);

          return {
            modalHas: m?.hasAttribute('data-lenis-prevent'),
            containerHas: container?.hasAttribute('data-lenis-prevent'),
            bodyHas: body?.hasAttribute('data-lenis-prevent'),
            panesTotal: panes.length,
            panesWithAttr: panes.filter((p) => p.hasAttribute('data-lenis-prevent')).length,
          };
        });

        assert(check.modalHas, 'Modal root missing data-lenis-prevent');
        assert(check.containerHas, 'Container missing data-lenis-prevent');
        assert(check.bodyHas, 'Body missing data-lenis-prevent');
        assertEqual(check.panesTotal, 5, 'Expected 5 tab panes');
        assertEqual(check.panesWithAttr, 5, 'All 5 tab panes must have data-lenis-prevent');
      });

      await runTest('All 5 tab panes have scrollHeight > clientHeight when populated', async () => {
        const tabIds = ['tong-quan', 'interactive-hub', 'signature-themes', 'app-screens', 'showcase-gallery'];
        for (const t of tabIds) {
          await page.click(`#loc-money-modal button[data-loc-tab="${t}"]`);
          await page.waitForTimeout(100);

          const heights = await page.evaluate((paneId) => {
            const pane = document.querySelector(`#loc-money-modal .loc-modal-tab-pane[data-loc-pane="${paneId}"]`);
            return pane ? { scrollHeight: pane.scrollHeight, clientHeight: pane.clientHeight } : null;
          }, t);

          assert(heights !== null, `Pane ${t} not found`);
          assert(
            heights.scrollHeight > heights.clientHeight,
            `Pane ${t} content (${heights.scrollHeight}px) should exceed container clientHeight (${heights.clientHeight}px) to enable scrolling`
          );
        }
      });

      await runTest('Wheel events scroll active modal pane while body window scrollY remains strictly 0', async () => {
        // Switch to gallery tab which has lots of content
        await page.click('#loc-money-modal button[data-loc-tab="showcase-gallery"]');
        await page.waitForTimeout(200);

        await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          if (pane) pane.scrollTop = 0;
          window.scrollTo(0, 0);
        });

        const initialScrollY = await page.evaluate(() => window.scrollY);
        assertEqual(initialScrollY, 0, 'Window scrollY should be 0 before wheel');

        await page.hover('#loc-money-modal .loc-modal-tab-pane.active');
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(300);

        const stateAfterWheel = await page.evaluate(() => {
          const pane = document.querySelector('#loc-money-modal .loc-modal-tab-pane.active');
          return {
            paneScrollTop: pane ? pane.scrollTop : 0,
            windowScrollY: window.scrollY,
          };
        });

        assert(stateAfterWheel.paneScrollTop > 0, `Expected modal pane to scroll down, got ${stateAfterWheel.paneScrollTop}`);
        assertEqual(stateAfterWheel.windowScrollY, 0, 'Window scrollY must remain 0 when scrolling inside modal');
      });

      await context.close();
    }

    // ==========================================================================
    // SUITE 8: Strict Read-Only Lockdown Outside #admin (Security & Anti-Vandalism)
    // ==========================================================================
    console.log(`\n${BOLD}--- SUITE 8: Strict Read-Only Lockdown Outside #admin ---${RESET}`);
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await runTest('Public root: Exactly ZERO elements have contenteditable="true" or boolean contenteditable', async () => {
        const editables = await page.$$eval('[contenteditable]', (els) =>
          els.filter((el) => el.getAttribute('contenteditable') !== 'false').map((el) => el.outerHTML.slice(0, 80))
        );
        assertEqual(editables.length, 0, `Found active editable elements in public view: ${editables.join('; ')}`);
      });

      await runTest('Public root: Zero elements have yellow/gold dashed outlines or editing borders', async () => {
        const dashedCount = await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          let count = 0;
          for (const el of all) {
            const s = window.getComputedStyle(el);
            if (
              s.outlineStyle === 'dashed' &&
              (s.outlineColor.includes('212') || s.outlineColor.includes('217') || s.outlineColor.includes('184') || s.outlineColor.includes('245'))
            ) {
              count++;
            }
          }
          return count;
        });
        assertEqual(dashedCount, 0, 'Public view contains dashed yellow/amber outlines');
      });

      await runTest('Admin controls (#saveBtn, #visual-editor-dock, #tiptap-bubble-menu) are completely invisible/hidden', async () => {
        const visibleAdminTools = await page.evaluate(() => {
          const selectors = ['#saveBtn', '#visual-editor-dock', '#tiptap-bubble-menu', '#adminBanner', '.insta-create-card'];
          const found = [];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null && window.getComputedStyle(el).display !== 'none') {
              found.push(sel);
            }
          }
          return found;
        });
        assertEqual(visibleAdminTools.length, 0, `Admin controls visible in public view: ${visibleAdminTools.join(', ')}`);
      });

      await runTest('Adversarial mutation test: Simulated typing does NOT mutate static text elements', async () => {
        const titleInitial = await page.evaluate(() => {
          const el = document.querySelector('.loc-money-card .project-card-title');
          return el ? el.textContent : '';
        });

        // Try to focus and type
        await page.click('.loc-money-card .project-card-title');
        await page.keyboard.type('ATTACK_MUTATION');
        await page.waitForTimeout(100);

        const titleAfter = await page.evaluate(() => {
          const el = document.querySelector('.loc-money-card .project-card-title');
          return el ? el.textContent : '';
        });

        assertEqual(titleAfter, titleInitial, 'Text content was mutated by keyboard in public view!');
      });

      await runTest('Hash #works and #explorations remain 100% strictly read-only', async () => {
        for (const h of ['#works', '#explorations']) {
          await page.goto(`${baseUrl}/${h}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const activeEditables = await page.$$eval('[contenteditable="true"]', (els) => els.length);
          assertEqual(activeEditables, 0, `Active contenteditable under ${h}`);
        }
      });

      await context.close();
    }
  } finally {
    await browser.close();
    if (proc) {
      proc.kill();
    }
  }

  // ==========================================================================
  // SUITE 9: Production Build & Bundle Integrity
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 9: Production Build & Bundle Integrity ---${RESET}`);

  await runTest('npm run build completes with exit code 0 and bundles dist cleanly', async () => {
    const buildOutput = execSync('npm run build', { encoding: 'utf8' });
    assert(buildOutput.includes('built in') || buildOutput.includes('vite'), 'Build output should indicate successful build');
  });

  // Summary
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}CHALLENGER AUDIT SUMMARY:${RESET}`);
  console.log(`Total Assertions : ${totalTests}`);
  console.log(`Passed Tests     : ${GREEN}${passedTests}${RESET}`);
  console.log(`Failed Tests     : ${failedTests ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.log(`${RED}CRITICAL: Verification Failed with ${failedTests} failure(s):${RESET}`);
    failures.forEach((f) => console.log(` - ${f.name}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log(`${GREEN}VERDICT: 100% EMPIRICAL SUCCESS — ALL CHALLENGES PASSED! 🚀${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`Fatal error in challenger suite: ${err.message}`);
  process.exit(1);
});
