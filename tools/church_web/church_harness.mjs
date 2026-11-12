// 시험용: three.js 없이(가짜 canvas) 모든 성당 빌더를 Node(vm)에서 돌려 충돌체·바닥 구역을 모은다.
// 경로 탐색·스테이션 시험이 실제 월드와 같은 충돌체로 동작하는지 확인하는 데 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

function makeSandbox() {
  const sandbox = { console, performance, setTimeout, clearTimeout };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const noop = () => {};
  const ctx2d = new Proxy(noop, {
    get: (t, k) => {
      if (k === 'canvas') return {};
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return noop;
    },
    set: () => true
  });
  sandbox.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener: noop }),
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }
  };
  sandbox.location = { search: '' };
  sandbox.navigator = { userAgent: 'node' };
  sandbox.Image = function () {};
  vm.createContext(sandbox);
  return sandbox;
}

/** 모든 성당을 빌드해 [{id, layout, colliders, zones}] 를 돌려준다(실제 world.js 와 같은 방식으로 충돌체를 모은다). */
export function loadChurches() {
  const sb = makeSandbox();
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js'].forEach(run);
  fs.readdirSync(assets).filter((f) => /^ch_[a-z]+\.js$/.test(f)).sort().forEach(run);
  const out = [];
  for (const id of Object.keys(sb.ChurchBuilders)) {
    const b = sb.ChurchBuilders[id];
    const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: 'low' });
    const ret = b.build(ctx);
    const S = ctx._;
    const colliders = S.colliders.slice(), zones = S.zones.slice();
    if (ret && ret.colliders) ret.colliders.forEach((c) => colliders.push(c));
    if (ret && ret.floorZones) ret.floorZones.forEach((z) => zones.push(z));
    out.push({ id, layout: b.layout, colliders, zones });
  }
  return { churches: out, Logic: sb.ChurchLogic, Stations: sb.ChurchStations, Layouts: sb.ChurchLayouts };
}
