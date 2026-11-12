// 사용: (cd tools/church_web && npm install) && node tools/church_web/build_extras.mjs
// 결과: assets/church/three_extras.js (window.ThreeX). three 는 assets/church/three.min.js 의 전역 THREE 를 쓴다(r149 일치 필수).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ver = require(path.join(here, 'node_modules/three/package.json')).version;
const minHead = fs.readFileSync(path.resolve(here, '../../assets/church/three.min.js'), 'utf8').slice(0, 400);
if (ver !== '0.149.0') throw new Error('three examples must be 0.149.0, got ' + ver);
const globalThreePlugin = {
  name: 'global-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'global-three' }));
    b.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' }));
  }
};
const out = path.resolve(here, '../../assets/church/three_extras.js');
await build({
  entryPoints: [path.join(here, 'extras_entry.js')], bundle: true, format: 'iife', globalName: 'ThreeX', minify: true, target: 'es2019',
  plugins: [globalThreePlugin], outfile: out, legalComments: 'none',
  banner: { js: '/* three_extras.js — three@0.149.0 examples/jsm (MIT) bundled by tools/church_web/build_extras.mjs. Requires global THREE r149. */' }
});
console.log('built', out, (fs.statSync(out).size / 1024).toFixed(0) + 'KB', 'three', ver, minHead.includes('2010-2023') ? '(min.js header ok)' : '');
