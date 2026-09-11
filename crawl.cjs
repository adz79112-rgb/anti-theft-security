const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function run() {
  const seen = new Set();
  const queue = ['http://localhost:3000/src/main.tsx'];
  
  while(queue.length > 0) {
    const url = queue.shift();
    if(seen.has(url)) continue;
    seen.add(url);
    
    console.log("Fetching", url);
    const { statusCode, data } = await fetchUrl(url);
    if(statusCode >= 400) {
      console.log("ERROR", statusCode, url);
      console.log(data);
    }
    
    // find all imports
    const importRegex = /import\s+.*?(?:from\s+)?['"](\/src\/[^'"]+)['"]/g;
    let match;
    while((match = importRegex.exec(data)) !== null) {
      queue.push(`http://localhost:3000${match[1]}`);
    }
  }
}
run();
