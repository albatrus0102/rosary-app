import { loadChurches } from './church_harness.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const { churches } = loadChurches();
for (const c of churches) {
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const z = L.reverence.zone; const st = Stations.create(L).stations();
  console.log(c.id, z && [z.x0,z.x1,z.z0,z.z1,z.front,z.halfW].map(v=>+v.toFixed(2)).join(','), z&&z.how, 'altarSt', st.altar.x.toFixed(2), st.altar.z.toFixed(2), 'sacred', JSON.stringify((c.ctx._.sacred||[]).map(s=>[s.k[0],+s.x.toFixed(1),+s.z.toFixed(1), L.reverence.inZone(s.x,s.z)?'IN':'OUT'])));
}
