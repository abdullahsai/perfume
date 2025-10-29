const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { generateBundles } = require('../scripts/generateBundles');

const projectRoot = path.resolve(__dirname, '..');
const serverBundlePath = path.join(projectRoot, 'src', 'server', 'perfumeLibBundle.gs');
const clientBundlePath = path.join(projectRoot, 'src', 'client', 'perfumeLibClientBundle.html');
const libDir = path.join(projectRoot, 'src', 'lib');

describe('generateBundles', () => {
  beforeAll(() => {
    generateBundles();
  });

  test('server bundle compiles without syntax errors', () => {
    const code = fs.readFileSync(serverBundlePath, 'utf8');
    expect(() => new vm.Script(code)).not.toThrow();
  });

  test('client bundle embeds modules inside a script tag', () => {
    const html = fs.readFileSync(clientBundlePath, 'utf8');
    expect(html.startsWith('<!-- Auto-generated from src/lib by scripts/generateBundles.js -->')).toBe(true);
    expect(html).toContain('<script>');
    expect(html.trim().endsWith('</script>')).toBe(true);
  });

  test('each module is wrapped in an IIFE', () => {
    const code = fs.readFileSync(serverBundlePath, 'utf8');
    const files = fs.readdirSync(libDir).filter((file) => file.endsWith('.js'));

    files.forEach((file) => {
      expect(code).toContain(`// BEGIN ${file}\n(() => {`);
      expect(code).toContain(`})();\n// END ${file}`);
    });
  });
});
