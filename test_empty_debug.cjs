const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  
  let jsError = false;
  page.on('pageerror', err => {
    console.log('PAGE UNCAUGHT ERROR:', err.toString());
    jsError = true;
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const state = await page.evaluate(() => {
    return {
      rootContent: document.getElementById('root')?.innerHTML || '',
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      htmlBg: window.getComputedStyle(document.documentElement).backgroundColor,
      stealthScreen: !!document.getElementById('stealth-stolen-mode-screen'),
      stealthZIndex: document.getElementById('stealth-stolen-mode-screen') ? window.getComputedStyle(document.getElementById('stealth-stolen-mode-screen')).zIndex : null,
      stealthDisplay: document.getElementById('stealth-stolen-mode-screen') ? window.getComputedStyle(document.getElementById('stealth-stolen-mode-screen')).display : null,
      stealthColor: document.getElementById('stealth-stolen-mode-screen') ? window.getComputedStyle(document.getElementById('stealth-stolen-mode-screen')).backgroundColor : null
    };
  });
  
  console.log("STATE:", state);

  await browser.close();
})();
