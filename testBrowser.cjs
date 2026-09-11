const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); // wait for render
  
  // click french if we can
  // but let's just see if there's any initial error
  console.log("HTML:", await page.content());
  await browser.close();
})();
