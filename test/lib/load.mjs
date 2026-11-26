// 브라우저용 스크립트(IIFE, window 전역)를 Node 에서 읽는다: globalThis 를 window 로 두고 그대로 실행.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web');
export function load(...files) {
  if (!globalThis.window) globalThis.window = globalThis;
  for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(WEB, f), 'utf8'), { filename: f });
  return globalThis;
}
// 집 장면: 레이아웃 + 순수 계획(충돌체) + 로직
export function house() {
  const g = load('layouts.js', 'scene_logic.js', 'ch_house.js');
  const B = g.RoomBuilders.house, layout = B.layout;
  const colliders = B.planColliders();
  const logic = g.RoomLogic.create(layout, { colliders: colliders.map((c) => { const o = { ...c }; delete o.tag; return o; }), zones: layout.floorZones });
  return { B, layout, colliders, logic, L: g.RoomLogic };
}
// 원(반지름 r)이 충돌체와 겹치는 깊이(양수면 파고듦)
export function penetration(c, x, z, r) {
  if (c.r !== undefined && c.x0 === undefined) return c.r + r - Math.hypot(x - c.x, z - c.z);
  const cx = Math.max(c.x0, Math.min(c.x1, x)), cz = Math.max(c.z0, Math.min(c.z1, z));
  const inside = x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
  if (inside) return r + Math.min(x - c.x0, c.x1 - x, z - c.z0, c.z1 - z);
  return r - Math.hypot(x - cx, z - cz);
}
