const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const leaks = [];
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const f of files) {
      if (f === 'node_modules' || f === '.git' || f === '.next') continue;
      const fullPath = path.join(currentDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.json') || f.endsWith('.env') || f.endsWith('.local'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('xgzkudwuukctaldwcekr')) {
          leaks.push({ file: fullPath, match: 'xgzkudwuukctaldwcekr' });
        }
      }
    }
  }
  walk(dir);
  return leaks;
}

const leaks = checkDir('c:\\Users\\Grupo 5\\Desktop\\SPS Prototipo\\src');
console.log('=== ISOLATION AUDIT IN SPS PROTOTIPO (SRC) ===');
console.log('Leaks found:', leaks.length);
if (leaks.length > 0) {
  console.log(leaks);
} else {
  console.log('✅ ZERO SIGPAD DATABASE LEAKS FOUND IN 704 CODEBASE (SRC).');
}
