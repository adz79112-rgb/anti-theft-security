const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.emulate(puppeteer.KnownDevices['Pixel 5']);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const h1Text = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.innerText : 'NO H1';
  });
  console.log("H1 TEXT:", h1Text);

  await browser.close();
})();
