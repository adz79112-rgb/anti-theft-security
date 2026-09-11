const fs = require('fs');

let content = fs.readFileSync('src/utils/translateInline.ts', 'utf-8');

if (!content.includes('generatedDict')) {
  content = `import generatedDict from './generated_dict.json';\n` + content;
  
  content = content.replace('const dict = translationsMap[enText];', 'const dict = (translationsMap as Record<string, Record<string, string>>)[enText] || (generatedDict as Record<string, Record<string, string>>)[enText];');
  
  fs.writeFileSync('src/utils/translateInline.ts', content);
}
