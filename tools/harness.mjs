// 굽기·시험용: three.js 를 Node(vm)에서 돌려(가짜 canvas·Image) 장면 빌더를 앱과 같은 설정으로 짓는다.
// ao_bake.mjs 가 쓴다: loadRooms({quality:'high', photos:true, aoDefer:true, only}) → {rooms:[{id, ctx, prepare, layout, colliders, zones}], Logic, THREE}
// (원본 엔진 도구와 같은 모양)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const WEB = process.env.ROOM_WEB || path.resolve(here, '../web');

function makeSandbox() {
  const sb = { console, performance, setTimeout, clearTimeout };
  sb.window = sb; sb.self = sb;
  const noop = () => {};
  const ctx2d = new Proxy(noop, {
    get: (t, k) => {
      if (k === 'canvas') return {};
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return noop;
    },
    set: () => true
  });
  sb.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener: noop }),
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }, head: { appendChild: noop }
  };
  sb.location = { search: '' }; sb.navigator = { userAgent: 'node' };
  sb.Image = function () {};
  vm.createContext(sb);
  return sb;
}
export function loadRooms(opts = {}) {
  const sb = makeSandbox();
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'palette.js', 'layouts.js', 'scan3d.js', 'scene_logic.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js'].forEach(run);
  fs.readdirSync(WEB).filter((f) => /^ch_[a-z]+\.js$/.test(f)).sort().forEach(run);
  const out = [];
  for (const id of Object.keys(sb.RoomBuilders)) {
    if (opts.only && opts.only.indexOf(id) < 0) continue;
    const b = sb.RoomBuilders[id];
    const ctx = sb.RoomKit.createContext({ layout: b.layout, quality: opts.quality || 'low', aoDefer: !!opts.aoDefer });
    const ret = b.build(ctx), S = ctx._;
    const colliders = S.colliders.slice(), zones = S.zones.slice();
    out.push({ id, ret, layout: b.layout, colliders, zones, walls: S.walls, windows: S.windows, prepare: () => ctx._prepare(), ctx, builder: b });
  }
  return { rooms: out, Kit: sb.RoomKit, Logic: sb.RoomLogic, Layouts: sb.RoomLayouts, THREE: sb.THREE, sandbox: sb };
}
