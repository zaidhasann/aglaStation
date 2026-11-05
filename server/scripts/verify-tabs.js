const puppeteer = require('puppeteer');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyClientSync() {
  console.log('🌐 Launching headless browser to verify multi-tab sync...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Tab 1: Joins room
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 375, height: 812 });
    console.log('Tab 1: Navigating to http://localhost:3000...');
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Submit selection flow to enter ride
    await page1.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await page1.click('button[type="submit"]');

    // Dismiss Audio Gate
    await page1.waitForFunction(() => document.body.innerText.includes('Tap to join the ride'));
    await page1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gate = btns.find((b) => b.innerText.includes('Tap to join the ride'));
      if (gate) gate.click();
    });
    console.log('Tab 1: Boarded train and active in room!');

    // Tab 2: Joins room
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 375, height: 812 });
    console.log('Tab 2: Navigating to http://localhost:3000...');
    await page2.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    await page2.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await page2.click('button[type="submit"]');

    await page2.waitForFunction(() => document.body.innerText.includes('Tap to join the ride'));
    await page2.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gate = btns.find((b) => b.innerText.includes('Tap to join the ride'));
      if (gate) gate.click();
    });
    console.log('Tab 2: Boarded train and active in room!');

    // Verify both tabs show active listeners count
    await page1.waitForFunction(() => /riders/.test(document.body.innerText));
    await page2.waitForFunction(() => /riders/.test(document.body.innerText));
    console.log('✅ PASS: Both tabs reflect active listeners in the room!');

    // Station check before advance (English name in h1.text-2xl)
    const getStation = (pg) =>
      pg.evaluate(() => {
        const el = document.querySelector('h1.text-2xl');
        return el ? el.innerText.trim() : '';
      });

    const stationBefore = await getStation(page1);
    console.log(`Current station before advance: "${stationBefore}"`);

    // Click Next Station button on Tab 1
    await page1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const next = btns.find((b) => b.innerText.includes('Next Station'));
      if (next) next.click();
    });

    // Wait for update on both tabs
    await page1.waitForFunction(
      (prev) => {
        const el = document.querySelector('h1.text-2xl');
        return el && el.innerText.trim() !== prev;
      },
      { timeout: 10000 },
      stationBefore
    );

    await page2.waitForFunction(
      (prev) => {
        const el = document.querySelector('h1.text-2xl');
        return el && el.innerText.trim() !== prev;
      },
      { timeout: 10000 },
      stationBefore
    );

    const st1 = await getStation(page1);
    const st2 = await getStation(page2);

    console.log(`Tab 1 Station after advance: "${st1}"`);
    console.log(`Tab 2 Station after advance: "${st2}"`);

    if (st1 === st2 && st1 !== stationBefore) {
      console.log('✅ PASS: Both Tab 1 and Tab 2 transitioned simultaneously to the next station!');
    } else {
      throw new Error(`Station mismatch: Tab 1 "${st1}" vs Tab 2 "${st2}"`);
    }

    console.log('\n🎉 Multi-tab sync verified successfully with Phase 3 UI!\n');
  } finally {
    await browser.close();
  }
}

verifyClientSync().catch((err) => {
  console.error('Error during client sync verification:', err);
  process.exit(1);
});
