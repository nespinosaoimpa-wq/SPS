const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern, maxDepth = 4, depth = 0) {
  if (depth > maxDepth) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          searchDir(fullPath, pattern, maxDepth, depth + 1);
        } else if (stat.isFile() && (file.endsWith('.env') || file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.txt') || file.includes('env'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes(pattern.toLowerCase())) {
            console.log('FOUND MATCH IN:', fullPath);
            const lines = content.split('\n');
            lines.forEach((l, idx) => {
              if (l.toLowerCase().includes(pattern.toLowerCase())) {
                console.log(`  Line ${idx + 1}: ${l}`);
              }
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log('Searching for teqfiiavnyvvokuinjdy...');
searchDir('C:\\Users\\Grupo 5\\Desktop', 'teqfiiavnyvvokuinjdy');
searchDir('C:\\Users\\Grupo 5\\.gemini', 'teqfiiavnyvvokuinjdy');
console.log('Done search.');
