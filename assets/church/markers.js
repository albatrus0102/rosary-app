/* markers.js — 성당 안 스테이션 표식(가서 행동하는 자리): 바닥의 부드러운 빛 고리 + 떠 있는 얇은 이름표.
   - 고리 1개 + 이름표 스프라이트 1개 + 보이지 않는 터치 판 1개 / 스테이션. (가려진 건 없음: draw call 은 스테이션 수의 2배)
   - 이름표는 화면에서 알약 높이 18~26 CSS px 에 머물도록 거리(카메라 앞쪽 깊이)에 맞춰 크기를 보정한다(label_fit.js).
     내 이름표(avoid 사각형)와 화면에서 겹치면 그만큼 위로 올려 가리지 않는다(우선순위: 내 이름 > 표식).
   - 가까이(도달 범위) 가면 서서히 사라진다. 걷는 중에는 목적지가 아닌 표식이 흐려진다. 앉으면 모두 숨는다.
   - pick(ndcX, ndcY, camera): 레이캐스트(터치 판·이름표·고리), 못 맞히면 화면에서 가까운 표식(36px).
   ChurchMarkers.create(group, stations, logic) -> {update, pick, items, dispose} */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo;
  var LABELS = { candle: '촛불 봉헌', altar: '제대 앞', font: '성수대' };
  var FONT = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function labelTexture(text) {
    var w = 256, h = 72;
    var tex = G.canvasTexture(w, h, function (g) {
      g.clearRect(0, 0, w, h);
      var r = 28, x0 = 6, y0 = 8, x1 = w - 6, y1 = h - 8;
      g.beginPath();
      g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.quadraticCurveTo(x1, y0, x1, y0 + r);
      g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1); g.lineTo(x0 + r, y1);
      g.quadraticCurveTo(x0, y1, x0, y1 - r); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0);
      g.closePath();
      g.fillStyle = 'rgba(34,23,14,0.78)'; g.fill();
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,226,166,0.85)'; g.stroke();
      g.font = '700 32px ' + FONT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fffaf0';
      g.fillText(text, w / 2, h / 2 + 1);
    }, false, true);
    tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    return { tex: tex, aspect: w / h };
  }

  // 일반 블렌딩의 금색 고리(밝은 대리석 바닥에서도 보이게 바깥에 옅은 갈색 그림자 띠를 둔다).
  function ringTexture() {
    return G.canvasTexture(128, 128, function (g, w, h) {
      var c = w / 2;
      g.clearRect(0, 0, w, h);
      var fill = g.createRadialGradient(c, c, 0, c, c, c * 0.72);
      fill.addColorStop(0, 'rgba(255,214,120,0.22)'); fill.addColorStop(1, 'rgba(255,214,120,0.08)');
      g.fillStyle = fill; g.beginPath(); g.arc(c, c, c * 0.72, 0, Math.PI * 2); g.fill();
      var sh = g.createRadialGradient(c, c, c * 0.6, c, c, c * 0.99);
      sh.addColorStop(0, 'rgba(96,56,12,0)'); sh.addColorStop(0.5, 'rgba(96,56,12,0.5)'); sh.addColorStop(1, 'rgba(96,56,12,0)');
      g.fillStyle = sh; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
      var ring = g.createRadialGradient(c, c, c * 0.56, c, c, c * 0.9);
      ring.addColorStop(0, 'rgba(255,196,70,0)'); ring.addColorStop(0.2, 'rgba(255,196,70,1)'); ring.addColorStop(0.8, 'rgba(244,168,40,1)'); ring.addColorStop(1, 'rgba(244,168,40,0)');
      g.fillStyle = ring; g.beginPath(); g.arc(c, c, c * 0.92, 0, Math.PI * 2); g.fill();
    }, false, true);
  }

  function create(group, stationsApi, logic, opts) {
    opts = opts || {};
    var st = stationsApi.stations();
    var items = [];
    var ringTex = ringTexture();
    var ringGeo = new T.PlaneGeometry(2.1, 2.1);
    var hitGeo = new T.PlaneGeometry(2.8, 2.8);
    var hitMat = new T.MeshBasicMaterial({ visible: false });
    var labelTexs = {};
    var holder = new T.Group(); holder.name = 'station-markers';
    group.add(holder);

    function add(kind, s) {
      var floor = logic.floorY(s.x, s.z);
      var ringMat = new T.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, fog: false, opacity: 0, toneMapped: false });
      var ring = new T.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, floor + 0.05, s.z); ring.renderOrder = 7;
      var hit = new T.Mesh(hitGeo, hitMat);
      hit.rotation.x = -Math.PI / 2; hit.position.set(s.x, floor + 0.06, s.z);
      var lt = labelTexs[kind] || (labelTexs[kind] = labelTexture(LABELS[kind] || kind));
      var spMat = new T.SpriteMaterial({ map: lt.tex, transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0, toneMapped: false });
      var sp = new T.Sprite(spMat);
      // 이름표는 서는 자리가 아니라 대상(스탠드/제대) 쪽 위에 떠 있다
      var tx = s.stand ? s.stand.x : s.x, tz = s.stand ? s.stand.z : s.z;
      if (kind === 'altar') { tx = s.x; tz = s.z; }
      var by = floor + (kind === 'altar' ? 2.5 : 2.3);
      sp.position.set(tx, by, tz); sp.renderOrder = 8;
      sp.userData.aspect = lt.aspect;
      holder.add(ring); holder.add(hit); holder.add(sp);
      items.push({ kind: kind, index: s.index === undefined ? 0 : s.index, s: s, ring: ring, hit: hit, sp: sp, by: by, rz: 0, a: 0, ph: items.length * 1.7 });
    }
    st.candle.forEach(function (s) { add('candle', s); });
    add('altar', st.altar);
    st.font.forEach(function (s) { add('font', s); });

    var LF = root.ChurchLabelFit, PM = LF && LF.PRESETS.marker;
    var cpos = { x: 0, y: 0, z: 0 }, cfwd = { x: 0, y: 0, z: -1 };
    var ray = new T.Raycaster(), ndc = new T.Vector2(), pv = new T.Vector3();
    var M = {
      items: items,
      holder: holder,
      // active: {kind,index}|null — 걷는 중인 목적지. on: 걷는 중(앉지 않음)
      // vp: {w,h,avoid} — 화면 크기(CSS px)와, 피해야 할 내 이름표의 화면 사각형({cx,cy,w,h}|null). 없으면 예전처럼 거리 비례 크기.
      update: function (dt, t, me, camera, active, on, vp) {
        var k = 1 - Math.exp(-Math.max(0, dt) * 6);   // 첫 프레임의 dt 가 음수여도 보간이 튀지 않게
        var fitOn = !!(LF && vp && vp.h > 0);
        if (fitOn) {
          var ce = camera.matrixWorld.elements;
          cpos.x = ce[12]; cpos.y = ce[13]; cpos.z = ce[14]; cfwd.x = -ce[8]; cfwd.y = -ce[9]; cfwd.z = -ce[10];
        }
        for (var i = 0; i < items.length; i++) {
          var it = items[i], s = it.s;
          var d = Math.sqrt((me.x - s.x) * (me.x - s.x) + (me.z - s.z) * (me.z - s.z));
          var want = on ? smooth((d - 1.0) / 1.6) : 0;           // 서 있는 자리에 가까우면 사라진다
          if (active) want *= (active.kind === it.kind && active.index === it.index) ? 1 : 0.35;
          it.a += (want - it.a) * k;
          var vis = it.a > 0.01;
          it.ring.visible = vis; it.sp.visible = vis; it.hit.visible = vis;
          if (!vis) { it.shown = false; continue; }
          var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + it.ph);
          it.ring.material.opacity = it.a * (0.72 + 0.28 * pulse);
          var sc = 1 + 0.05 * pulse; it.ring.scale.set(sc, sc, 1);
          var cd = camera.position.distanceTo(it.sp.position);
          if (fitOn) {
            // 화면에서 알약 높이가 18~26px 에 머물도록 월드 높이를 정한다(가까우면 작게, 멀면 크게). 알약 아래 가장자리는 고정.
            var dep = Math.max(0.3, LF.depthOf(cpos, cfwd, it.sp.position.x, it.by, it.sp.position.z));
            var ft = LF.fit(dep, vp.h, camera.fov, PM), ppm = LF.pxPerMeter(dep, vp.h, camera.fov);
            var hgt = ft.h, cy0 = it.by + LF.anchorLift(hgt, PM);
            // 내 이름표와 화면에서 겹치면 위로 올린다(부드럽게). 올림 px 는 알약 높이의 6배까지.
            var want2 = 0;
            if (vp.avoid) {
              pv.set(it.sp.position.x, cy0, it.sp.position.z).project(camera);
              if (pv.z < 1) {
                want2 = Math.min(ft.px * 6, LF.overlapRaise(vp.avoid, { cx: (pv.x * 0.5 + 0.5) * vp.w, cy: (-pv.y * 0.5 + 0.5) * vp.h, w: ft.px * 4.3, h: ft.px }, 3));
              }
            }
            if (it.shown) it.rz += (want2 - it.rz) * k; else { it.rz = want2; it.shown = true; }   // 막 나타날 때는 바로 피한 자리에서 시작
            it.sp.position.y = cy0 + it.rz / ppm;
            it.sp.scale.set(hgt * it.sp.userData.aspect, hgt, 1);
          } else {
            // 멀수록 이름표를 키워 읽히게 한다(상한 있음).
            var hg2 = 0.46 * Math.max(1, Math.min(3.6, cd / 9));
            it.sp.scale.set(hg2 * it.sp.userData.aspect, hg2, 1);
          }
          it.sp.material.opacity = it.a * (cd > 45 ? 0.75 : 1);
        }
      },
      // ndc(-1..1, y 위가 +) -> {kind,index} | null
      pick: function (nx, ny, camera, w, h) {
        ndc.set(nx, ny);
        ray.setFromCamera(ndc, camera);
        var objs = [], map = [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].a < 0.05) continue;
          objs.push(items[i].hit, items[i].ring, items[i].sp);
          map.push(items[i], items[i], items[i]);
        }
        if (objs.length) {
          var hits = ray.intersectObjects(objs, false);
          if (hits.length) return { kind: map[objs.indexOf(hits[0].object)].kind, index: map[objs.indexOf(hits[0].object)].index };
        }
        // 화면에서 가까운 표식(36px)
        var best = null, bd = 36 * 36, sx = (nx * 0.5 + 0.5) * w, sy = (-ny * 0.5 + 0.5) * h;
        for (var j = 0; j < items.length; j++) {
          var it = items[j];
          if (it.a < 0.05) continue;
          var pts = [it.sp.position, it.ring.position];
          for (var q = 0; q < 2; q++) {
            pv.copy(pts[q]).project(camera);
            if (pv.z > 1) continue;
            var dx = (pv.x * 0.5 + 0.5) * w - sx, dy = (-pv.y * 0.5 + 0.5) * h - sy, dd = dx * dx + dy * dy;
            if (dd < bd) { bd = dd; best = it; }
          }
        }
        return best ? { kind: best.kind, index: best.index } : null;
      },
      dispose: function () {
        group.remove(holder);
        ringGeo.dispose(); hitGeo.dispose(); hitMat.dispose(); ringTex.dispose();
        items.forEach(function (it) { it.ring.material.dispose(); it.sp.material.dispose(); });
        Object.keys(labelTexs).forEach(function (k2) { labelTexs[k2].tex.dispose(); });
        items.length = 0;
      }
    };
    return M;
  }

  root.ChurchMarkers = { create: create, LABELS: LABELS };
})(typeof window !== 'undefined' ? window : this);
