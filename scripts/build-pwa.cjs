// Runs on Vercel for every deployment. No dependencies or manual version bump.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const swPath = path.join(root, 'sw.js');
const template = fs.readFileSync(swPath, 'utf8').replace(/const RELEASE = '[^']*';/, "const RELEASE = 'local';");
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const localAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map(match => match[1]).filter(url => !/^(?:[a-z]+:|\/\/)/i.test(url));
const assets = [...new Set(['./index.html', './manifest.json', './assets/logo.png',
  ...localAssets.map(url => './' + url.replace(/^\.\//, ''))])].sort();
const source = template.replace(/const ASSETS = \[[\s\S]*?\];/, 'const ASSETS = ' + JSON.stringify(assets, null, 2) + ';');
const hash = crypto.createHash('sha256').update(source);
for(const asset of assets) {
  const file = path.resolve(root, asset);
  if(!file.startsWith(root + path.sep)) throw new Error('Asset outside app: ' + asset);
  hash.update(asset).update(fs.readFileSync(file));
}
hash.update(fs.readFileSync(path.join(root, 'vercel.json')));
const release = hash.digest('hex').slice(0, 20);
fs.writeFileSync(swPath, source.replace("const RELEASE = 'local';", `const RELEASE = '${release}';`));
console.log('Vitale app release ' + release + ' (' + assets.length + ' offline files)');
