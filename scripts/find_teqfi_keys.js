const fs = require('fs');
const path = require('path');

function searchForKeys(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'node_modules' || f === '.git') continue;
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          searchForKeys(full);
        } else if (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.json') || f.endsWith('.env') || f.endsWith('.md') || f.endsWith('.jsonl')) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('teqfiiavnyvvokuinjdy')) {
            console.log('MATCH IN:', full);
            const lines = content.split('\n');
            lines.forEach((l, idx) => {
              if (l.includes('eyJ') || l.includes('KEY') || l.includes('key') || l.includes('teqfi')) {
                console.log(` Line ${idx+1}: ${l.trim().slice(0, 120)}`);
              }
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

searchForKeys('C:\\Users\\Grupo 5\\.gemini');
searchForKeys('C:\\Users\\Grupo 5\\Desktop');
