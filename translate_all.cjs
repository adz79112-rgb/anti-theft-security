const translate = require('google-translate-api-x');
const fs = require('fs');

async function run() {
  const lines = fs.readFileSync('unique_en_strings.txt', 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.includes('${')); // exclude templates for safety, or we can include them

  // To be safe, filter lines to those without template literals (like ${...}) to avoid breaking them,
  // or we can translate them and just ensure we keep them. Actually, google translate handles text.
  
  const langs = ['zh-CN', 'fr', 'es', 'ru', 'ur', 'fa'];
  const dict = {};

  for (const line of lines) {
    dict[line] = {};
  }

  // To avoid rate limits, we translate language by language, batching text
  for (const lang of langs) {
    console.log(`Translating to ${lang}...`);
    let langKey = lang === 'zh-CN' ? 'zh' : lang;
    
    // We can translate an array of strings directly in google-translate-api-x
    // Let's chunk to 50 strings at a time
    const chunkSize = 50;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      try {
        const res = await translate(chunk, { to: lang, forceBatch: false });
        // res is an array if we pass an array
        const translatedArray = Array.isArray(res) ? res : [res];
        
        for (let j = 0; j < chunk.length; j++) {
          if (translatedArray[j] && translatedArray[j].text) {
            dict[chunk[j]][langKey] = translatedArray[j].text;
          }
        }
      } catch (e) {
        console.error(`Error in chunk ${i} for ${lang}:`, e.message);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  fs.writeFileSync('src/utils/generated_dict_full.json', JSON.stringify(dict, null, 2));
  console.log('Done generating generated_dict_full.json');
}

run();
