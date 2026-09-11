const { translate } = require('@vitalets/google-translate-api');
const fs = require('fs');

async function run() {
  const lines = fs.readFileSync('unique_en_strings.txt', 'utf-8').split('\n').map(l => l.trim()).filter(l => l);
  const langs = ['zh-CN', 'fr', 'es', 'ru'];
  const dict = {};

  for (const line of lines) {
    dict[line] = {};
  }

  const chunkSize = 20;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const textToTranslate = chunk.join(' ||| ');
    
    console.log(`Translating chunk ${i / chunkSize + 1} of ${Math.ceil(lines.length / chunkSize)}...`);
    
    for (const lang of langs) {
      try {
        const res = await translate(textToTranslate, { to: lang });
        const translatedParts = res.text.split(/\|\|\||\| \| \||\|\| \|/g).map(s => s.trim());
        
        for (let j = 0; j < chunk.length; j++) {
          let langKey = lang === 'zh-CN' ? 'zh' : lang;
          if (translatedParts[j]) {
            dict[chunk[j]][langKey] = translatedParts[j];
          }
        }
      } catch (e) {
        console.error(`Error translating chunk to ${lang}:`, e.message);
      }
      
      // small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 500));
    }
  }

  fs.writeFileSync('src/utils/generated_dict.json', JSON.stringify(dict, null, 2));
  console.log('Done!');
}
run();
