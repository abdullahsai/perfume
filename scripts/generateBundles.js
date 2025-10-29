const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const libDir = path.join(projectRoot, 'src', 'lib');
const serverBundlePath = path.join(projectRoot, 'src', 'server', 'perfumeLibBundle.gs');
const clientBundlePath = path.join(projectRoot, 'src', 'client', 'perfumeLibClientBundle.html');

function indent(content) {
  return content
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : ''))
    .join('\n');
}

function wrapModule(file, content) {
  const indented = indent(content);
  return [
    `// BEGIN ${file}`,
    '(() => {',
    indented,
    '})();',
    `// END ${file}`,
    ''
  ].join('\n');
}

function generateBundles() {
  const files = fs
    .readdirSync(libDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  const banner = '// Auto-generated from src/lib by scripts/generateBundles.js\n';
  const combined = files
    .map((file) => {
      const content = fs.readFileSync(path.join(libDir, file), 'utf8');
      return wrapModule(file, content);
    })
    .join('\n\n');

  fs.writeFileSync(serverBundlePath, `${banner}${combined}`);
  fs.writeFileSync(
    clientBundlePath,
    `<!-- Auto-generated from src/lib by scripts/generateBundles.js -->\n<script>\n${combined}</script>\n`
  );
}

if (require.main === module) {
  generateBundles();
}

module.exports = {
  generateBundles
};
