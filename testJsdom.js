const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`, {
  url: "http://localhost",
  runScripts: "dangerously"
});

// Polyfills for the app
dom.window.localStorage = {
  getItem: (k) => k === 'antitheft_lang' ? 'fr' : null,
  setItem: () => {},
  clear: () => {}
};
dom.window.sessionStorage = dom.window.localStorage;
dom.window.navigator.geolocation = { getCurrentPosition: () => {} };

// Try to require the compiled output of the app
// Vite builds to dist/
// We can just serve the dist folder or require the index.html? No, jsdom can't execute ES modules easily from a string unless configured.
