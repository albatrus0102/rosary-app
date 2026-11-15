// 임시(커밋하지 않음): 성 베드로 빌더 통계·14처 자리
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const WayCross = require('../../assets/church/way_cross.js');
const { churches } = loadChurches();
const c = churches.find((x) => x.id === 'stpeter');
const S = c.ctx._;
const bb = S.batches, out = {};
let tot = 0;
for (const k in bb) { out[k] = bb[k].vertexCount; tot += bb[k].vertexCount; }
for (const k in S.surfBatches) { out['surf:' + k] = S.surfBatches[k].batch.vertexCount; tot += S.surfBatches[k].batch.vertexCount; }
console.log('batches', JSON.stringify(out), 'total', tot, 'tris', tot / 3);
console.log('stats', JSON.stringify(c.ctx.stats), 'colliders', c.colliders.length, 'planes', S.planes.length, 'glows', S.glows.length, 'flames', (S.flames || []).length, 'beams', (S.beams || []).length);
const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
const St = Stations.create(L);
const r = WayCross.derive({ layout: c.layout, logic: L, stations: St, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
console.log('cross', r.why, JSON.stringify(r.counts));
r.plaques.forEach((p) => console.log(p.n, p.side, p.x.toFixed(2), p.z.toFixed(2), 'n', p.nx, p.nz, 'stand', p.stand.x.toFixed(2), p.stand.z.toFixed(2)));
const st = St.stations();
console.log('stations', JSON.stringify(st, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v).slice(0, 600));
if (process.argv[2]) { const pts = JSON.parse(process.argv[2]); pts.forEach((p) => console.log(p, 'free', St.free(p[0], p[1]), 'reach', St.isReachable(p[0], p[1]))); }
