import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({});

async function refactorFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes("lang === 'ar'")) {
    console.log(`No hardcoded translations found in ${filePath}`);
    return;
  }

  const prompt = `You are an expert TypeScript React developer and polyglot translator.
The following React component uses hardcoded ternary expressions for translations like \`lang === 'ar' ? 'Arabic Text' : 'English Text'\`.

Your task:
1. Extract ALL these hardcoded texts.
2. Create a local dictionary object OUTSIDE the component (e.g., \`const localDict = { ... }\`) containing translations for at least these language keys: 'en', 'ar', 'zh', 'fr', 'es', 'ru', 'ur', 'fa', 'tr', 'hi', 'pt'.
3. Use your knowledge to provide accurate translations for all those languages based on the English/Arabic text.
4. Inside the component, add \`const tLocal = localDict[lang as keyof typeof localDict] || localDict['en'];\` (make sure \`lang\` is accessible, it should be in the props).
5. Replace all the original ternary expressions (e.g., \`{lang === 'ar' ? 'مرحبا' : 'Hello'}\`) with the dictionary reference (e.g., \`{tLocal.hello}\`).
6. NEVER remove or modify any other logic, components, imports, or exports. ONLY refactor the translations.
7. Return ONLY the raw valid TypeScript code. NO markdown formatting, NO \`\`\`tsx tags, NO explanations. Start exactly with the first import.

File Content:
${content}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.1
      }
    });
    
    let updatedCode = response.text;
    // Strip markdown if it somehow included it
    if (updatedCode.startsWith('\`\`\`')) {
      updatedCode = updatedCode.replace(/^\`\`\`(tsx|ts)?\n/, '').replace(/\n\`\`\`$/, '');
    }
    
    fs.writeFileSync(filePath, updatedCode);
    console.log(`✅ Successfully refactored ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to process ${filePath}:`, error);
  }
}

async function main() {
  await refactorFile('src/components/StealthStatusBadge.tsx');
}

main();
