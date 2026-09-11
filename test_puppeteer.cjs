const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  const content = await page.content();
  if (content.includes('حدث خطأ أثناء تحميل الواجهة') || content.includes('Unknown render error')) {
     console.log("REACT ERROR DETECTED");
     try {
       const text = await page.$eval('.overflow-auto', el => el.textContent);
       console.log("ERROR DETAILS:", text);
     } catch (e) { }
  } else {
     console.log("NO REACT ERROR DETECTED. ALL GOOD.");
  }

  await browser.close();
})();
