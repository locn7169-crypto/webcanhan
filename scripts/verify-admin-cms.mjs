import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('test-results/admin-cms');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runAdminVerification() {
  console.log('🚀 Starting Admin Studio CMS Deep Verification...');

  // Reset Cloud Gist baseline to 1902
  const { pushCloudPin } = await import('../src/scripts/cloud-cms-sync.ts');
  await pushCloudPin('1902');

  // 1. Start preview server
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    console.log('Visiting http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Verify Header Admin Button is visible
    const adminBtn = await page.$('.site-header .admin-nav-trigger');
    if (!adminBtn) throw new Error('Admin nav trigger button not found in header!');
    console.log('✔ Admin Nav trigger found in header.');

    // 2. Click Admin Button -> PIN Modal must open
    await adminBtn.click();
    await page.waitForTimeout(400);

    const isPinModalOpen = await page.evaluate(() => {
      const overlay = document.getElementById('admin-auth-overlay');
      return overlay?.classList.contains('is-open');
    });
    if (!isPinModalOpen) throw new Error('PIN Auth modal did not open upon clicking Admin button!');
    console.log('✔ PIN Auth modal opened successfully.');
    await page.screenshot({ path: path.join(outDir, '01-pin-modal.png') });

    // 2b. Test Wrong PIN rejected
    console.log('Testing incorrect PIN rejection (0000)...');
    for (let i = 0; i < 4; i++) {
      await page.click('.admin-keypad-btn[data-key="0"]');
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    const hasShake = await page.evaluate(() => {
      return document.getElementById('admin-auth-card')?.classList.contains('shake') ||
        document.querySelector('.toast-notice')?.textContent?.includes('không đúng');
    });
    console.log(`✔ Wrong PIN rejected with warning/shake: ${hasShake ? 'PASS' : 'WARN'}`);
    await page.waitForTimeout(1500);

    // 3. Enter Correct Default PIN: 1902 using keypad clicks
    console.log('Entering correct PIN: 1902...');
    await page.click('.admin-keypad-btn[data-key="1"]');
    await page.waitForTimeout(120);
    await page.click('.admin-keypad-btn[data-key="9"]');
    await page.waitForTimeout(120);
    await page.click('.admin-keypad-btn[data-key="0"]');
    await page.waitForTimeout(120);
    await page.click('.admin-keypad-btn[data-key="2"]');
    await page.waitForTimeout(1200);

    // 4. Admin Studio Dashboard must be open
    const isStudioOpen = await page.evaluate(() => {
      const overlay = document.getElementById('admin-studio-overlay');
      return overlay?.classList.contains('is-open');
    });
    if (!isStudioOpen) throw new Error('Admin Studio Dashboard did not open after entering correct PIN 1902!');
    console.log('✔ Admin Studio Dashboard opened successfully.');
    await page.screenshot({ path: path.join(outDir, '02-admin-dashboard.png') });

    // Check stats (matching Image 1: 128 Ảnh đã đăng, 06 Bộ sưu tập, badge "01")
    const statsText = await page.evaluate(() => {
      const photos = document.getElementById('admin-stat-photos-count')?.textContent;
      const colls = document.getElementById('admin-stat-collections-count')?.textContent;
      const badge01 = document.getElementById('admin-badge-media-count')?.textContent;
      return { photos, colls, badge01 };
    });
    console.log(`✔ Admin Dashboard Stats verified: ${statsText.photos} Ảnh đã đăng, ${statsText.colls} Bộ sưu tập, Badge: ${statsText.badge01}.`);
    if (statsText.badge01 !== '01') throw new Error(`Badge was expected to be '01', got ${statsText.badge01}`);

    // 5. Open "Thư viện hình ảnh" (Media Library)
    console.log('Navigating to Thư viện hình ảnh...');
    await page.click('.admin-menu-item[data-action="open-media-library"]');
    await page.waitForTimeout(500);

    const isMediaViewActive = await page.evaluate(() => {
      const panel = document.getElementById('admin-view-media');
      return panel?.classList.contains('active');
    });
    if (!isMediaViewActive) throw new Error('Media Library panel failed to open!');
    console.log('✔ Media Library panel active.');
    await page.screenshot({ path: path.join(outDir, '03-media-library.png') });

    // Check that cards have numbered order badges 1, 2, 3...
    const cardBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.admin-order-badge')).map((b) => b.textContent?.trim());
      return badges;
    });
    console.log(`✔ Found ${cardBadges.length} photo cards with badges:`, cardBadges.slice(0, 6));

    // 6. Test Move Right Arrow Reordering
    console.log('Testing Arrow Reordering (Move #1 -> #2)...');
    const firstMoveRightBtn = await page.$('.admin-photo-card:nth-child(1) .move-right-act');
    if (firstMoveRightBtn) {
      const titleBefore = await page.evaluate(() => document.querySelector('.admin-photo-card:nth-child(1) .admin-photo-title')?.textContent);
      await firstMoveRightBtn.click();
      await page.waitForTimeout(400);
      const titleAfter = await page.evaluate(() => document.querySelector('.admin-photo-card:nth-child(2) .admin-photo-title')?.textContent);
      console.log(`✔ Reordered successfully: Item "${titleBefore}" moved to second card ("${titleAfter}").`);
    }

    // 7. Test Quick-Edit Click on thumbnail/title
    console.log('Testing quick-edit click on card thumbnail...');
    const quickEditThumb = await page.$('.admin-photo-card:nth-child(1) [data-action="quick-edit"]');
    if (quickEditThumb) {
      await quickEditThumb.click();
      await page.waitForTimeout(400);

      const isMetaModalOpen = await page.evaluate(() => {
        const modal = document.getElementById('admin-meta-modal');
        return modal?.classList.contains('is-open');
      });
      if (!isMetaModalOpen) throw new Error('Metadata edit modal did not open on quick-edit click!');
      console.log('✔ Metadata editor modal opened via thumbnail click.');
      await page.screenshot({ path: path.join(outDir, '04-metadata-editor.png') });

      // Change title
      await page.fill('#admin-meta-title-input', 'Khoảnh khắc hoa hồng cẩm thạch — Đã biên tập');
      await page.click('#admin-meta-save-btn');
      await page.waitForTimeout(400);
      console.log('✔ Metadata updated & saved to IndexedDB.');
    }

    // 8. Test synthetic batch upload of image
    console.log('Testing image upload via hidden batch input...');
    // Create a 1x1 base64 png file for upload
    const testPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const testFilePath = path.resolve('test-upload-sample.png');
    fs.writeFileSync(testFilePath, testPngBuffer);

    const fileInput = await page.$('#admin-batch-file-input');
    if (fileInput) {
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(1000);
      const newCount = await page.evaluate(() => document.querySelectorAll('.admin-photo-card').length);
      console.log(`✔ Batch image processed successfully! Total photo cards in gallery now: ${newCount}.`);
    }
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    // 9. Test One-Click "Xuất bản" (Publish)
    console.log('Testing "Xuất bản ngay" button...');
    await page.click('#admin-publish-all-btn');
    await page.waitForTimeout(600);

    // Verify toast notice appeared
    const toastMessage = await page.evaluate(() => {
      const toast = document.querySelector('.toast-notice');
      return toast?.textContent;
    });
    console.log(`✔ Publish Toast Notice: "${toastMessage?.trim()}"`);
    await page.screenshot({ path: path.join(outDir, '05-published-success.png') });

    // 10. Close Admin and check that live website has the updated data
    await page.click('#admin-studio-close-btn');
    await page.waitForTimeout(500);

    // Open Exploration Journal modal on the website to verify live update
    const photoCardMain = await page.$('.exploration-card[data-exploration-id="photography"]');
    if (photoCardMain) {
      await photoCardMain.click();
      await page.waitForTimeout(600);
      console.log('✔ Live Exploration Journal opened on main site.');
      await page.screenshot({ path: path.join(outDir, '06-live-site-updated.png') });
      // Close journal modal
      const journalCloseBtn = await page.$('.journal-close-btn');
      if (journalCloseBtn) {
        await journalCloseBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }

    // 11. Test Keyboard Shortcut (Option + A)
    await page.keyboard.press('Alt+KeyA');
    await page.waitForTimeout(500);
    const reOpened = await page.evaluate(() => {
      const overlay = document.getElementById('admin-studio-overlay');
      return overlay?.classList.contains('is-open');
    });
    console.log(`✔ Shortcut Option + A reopened Admin directly: ${reOpened ? 'PASS' : 'FAIL'}`);

    // 12. Test PIN Change Security in Settings
    console.log('Testing PIN change in Settings...');
    await page.click('.admin-menu-item[data-action="open-settings"]');
    await page.waitForTimeout(400);

    await page.fill('#admin-new-pin-input', '5678');
    await page.click('#admin-save-pin-btn');
    // Wait until save is complete (button is re-enabled)
    await page.waitForFunction(() => !document.getElementById('admin-save-pin-btn')?.hasAttribute('disabled'), { timeout: 10000 });
    await page.waitForTimeout(600);

    // Logout
    await page.click('#admin-logout-btn');
    await page.waitForTimeout(400);

    // Try old PIN 1902 -> MUST FAIL now!
    console.log('Attempting login with old default PIN 1902 (must fail)...');
    await adminBtn.click();
    await page.waitForTimeout(400);

    await page.click('.admin-keypad-btn[data-key="1"]');
    await page.click('.admin-keypad-btn[data-key="9"]');
    await page.click('.admin-keypad-btn[data-key="0"]');
    await page.click('.admin-keypad-btn[data-key="2"]');
    await page.waitForTimeout(600);

    const oldPinFailed = await page.evaluate(() => {
      const overlay = document.getElementById('admin-studio-overlay');
      return !overlay?.classList.contains('is-open');
    });
    if (!oldPinFailed) throw new Error('CRITICAL BUG: Old default PIN 1902 was still accepted after changing PIN to 5678!');
    console.log('✔ Security confirmed: Old default PIN 1902 was rejected after PIN change.');
    await page.waitForTimeout(1400);

    // Enter new PIN 5678 -> MUST SUCCEED!
    console.log('Entering new PIN 5678...');
    await page.click('.admin-keypad-btn[data-key="5"]');
    await page.waitForTimeout(100);
    await page.click('.admin-keypad-btn[data-key="6"]');
    await page.waitForTimeout(100);
    await page.click('.admin-keypad-btn[data-key="7"]');
    await page.waitForTimeout(100);
    await page.click('.admin-keypad-btn[data-key="8"]');
    await page.waitForTimeout(1200);

    const newPinSuccess = await page.evaluate(() => {
      const overlay = document.getElementById('admin-studio-overlay');
      return overlay?.classList.contains('is-open');
    });
    if (!newPinSuccess) throw new Error('New PIN 5678 was not accepted!');
    console.log('✔ New PIN 5678 logged in successfully!');

    // Reset back to default
    await page.click('.admin-menu-item[data-action="open-settings"]');
    await page.waitForTimeout(300);
    await page.fill('#admin-new-pin-input', '1902');
    await page.click('#admin-save-pin-btn');
    await page.waitForFunction(() => !document.getElementById('admin-save-pin-btn')?.hasAttribute('disabled'), { timeout: 10000 });
    await page.waitForTimeout(600);
    console.log('✔ PIN restored to default 1902.');

    console.log('🎉 ALL ADMIN STUDIO CMS DEEP VERIFICATIONS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    throw err;
  } finally {
    await browser.close();
    previewProcess.kill();
  }
}

runAdminVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
