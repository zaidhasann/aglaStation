const puppeteer = require('puppeteer');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureUpdatedScreens() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

    // 1. Line Selection Screen (Showing Yellow, Blue, Red, Violet, Magenta lines)
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Board The Metro'));
    await page.screenshot({ path: 'client/public/screenshots/05_multi_line_selection.png' });
    console.log('✅ Captured 05_multi_line_selection.png');

    // 2. Select Blue Line and board
    console.log('Selecting Blue Line...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const blueBtn = btns.find((b) => b.innerText.includes('Blue Line'));
      if (blueBtn) blueBtn.click();
    });

    await wait(500);
    await page.click('button[type="submit"]');

    // Dismiss Audio Gate
    await page.waitForFunction(() => document.body.innerText.includes('Tap to join the ride'));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gate = btns.find((b) => b.innerText.includes('Tap to join the ride'));
      if (gate) gate.click();
    });

    // 3. Now Playing Card in Blue Line Theme
    await page.waitForFunction(() => document.body.innerText.includes('Blue Line'));
    await wait(1000);
    await page.screenshot({ path: 'client/public/screenshots/06_blue_line_now_playing.png' });
    console.log('✅ Captured 06_blue_line_now_playing.png in Blue Line Theme');

    // 4. Switch to Live Delivery-style Route Map Tab
    console.log('Switching to Live Route Map Tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const routeTab = btns.find((b) => b.innerText.includes('Live Route Map'));
      if (routeTab) routeTab.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Live Track'));
    await wait(1500);
    await page.screenshot({ path: 'client/public/screenshots/07_delivery_style_metro_map.png' });
    console.log('✅ Captured 07_delivery_style_metro_map.png (Delivery app style live track)');

    console.log('\n🎉 All multi-line and visual map screenshots captured successfully!\n');
  } finally {
    await browser.close();
  }
}

captureUpdatedScreens().catch(console.error);
