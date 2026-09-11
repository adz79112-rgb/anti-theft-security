const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Emulate mobile
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('UNCAUGHT:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("ROOT CONTENT LENGTH:", rootContent.length);
  
  // check if StealthStolenScreen is open
  const stealthMode = await page.evaluate(() => !!document.getElementById('stealth-stolen-mode-screen'));
  console.log("STEALTH MODE VISIBLE:", stealthMode);
  
  // Check classes of root or body
  const bodyClasses = await page.evaluate(() => document.body.className);
  console.log("BODY CLASSES:", bodyClasses);

  await browser.close();
})();
