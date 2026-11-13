// 사용: node tools/avatar_glb/build_loader.mjs [--install]
// 결과: tools/avatar_glb/dist/three_glb.js (window.ThreeGLB = { GLTFLoader, MeshoptDecoder }), 전역 THREE(r149, assets/church/three.min.js) 사용.
//   - GLTFLoader: three@0.149.0 examples/jsm (assets/church/three.min.js 와 같은 판이어야 한다)
//   - MeshoptDecoder: meshoptimizer 패키지의 디코더(인코더와 같은 판; three r149 동봉 디코더는 새 인코더 형식을 모를 수 있다)
// --install 을 주면 assets/church/three_glb.js 에도 쓴다(앱 번들 연결 단계에서만; index.html 에 <script> 추가 필요).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ver = require(path.join(here, 'node_modules/three/package.json')).version;
if (ver !== '0.149.0') throw new Error('three examples must be 0.149.0, got ' + ver);
const mver = require(path.join(here, 'node_modules/meshoptimizer/package.json')).version;
const globalThree = {
  name: 'global-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'global-three' }));
    b.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' }));
  }
};
const out = path.join(here, 'dist/three_glb.js');
await build({
  stdin: { contents: "export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; export { MeshoptDecoder } from 'meshoptimizer/decoder';", resolveDir: here, loader: 'js' },
  bundle: true, format: 'iife', globalName: 'ThreeGLB', minify: true, target: 'es2019', plugins: [globalThree], outfile: out, legalComments: 'none',
  banner: { js: `/* three_glb.js — three@${ver} GLTFLoader (MIT) + meshoptimizer@${mver} MeshoptDecoder (MIT), tools/avatar_glb/build_loader.mjs 로 생성. 전역 THREE r149 필요. */` }
});
console.log('built', out, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
if (process.argv.includes('--install')) {
  const dst = path.resolve(here, '../../assets/church/three_glb.js');
  fs.copyFileSync(out, dst); console.log('installed', dst);
}
