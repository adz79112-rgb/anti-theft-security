const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');

const filesToProcess = [
  ...fs.readdirSync(componentsDir).map(f => path.join(componentsDir, f)),
  path.join(srcDir, 'App.tsx')
].filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

filesToProcess.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes("lang === 'ar'")) return;
  
  // Replace the pattern
  const regex = /lang === 'ar'\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/g;
  
  let modifiedContent = content.replace(regex, (match, arString, enString) => {
    return `translateInline(lang, '${enString.replace(/'/g, "\\'")}', '${arString.replace(/'/g, "\\'")}')`;
  });
  
  // Add import if modified
  if (modifiedContent !== content) {
    const importPath = filePath.includes('components') ? '../utils/translateInline' : './utils/translateInline';
    if (!modifiedContent.includes('translateInline')) {
        console.log("WAIT, it SHOULD include it now.");
    }
    
    // check if it's already imported
    if (!modifiedContent.includes("import { translateInline }")) {
       const importStatement = `import { translateInline } from '${importPath}';\n`;
       // insert after first import
       modifiedContent = modifiedContent.replace(/import [^\n]+;\n/, match => match + importStatement);
    }
    
    fs.writeFileSync(filePath, modifiedContent);
    console.log(`Updated ${filePath}`);
  }
});
