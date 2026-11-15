// 밀라노 성당 씬의 창 개구부 조회(E-1, docs/church/MILAN_55_PLACEMENT.md) — 씬 코드를 고치지 않고 빌더를 Node(vm)에서 그대로 돌려 잰다.
// 사용: node tools/church_web/milan_openings.mjs            # 개구부 표(구역별)
//       node tools/church_web/milan_openings.mjs --json     # 개구부 전체(JSON, world 좌표·법선·크기)
//       node tools/church_web/milan_openings.mjs --match    # art/glass_milan55 의 55행을 개구부에 대조한 분류표(a/b/c/d)
//       node tools/church_web/milan_openings.mjs --md       # 문서용 마크다운 표(개구부 + 55행)
//
// 재는 방법: ch_milan.js 의 창(windowPanel / windowPanelPoly)은 개구부마다
//   (1) 납틀 뒷판(solid 배치, 색 0x2c241f, 개구부 윤곽 그대로) 한 장과
//   (2) 그 2cm 앞의 유리 칸(glass 배치) 또는 문짝 칸(solid 배치)을 만든다.
// 창마다 따로 된 Mesh 는 없다(전부 배치 하나로 합쳐진다). 그래서 뒷판의 addTris 호출을 가로채 개구부 윤곽(폭·창턱·기공점·꼭대기)과
// 실내 방향(hint)을 얻고, glass 배치의 삼각형이 그 윤곽 안에 있는지로 '유리 창 / 문'을 가른다.
// 좌표계: 입구 +z, 제대 -z, +x = 남쪽(제대를 볼 때 오른쪽), -x = 북쪽, y 위. 단위는 앱 미터(실제 × 0.47).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const art = path.resolve(here, '../../art/glass_milan55');
const BACK = 0x2c241f, SCALE = 0.47;

// church_harness.mjs 와 같은 가짜 canvas 샌드박스(밀라노 빌더 하나만 돌린다)
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

const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;

/** 밀라노 빌더를 돌려 개구부 목록을 돌려준다. opts.search: '?photoglass=0' 등 */
export function measureMilan(opts = {}) {
  const sb = makeSandbox();
  if (opts.search) sb.location.search = opts.search;
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js', 'ch_milan.js'].forEach(run);
  const b = sb.ChurchBuilders.milan;
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: 'low' });
  const backs = [], glassTris = [];
  const solidAdd = ctx.solid.addTris.bind(ctx.solid), glassAdd = ctx.glass.addTris.bind(ctx.glass);
  ctx.solid.addTris = function (verts, color, hint, o) { if (color === BACK) backs.push({ verts: Array.from(verts), hint: hint.slice() }); return solidAdd(verts, color, hint, o); };
  ctx.glass.addTris = function (verts, color, hint, o) { glassTris.push(Array.from(verts)); return glassAdd(verts, color, hint, o); };
  b.build(ctx);
  const S = ctx._;

  // 뒷판 → 개구부. windowPanel 은 뒷판을 한 번에, windowPanelPoly 도 한 번에 넣는다(호출 1번 = 개구부 1개)
  const openings = backs.map((bk) => {
    const pts = [];
    for (let i = 0; i < bk.verts.length; i += 3) pts.push([bk.verts[i], bk.verts[i + 1], bk.verts[i + 2]]);
    // 수평 방향 u: 가장 먼 두 점의 xz 차
    let far = 0, ux = 1, uz = 0;
    for (const p of pts) { const d = Math.hypot(p[0] - pts[0][0], p[2] - pts[0][2]); if (d > far) { far = d; ux = (p[0] - pts[0][0]) / d; uz = (p[2] - pts[0][2]) / d; } }
    let nx = -uz, nz = ux;
    const c0 = pts[0];
    if (nx * (bk.hint[0] - c0[0]) + nz * (bk.hint[2] - c0[2]) < 0) { nx = -nx; nz = -nz; }   // 실내 쪽
    // 실내에서 창을 볼 때 오른쪽 = (nz, -nx) … glass_place.js 의 판 가로축(rx = nz, rz = -nx)과 같게
    ux = nz; uz = -nx;
    let u0 = 1e9, u1 = -1e9, y0 = 1e9, y1 = -1e9;
    const us = pts.map((p) => (p[0] - c0[0]) * ux + (p[2] - c0[2]) * uz);
    us.forEach((u, i) => { u0 = Math.min(u0, u); u1 = Math.max(u1, u); y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); });
    let spring = y0;
    us.forEach((u, i) => { if (Math.abs(u - u0) < 1e-3 || Math.abs(u - u1) < 1e-3) spring = Math.max(spring, pts[i][1]); });
    const uc = (u0 + u1) / 2, bx = c0[0] + ux * uc, bz = c0[2] + uz * uc;   // 뒷판 평면 위 가운데
    return { bx, bz, nx, nz, ux, uz, w: u1 - u0, sill: y0, spring, apex: y1 };
  });
  // 유리 삼각형을 개구부에 나눠 준다(뒷판 2cm 앞 평면, 윤곽 상자 안)
  for (const o of openings) { o.glassTris = 0; o.gd = []; }
  for (const t of glassTris) {
    for (let i = 0; i < t.length; i += 9) {
      const cx = (t[i] + t[i + 3] + t[i + 6]) / 3, cy = (t[i + 1] + t[i + 4] + t[i + 7]) / 3, cz = (t[i + 2] + t[i + 5] + t[i + 8]) / 3;
      for (const o of openings) {
        const dn = (cx - o.bx) * o.nx + (cz - o.bz) * o.nz, du = (cx - o.bx) * o.ux + (cz - o.bz) * o.uz;
        if (dn > 0.005 && dn < 0.06 && Math.abs(du) <= o.w / 2 + 0.01 && cy >= o.sill - 0.01 && cy <= o.apex + 0.01) { o.glassTris++; o.gd.push(dn); break; }
      }
    }
  }
  const L = { M: 4.512, ZF: 34.9 };
  L.XN = L.M; L.XA = 2 * L.M; L.XW = 3 * L.M; L.XT = 20.2;
  const zk = (k) => L.ZF - L.M * k;
  const near = (a, b2, e = 0.7) => Math.abs(a - b2) < e;
  const out = openings.map((o) => {
    const gd = o.glassTris ? Math.max(...o.gd) : 0.02;            // 유리 칸 평면(메달리온은 1.2cm 앞이라 최댓값 쪽이 바탕 유리)
    const x = o.bx + o.nx * gd, z = o.bz + o.nz * gd;             // 유리 평면 가운데
    const side = x > 0.5 ? 'S' : (x < -0.5 ? 'N' : 'C');           // +x = 남
    const h = o.apex - o.sill;
    let zone, key, bay = null;
    if (o.sill > 22) { zone = 'tiburio'; const a = Math.round(((Math.atan2(-o.nz, -o.nx) * 180 / Math.PI) + 360) % 360); key = 'tiburio_' + String(a).padStart(3, '0'); }
    else if (o.sill > 15 && near(Math.abs(x), L.XN, 0.6)) { zone = 'clerestory'; bay = Math.round((L.ZF - z) / L.M + 0.5); key = 'clere' + side + '_b' + String(bay).padStart(2, '0'); }
    else if (near(z, L.ZF, 1.0)) {
      const col = Math.round(x / L.M);   // -2..2
      const nm = ['n2', 'n1', 'c', 's1', 's2'][col + 2];
      if (o.glassTris) { zone = 'counterfacade_upper'; key = 'cfUpper_' + nm; } else { zone = 'counterfacade_door'; key = 'cfDoor_' + nm; }
    }
    else if (z < -29.5) { zone = 'apse'; key = 'apse_' + (side === 'C' ? 'center' : side === 'S' ? 'south' : 'north'); }
    else if (near(Math.abs(x), L.XT, 0.8)) {
      zone = 'transept_end';
      const zc = (zk(11) + zk(9)) / 2;
      key = 'trEnd' + side + (near(z, zc, 1.5) ? '_center' : (z > zc ? '_west' : '_east'));   // west = 입구 쪽(+z), east = 제대 쪽(-z)
    }
    else if (near(z, zk(8), 0.8) && Math.abs(x) > L.XW) { zone = 'transept_west_wall'; key = 'trWest' + side; }
    else if (near(z, zk(12), 0.8) && Math.abs(x) > L.XW) { zone = 'transept_east_wall'; key = 'trEast' + side; }
    else if (near(Math.abs(x), L.XW, 0.8)) { zone = 'aisle'; bay = Math.round((L.ZF - z) / L.M + 0.5); key = 'aisle' + side + '_b' + bay; }
    else { zone = 'other'; key = 'other_' + r2(x) + '_' + r2(z); }
    return {
      key, zone, side, bay, kind: o.glassTris ? 'glass' : 'door',
      x: r3(x), y: r3(o.sill + h / 2), z: r3(z), nx: r3(o.nx) + 0, nz: r3(o.nz) + 0,
      yawDeg: ((v) => (v <= -179.99 ? 180 : v))(r2(Math.atan2(o.nx, o.nz) * 180 / Math.PI)),         // 판의 +Z(앞면)가 실내를 보게 하는 Y 회전
      w: r3(o.w), sill: r3(o.sill), spring: r3(o.spring), apex: r3(o.apex), h: r3(h), rise: r3(o.apex - o.spring),
      aspect: r3(o.w / h), realW: r2(o.w / SCALE), realH: r2(h / SCALE), glassTris: o.glassTris
    };
  });
  const slots = (S.glassSlots || []).map((s) => ({ win: s.win, slot: s.slot, x: r3(s.x), y: r3(s.y), z: r3(s.z), nx: r3(s.nx), nz: r3(s.nz), w: r3(s.w), h: r3(s.h) }));
  // 정면 벽기둥(ch_milan.js facade(): x = ±XN, ±XA, 폭 1.3m, 돌출 0.8m, 높이 14.66 / 11.78m)과 같은 x 에 있는 문·창은 벽기둥 뒤에 있어 실내에서 보이지 않는다
  for (const o of out) o.hidden = (o.zone === 'counterfacade_door' || o.zone === 'counterfacade_upper') && Math.abs(o.x) > 1 ? '정면 벽기둥에 가림' : null;
  for (const o of out) { const s = slots.find((q) => Math.hypot(q.x - o.x, q.z - o.z) < 0.3); o.now = (o.kind === 'door' ? '문짝(절차적)' : (s ? '절차적 유리 + 사진 ' + s.win + ' (' + s.slot + ', 아래 ' + s.h + 'm)' : '절차적 유리')) + (o.hidden ? ' · ' + o.hidden : ''); }
  const order = ['aisle', 'transept_west_wall', 'transept_end', 'transept_east_wall', 'apse', 'counterfacade_door', 'counterfacade_upper', 'clerestory', 'tiburio', 'other'];
  out.sort((a, b2) => order.indexOf(a.zone) - order.indexOf(b2.zone) || a.key.localeCompare(b2.key));
  return { layout: b.layout, consts: { ...L, zk: Array.from({ length: 14 }, (_, k) => r3(zk(k))) }, openings: out, glassSlots: slots, beams: (S.beams || []).length };
}

// ---- 55행 대조 ----
// 분류: a = 대응 개구부가 지금 모델에 있음 · b = 벽은 있으나 개구부 없음(새로 뚫어야 함) · c = 그 건축 부분이 모델에 없음 · d = 위치 미확정 → QA Gallery
// P 번호 → 개구부 key. 근거는 지시서의 글 설명뿐이다(공개 도면 그림은 이 작업에서 직접 열어 확인하지 못했다) → 익랑 안의 순서(P09·P10, P14·P15, P25·P26, P30·P31)는 'inferred'.
const PLAN = {};
for (let i = 1; i <= 8; i++) PLAN['P' + String(i).padStart(2, '0')] = { cls: 'a', key: 'aisleS_b' + i, conf: 'text' };            // 남측랑: 입구에서 i 번째
for (let i = 1; i <= 8; i++) PLAN['P' + (40 - i)] = { cls: 'a', key: 'aisleN_b' + i, conf: 'text' };                                  // 북측랑: P39 = 입구에서 1번째 … P32 = 8번째
Object.assign(PLAN, {
  P09: { cls: 'a', key: 'trWestS', conf: 'inferred', note: '남익랑 서쪽(입구 쪽) 벽 z=-1.196 의 창' },
  P10: { cls: 'a', key: 'trEndS_west', conf: 'inferred', note: '남익랑 끝 벽의 서쪽 측랑 칸 창(경당 옆)' },
  P11: { cls: 'c', key: null, note: '성 요한 보노 경당(다각형 끝 경당)의 측면 창 — 모델에는 경당이 없고 끝 벽 가운데 큰 창 1개뿐' },
  P12: { cls: 'c', key: 'trEndS_center', note: '경당 끝 중앙 창 — 경당은 없다. 끝 벽 가운데 큰 창(trEndS_center)이 같은 축 위의 유일한 대역 자리(사용자 승인 시)' },
  P13: { cls: 'c', key: null, note: '경당 측면 창 — 모델에 없음' },
  P14: { cls: 'a', key: 'trEndS_east', conf: 'inferred', note: '남익랑 끝 벽의 동쪽(제대 쪽) 측랑 칸 창' },
  P15: { cls: 'a', key: 'trEastS', conf: 'inferred', note: '남익랑 동쪽(제대 쪽) 벽 z=-19.244 의 창' },
  P16: { cls: 'b', key: null, wall: '남쪽 회랑 직선 벽 x=+9.024, z -19.24…-23.76 (성구실 쪽 맹벽, 높이 15.2m, 폭 4.51m)' },
  P17: { cls: 'b', key: null, wall: '남쪽 회랑 직선 벽 x=+9.024, z -23.76…-29.0 (맹벽, 높이 15.2m, 폭 5.24m)' },
  P18: { cls: 'b', key: null, wall: '남쪽 회랑 — 위 두 구간 중 하나를 나누거나 익랑 동쪽 맹벽(z=-19.244, x 9.02…13.54)' },
  P19: { cls: 'a', key: 'apse_south', conf: 'text' },
  P20: { cls: 'a', key: 'apse_center', conf: 'text', note: '아래 2.74m 는 진본 사진 milan_apse_lower 가 이미 걸려 있다(자리 충돌)' },
  P21: { cls: 'a', key: 'apse_north', conf: 'text' },
  P22: { cls: 'b', key: null, wall: '북쪽 회랑 직선 벽 x=-9.024, z -23.76…-29.0 (맹벽)' },
  P23: { cls: 'b', key: null, wall: '북쪽 회랑 직선 벽 x=-9.024, z -19.24…-23.76 (맹벽)' },
  P24: { cls: 'b', key: null, wall: '북쪽 회랑 — 위 두 구간 중 하나를 나누거나 익랑 동쪽 맹벽(z=-19.244, x -13.54…-9.02)' },
  P25: { cls: 'a', key: 'trEastN', conf: 'inferred', note: '북익랑 동쪽(제대 쪽) 벽의 창' },
  P26: { cls: 'a', key: 'trEndN_east', conf: 'inferred', note: '북익랑 끝 벽의 동쪽 측랑 칸 창' },
  P27: { cls: 'c', key: null, note: '나무의 성모 경당 측면 창 — 모델에 경당 없음' },
  P28: { cls: 'c', key: 'trEndN_center', note: '경당 끝 중앙 창 — 경당 없음. 끝 벽 가운데 큰 창이 유일한 대역 자리(사용자 승인 시)' },
  P29: { cls: 'c', key: null, note: '경당 측면 창 — 모델에 없음' },
  P30: { cls: 'a', key: 'trEndN_west', conf: 'inferred', note: '북익랑 끝 벽의 서쪽 측랑 칸 창' },
  P31: { cls: 'a', key: 'trWestN', conf: 'inferred', note: '북익랑 서쪽(입구 쪽) 벽의 창' }
});
// DEV-040~055 (plan_id 없는 행 포함)
const EXTRA = {
  'DEV-040': { cls: 'c', key: null, note: 'V12bis 는 경당 상부 창 — 모델에 경당·상부 창 없음 → QA Gallery' },
  'DEV-041': { cls: 'b', key: null, wall: '정문 안쪽 벽 z=34.9, 문 위(y 약 5.5…8.0). 하단 5창 자리에 지금은 문 5개뿐. 방향 충돌(orientation_conflict) → 뚫더라도 좌우 확정 전에는 QA Gallery' },
  'DEV-042': { cls: 'b', key: null, wall: '정문 안쪽 하단(위와 같음). P42 = V42 미확정' },
  'DEV-043': { cls: 'b', key: null, wall: '정문 안쪽 하단 측면 A — 좌우 미확정(hold)' },
  'DEV-044': { cls: 'b', key: null, wall: '정문 안쪽 하단 측면 B — 좌우 미확정(hold)' },
  'DEV-045': { cls: 'b', key: null, wall: '정문 안쪽 하단 중앙(가운데 문 위). 좌우 충돌이 없는 유일한 하단 자리' },
  'DEV-046': { cls: 'b', key: 'cfUpper_n1|cfUpper_s1', conf: 'side_unknown', note: '상단 측면 A — 개구부(1.2×4.0m)는 있으나 정면 벽기둥(폭 1.3·돌출 0.8m, 같은 x)에 가려 보이지 않는다 → 정면 벽을 다시 짜야 함. 좌우도 미확정(hold) → 그때까지 QA Gallery' },
  'DEV-047': { cls: 'a', key: 'cfUpper_c', conf: 'provisional', note: '상단 중앙 — 개구부 있음·보임(좌우 문제 없음)' },
  'DEV-048': { cls: 'b', key: 'cfUpper_n1|cfUpper_s1', conf: 'side_unknown', note: '상단 측면 B — 046 과 같음(벽기둥에 가림 + 좌우 미확정) → QA Gallery' }
};
for (let i = 49; i <= 55; i++) EXTRA['DEV-0' + i] = { cls: 'd', key: null, note: '실제 위치 미확정(test_only_unplaced) → QA Gallery 전용. 교차부(티부리오 8창)에 임의 배정 금지' };

/** PNG 머리말에서 크기를 읽는다(텍스처 파일은 읽기만 한다) */
function pngSize(file) { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }

export function matchRows(m = measureMilan()) {
  const plc = JSON.parse(fs.readFileSync(path.join(art, 'milan_55_claude_placement.json'), 'utf8'));
  const byKey = Object.fromEntries(m.openings.map((o) => [o.key, o]));
  return plc.rows.map((r) => {
    const rule = (r.plan_id && PLAN[r.plan_id] && !EXTRA[r.dev_id]) ? PLAN[r.plan_id] : (EXTRA[r.dev_id] || { cls: 'd', key: null, note: '규칙 없음' });
    const keys = rule.key ? rule.key.split('|') : [], o = keys.length === 1 ? byKey[keys[0]] : null;
    const [pw, ph] = pngSize(path.join(art, r.texture_file));
    const row = { dev: r.dev_id, plan: r.plan_id, archive: r.archive_id, zone: r.zone, evidence: r.placement_evidence, cls: rule.cls, key: rule.key, conf: rule.conf || null, note: rule.note || rule.wall || '', px: [pw, ph], texAspect: r3(pw / ph) };
    if (r.glass_width_m) { row.real = [r.glass_width_m, r.glass_height_m]; row.realApp = [r2(r.glass_width_m * SCALE), r2(r.glass_height_m * SCALE)]; }
    if (o) {
      row.opening = { x: o.x, y: o.y, z: o.z, yawDeg: o.yawDeg, w: o.w, h: o.h, aspect: o.aspect };
      // 비율을 지켜 개구부 상자 안에 넣기(contain) → 판 크기, 가장 가까이서 볼 때의 텍셀 크기(mm)
      const a = pw / ph, fit = a > o.w / o.h ? { w: o.w, h: o.w / a } : { w: o.h * a, h: o.h };
      row.contain = { w: r2(fit.w), h: r2(fit.h), cover: r2(fit.w * fit.h / (o.w * o.h)) };
      row.texelMm = Math.round(fit.h / ph * 1000);
      row.stretch = r2((o.w / o.h) / a);   // 개구부를 꽉 채우면 가로가 이만큼 늘어난다(1 = 왜곡 없음)
    }
    return row;
  });
}

function table(rows, cols) {
  const head = '| ' + cols.map((c) => c[0]).join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n';
  return head + rows.map((r) => '| ' + cols.map((c) => { const v = c[1](r); return v === null || v === undefined ? '' : String(v); }).join(' | ') + ' |').join('\n') + '\n';
}
const OPEN_COLS = [
  ['key(개구부 식별자)', (o) => '`' + o.key + '`'], ['구역', (o) => o.zone], ['x', (o) => o.x], ['y(중심)', (o) => o.y], ['z', (o) => o.z],
  ['실내 법선(nx,nz)', (o) => o.nx + ', ' + o.nz], ['yaw°', (o) => o.yawDeg], ['폭', (o) => o.w], ['창턱', (o) => o.sill], ['기공', (o) => o.spring], ['꼭대기', (o) => o.apex],
  ['전체 높이', (o) => o.h], ['가로/세로', (o) => o.aspect], ['실제 환산(m)', (o) => o.realW + '×' + o.realH], ['지금 붙은 것', (o) => o.now]
];
const ROW_COLS = [
  ['DEV', (r) => r.dev], ['P / V', (r) => (r.plan || '—') + ' / ' + (r.archive || '—')], ['분류', (r) => r.cls], ['개구부 key', (r) => r.key ? '`' + r.key.replace('|', '` 또는 `') + '`' : '—'],
  ['world x, y, z', (r) => r.opening ? r.opening.x + ', ' + r.opening.y + ', ' + r.opening.z : '—'], ['yaw°', (r) => r.opening ? r.opening.yawDeg : '—'],
  ['개구부 폭×높이', (r) => r.opening ? r.opening.w + '×' + r.opening.h : '—'], ['텍스처 px', (r) => r.px.join('×')], ['비율(가로/세로) 텍스처→개구부', (r) => r.texAspect + (r.opening ? ' → ' + r.opening.aspect : '')],
  ['contain 판(m)·덮는 비율', (r) => r.contain ? r.contain.w + '×' + r.contain.h + ' · ' + Math.round(r.contain.cover * 100) + '%' : '—'], ['텍셀(mm)', (r) => r.texelMm || '—'],
  ['근거·비고', (r) => [r.evidence, r.conf ? 'key:' + r.conf : '', r.note].filter(Boolean).join(' · ')]
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), m = measureMilan();
  if (a.includes('--json')) console.log(JSON.stringify(a.includes('--match') ? { ...m, rows: matchRows(m) } : m, null, 1));
  else if (a.includes('--md')) { console.log(table(m.openings, OPEN_COLS)); console.log(table(matchRows(m), ROW_COLS)); }
  else if (a.includes('--match')) {
    const rows = matchRows(m), n = { a: 0, b: 0, c: 0, d: 0 };
    rows.forEach((r) => { n[r.cls]++; console.log([r.dev, (r.plan || '-').padEnd(3), r.cls, (r.key || '-').padEnd(24), r.opening ? `(${r.opening.x}, ${r.opening.y}, ${r.opening.z}) yaw ${r.opening.yawDeg} ${r.opening.w}x${r.opening.h}` : '', r.px.join('x'), r.contain ? `contain ${r.contain.w}x${r.contain.h} ${Math.round(r.contain.cover * 100)}% texel ${r.texelMm}mm` : ''].join('  ')); });
    console.log('분류 수', n);
    const used = {}; rows.forEach((r) => { if (r.cls === 'a' && r.key && !r.key.includes('|')) (used[r.key] = used[r.key] || []).push(r.dev); });
    const dup = Object.entries(used).filter(([, v]) => v.length > 1);
    console.log(dup.length ? '중복 anchor: ' + JSON.stringify(dup) : '중복 anchor 없음(a 분류, 단일 key)');
  } else {
    const by = {};
    m.openings.forEach((o) => { (by[o.zone] = by[o.zone] || []).push(o); });
    console.log(`밀라노 씬(scalePercent ${m.layout.scalePercent}): 개구부 ${m.openings.length}개 (유리 ${m.openings.filter((o) => o.kind === 'glass').length}, 문 ${m.openings.filter((o) => o.kind === 'door').length}), 사진 창 자리 ${m.glassSlots.length}, 빛줄기 ${m.beams}`);
    for (const z of Object.keys(by)) {
      console.log(`\n[${z}] ${by[z].length}개`);
      by[z].forEach((o) => console.log(`  ${o.key.padEnd(18)} x ${String(o.x).padStart(8)} y ${String(o.y).padStart(7)} z ${String(o.z).padStart(8)}  n(${o.nx},${o.nz}) yaw ${String(o.yawDeg).padStart(7)}  ${o.w}x${o.h} (창턱 ${o.sill}, 기공 ${o.spring}, 꼭대기 ${o.apex})  ${o.now}`));
    }
  }
}
