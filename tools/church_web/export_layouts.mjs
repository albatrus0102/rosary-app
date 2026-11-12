// 사용: node tools/church_web/export_layouts.mjs  ->  server/church/src/layouts.json (레이아웃 배열)
// assets/church/layouts.js 와 ch_*.js 의 ChurchLayouts.register() 호출을 Node(vm)에서 실행해 모은다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

export function loadLayouts() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sandbox, { filename: f });
  run('scene_logic.js');
  run('layouts.js');
  const builders = fs.readdirSync(assets).filter((f) => /^ch_[a-z]+\.js$/.test(f)).sort();
  for (const f of builders) run(f); // 최상위에서 THREE 를 쓰면 여기서 에러가 난다(빌더 규칙 위반)
  const L = sandbox.ChurchLayouts, Logic = sandbox.ChurchLogic;
  const out = [];
  for (const id of L.ids()) {
    const lay = JSON.parse(JSON.stringify(L.byId[id]));
    lay.seats = Logic.seatsOf(lay).map((s) => ({ id: s.id, x: +s.x.toFixed(3), z: +s.z.toFixed(3), yaw: s.yaw }));
    lay.slotPos = Logic.candleSlots(lay).map((s) => ({ slot: s.slot, stand: s.stand, x: +s.x.toFixed(3), z: +s.z.toFixed(3) }));
    out.push(lay);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = loadLayouts();
  const dest = path.resolve(here, '../../server/church/src/layouts.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', dest, out.map((l) => `${l.id}(${l.seats.length} seats, ${l.slotPos.length} slots)`).join(', '));
}
