// 사용: THREE_NODE_MODULES=<three@0.149.0 과 esbuild 가 깔린 node_modules 경로> node tools/build_extras.mjs
// 결과: web/three_extras.js (window.ThreeX). 전역 THREE(r149, web/three.min.js)를 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const nm = process.env.THREE_NODE_MODULES || path.join(here, 'node_modules');
const require = createRequire(path.join(nm, 'x.js'));
const { build } = require('esbuild');
const ver = require(path.join(nm, 'three/package.json')).version;
if (ver !== '0.149.0') throw new Error('three examples must be 0.149.0, got ' + ver);
const globalThree = { name: 'global-three', setup(b) {
  b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'global-three' }));
  b.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' }));
} };
const out = path.resolve(here, '../web/three_extras.js');
await build({ entryPoints: [path.join(here, 'extras_entry.js')], bundle: true, format: 'iife', globalName: 'ThreeX', minify: true, target: 'es2019',
  nodePaths: [nm], plugins: [globalThree], outfile: out, legalComments: 'none',
  banner: { js: '/* three_extras.js — three@0.149.0 examples/jsm (MIT, Copyright 2010-2023 Three.js Authors). Requires global THREE r149. */' } });
console.log('built', out, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
// GLB 아바타 읽기(GLTFLoader)만 따로: web/three_glb.js (window.ThreeGLB)
const outG = path.resolve(here, '../web/three_glb.js');
await build({ entryPoints: [path.join(here, 'glb_entry.js')], bundle: true, format: 'iife', globalName: 'ThreeGLB', minify: true, target: 'es2019',
  nodePaths: [nm], plugins: [globalThree], outfile: outG, legalComments: 'none',
  banner: { js: '/* three_glb.js — three@0.149.0 examples/jsm GLTFLoader (MIT, Copyright 2010-2023 Three.js Authors). Requires global THREE r149. */' } });
console.log('built', outG, (fs.statSync(outG).size / 1024).toFixed(0) + 'KB');
