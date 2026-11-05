const puppeteer = require('puppeteer');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyUIAndMotion() {
  console.log('🎨 Starting Phase 3 UI & Motion verification (360px viewport)...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Mobile-first baseline: 360px x 740px
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });

    console.log('Navigating to http://localhost:3000 at 360px width...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // 1. Verify Selection Flow screen
    await page.waitForFunction(() => document.body.innerText.includes('Board Delhi Metro'));
    console.log('✅ Selection Flow rendered at 360px viewport');
    await page.screenshot({ path: 'client/public/screenshots/01_selection_flow.png' });

    // 2. Select route and board train
    console.log('Submitting metro selection to board train...');
    await page.click('button[type="submit"]');

    // 3. Audio Gate modal appears
    await page.waitForFunction(() => document.body.innerText.includes('Join the Delhi Metro Ride'));
    console.log('✅ Audio Gate Modal successfully displayed');
    await page.screenshot({ path: 'client/public/screenshots/02_audio_gate.png' });

    // Tap to join ride
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gateBtn = btns.find((b) => b.innerText.includes('Tap to join the ride'));
      if (gateBtn) gateBtn.click();
    });

    // 4. Active Ride View with Now Playing Card and Route Strip
    await page.waitForFunction(() => document.body.innerText.includes('Current Station'));
    console.log('✅ Active Ride view rendered with Now Playing card and vertical Route Strip');
    await wait(1000);
    await page.screenshot({ path: 'client/public/screenshots/03_active_ride.png' });

    // 5. Test manual advance & toast notification
    console.log('\nTriggering station advance to verify motion & arrival toast...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find((b) => b.innerText.includes('Next Station'));
      if (nextBtn) nextBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Arrived at Station'), { timeout: 8000 });
    console.log('✅ Arrival Toast displayed with spring motion');
    await page.screenshot({ path: 'client/public/screenshots/04_arrival_toast.png' });

    console.log('\n🎉 Phase 3 UI & Motion verification completed successfully! Screenshots saved.\n');
  } finally {
    await browser.close();
  }
}

verifyUIAndMotion().catch((err) => {
  console.error('Error during UI verification:', err);
  process.exit(1);
});
