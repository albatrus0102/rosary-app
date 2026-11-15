import { loadChurches } from './church_harness.mjs';
const { churches, Logic, Stations, WayCross } = loadChurches();
for (const c of churches) {
  const lay = c.layout, b = lay.bounds;
  const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), st = S.stations();
  let pl = []; try { pl = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots }).plaques || []; } catch (e) {}
  const cols = c.colliders.map((q) => q.r !== undefined && q.x0 === undefined ? { x0: q.x - q.r, x1: q.x + q.r, z0: q.z - q.r, z1: q.z + q.r } : { x0: Math.min(q.x0, q.x1), x1: Math.max(q.x0, q.x1), z0: Math.min(q.z0, q.z1), z1: Math.max(q.z0, q.z1) });
  const hit = (x, z) => { if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return { big: 1 }; for (const q of cols) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return q; for (const q of L.bands) if (x >= q.x0 - .3 && x <= q.x1 + .3 && z >= q.z0 - .3 && z <= q.z1 + .3) return q; return null; };
  const near = (x, z, list, d) => list.some((p) => p && Math.hypot(p.x - x, p.z - z) < d);
  const stands = lay.candles.stands, fonts = st.font || [];
  const res = [];
  for (const [fx, fz, yaw] of [[1, 0, 90], [-1, 0, -90], [0, 1, 0], [0, -1, 180]]) {
    const px = fz, pz = -fx; let best = null;
    for (let x = b.x0; x <= b.x1; x += 0.1) for (let z = b.z0; z <= b.z1; z += 0.1) {
      const P = (d, l) => [x + fx * d + px * l, z + fz * d + pz * l];
      let ok = true;
      for (const l of [-0.45, 0, 0.45]) { const w = hit(...P(-0.42, l)); if (!w || !(w.big || (Math.abs(px) > .5 ? w.x1 - w.x0 : w.z1 - w.z0) >= 2.4)) { ok = false; break; } }
      if (!ok) continue;
      for (let d = -0.25; d <= 1.15 && ok; d += 0.14) for (let l = -0.62; l <= 0.621; l += 0.155) if (hit(...P(d, l))) { ok = false; break; }
      if (!ok) continue;
      const A = P(1.6, 0);
      if (!S.free(...A) || !S.free(...P(1.6, .35)) || !S.free(...P(1.6, -.35)) || !S.free(...P(2.0, 0)) || !S.isReachable(...A)) continue;
      if (L.floorY(x, z) !== 0 || L.floorY(...A) !== 0) continue;
      if (near(x, z, stands, 3.2) || near(x, z, pl, 1.9) || near(x, z, fonts, 3) || near(x, z, [st.altar], 3.5) || near(A[0], A[1], [st.entrance, lay.spawn], 4.5)) continue;
      if (c.windows.some((w) => w.x !== undefined && Math.hypot(w.x - (x - fx * .5), w.z - (z - fz * .5)) < 1.3 && (w.y === undefined || w.y < 2.9))) continue;
      const sc = Math.abs(z - (st.altar.z + 1.5)) + (Math.min(x - b.x0, b.x1 - x)) * 0.3 + (x > 0 ? 0.05 : 0);
      if (!best || sc < best.sc) best = { x: +x.toFixed(1), z: +z.toFixed(1), yaw, sc: +sc.toFixed(1) };
    }
    if (best) res.push(best);
  }
  console.log(c.id, 'b', JSON.stringify(b), 'altar', st.altar.x.toFixed(1), st.altar.z.toFixed(1), 'stands', stands.map((s) => s.x + ',' + s.z).join(' '), '\n  ', res.map((r) => JSON.stringify(r)).join(' '));
}
