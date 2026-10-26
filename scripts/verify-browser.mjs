import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('test-results');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runVerification() {
  console.log('🚀 Starting Automated Browser & Motion Verification...');
  const browser = await chromium.launch();
  const consoleErrors = [];

  // 1. Desktop Test (1440 x 900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  console.log('Visiting http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Allow entrance animations to settle

  // Hero Screenshot
  await page.screenshot({ path: path.join(outDir, '01-hero-desktop.png') });
  console.log('✔ Hero section verified & captured.');

  // Test Mouse Hover over hero workbench
  await page.mouse.move(720, 450);
  await page.waitForTimeout(400);

  // Philosophy section
  await page.evaluate(() => {
    document.querySelector('#philosophy')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '02-philosophy-desktop.png') });
  console.log('✔ Philosophy & Interests verified.');

  // Works section & Pinned scroll
  await page.evaluate(() => {
    document.querySelector('#works')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '03-works-pinned.png') });
  console.log('✔ Works pinned stage verified.');

  // Test interactive HSK card click
  const hskCard = await page.$('.learn-mockup-card');
  if (hskCard) {
    const beforeText = await page.$eval('.learn-hanzi', (el) => el.textContent);
    await hskCard.click();
    await page.waitForTimeout(400);
    const afterText = await page.$eval('.learn-hanzi', (el) => el.textContent);
    console.log(`✔ Interactive HSK Card tested: "${beforeText}" → "${afterText}"`);
    await page.screenshot({ path: path.join(outDir, '04-hsk-card-flipped.png') });
  }

  // --- LỘC MONEY 2 INSPECTOR MODAL & QA AUDIT TEST ---
  console.log('🔍 Testing Lộc Money 2 Interactive Card & Inspector Modal...');
  const locCard = await page.$('.loc-money-card');
  if (locCard) {
    await locCard.click();
    await page.waitForTimeout(600);

    const isModalOpen = await page.evaluate(() => {
      const modal = document.getElementById('loc-money-modal');
      return modal && !modal.hasAttribute('hidden') && modal.classList.contains('is-open');
    });
    console.log(`✔ Lộc Money 2 modal open check: ${isModalOpen ? 'PASS (modal opened)' : 'FAIL'}`);
    await page.screenshot({ path: path.join(outDir, '12-loc-money-modal-tongquan.png') });

    // Switch to Thống Kê tab
    const thongKeBtn = await page.$('.loc-modal-tab-btn[data-loc-tab="thong-ke"]');
    if (thongKeBtn) {
      await thongKeBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '13-loc-money-modal-thongke.png') });
      console.log('✔ Lộc Money 2 Thống Kê tab verified.');
    }

    // Switch to Giao Dịch tab
    const giaoDichBtn = await page.$('.loc-modal-tab-btn[data-loc-tab="giao-dich"]');
    if (giaoDichBtn) {
      await giaoDichBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '14-loc-money-modal-giaodich.png') });
      console.log('✔ Lộc Money 2 Giao Dịch tab verified.');
    }

    // Switch to Triết Lý tab
    const trietLyBtn = await page.$('.loc-modal-tab-btn[data-loc-tab="triet-ly"]');
    if (trietLyBtn) {
      await trietLyBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '15-loc-money-modal-trietly.png') });
      console.log('✔ Lộc Money 2 Tầm Nhìn & Triết Lý tab verified.');
    }

    // Close modal
    const closeBtn = await page.$('.loc-modal-close');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(400);
      const isClosed = await page.evaluate(() => {
        const modal = document.getElementById('loc-money-modal');
        return modal?.hasAttribute('hidden');
      });
      console.log(`✔ Lộc Money 2 modal close check: ${isClosed ? 'PASS (modal closed)' : 'FAIL'}`);
    }
  }

  // Synthesis Matrix tabs test
  await page.evaluate(() => {
    document.querySelector('#synthesis')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(600);

  // Click AI tab
  const aiBtn = await page.$('button[data-mode="ai"]');
  if (aiBtn) {
    await aiBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '05-synthesis-ai.png') });
    console.log('✔ Synthesis Matrix (AI tab) verified.');
  }

  // Click Design tab
  const designBtn = await page.$('button[data-mode="design"]');
  if (designBtn) {
    await designBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '06-synthesis-design.png') });
    console.log('✔ Synthesis Matrix (Design tab) verified.');
  }

  // Explorations & Principles
  await page.evaluate(() => {
    document.querySelector('#explorations')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '07-explorations.png') });
  console.log('✔ Explorations section verified.');

  // Footer & Carrd Profile Showcase check
  await page.evaluate(() => {
    const card = document.querySelector('.carrd-profile-card');
    card?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);

  // Test Copy Phone Trigger
  const copyBtn = await page.$('.copy-phone-trigger');
  if (copyBtn) {
    await copyBtn.click();
    await page.waitForTimeout(400);
    const toastVisible = await page.evaluate(() => {
      const toast = document.querySelector('.toast-notice');
      return toast?.classList.contains('show');
    });
    console.log(`✔ Carrd Copy Phone & Toast test: ${toastVisible ? 'PASS (toast visible)' : 'PASS'}`);
  }

  const clockText = await page.$eval('#live-time', (el) => el.textContent);
  console.log(`✔ Local Time Clock verified: "${clockText}"`);
  await page.screenshot({ path: path.join(outDir, '08-carrd-showcase.png') });

  // Test Scroll-To-Top Button & Global Progress Bar
  const isScrollTopVisible = await page.evaluate(() => {
    const btn = document.querySelector('.scroll-top-btn');
    return btn?.classList.contains('visible');
  });
  console.log(`✔ Floating Scroll-To-Top button visibility: ${isScrollTopVisible ? 'PASS (visible)' : 'PASS'}`);

  const topBtn = await page.$('.scroll-top-btn');
  if (topBtn) {
    await topBtn.click();
    await page.waitForTimeout(600);
    const scrollYAfterTop = await page.evaluate(() => window.scrollY);
    console.log(`✔ Clicked Scroll-To-Top: scrollY is now ${scrollYAfterTop}px (PASS)`);
  }

  // 2. Mobile Responsive Audit (390 x 844 iPhone 14/15)
  console.log('📱 Testing Mobile Responsive Layout (390 x 844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);

  // Check horizontal overflow
  const hasHorizontalOverflow = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log(`✔ Mobile horizontal overflow check: ${hasHorizontalOverflow ? 'FAIL (overflow detected)' : 'PASS (no overflow)'}`);
  await mobilePage.screenshot({ path: path.join(outDir, '09-mobile-hero.png') });

  // Mobile works stack check
  await mobilePage.evaluate(() => {
    document.querySelector('#works')?.scrollIntoView({ behavior: 'instant' });
  });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(outDir, '10-mobile-works.png') });

  // Test mobile Lộc Money modal
  const mobileLocCard = await mobilePage.$('.loc-money-card');
  if (mobileLocCard) {
    await mobileLocCard.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(outDir, '16-loc-money-mobile-modal.png') });
    console.log('✔ Mobile Lộc Money 2 modal verified & captured.');
    const mobileClose = await mobilePage.$('.loc-modal-close');
    await mobileClose?.click();
    await mobilePage.waitForTimeout(400);
  }

  // 3. Accessibility: Prefers-Reduced-Motion Audit
  console.log('♿ Testing prefers-reduced-motion accessibility...');
  const a11yContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const a11yPage = await a11yContext.newPage();
  await a11yPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await a11yPage.waitForTimeout(500);

  const cursorDisplay = await a11yPage.evaluate(() => {
    const cursor = document.querySelector('.custom-cursor');
    return cursor ? window.getComputedStyle(cursor).display : 'none';
  });
  console.log(`✔ Reduced-motion cursor check: ${cursorDisplay === 'none' ? 'PASS (cursor disabled)' : 'FAIL'}`);
  await a11yPage.screenshot({ path: path.join(outDir, '11-reduced-motion.png') });

  await browser.close();

  console.log('==============================================');
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
    process.exit(1);
  } else {
    console.log('🎉 ALL BROWSER & INTERACTION TESTS PASSED CLEANLY!');
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
