import { chromium } from 'playwright';

async function run() {
  console.log('--- Verifying Live Site Deployment at https://nguyenthanhloc.pages.dev ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test 1: Clean visit
  await page.goto('https://nguyenthanhloc.pages.dev', { waitUntil: 'networkidle' });

  const eyebrow = await page.$eval('#explorations .eyebrow span', (el) => el.textContent.trim());
  const title = await page.$eval('#explorations .explorations-title', (el) => el.textContent.trim());
  const subtitleCount = await page.$$eval('#explorations .explorations-subtitle', (els) => els.length);

  console.log('Live Eyebrow:', eyebrow);
  console.log('Live Title:', title);
  console.log('Live Subtitle Count:', subtitleCount);

  if (eyebrow !== 'LIBRARY · THƯ VIỆN') {
    throw new Error(`Live Eyebrow failed! Got: ${eyebrow}`);
  }
  if (!title.includes('Thư Viện') || !title.includes('Library')) {
    throw new Error(`Live Title failed! Got: ${title}`);
  }
  if (title.includes('Ngoài màn hình')) {
    throw new Error(`Deprecated string found in live title: ${title}`);
  }
  if (subtitleCount !== 0) {
    throw new Error(`Live subtitle still exists! Count: ${subtitleCount}`);
  }

  // Test 2: Adversarial visit with stale cache
  console.log('--- Testing Live Site with Stale LocalStorage Cache Injected ---');
  await page.evaluate(() => {
    localStorage.setItem(
      'loc_portfolio_tiptap_v2',
      JSON.stringify({
        'explorations-title': 'Ngoài màn hình · Explorations Outside the Screen',
        'explorations-eyebrow': 'FIELD NOTES & PERSPECTIVES · GHI CHÉP & GÓC NHÌN',
        'explorations-subtitle': 'Một vài lát cắt về kỷ luật, vận động và khoảng lặng.',
      })
    );
  });

  // Reload page
  await page.reload({ waitUntil: 'networkidle' });

  const eyebrowAfterReload = await page.$eval('#explorations .eyebrow span', (el) => el.textContent.trim());
  const titleAfterReload = await page.$eval('#explorations .explorations-title', (el) => el.textContent.trim());
  const subtitleCountAfterReload = await page.$$eval('#explorations .explorations-subtitle', (els) => els.length);

  console.log('After Reload Eyebrow:', eyebrowAfterReload);
  console.log('After Reload Title:', titleAfterReload);
  console.log('After Reload Subtitle Count:', subtitleCountAfterReload);

  if (eyebrowAfterReload !== 'LIBRARY · THƯ VIỆN') {
    throw new Error(`Stale cache overwrote eyebrow! Got: ${eyebrowAfterReload}`);
  }
  if (!titleAfterReload.includes('Thư Viện') || !titleAfterReload.includes('Library') || titleAfterReload.includes('Ngoài màn hình')) {
    throw new Error(`Stale cache overwrote title! Got: ${titleAfterReload}`);
  }
  if (subtitleCountAfterReload !== 0) {
    throw new Error(`Stale cache restored subtitle! Count: ${subtitleCountAfterReload}`);
  }

  // Take screenshot of the section to confirm visually
  const explorationsSection = page.locator('#explorations');
  await explorationsSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/Users/nguyenthanhloc/.gemini/antigravity/brain/dd327259-10bb-409d-bc18-d4b281c8dc76/live-library-verified.png' });
  console.log('✔ Screenshot captured: live-library-verified.png');

  console.log('🎉 LIVE VERIFICATION PASSED 100%! All checks passed.');
  await browser.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
