import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App';

const originalUseState = React.useState;
(React as any).useState = function(initial) {
  if (typeof initial === 'function' && initial.toString().includes('antitheft_auth')) {
    return [true, () => {}];
  }
  return originalUseState.apply(this, arguments);
};

try {
  global.localStorage = {
    getItem: (key) => {
      if (key === 'antitheft_lang') return 'fr';
      if (key === 'antitheft_auth') return 'true';
      return null;
    },
    setItem: () => {},
    clear: () => {}
  } as any;
  
  global.document = {
    documentElement: { dir: 'ltr', lang: 'en' }
  } as any;
  
  Object.defineProperty(global, 'navigator', {
    value: { language: 'fr', geolocation: { getCurrentPosition: () => {} } },
    writable: true
  });

  const html = renderToString(<App />);
  console.log("Render successful! Length:", html.length);
} catch (e) {
  console.error("Render failed:", e.stack);
}
