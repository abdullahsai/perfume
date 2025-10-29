const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const libDir = path.join(projectRoot, 'src', 'lib');
const serverBundlePath = path.join(projectRoot, 'src', 'server', 'perfumeLibBundle.gs');
const clientBundlePath = path.join(projectRoot, 'src', 'client', 'perfumeLibBundle.html');

function generate() {
  const files = fs
    .readdirSync(libDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  const banner = '// Auto-generated from src/lib by scripts/generateBundles.js\n';
  const combined = files
    .map((file) => {
      const content = fs.readFileSync(path.join(libDir, file), 'utf8');
      return `// BEGIN ${file}\n${content}\n// END ${file}\n`;
    })
    .join('\n');

  fs.writeFileSync(serverBundlePath, `${banner}${combined}`);
  fs.writeFileSync(clientBundlePath, `<!-- Auto-generated from src/lib by scripts/generateBundles.js -->\n<script>\n${combined}\n</script>\n`);
}

generate();
