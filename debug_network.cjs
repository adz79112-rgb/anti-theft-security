const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`Failed Response: ${response.status()} ${response.url()}`);
    }
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
  await browser.close();
})();
