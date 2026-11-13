// 대안 FBX 변환(--via three): Playwright chromium 안에서 three r149 FBXLoader → GLTFExporter(binary).
// fbx2gltf 바이너리를 쓸 수 없는 환경(맥 ARM 등)용. FBXLoader 는 Mixamo FBX 를 cm 로 읽으므로 내보낸 뒤 bakeRootScale 이 미터로 고친다
// (여기서는 최상위 그룹에 0.01 스케일을 걸어 내보낸다).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { TOOL_DIR } from './gltf_ops.mjs';

const require = createRequire(import.meta.url);
const THREE_MIN = path.resolve(TOOL_DIR, '../../assets/church/three.min.js');

const globalThree = {
  name: 'global-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'global-three' }));
    b.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' }));
  }
};
let bundleCache = null;
async function bundle() {
  if (bundleCache) return bundleCache;
  const r = await build({
    stdin: { contents: "export { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'; export { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';", resolveDir: TOOL_DIR, loader: 'js' },
    bundle: true, format: 'iife', globalName: 'ThreeConv', write: false, plugins: [globalThree], target: 'es2019', logLevel: 'silent'
  });
  bundleCache = r.outputFiles[0].text;
  return bundleCache;
}

export async function convertFbxWithThree(file, outGlb) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const log = [];
  try {
    const page = await browser.newPage();
    page.on('console', (m) => log.push(m.text()));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: fs.readFileSync(THREE_MIN, 'utf8') });
    await page.addScriptTag({ content: await bundle() });
    const b64 = fs.readFileSync(file).toString('base64');
    const out = await page.evaluate(async (b64) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const obj = new window.ThreeConv.FBXLoader().parse(u8.buffer, '');
      const top = new THREE.Group(); top.name = 'Armature'; top.scale.setScalar(0.01); top.add(obj);
      const glb = await new Promise((res, rej) => new window.ThreeConv.GLTFExporter().parse(top, res, rej, { binary: true, animations: obj.animations || [], onlyVisible: false }));
      const v = new Uint8Array(glb); let s = '';
      for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode.apply(null, v.subarray(i, i + 0x8000));
      return { b64: btoa(s), clips: (obj.animations || []).map((a) => a.name) };
    }, b64);
    fs.writeFileSync(outGlb, Buffer.from(out.b64, 'base64'));
    log.push('clips: ' + out.clips.join(','));
  } finally { await browser.close(); }
  return log.join('\n');
}
