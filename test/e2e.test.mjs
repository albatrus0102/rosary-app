// 실브라우저(헤드리스 Chromium) 끝까지: test.html 이 ch_house 를 열고, 브리지 이벤트가 오가는지
//   ready·firstFrame → sit({i}) → sat{i} → stand → stood{i} · 좌석 누르기 → seatTap{i} · setPeers → 보이는 사람 · myPose · perf · 콘솔 오류 0 · dispose
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from '../tools/serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

test('브라우저: 장면이 열리고 브리지 이벤트가 오간다', { timeout: 240000 }, async () => {
  const { srv, url } = await serve();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&quality=low&hour=14');
    const ev = (name, extra = '') => p.waitForFunction(([n, x]) => (window.__roomEvents || []).some((e) => e.e === n && (!x || JSON.stringify(e).includes(x))), [name, extra], { timeout: 90000 });
    await ev('ready'); await ev('firstFrame');
    const st = await p.evaluate(() => ({ seats: window.__room.logic.seats.length, verts: window.__room.world.stats.vertices }));
    assert.equal(st.seats, 6);
    // 앉기·서기(작업대 스툴 3, 그네 4)
    await p.evaluate(() => window.Room3D.sit({ i: 3 }));
    await ev('sat', '"i":3');
    assert.equal(await p.evaluate(() => window.__room.me.seat), 'S3');
    await p.evaluate(() => window.Room3D.stand());
    await ev('stood', '"i":3');
    await p.evaluate(() => window.Room3D.sit({ i: 4 }));
    await ev('sat', '"i":4');
    await p.evaluate(() => window.Room3D.stand());
    await ev('stood', '"i":4');
    // 좌석 누르기: 화면에 그 의자 자리를 투영해서 누른다 → seatTap
    const pt = await p.evaluate(() => {
      const a = window.__room, T = window.THREE, s = a.logic.seats[1];
      a.me.x = -0.4; a.me.z = 0.6; a.ctl.yaw = Math.PI / 2 + 0.6; a.camInit = false;
      return new Promise((res) => setTimeout(() => { const v = new T.Vector3(s.x, a.logic.seatFloor(s.id) + 0.55, s.z).project(a.camera); res({ x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }); }, 1500));
    });
    await p.evaluate((q) => window.Room3D.tapAt(q), pt);
    await ev('seatTap');
    // 다른 사람: 걷는 1 + 앉은 1 → 둘 다 보이고, 앉은 좌석은 찬 자리
    await p.evaluate(() => window.Room3D.setPeers([{ id: 'w', x: 0.3, z: 1.5, yaw: 0, state: 'walk', avatar: { label: '걷는 이' } }, { id: 's', x: 0, z: 0, state: 'sit', seat: 2, avatar: { label: '앉은 이' } }]));
    await p.waitForFunction(() => window.__room.net.visibleCount() === 2, null, { timeout: 30000 });
    assert.equal(await p.evaluate(() => window.__room.net.isTaken('S2')), true);
    await ev('myPose');
    await ev('perf');
    // 그네가 차면 아주 작게 흔들린다(앉은 아바타도 같은 만큼)
    await p.evaluate(() => window.Room3D.setPeers([{ id: 'q', x: 0, z: 0, state: 'sit', seat: 5 }]));
    await p.waitForFunction(() => { const s = window.__room.scene.getObjectByName('swing'); return s && Math.abs(s.rotation.x) > 0.002; }, null, { timeout: 60000 });
    const sw = await p.evaluate(() => Math.abs(window.__room.scene.getObjectByName('swing').rotation.x));
    assert.ok(sw < 0.035, 'sway is subtle: ' + sw);
    // 패널·정원·결·시간
    await p.evaluate(() => { window.Room3D.setTimerText({ text: '12:34' }); window.Room3D.setGarden([{ flower: 2, stage: 3 }, { flower: 1, stage: 0, pot: 1 }]); window.Room3D.setSkin({ skin: 'walnut' }); window.Room3D.setHour({ hour: 21 }); });
    await p.waitForTimeout(500);
    assert.deepEqual(errs, []);
    await p.evaluate(() => window.Room3D.dispose());
    assert.equal(await p.evaluate(() => window.__room.started), false);
  } finally { await b.close(); srv.close(); }
});
