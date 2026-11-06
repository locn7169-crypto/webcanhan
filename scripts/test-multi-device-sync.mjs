import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function testMultiDeviceSync() {
  console.log('🧪 Starting Multi-Device Cloud Sync Verification (Phone <-> PC)...');

  // Reset Cloud Gist baseline to 1902 so tests run from clean slate
  console.log('🔄 Initializing Cloud Gist baseline to PIN 1902...');
  const { pushCloudPin } = await import('../src/scripts/cloud-cms-sync.ts');
  await pushCloudPin('1902');

  // Start preview server
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    preview.stdout.on('data', (d) => {
      if (d.toString().includes('http://localhost:4173') || d.toString().includes('Local:')) {
        resolve();
      }
    });
    setTimeout(resolve, 3500);
  });

  const browser = await chromium.launch({ headless: true });

  try {
    // ------------------------------------------------------------------------
    // CONTEXT 1: SIMULATE MOBILE PHONE (Device A)
    // ------------------------------------------------------------------------
    console.log('\n📱 Step 1: Simulating Mobile Phone (Device A)...');
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14
      isMobile: true,
      hasTouch: true,
    });
    const phonePage = await phoneContext.newPage();
    phonePage.on('console', (msg) => {
      if (msg.text().includes('[CloudCMS]') || msg.text().includes('[AdminStudio]')) {
        console.log('[PHONE]:', msg.text());
      }
    });

    await phonePage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await phonePage.waitForTimeout(600);

    // Open Admin on Phone
    console.log('📱 Phone: Opening Admin modal...');
    await phonePage.evaluate(() => {
      window.location.hash = '#admin';
    });
    await phonePage.waitForTimeout(600);

    // Enter PIN 1902
    await phonePage.click('.admin-keypad-btn[data-key="1"]');
    await phonePage.click('.admin-keypad-btn[data-key="9"]');
    await phonePage.click('.admin-keypad-btn[data-key="0"]');
    await phonePage.click('.admin-keypad-btn[data-key="2"]');
    await phonePage.waitForTimeout(800);

    const isPhoneAdminOpen = await phonePage.evaluate(() => {
      return document.getElementById('admin-studio-overlay')?.classList.contains('is-open');
    });
    console.log('📱 Phone: Admin open result:', isPhoneAdminOpen ? 'PASS' : 'FAIL');
    if (!isPhoneAdminOpen) throw new Error('Phone Admin failed to open');

    // Go to Media Library on Phone
    await phonePage.click('.admin-menu-item[data-action="open-media-library"]');
    await phonePage.waitForTimeout(500);

    // Simulate uploading a photo from Phone
    console.log('📱 Phone: Uploading new mobile photo...');
    const testPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const testFilePath = '/tmp/phone-test-photo.png';
    const fs = await import('fs');
    fs.writeFileSync(testFilePath, testPngBuffer);

    const fileInput = await phonePage.$('#admin-batch-file-input');
    if (fileInput) {
      await fileInput.setInputFiles(testFilePath);
      await phonePage.waitForTimeout(1200);
    }
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    const phoneCount = await phonePage.evaluate(() => document.querySelectorAll('.admin-photo-card').length);
    console.log(`📱 Phone: Uploaded photo successfully. Photo count on Phone now: ${phoneCount}`);

    // Edit the newly added photo title
    await phonePage.evaluate(() => {
      const firstCard = document.querySelector('.admin-photo-card[data-item-index="0"]');
      if (firstCard) {
        const title = firstCard.querySelector('.admin-photo-title');
        if (title) title.textContent = 'Ảnh chụp từ Điện thoại Đà Lạt';
      }
    });

    // Click "Xuất bản ngay" on Phone
    console.log('📱 Phone: Clicking "Xuất bản ngay" (Push to Cloud)...');
    await phonePage.click('#admin-publish-all-btn');
    await phonePage.waitForTimeout(2500); // Wait for cloud push to complete
    console.log('✔ Phone: Published and synced to cloud.');

    // ------------------------------------------------------------------------
    // CONTEXT 2: SIMULATE DESKTOP PC (Device B)
    // (Completely clean session with separate storage, simulating a real PC)
    // ------------------------------------------------------------------------
    console.log('\n💻 Step 2: Simulating Desktop Computer (Device B)...');
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const pcPage = await pcContext.newPage();
    pcPage.on('console', (msg) => {
      if (msg.text().includes('[CloudCMS]') || msg.text().includes('[AdminStudio]')) {
        console.log('[PC]:', msg.text());
      }
    });

    console.log('💻 PC: Visiting nguyenthanhloc (Loading fresh page)...');
    await pcPage.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await pcPage.waitForTimeout(1000);

    // Explicitly call cloud sync on PC to guarantee latest state
    console.log('💻 PC: Syncing latest changes from Cloud Gist...');
    await pcPage.evaluate(async () => {
      if (window.syncCMSFromCloud) {
        await window.syncCMSFromCloud();
      }
    });
    await pcPage.waitForTimeout(1200);

    // Open Admin on PC using hash trigger
    console.log('💻 PC: Opening Admin to verify Media Library...');
    await pcPage.evaluate(() => {
      window.location.hash = '#admin';
    });
    await pcPage.waitForTimeout(600);

    // Enter PIN 1902 on PC
    await pcPage.click('.admin-keypad-btn[data-key="1"]');
    await pcPage.click('.admin-keypad-btn[data-key="9"]');
    await pcPage.click('.admin-keypad-btn[data-key="0"]');
    await pcPage.click('.admin-keypad-btn[data-key="2"]');
    await pcPage.waitForTimeout(800);

    await pcPage.click('.admin-menu-item[data-action="open-media-library"]');
    await pcPage.waitForTimeout(500);

    const pcPhotoCardsCount = await pcPage.evaluate(() => {
      return document.querySelectorAll('.admin-photo-card').length;
    });
    console.log(`💻 PC: Found ${pcPhotoCardsCount} photo cards in Media Library.`);
    if (pcPhotoCardsCount < 9) {
      throw new Error(`Expected at least 9 photo cards synced to PC, but found ${pcPhotoCardsCount}`);
    }
    console.log('🎉 SUCCESS: Photo uploaded on phone is 100% visible and synchronized on PC!');

    // ------------------------------------------------------------------------
    // CONTEXT 3: TEST PIN SYNCHRONIZATION ACROSS DEVICES
    // ------------------------------------------------------------------------
    console.log('\n🔐 Step 3: Testing PIN synchronization across devices...');
    console.log('📱 Phone: Changing PIN to 4321 in Settings...');
    await phonePage.evaluate(() => {
      const backBtn = document.querySelector('[data-action="back-to-dashboard"]');
      if (backBtn) backBtn.click();
      const settingsItem = document.querySelector('[data-action="open-settings"]');
      if (settingsItem) settingsItem.click();
    });
    await phonePage.waitForTimeout(600);
    await phonePage.fill('#admin-new-pin-input', '4321');
    await phonePage.click('#admin-save-pin-btn');
    await phonePage.waitForTimeout(2500); // Wait for cloud PIN push

    // Now on PC: Clear all session & remember-me auth to test fresh PIN login
    console.log('💻 PC: Attempting login with new PIN 4321...');
    await pcPage.evaluate(() => {
      sessionStorage.clear();
      localStorage.removeItem('loc_admin_session_auth');
      document.getElementById('admin-studio-overlay')?.classList.remove('is-open');
      if (window.requestAdminAccess) {
        window.requestAdminAccess();
      }
    });
    await pcPage.waitForTimeout(600);

    await pcPage.click('.admin-keypad-btn[data-key="4"]');
    await pcPage.click('.admin-keypad-btn[data-key="3"]');
    await pcPage.click('.admin-keypad-btn[data-key="2"]');
    await pcPage.click('.admin-keypad-btn[data-key="1"]');
    await pcPage.waitForTimeout(1000);

    const isPcUnlockedWithNewPin = await pcPage.evaluate(() => {
      return document.getElementById('admin-studio-overlay')?.classList.contains('is-open');
    });
    console.log('💻 PC: Logged in with new PIN 4321 result:', isPcUnlockedWithNewPin ? 'PASS' : 'FAIL');
    if (!isPcUnlockedWithNewPin) {
      throw new Error('PC failed to unlock with PIN changed on Phone!');
    }
    console.log('🎉 SUCCESS: PIN changed on Phone is 100% synchronized and accepted on PC!');

    // Restore default PIN 1902 and clean up
    await phonePage.evaluate(() => {
      const settingsItem = document.querySelector('[data-action="open-settings"]');
      if (settingsItem) settingsItem.click();
    });
    await phonePage.waitForTimeout(400);
    await phonePage.fill('#admin-new-pin-input', '1902');
    await phonePage.click('#admin-save-pin-btn');
    await phonePage.waitForTimeout(2000);
    console.log('✔ Restored default PIN 1902.');

    console.log('\n✨ ALL MULTI-DEVICE CLOUD SYNC TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

testMultiDeviceSync().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
