/* view.js — 묵주 3D 장면: 렌더러·환경(스튜디오 환경광 PMREM)·벨벳 바탕·접촉 그림자, 알 인스턴싱, 체인/끈, 십자가·메달,
   C안(손안의 묵주, 원호) ↔ A안(전체 묵주, 바닥에 펼침) 전환, 위치 스프링(관성·탄성), 필요할 때만 그리기(정지 시 휴면).
   Flutter 다리: window.RosaryAPI (init, setStep, setDrag, setView, setRosary, setTheme, setHand, setQuality, setOrbit, setReduceMotion)
   이벤트: FlutterRosary.postMessage(JSON) — {e:'ready'}, {e:'built', id, ms}, {e:'error', msg}. 진단: window.__rosary */
(function (root) {
  'use strict';
  var T = root.THREE, L = root.RosaryLayout, DEFS = root.RosaryDefs, MODELS = root.RosaryModels, MATS = root.RosaryMaterials;
  var canvasEl = document.getElementById('c');
  function post(o) { try { if (root.FlutterRosary) root.FlutterRosary.postMessage(JSON.stringify(o)); } catch (e) { /* 다리 없음 */ } }

  var S = {
    quality: 'high', theme: 'navy', hand: 'center', view: 'c', reduce: false,
    p: 0, pv: 0, target: 0, drag: 0, dragging: false,
    t: 0, tTarget: 0,              // 0 = C안, 1 = A안
    orbit: { yaw: 0, pitch: 0, zoom: 1 }, gallery: false,
    running: false, last: 0, frames: 0, msSum: 0, lastMs: 0, built: null
  };
  var renderer, scene, camera, keyLight, fillLight, spot, backdrop, mats, R = null;

  function setup() {
    renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!root.__rosaryShots });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.VSMShadowMap; renderer.shadowMap.autoUpdate = true;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(30, 1, 0.1, 400);
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new root.ThreeX.RoomEnvironment(), 0.035).texture;
    pm.dispose();
    keyLight = new T.DirectionalLight(0xfff1dc, 2.4);
    keyLight.position.set(-6, 9, 14); keyLight.castShadow = true;
    keyLight.shadow.bias = -0.0006; keyLight.shadow.radius = 9; keyLight.shadow.blurSamples = 16;
    scene.add(keyLight); scene.add(keyLight.target);
    fillLight = new T.HemisphereLight(0xdfe6ff, 0x2a2018, 0.35); scene.add(fillLight);
    spot = new T.SpotLight(0xfff0d8, 0, 0, 0.06, 1, 2); spot.position.set(0, 0, 40); scene.add(spot); scene.add(spot.target);
    backdrop = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshBasicMaterial({ color: 0x111111 }));
    backdrop.receiveShadow = true; scene.add(backdrop);
    applyQuality();
    resize();
    root.addEventListener('resize', function () { resize(); kick(); });
  }
  function applyQuality() {
    var low = S.quality === 'low';
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, low ? 1.25 : 2));
    keyLight.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024);
    if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
    renderer.shadowMap.enabled = true;
  }
  function resize() {
    var w = root.innerWidth || 360, h = root.innerHeight || 320;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ---- 묵주 만들기(하나만 메모리에: 바꾸면 이전 것을 모두 정리) ----
  function disposeRosary() {
    if (!R) return;
    R.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    scene.remove(R.group); mats.dispose(); R = null;
  }
  function build(id) {
    var t0 = performance.now();
    disposeRosary();
    var def = DEFS.get(id);
    mats = MATS.create(renderer, S.quality);
    backdrop.material = mats.backdrop(S.theme);
    var group = new T.Group(); scene.add(group);
    var dims = { small: def.bead.small * def.bead.aspect, big: def.bead.big * def.bead.aspect, cross: def.cross.height + 0.6, medal: def.medal.height, gap: def.link.gap };
    var s = L.arcLengths(dims);
    var beadGeo = MODELS.beadGeometry(def), beadMat = mats.get(def.bead.material);
    var nSmall = 0, nBig = 0;
    L.nodes.forEach(function (n) { if (n.kind === L.NODE.SMALL) nSmall++; else if (n.kind === L.NODE.BIG) nBig++; });
    function inst(geo, mat, count, shadow) { var m = new T.InstancedMesh(geo, mat, count); m.castShadow = shadow !== false; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); group.add(m); return m; }
    var bs = def.bead.shadow !== false; // 투명·반투명 알은 짙은 그림자를 만들지 않는다
    var small = inst(beadGeo, beadMat, nSmall, bs), big = inst(beadGeo, beadMat, nBig, bs);
    [small, big].forEach(function (m) { m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(m.count * 3).fill(1), 3); m.instanceColor.setUsage(T.DynamicDrawUsage); });
    var caps = def.bead.caps ? inst(MODELS.capGeometry(), mats.get(def.bead.caps), (nSmall + nBig) * 2) : null;
    var linkType = def.link.type, links = null, cords = null, knots = null;
    if (linkType === 'cord') {
      cords = inst(MODELS.cordGeometry(), mats.get(def.link.material), 70);
      knots = inst(MODELS.knotGeometry(), mats.get(def.link.material), 70);
      links = inst(MODELS.linkGeometry('eyepin'), mats.get(def.cross.trim || 'antiqueSilver'), 12);
    } else {
      links = inst(MODELS.linkGeometry(linkType), mats.get(def.link.material), 70 * 4);
    }
    var cross = MODELS.buildCross(def, mats); group.add(cross);
    var medal = MODELS.buildMedal(def, mats); group.add(medal);
    // 알마다 고정된 작은 불균일(크기 ±, 결 방향 회전)
    var rnd = [], seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < L.nodeCount; i++) rnd.push({ roll: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.7, k: 1 + (rand() - 0.5) * 2 * (def.bead.irregular || 0) * 1.4 });
    R = { def: def, dims: dims, s: s, group: group, small: small, big: big, caps: caps, links: links, cords: cords, knots: knots, cross: cross, medal: medal, rnd: rnd,
      a: L.aLayout(s, dims), palette: def.bead.palette ? def.bead.palette.map(function (h) { return new T.Color(h); }) : null };
    S.built = { id: def.id, ms: Math.round(performance.now() - t0) };
    post({ e: 'built', id: def.id, ms: S.built.ms });
    kick();
  }

  // ---- 배치 ----
  var P = [], Q = [], SC = [], VIS = [];
  for (var i0 = 0; i0 < 62; i0++) { P.push(new T.Vector3()); Q.push(new T.Quaternion()); SC.push(1); VIS.push(true); }
  var _m = new T.Matrix4(), _m2 = new T.Matrix4(), _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3(), _v = new T.Vector3(), _w = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _s = new T.Vector3(), _c = new T.Color();
  function nodeSize(i) { var k = L.nodes[i].kind; return k === 'small' ? R.dims.small : k === 'big' ? R.dims.big : k === 'cross' ? R.dims.cross : R.dims.medal; }
  // C안 표시 배율: 현재 위치에서 멀수록 작게(사진의 얕은 원근). 십자가는 화면에 들어오게 줄인다.
  var CK = 0.52;
  function cScale(u) { return 1 / (1 + CK * Math.pow(Math.abs(u), 1.12)); }
  function nodeShow(i) { var k = L.nodes[i].kind; return k === 'cross' ? 0.5 : k === 'medal' ? 0.85 : 1; }
  function basis(q, ty, tz, nzx, nzy, nzz, roll) {
    _y.set(ty[0], ty[1], ty[2]).normalize(); _z.set(nzx, nzy, nzz);
    _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y).normalize();
    _m.makeBasis(_x, _y, _z); q.setFromRotationMatrix(_m);
    if (roll) { _q2.setFromAxisAngle(_y.set(0, 1, 0), roll); q.multiply(_q2); }
  }
  var C = { R: 2.7, front: 2.4, vis: 3.7 };
  function handX() { return S.hand === 'left' ? -0.55 : S.hand === 'right' ? 0.55 : 0; }
  var cPos = [], cQ = [], cS = [], aPos = [], aQ = [];
  for (var j = 0; j < 62; j++) { cPos.push(new T.Vector3()); cQ.push(new T.Quaternion()); cS.push(1); aPos.push(new T.Vector3()); aQ.push(new T.Quaternion()); }
  function layoutC(p) {
    // 노드 i 의 원호 좌표 = 크기·간격을 표시 배율로 줄여 누적
    var A = [0], i;
    for (i = 0; i < 61; i++) {
      var d = nodeSize(i) * nodeShow(i) / 2 * cScale(i - p) + R.dims.gap * cScale(i + 0.5 - p) + nodeSize(i + 1) * nodeShow(i + 1) / 2 * cScale(i + 1 - p);
      A.push(A[i] + d);
    }
    var fi = Math.max(0, Math.min(60, Math.floor(p))), ap = A[fi] + (A[fi + 1] - A[fi]) * (p - fi);
    var hx = handX();
    for (i = 0; i < 62; i++) {
      var th = (A[i] - ap) / C.R, u = i - p;
      cPos[i].set(hx, C.R * Math.sin(th), C.front - C.R * (1 - Math.cos(th)));
      cS[i] = cScale(u) * nodeShow(i);
      VIS[i] = Math.abs(u) <= C.vis && Math.abs(th) < 1.45;
      // 접선(경로 진행 방향) = 원호 위쪽, 앞면 = 원호 바깥(카메라 쪽)
      var isBead = L.nodes[i].kind === 'small' || L.nodes[i].kind === 'big';
      basis(cQ[i], [0, Math.cos(th), -Math.sin(th)], null, 0, Math.sin(th), Math.cos(th), R.rnd[i].roll + (isBead ? (A[i] - ap) * 0.6 : 0));
      if (isBead) { _q2.setFromAxisAngle(_v.set(1, 0, 0), R.rnd[i].tilt); cQ[i].multiply(_q2); }
    }
  }
  function layoutA() {
    var pts = R.a.pts, i;
    for (i = 0; i < 62; i++) {
      var r = (L.nodes[i].kind === 'cross' ? R.def.cross.depth : L.nodes[i].kind === 'medal' ? 0.12 : nodeSize(i) * 0.5 * 0.98);
      aPos[i].set(pts[i].x, pts[i].y, r + 0.02);
      basis(aQ[i], [pts[i].tx, pts[i].ty, 0], null, 0, 0, 1, (L.nodes[i].kind === 'small' || L.nodes[i].kind === 'big') ? R.rnd[i].roll : 0);
      if (L.nodes[i].kind === 'small' || L.nodes[i].kind === 'big') { _q2.setFromAxisAngle(_v.set(1, 0, 0), R.rnd[i].tilt); aQ[i].multiply(_q2); }
    }
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function place() {
    var p = S.p, e = ease(S.t), i;
    layoutC(p);
    if (e > 0) layoutA();
    var medalNode = Math.abs(p - 6) <= Math.abs(p - 61) ? 6 : 61;
    for (i = 0; i < 62; i++) {
      if (e <= 0) { P[i].copy(cPos[i]); Q[i].copy(cQ[i]); SC[i] = cS[i]; }
      else {
        P[i].copy(cPos[i]).lerp(aPos[i], e); Q[i].copy(cQ[i]).slerp(aQ[i], e); SC[i] = cS[i] + (1 - cS[i]) * e;
        if (e > 0.02) VIS[i] = true;
      }
      // A안: 현재 알은 조금 들어 올린다(재질은 그대로, 위치로 강조)
      if (e > 0) { var cur = Math.round(p); if (i === cur && Math.abs(p - cur) < 0.3) { P[i].z += 0.9 * e; SC[i] *= 1 + 0.3 * e; } }
    }
    if (e < 0.02) { // C안: 같은 메달 하나만(가까운 쪽 경로 위치)
      var other = medalNode === 6 ? 61 : 6; VIS[other] = false;
    } else VIS[61] = false; // A안: 61 은 6 과 같은 자리
    // 알 인스턴스
    var si = 0, bi = 0, ci = 0, dimP = p - 0.2;
    for (i = 0; i < 62; i++) {
      var k = L.nodes[i].kind;
      if (k !== 'small' && k !== 'big') continue;
      if (!VIS[i]) continue;
      var size = (k === 'big' ? R.def.bead.big : R.def.bead.small) * SC[i] * R.rnd[i].k;
      _s.set(size, size, size); _m2.compose(P[i], Q[i], _s);
      var mesh = k === 'big' ? R.big : R.small, idx = k === 'big' ? bi++ : si++;
      mesh.setMatrixAt(idx, _m2);
      // 지난 알은 조금 어둡고 차분하게(조명·채도로만 구별), A안에서 더 분명히
      var done = i < dimP, f = done ? 1 - (0.15 + 0.43 * e) : 1;
      _c.setRGB(f, f * (done ? 0.96 : 1), f * (done ? 0.97 : 1));
      if (R.palette) { var pc = R.palette[((L.nodes[i].decade || 1) - 1) % R.palette.length]; _c.multiply(pc); } // 단마다 색이 다른 묵주
      mesh.setColorAt(idx, _c);
      if (R.caps) {
        var hy = 0.5 * (R.def.bead.aspect || 1) * 0.94;
        _m.makeTranslation(0, hy, 0); R.caps.setMatrixAt(ci++, _m.premultiply(_m2));
        _m.makeRotationX(Math.PI); _m.setPosition(0, -hy, 0); R.caps.setMatrixAt(ci++, _m.premultiply(_m2));
      }
    }
    R.small.count = si; R.big.count = bi; if (R.caps) R.caps.count = ci;
    [R.small, R.big].forEach(function (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    if (R.caps) R.caps.instanceMatrix.needsUpdate = true;
    // 십자가·메달
    placeObj(R.cross, 0, R.def.cross.height ? 1 : 1);
    var mn = e < 0.02 ? medalNode : 6;
    placeObj(R.medal, mn, 1);
    links();
  }
  function placeObj(obj, i, k) {
    obj.visible = VIS[i];
    obj.position.copy(P[i]); obj.quaternion.copy(Q[i]); obj.scale.setScalar(SC[i] * k);
  }
  // 노드 i 의 표면에서 방향 dir 쪽 끝점(반지름 × 배율)
  function surf(i, dir, out) {
    var k = L.nodes[i].kind, r;
    if (k === 'cross') r = (R.def.cross.height / 2 + 0.3) * SC[i];
    else if (k === 'medal') { r = R.medal.userData.ry * SC[i] * 0.96; }
    else r = (k === 'big' ? R.def.bead.big : R.def.bead.small) * 0.5 * (R.def.bead.aspect || 1) * SC[i] * 0.92;
    return out.copy(P[i]).addScaledVector(dir, r);
  }
  var _a = new T.Vector3(), _b = new T.Vector3(), _d = new T.Vector3(), _n = new T.Vector3();
  function links() {
    var li = 0, co = 0, kn = 0, type = R.def.link.type, wdt = R.def.link.width;
    for (var i = 0; i < 61; i++) {
      var j = i + 1;
      var ii = (i === 61) ? 6 : i, jj = (j === 61 && !VIS[61]) ? 6 : j;
      if (!VIS[ii] || !VIS[jj]) continue;
      _d.subVectors(P[jj], P[ii]); var full = _d.length(); if (full < 1e-6) continue; _d.divideScalar(full);
      surf(ii, _d, _a); _n.copy(_d).negate(); surf(jj, _n, _b);
      var len = _a.distanceTo(_b), sc = (SC[ii] + SC[jj]) / 2;
      // 접선에 수직인 '앞' 방향(카메라 쪽): 노드 앞면의 Z
      _z.set(0, 0, 1).applyQuaternion(Q[ii]);
      if (type === 'cord') {
        // 끈: 알 중심에서 중심까지(알 속은 가려진다) + 가운데 매듭
        _v.addVectors(P[ii], P[jj]).multiplyScalar(0.5);
        var cl = full * 1.0;
        if (L.nodes[ii].kind === 'cross' || L.nodes[jj].kind === 'cross') { _v.addVectors(_a, _b).multiplyScalar(0.5); cl = len + 0.2 * sc; }
        _q.setFromUnitVectors(_y.set(0, 1, 0), _d);
        _s.set(wdt * 0.5 * sc, cl, wdt * 0.5 * sc); _m.compose(_v, _q, _s); R.cords.setMatrixAt(co++, _m);
        if (L.nodes[ii].kind !== 'cross' && L.nodes[jj].kind !== 'cross' && L.nodes[ii].kind !== 'medal' && L.nodes[jj].kind !== 'medal') {
          if (R.def.link.knot === false) continue;
          _v.addVectors(_a, _b).multiplyScalar(0.5); _s.set(wdt * 1.05 * sc, wdt * 1.15 * sc, wdt * 1.05 * sc); _m.compose(_v, _q, _s); R.knots.setMatrixAt(kn++, _m);
        } else if (li < 12) { // 십자가·메달 고리
          var at = L.nodes[ii].kind === 'cross' || L.nodes[ii].kind === 'medal' ? _a : _b;
          _s.set(0.13 * sc, 0.13 * sc, 0.13 * sc); _m.compose(at, _q, _s); R.links.setMatrixAt(li++, _m);
        }
      } else {
        var n = type === 'chain' ? Math.max(2, Math.round(len / (0.2 * sc))) : Math.max(2, Math.round(len / (0.22 * sc)));
        var pitch = len / n, rr = pitch * (type === 'chain' ? 0.62 : 0.6);
        for (var k = 0; k < n; k++) {
          _v.copy(_a).addScaledVector(_d, pitch * (k + 0.5));
          _x.crossVectors(_d, _z).normalize(); var zz = _w.crossVectors(_x, _d).normalize();
          if (k % 2) { var tmp = _x.clone(); _x.copy(zz); zz.copy(tmp).negate(); }
          _m.makeBasis(_x, _d, zz); _q.setFromRotationMatrix(_m);
          if (type === 'chain') _s.set(rr * 0.62, rr, rr * 0.62); else _s.set(rr * 0.85, rr, rr * 0.85);
          _m.compose(_v, _q, _s); R.links.setMatrixAt(li++, _m);
        }
      }
    }
    R.links.count = li; R.links.instanceMatrix.needsUpdate = true;
    if (R.cords) { R.cords.count = co; R.cords.instanceMatrix.needsUpdate = true; R.knots.count = kn; R.knots.instanceMatrix.needsUpdate = true; }
  }

  // ---- 카메라·빛 ----
  var camC = new T.Vector3(), tgtC = new T.Vector3(), camA = new T.Vector3(), tgtA = new T.Vector3(), _cam = new T.Vector3(), _tgt = new T.Vector3();
  function frameCamera() {
    var e = ease(S.t), fovT = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), h = root.innerHeight || 320, w = root.innerWidth || 360;
    // C안: 작은 알 하나가 화면에서 약 96px(영역 높이의 30%를 넘지 않게) 되도록 거리를 잡는다. 십자가 가까이에선 물러난다.
    var px = Math.min(100, h * 0.3), D = (1 * h) / (2 * fovT * px);
    var wc = Math.max(0, 1 - Math.abs(S.p) / 1.2); D *= 1 + 0.75 * wc * wc;
    var hx = handX();
    camC.set(hx * 0.4, -0.15, C.front + D); tgtC.set(hx * 0.4, 0, C.front - 0.3);
    if (e > 0) {
      var b = R.a.bounds, cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      var bw = (b.maxX - b.minX) * 1.08, bh = (b.maxY - b.minY) * 1.06, asp = w / h;
      var DA = Math.max(bh, bw / asp) / (2 * fovT);
      var o = S.orbit, z = DA / Math.max(0.35, o.zoom);
      camA.set(cx + Math.sin(o.yaw) * Math.cos(o.pitch) * z, cy - 1.5 + Math.sin(o.pitch) * z, Math.cos(o.yaw) * Math.cos(o.pitch) * z);
      if (!S.gallery) camA.set(cx, cy - DA * 0.08, DA);
      tgtA.set(cx, cy, 0);
    }
    _cam.copy(camC).lerp(camA, e); _tgt.copy(tgtC).lerp(tgtA, e);
    camera.position.copy(_cam); camera.lookAt(_tgt);
    // 그림자 카메라를 보이는 범위에 맞춘다
    var sc = keyLight.shadow.camera, ext = 6 + e * 26;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();
    keyLight.target.position.copy(_tgt); keyLight.position.copy(_tgt).add(_v.set(-5, 9, 20));
    // A안 현재 알 조명(은은한 스폿)
    var cur = Math.max(0, Math.min(61, Math.round(S.p)));
    spot.intensity = e * 1600; spot.target.position.copy(P[cur]); spot.position.set(P[cur].x + 2, P[cur].y + 4, P[cur].z + 26);
  }

  // ---- 애니메이션 루프(정지하면 멈춘다) ----
  function kick() { if (!S.running && R) { S.running = true; S.last = performance.now(); requestAnimationFrame(tick); } }
  function step(dt) {
    var goal = S.target + S.drag, moving = false;
    if (S.reduce) { S.p = goal; S.pv = 0; }
    else {
      var w = S.dragging ? 34 : 13, z = S.dragging ? 1 : 0.62;
      var a = w * w * (goal - S.p) - 2 * z * w * S.pv;
      S.pv += a * dt; S.p += S.pv * dt;
      if (Math.abs(goal - S.p) < 0.0008 && Math.abs(S.pv) < 0.002) { S.p = goal; S.pv = 0; } else moving = true;
    }
    if (S.t !== S.tTarget) {
      var sp = S.reduce ? 1000 : dt / 0.95;
      S.t = S.tTarget > S.t ? Math.min(S.tTarget, S.t + sp) : Math.max(S.tTarget, S.t - sp);
      moving = true;
    }
    return moving;
  }
  function renderOnce() {
    var t0 = performance.now();
    place(); frameCamera();
    renderer.render(scene, camera);
    var ms = performance.now() - t0; S.frames++; S.msSum += ms; S.lastMs = ms;
  }
  function tick(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - S.last) / 1000)); S.last = now;
    var moving = step(dt);
    renderOnce();
    if (moving || S.dirty) { S.dirty = false; requestAnimationFrame(tick); } else S.running = false;
  }

  var API = {
    init: function (o) {
      o = o || {};
      if (o.quality) S.quality = o.quality; if (o.theme) S.theme = o.theme; if (o.hand) S.hand = o.hand; S.reduce = !!o.reduceMotion;
      S.gallery = !!o.gallery;
      if (!renderer) setup(); else applyQuality();
      S.target = S.p = L.stepPos(o.step || 0);
      S.view = o.view === 'a' ? 'a' : 'c'; S.t = S.tTarget = S.view === 'a' ? 1 : 0;
      build(o.rosary || 'olive');
    },
    setStep: function (o) { S.target = L.stepPos(o.step | 0); S.drag = 0; S.dragging = false; if (o.animate === false) { S.p = S.target; S.pv = 0; } kick(); },
    setDrag: function (o) { S.drag = Math.max(-1.1, Math.min(1.1, +o.offset || 0)); S.dragging = !!o.active; kick(); },
    setView: function (o) { S.view = o.view === 'a' ? 'a' : 'c'; S.tTarget = S.view === 'a' ? 1 : 0; kick(); },
    setRosary: function (o) { if (!R || R.def.id !== o.id) build(o.id); },
    setTheme: function (o) { S.theme = o.theme; if (R) backdrop.material = mats.backdrop(S.theme); S.dirty = true; kick(); },
    setHand: function (o) { S.hand = o.hand; S.dirty = true; kick(); },
    setQuality: function (o) { if (o.quality === S.quality) return; S.quality = o.quality; applyQuality(); if (R) build(R.def.id); },
    setOrbit: function (o) { S.orbit.yaw = +o.yaw || 0; S.orbit.pitch = Math.max(-0.9, Math.min(0.9, +o.pitch || 0)); S.orbit.zoom = Math.max(0.5, Math.min(4, +o.zoom || 1)); S.dirty = true; kick(); },
    setReduceMotion: function (o) { S.reduce = !!o.on; }
  };
  root.RosaryAPI = API;
  root.__rosary = { S: S, get R() { return R; }, get renderer() { return renderer; }, renderOnce: function () { if (R) renderOnce(); },
    settled: function () { return !S.running; }, stats: function () { var i = renderer.info; return { frames: S.frames, avgMs: S.frames ? S.msSum / S.frames : 0, lastMs: S.lastMs, calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, built: S.built }; } };
  root.addEventListener('error', function (e) { post({ e: 'error', msg: String(e.message || e) }); });
  post({ e: 'ready' });
})(typeof window !== 'undefined' ? window : this);
