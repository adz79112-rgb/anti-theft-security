const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  
  let hasError = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
      hasError = true;
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE UNCAUGHT ERROR:', err.toString());
    hasError = true;
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("ROOT CONTENT LENGTH:", rootContent.length);
  
  // Dump everything inside root if small enough, or check specific elements
  const mainExists = await page.evaluate(() => !!document.querySelector('main'));
  console.log("MAIN EXISTS:", mainExists);
  
  const headerExists = await page.evaluate(() => !!document.querySelector('header'));
  console.log("HEADER EXISTS:", headerExists);

  if (rootContent.length === 0) {
    console.log("APP IS BLANK!");
  } else {
    console.log("APP RENDERED DIFFERENTLY.");
  }
  
  await browser.close();
})();
