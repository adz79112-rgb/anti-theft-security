const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('UNCAUGHT:', err.toString());
  });
  page.on('requestfailed', req => {
    console.log('FAILED REQ:', req.url());
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("ROOT CONTENT LENGTH:", rootContent.length);
  if (rootContent.length === 0) {
    console.log("ROOT IS EMPTY! WHITE SCREEN CONFIRMED!");
  } else {
    console.log("ROOT IS NOT EMPTY.");
  }
  
  await browser.close();
})();
