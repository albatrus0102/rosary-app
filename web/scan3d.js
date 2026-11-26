/* scan3d.js — 3D 스캔 묶음(scan3d_<key>.js)을 읽어 장면에 세우는 로더(로더만; 묶음 파일은 이 패키지에 없다).
   - 묶음은 쓸 때만 읽는다(script 태그, 페이지에 한 번). 같은 장면 안 같은 묶음은 기하 하나를 함께 쓴다.
   - 묶음 파일 형식: window.RoomArt.scans3d[key] = { load(THREE) -> Promise<{near, far, meta:{h, min:[x,y,z]}}> }.
   - 자리마다 THREE.LOD 하나(근거리 / 원거리 = 높이 × LOD_K m 밖) → 그리기 호출은 자리마다 늘 1.
   - 묶음 등록: RoomScan3D.register(key, {kind:'matte'|'color', dir?:'경로/', rotY?:도}). 등록하지 않은 key 는 세우지 않는다.
   - 브라우저가 아니면(node 시험) place() 가 false → 빌더가 대체 도형을 그린다. 늦게 실패하면 onFail().
   - 출처·라이선스는 묶음 안 meta.src 에 두고, 쓰는 쪽 문서에 적는다(CC0/MIT 만). */
(function (root) {
  'use strict';
  var PACKS = {};
  function packDef(key) { return PACKS[key] || null; }
  var LOD_K = 4, LOD_MIN = 5;
  // 재질: matte(무광 흰 석고 + 열쇠 빛 — 굴곡이 읽히게), color(정점 색)
  var MAT = {
    matte: { color: 0xd8d2c8, roughness: 0.7, metalness: 0, envMapIntensity: 0.3, key: { dir: [-0.45, 0.75, 0.62], color: 0xfff3e2, intensity: 1.0, wrap: 0.25 } },
    color: { vertexColors: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.7 }
  };
  function keyLight(m, key) {
    var T = root.THREE, d = new T.Vector3().fromArray(key.dir).normalize();
    var u = { scanKeyDir: { value: d }, scanKeyCol: { value: new T.Color(key.color).multiplyScalar(key.intensity) }, scanKeyWrap: { value: key.wrap || 0 } };
    m.userData.scanKey = u;
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'uniform vec3 scanKeyDir;\nvarying vec3 vScanKey;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvScanKey = normalize( mat3( modelViewMatrix ) * scanKeyDir );');
      sh.fragmentShader = 'uniform vec3 scanKeyCol;\nuniform float scanKeyWrap;\nvarying vec3 vScanKey;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>',
        '#include <lights_fragment_end>\n\t{ float kd = max( ( dot( normal, normalize( vScanKey ) ) + scanKeyWrap ) / ( 1.0 + scanKeyWrap ), 0.0 );\n\t  reflectedLight.directDiffuse += scanKeyCol * kd * BRDF_Lambert( diffuseColor.rgb ); }');
    };
    m.customProgramCacheKey = function () { return 'scan3dKey'; };
  }
  var loading = {};
  // 바닥 반사(Reflector)의 가상 카메라에는 그리지 않는다(draw call 절약).
  // 카메라가 장면 안 Reflector 의 .camera 인지 처음 볼 때 한 번 찾아 기억한다.
  var camKind = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function reflCam(o, cam) {
    if (!camKind || !cam) return false;
    if (camKind.has(cam)) return camKind.get(cam);
    var top = o, r = false; while (top.parent) top = top.parent;
    top.traverse(function (n) { if (n.isReflector && n.camera === cam) r = true; });
    camKind.set(cam, r); return r;
  }
  function packOf(key) { var a = root.RoomArt && root.RoomArt.scans3d; return a ? a[key] : null; }
  function script(key) {
    if (packOf(key)) return Promise.resolve(packOf(key));
    if (!loading[key]) {
      loading[key] = new Promise(function (res, rej) {
        var sc = document.createElement('script'); sc.src = ((packDef(key) && packDef(key).dir) || '') + 'scan3d_' + key + '.js'; sc.async = true;
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
      var def = MAT[kind] || MAT.matte, o = {};
      for (var k in def) if (k !== 'key') o[k] = def[k];
      var m = st.mats[kind] = new T.MeshStandardMaterial(o);
      m.name = 'scan3d_' + kind;
      if (def.key) keyLight(m, def.key);
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
  //    backAt(선택: 모형 뒷면을 기준점 뒤 이 거리에 맞춘다 — 벽에 붙는 물건), lodFar(선택), lodHide(선택: 이 거리 밖에서는 숨김), name
  function place(ctx, o, onFail) {
    var def = o && packDef(o.key);
    if (!def || !able(ctx)) return false;
    var T = root.THREE, st = state(ctx), mat = material(ctx, o.mat || def.kind);
    var lod = new T.LOD(); lod.name = o.name || ('scan3d_' + o.key); lod.visible = false;
    lod.userData.noCam = true; lod.userData.noAO = true; lod.userData.scan3d = o.key;
    lod.rotation.y = (o.ry || 0) + (def.rotY || 0) * Math.PI / 180;
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
      if (o.lodHide) lod.addLevel(new T.Object3D(), o.lodHide);   // 선택: 이 거리 밖에서는 그리지 않는다
      var back = o.backAt === undefined ? 0 : -o.backAt - M.min[2] * s, sa = Math.sin(lod.rotation.y), ca = Math.cos(lod.rotation.y);
      lod.position.set(o.x + sa * back, (o.y || 0) - M.min[1] * s, o.z + ca * back);
      lod.scale.set(o.mirror ? -s : s, s, s);
      lod.visible = true;
    }).catch(bad);
    return true;
  }
  var S = { PACKS: PACKS, register: function (key, def) { PACKS[key] = def; return def; }, LOD_K: LOD_K, LOD_MIN: LOD_MIN, MAT: MAT, place: place, able: able, material: material };
  root.RoomScan3D = S;
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : this);
