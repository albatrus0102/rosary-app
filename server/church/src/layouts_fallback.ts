// layouts.json 에 'basic'이 없을 때만 쓰는 하드코딩 폴백 (SPEC §1/§10).
// layouts.json 에 basic 이 항상 들어오게 되면 이 파일과 layouts.ts 의 FALLBACK 한 줄을 지우면 된다.
import type { Layout } from './layout';

export const BASIC_FALLBACK: Layout = {
  id: 'basic',
  scalePercent: 100,
  bounds: { x0: -12, x1: 12, z0: -20, z1: 20 },
  spawn: { x: 0, z: 17, r: 0 },
  seatGroups: [
    { g: 'L', rows: 12, perRow: 6, origin: { x: -3.2, z: -9.65 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0 },
    { g: 'R', rows: 12, perRow: 6, origin: { x: 3.2, z: -9.65 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0 },
  ],
  candles: { stands: [{ x: 10.5, z: 0, slots: 96, reach: 1.8 }] },
};
