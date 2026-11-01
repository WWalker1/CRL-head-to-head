// Compile only the existing sync dependency graph; ship no Next.js app or model bundle.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'workers/nightly-sync/dist');
const seen = new Set();
function compile(relative) {
  if (seen.has(relative)) return;
  seen.add(relative);
  const source = path.join(root, relative);
  let output = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: source,
  }).outputText;
  output = output.replace(/require\(["']([^"']+)["']\)/g, (full, specifier) => {
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return full;
    const target = specifier.startsWith('@/') ? specifier.slice(2) : path.join(path.dirname(relative), specifier);
    const dependency = target.replaceAll('\\', '/') + '.ts';
    if (!fs.existsSync(path.join(root, dependency))) throw new Error('Unsupported worker import: ' + specifier);
    compile(dependency);
    let rewritten = path.relative(path.dirname(relative), target).replaceAll('\\', '/');
    if (!rewritten.startsWith('.')) rewritten = './' + rewritten;
    return 'require(' + JSON.stringify(rewritten + '.js') + ')';
  });
  const destination = path.join(out, relative.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, output);
}
compile('utils/battleProcessor.ts');
compile('lib/scheduled-sync.ts');
console.log('Compiled ' + seen.size + ' sync modules');
