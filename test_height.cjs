const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const height = await page.evaluate(() => document.documentElement.clientHeight);
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  
  const rootHeight = await page.evaluate(() => document.getElementById('root')?.clientHeight);
  const rootScrollHeight = await page.evaluate(() => document.getElementById('root')?.scrollHeight);
  
  console.log("CLIENT HEIGHT:", height);
  console.log("SCROLL HEIGHT:", scrollHeight);
  console.log("ROOT CLIENT HEIGHT:", rootHeight);
  console.log("ROOT SCROLL HEIGHT:", rootScrollHeight);

  await browser.close();
})();
