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
    page1.on('console', (msg) => console.log('TAB 1 CONSOLE:', msg.text()));
    await page1.setViewport({ width: 375, height: 667 });
    console.log('Tab 1: Navigating to http://localhost:3000...');
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    await page1.waitForFunction(() => document.body.innerText.includes('Connected'));
    console.log('Tab 1: Connected to server!');
    const txt1 = await page1.evaluate(() => document.body.innerText);
    console.log('Tab 1 Body:', txt1);

    console.log('\n⏳ Waiting 3 seconds before opening Tab 2...');
    await wait(3000);

    const page2 = await browser.newPage();
    page2.on('console', (msg) => console.log('TAB 2 CONSOLE:', msg.text()));
    await page2.setViewport({ width: 375, height: 667 });
    console.log('Tab 2: Navigating to http://localhost:3000...');
    await page2.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page2.waitForFunction(() => document.body.innerText.includes('Connected'));
    console.log('Tab 2: Connected to server!');
    const txt2 = await page2.evaluate(() => document.body.innerText);
    console.log('Tab 2 Body:', txt2);

    await wait(2000);
    const txt1After = await page1.evaluate(() => document.body.innerText);
    const txt2After = await page2.evaluate(() => document.body.innerText);
    console.log('Tab 1 After:', txt1After);
    console.log('Tab 2 After:', txt2After);
  } finally {
    await browser.close();
  }
}

verifyClientSync().catch((err) => {
  console.error('Error during client sync verification:', err);
  process.exit(1);
});
