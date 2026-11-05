const puppeteer = require('puppeteer');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreen() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Submit selection to get into active ride
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');

    // Tap to join ride
    await page.waitForFunction(() => document.body.innerText.includes('Tap to join the ride'));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gate = btns.find((b) => b.innerText.includes('Tap to join the ride'));
      if (gate) gate.click();
    });

    await wait(2000);
    await page.screenshot({ path: 'client/public/screenshots/now_playing_screen.png' });
    console.log('✅ Screenshot captured at client/public/screenshots/now_playing_screen.png');
  } finally {
    await browser.close();
  }
}

captureScreen().catch(console.error);
