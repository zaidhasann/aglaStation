const puppeteer = require('puppeteer');

async function verifyPWA() {
  console.log('📱 Verifying PWA capabilities, manifest, and service worker...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });

    // 1. Verify Manifest route
    console.log('1. Checking /manifest.webmanifest endpoint...');
    const manifestRes = await page.goto('http://localhost:3000/manifest.webmanifest');
    const manifestJson = await manifestRes.json();
    console.log('Manifest Content:', JSON.stringify(manifestJson, null, 2));

    if (manifestJson.name === 'NextStation' && manifestJson.display === 'standalone') {
      console.log('✅ PASS: Web App Manifest is valid and configured for standalone PWA mode');
    } else {
      throw new Error('Manifest configuration mismatch');
    }

    // 2. Verify Service Worker registration & App Shell loading
    console.log('\n2. Navigating to app to check Service Worker registration...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });

    console.log('Service Worker registered in browser:', swRegistered);
    if (swRegistered) {
      console.log('✅ PASS: Service Worker registered successfully');
    }

    // 3. Verify Offline Fallback screen
    console.log('\n3. Checking /offline.html fallback page...');
    await page.goto('http://localhost:3000/offline.html', { waitUntil: 'networkidle2' });
    const offlineTitle = await page.evaluate(() => document.querySelector('h1')?.innerText);
    console.log('Offline page title:', offlineTitle);

    if (offlineTitle && offlineTitle.includes('Connect to Ride')) {
      console.log('✅ PASS: Friendly offline screen is ready');
    } else {
      throw new Error('Offline page missing or incorrect');
    }

    console.log('\n🎉 PWA Phase 3.5 verification completed successfully!\n');
  } finally {
    await browser.close();
  }
}

verifyPWA().catch((err) => {
  console.error('PWA Verification Error:', err);
  process.exit(1);
});
