/* scan3d.js — 실물 성상 3D 스캔(scan3d_<key>.js, tools/statues/make_scan_pack.mjs)을 성당에 세운다.
   - 묶음은 그 성당이 쓸 때만 읽는다(script 태그, 페이지에 한 번). 같은 성당 안 같은 묶음은 기하 하나를 함께 쓴다.
   - 자리마다 THREE.LOD 하나(근거리 / 원거리 = 높이 × LOD_K m 밖) → 그리기 호출은 자리마다 늘 1.
   - 재질은 성당(월드)마다 종류별로 하나: marble(흰 대리석 — 성모상 shrine.js 와 같은 값), color(정점 색 — 채색 목조).
   - 월드 해제(world.dispose)가 재질·기하를 놓는다. 공용 재질의 dispose 를 보고 늦게 도착한 묶음은 버린다.
   - 브라우저가 아니면(node 시험) place() 가 false → 빌더가 예전 절차 생성을 그대로 그린다.
     묶음 읽기·풀기가 늦게 실패하면 onFail() — kit 의 ctx.scan 이 예전 절차 생성을 ctx.lateDraw 로 따로 그린다.
   출처·라이선스: lib/domain/art_credits.dart, docs/church/ASSET_LICENSES.md, licenses/STATUE_SCANS.md (묶음 안 meta.src 에도 있다). */
(function (root) {
  'use strict';
  // 앱에 들어간 묶음(시험이 출처·예산을 이 표로 확인한다). kind = 재질 종류. churches = 쓰는 성당(문서·시험용).
  var PACKS = {
    pieta: { kind: 'marble', churches: ['stpeter'], label: '피에타(미켈란젤로)' },
    crucifix: { kind: 'color', churches: ['basic', 'florence', 'myeongdong', 'stpaul'], label: '십자고상' },
    st_peter: { kind: 'marble', churches: ['lateran', 'stpaul'], label: '성 베드로 상' },
    st_paul: { kind: 'marble', churches: ['lateran', 'stpaul'], label: '성 바오로 상' },
    angel: { kind: 'marble', churches: ['myeongdong'], label: '천사상' }
  };
  var LOD_K = 4, LOD_MIN = 5;
  var MAT = {
    marble: { color: 0xc2bcb2, roughness: 0.5, metalness: 0, envMapIntensity: 0.8 },
    marbleLit: { color: 0xc9c3b9, roughness: 0.5, metalness: 0, envMapIntensity: 0.8, emissive: 0x1a1814 },   // 창 없는 어두운 경당(피에타): 조명받는 흰 대리석처럼 조금 스스로 밝힌다
    color: { vertexColors: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.7 }
  };
  var loading = {};
  // 바닥 반사(Reflector, 고사양)의 가상 카메라에는 그리지 않는다 — 성상마다 draw call 이 1 더 늘고(근거리 삼각형도 한 번 더) 반사 속 작은 상은 거의 보이지 않는다.
  // 카메라가 장면 안 Reflector 의 .camera 인지 처음 볼 때 한 번 찾아 기억한다.
  var camKind = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function reflCam(o, cam) {
    if (!camKind || !cam) return false;
    if (camKind.has(cam)) return camKind.get(cam);
    var top = o, r = false; while (top.parent) top = top.parent;
    top.traverse(function (n) { if (n.isReflector && n.camera === cam) r = true; });
    camKind.set(cam, r); return r;
  }
  function packOf(key) { var a = root.ChurchArt && root.ChurchArt.scans3d; return a ? a[key] : null; }
  function script(key) {
    if (packOf(key)) return Promise.resolve(packOf(key));
    if (!loading[key]) {
      loading[key] = new Promise(function (res, rej) {
        var sc = document.createElement('script'); sc.src = 'scan3d_' + key + '.js'; sc.async = true;
        sc.onload = function () { var p = packOf(key); if (p && p.load) res(p); else { delete loading[key]; rej(new Error('scan3d ' + key)); } };
        sc.onerror = function () { delete loading[key]; rej(new Error('scan3d load ' + key)); };
        document.head.appendChild(sc);
      });
    }
    return loading[key];
  }
  function able(ctx) {
    var T = root.THREE;
    return !!(T && T.LOD && T.BufferGeometry && ctx && ctx.root && typeof Promise !== 'undefined' && typeof document !== 'undefined' && document.head && document.head.appendChild && !(root.location && /[?&]scan3d=0(&|$)/.test(root.location.search || '')));
  }
  function state(ctx) { return ctx._.scan3d || (ctx._.scan3d = { mats: {}, geos: {}, dead: false, placed: [] }); }
  function material(ctx, kind) {
    var st = state(ctx), T = root.THREE;
    if (!st.mats[kind]) {
      var m = st.mats[kind] = new T.MeshStandardMaterial(MAT[kind] || MAT.marble);
      m.name = 'scan3d_' + kind;
      m.addEventListener('dispose', function () { st.dead = true; });
    }
    return st.mats[kind];
  }
  function geometry(ctx, key) {
    var st = state(ctx);
    if (!st.geos[key]) st.geos[key] = script(key).then(function (p) { return p.load(root.THREE); });
    return st.geos[key];
  }
  // o: key, x, y(바닥), z, ry(지역 +Z 가 바라볼 쪽, 라디안), h(높이 m; 없으면 묶음 높이), mirror(좌우 뒤집기), mat(재질 종류 바꾸기: MAT 의 키),
  //    backAt(선택: 모형 뒷면을 기준점 뒤 이 거리에 맞춘다 — 벽에 붙는 십자고상), lodFar(선택), name
  function place(ctx, o, onFail) {
    if (!o || !PACKS[o.key] || !able(ctx)) return false;
    var T = root.THREE, st = state(ctx), mat = material(ctx, o.mat || PACKS[o.key].kind);
    var lod = new T.LOD(); lod.name = o.name || ('scan3d_' + o.key); lod.visible = false;
    lod.userData.noCam = true; lod.userData.noAO = true; lod.userData.scan3d = o.key;
    lod.rotation.y = o.ry || 0;
    var up = lod.update;
    lod.update = function (cam) {
      if (reflCam(lod, cam)) { for (var i = 0; i < lod.levels.length; i++) lod.levels[i].object.visible = false; return; }
      up.call(lod, cam);
    };
    ctx.root.add(lod); if (ctx.stats) ctx.stats.meshes++;
    st.placed.push(lod);
    var failed = false;
    function bad() {
      if (failed || st.dead) return; failed = true;
      if (lod.parent) lod.parent.remove(lod);
      if (onFail) onFail();
    }
    geometry(ctx, o.key).then(function (g) {
      if (st.dead || failed) return;
      var M = g.meta, s = o.h ? o.h / M.h : 1, h = M.h * s;
      ['near', 'far'].forEach(function (k, i) {
        var m = new T.Mesh(g[k], mat); m.name = lod.name + '_' + k; m.userData.noCam = true; m.userData.noAO = true;
        lod.addLevel(m, i ? (o.lodFar || Math.max(LOD_MIN, h * LOD_K)) : 0);
      });
      var back = o.backAt === undefined ? 0 : -o.backAt - M.min[2] * s, sa = Math.sin(lod.rotation.y), ca = Math.cos(lod.rotation.y);
      lod.position.set(o.x + sa * back, (o.y || 0) - M.min[1] * s, o.z + ca * back);
      lod.scale.set(o.mirror ? -s : s, s, s);
      lod.visible = true;
    }).catch(bad);
    return true;
  }
  var S = { PACKS: PACKS, LOD_K: LOD_K, LOD_MIN: LOD_MIN, MAT: MAT, place: place, able: able, material: material };
  root.ChurchScan3D = S;
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : this);
