import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { translations, getTranslation } from './src/utils/translations';

try {
  // Mock localStorage
  global.localStorage = {
    getItem: (key) => key === 'antitheft_lang' ? 'fr' : null,
    setItem: () => {},
    clear: () => {}
  } as any;
  
  global.document = {
    documentElement: { dir: 'ltr', lang: 'en' }
  } as any;
  
  global.window = {
    location: { reload: () => {} }
  } as any;

  console.log("Translations defined?", !!translations);
  console.log("fr translation defined?", !!translations.fr);
  console.log("fr getTranslation:", getTranslation('fr').appTitle);
  
  const html = renderToString(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  console.log("Render successful! Length:", html.length);
} catch (e) {
  console.error("Render failed:", e);
}
