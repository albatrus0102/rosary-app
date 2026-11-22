/* shaft_fx.js — 창으로 드는 햇빛 줄기·떠도는 먼지(docs/church/RENDER_V4.md §3). high·mid 만(low 는 예전 가산 판 1장 그대로).
   사진 같은 실내가 목표: 빛줄기는 '빛'이지 안개가 아니다 — 해가 실제로 닿는 공기만 밝힌다.
   - 판(world.js updateBeams 가 짓는 창마다 3장의 기하)을 그대로 쓰되, 장면 패스가 아니라 render.js 의 fx 패스(반·¼ 해상도, 가산)에서 그린다:
       · 해 그림자 맵으로 가린다(기둥·창살·벽 뒤의 공기는 어둡다 = 물리적으로 그 자리에 햇빛이 없다)
       · 장면 깊이로 부드럽게 사라진다(벽·바닥·기둥에 닿는 곳에 딱딱한 선이 없다, soft particles) · 카메라 가까이·판을 옆에서 볼 때도 사라진다
       · 느리게 흐르는 3D 값 노이즈로 밀도가 흔들린다(움직임 줄이기면 멈춤) · 색유리 창의 빛은 그 유리색으로 물들되 공기 속에서는 절반쯤 바랜다
   - 먼지: GPU 점 하나(draw call 1). 입자는 빛줄기 판 둘레(±0.35m)에만 놓이고 그 자리의 햇빛(그림자 맵)·빛줄기 세기만큼만 보인다 → 그늘에서는 안 보인다.
     크기는 화면에서 최소 2.5화소로 넓히고 밝기는 넓힌 만큼 나눈다(화소보다 작은 점의 반짝임 = 깜빡임 방지). 움직임 줄이기면 숨긴다.
   ChurchShafts.create(o) → S: S.scene(fx 패스가 그린다) · S.updateMotes() · S.prepare(camera, depthTex, w, h) · S.setTime(t) · S.setShadow(light) · S.dispose() */
(function (root) {
  'use strict';
  var T = root.THREE;

  var NOLIT = /[?&]shlit=0/.test((root.location && root.location.search) || '');   // 개발용: 그림자 맵으로 가리지 않기(비교)
  var NOISE = 'float shHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
    'float shNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
    ' return mix(mix(mix(shHash(i), shHash(i + vec3(1,0,0)), f.x), mix(shHash(i + vec3(0,1,0)), shHash(i + vec3(1,1,0)), f.x), f.y),\n' +
    '  mix(mix(shHash(i + vec3(0,0,1)), shHash(i + vec3(1,0,1)), f.x), mix(shHash(i + vec3(0,1,1)), shHash(i + vec3(1,1,1)), f.x), f.y), f.z); }\n';
  // 그림자 맵(three 의 RGBA 깊이 묶음)·장면 깊이 공통
  var COMMON = '#include <packing>\nuniform sampler2D tDepth; uniform vec2 uRes; uniform vec2 uNF; uniform float uDepthOn;\n' +
    'uniform sampler2D tShadow; uniform mat4 uShadowM; uniform vec2 uShadowTexel; uniform float uShadowOn; uniform float uLitMin;\n' +
    'float shLit(vec3 w){ if (uShadowOn < 0.5) return 1.0; vec4 sc = uShadowM * vec4(w, 1.0); sc.xyz /= sc.w;\n' +
    ' if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 0.0; float z = sc.z - 0.0015, s = 0.0;\n' +
    ' s += step(z, unpackRGBAToDepth(texture2D(tShadow, sc.xy + vec2(-0.5, -0.5) * uShadowTexel)));\n' +
    ' s += step(z, unpackRGBAToDepth(texture2D(tShadow, sc.xy + vec2(0.5, -0.5) * uShadowTexel)));\n' +
    ' s += step(z, unpackRGBAToDepth(texture2D(tShadow, sc.xy + vec2(-0.5, 0.5) * uShadowTexel)));\n' +
    ' s += step(z, unpackRGBAToDepth(texture2D(tShadow, sc.xy + vec2(0.5, 0.5) * uShadowTexel)));\n return s * 0.25; }\n' +
    // 장면 깊이(이 화소에서 가장 가까운 불투명 면) - 이 조각 깊이 → 0..1 (뒤에 있으면 0, soft 미터 안에서 부드럽게)
    'float shSoft(float vz, float soft){ if (uDepthOn < 0.5) return 1.0; float d = texture2D(tDepth, gl_FragCoord.xy / uRes).x;\n' +
    ' float sz = -perspectiveDepthToViewZ(d, uNF.x, uNF.y); return clamp((sz - vz) / soft, 0.0, 1.0); }\n';

  var SHAFT_V = 'attribute vec3 color; varying vec3 vCol; varying vec2 vUv; varying vec3 vW; varying float vZ;\n' +
    'void main(){ vCol = color; vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }';
  var SHAFT_F = 'uniform sampler2D tProfile; uniform float uT; uniform float uK; varying vec3 vCol; varying vec2 vUv; varying vec3 vW; varying float vZ;\n' + COMMON + NOISE +
    'void main(){ float prof = texture2D(tProfile, vUv).r * smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x); if (prof < 0.004) discard;\n' +
    // 싼 것부터(단면·각도·카메라 거리·깊이) — 버릴 조각은 노이즈·그림자 맵을 읽기 전에 버린다
    ' vec3 nrm = normalize(cross(dFdx(vW), dFdy(vW))); float ang = smoothstep(0.08, 0.5, abs(dot(nrm, normalize(cameraPosition - vW))));\n' +
    ' float a = prof * ang * smoothstep(0.6, 2.4, vZ) * dot(vCol, vec3(0.333)); if (a < 0.002) discard; a *= shSoft(vZ, 0.9); if (a < 0.002) discard;\n' +
    ' vec3 p = vW * 0.55 + vec3(0.0, -uT * 0.035, uT * 0.02); float n = shNoise(p) * 0.65 + shNoise(p * 2.7 + 7.1) * 0.35;\n' +
    ' a *= mix(0.55, 1.3, n) * mix(uLitMin, 1.0, shLit(vW)) / max(dot(vCol, vec3(0.333)), 1e-4);\n' +
    ' vec3 tint = mix(vec3(dot(vCol, vec3(0.2126, 0.7152, 0.0722))), vCol, 0.5);\n' +
    ' gl_FragColor = vec4(tint * a * uK, 1.0); }';

  var MOTE_V = 'attribute vec3 aCol; attribute vec4 aSeed; uniform float uT; uniform float uPx; uniform float uAmp; varying vec3 vCol; varying vec3 vW; varying float vZ; varying float vE;\n' +
    'void main(){ vec3 d = vec3(sin(uT * aSeed.w + aSeed.x), 0.55 * sin(uT * aSeed.w * 0.71 + aSeed.y), cos(uT * aSeed.w * 0.87 + aSeed.z)) * uAmp;\n' +
    ' vec4 w = modelMatrix * vec4(position + d, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv;\n' +
    // 실제 크기(지름 약 4mm)의 화면 크기. 최소 2.5화소로 넓히고 밝기는 넓힌 면적만큼 나눈다(반짝임 없음)
    ' float s = 0.004 * uPx / max(vZ, 0.1); float S = max(s, 2.5); gl_PointSize = S; vE = (s * s) / (S * S) * 4.0; vCol = aCol; }';
  var MOTE_F = 'uniform float uK; varying vec3 vCol; varying vec3 vW; varying float vZ; varying float vE;\n' + COMMON +
    'void main(){ vec2 c = gl_PointCoord - 0.5; float r = dot(c, c) * 4.0; if (r > 1.0) discard; float g = (1.0 - r) * (1.0 - r);\n' +
    ' float a = g * vE * smoothstep(0.5, 1.6, vZ) * smoothstep(14.0, 6.0, vZ) * shSoft(vZ, 0.25); if (a < 0.0005) discard; a *= mix(uLitMin * 0.4, 1.0, shLit(vW));\n' +
    ' gl_FragColor = vec4(vCol * a * uK, 1.0); }';

  function common() {
    return {
      tDepth: { value: null }, uRes: { value: new T.Vector2(1, 1) }, uNF: { value: new T.Vector2(0.3, 700) }, uDepthOn: { value: 0 },
      tShadow: { value: null }, uShadowM: { value: new T.Matrix4() }, uShadowTexel: { value: new T.Vector2(1 / 2048, 1 / 2048) }, uShadowOn: { value: 0 }, uLitMin: { value: 0.22 },
      uT: { value: 0 }
    };
  }

  /** o: {geometry(빛줄기 판 기하, world.js 와 공유), profile(판 단면 질감), sheets(창마다 판 수), nMotes, rng} */
  function create(o) {
    var C = common(), scene = new T.Scene();
    var su = T.UniformsUtils.clone({ tProfile: { value: null }, uK: { value: 1 } });
    su.tProfile.value = o.profile;
    for (var k in C) su[k] = C[k];
    var shaftMat = new T.ShaderMaterial({ uniforms: su, vertexShader: SHAFT_V, fragmentShader: SHAFT_F, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    shaftMat.extensions = { derivatives: true };
    shaftMat.forceSinglePass = true;   // 가산이라 앞뒤 순서가 상관없다 — 투명 양면 재질을 두 번 그리는 r149 기본(뒷면·앞면)을 끈다(draw call −1)
    var shaft = new T.Mesh(o.geometry, shaftMat); shaft.frustumCulled = false; scene.add(shaft);
    // 먼지
    var N = o.nMotes | 0, motes = null, mu = null, homes = [], rnd = o.rng || Math.random;
    var mp = new Float32Array(Math.max(1, N) * 3), mc = new Float32Array(Math.max(1, N) * 3), ms = new Float32Array(Math.max(1, N) * 4);
    for (var i = 0; i < N; i++) {
      homes.push([rnd(), rnd(), rnd(), (rnd() * 2 - 1) * 0.35]);   // 판 하나 고르기(0..1), 길이 방향, 높이 방향, 판에서 떨어진 거리(m)
      ms[i * 4] = rnd() * 6.28; ms[i * 4 + 1] = rnd() * 6.28; ms[i * 4 + 2] = rnd() * 6.28; ms[i * 4 + 3] = 0.05 + rnd() * 0.09;
    }
    if (N) {
      var mg = new T.BufferGeometry();
      mg.setAttribute('position', new T.BufferAttribute(mp, 3)); mg.setAttribute('aCol', new T.BufferAttribute(mc, 3)); mg.setAttribute('aSeed', new T.BufferAttribute(ms, 4));
      mu = { uK: { value: 1 }, uPx: { value: 800 }, uAmp: { value: 0.22 } };
      for (k in C) mu[k] = C[k];
      var moteMat = new T.ShaderMaterial({ uniforms: mu, vertexShader: MOTE_V, fragmentShader: MOTE_F, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
      motes = new T.Points(mg, moteMat); motes.frustumCulled = false; scene.add(motes);
    }
    var S = { scene: scene, shaft: shaft, motes: motes, uniforms: C, nMotes: N, shaftK: 1, moteK: 1, reduced: false };
    /** world.updateBeams 뒤: 먼지를 판(빛줄기 기하) 둘레에 다시 놓는다. 판 수가 많아도 입자 수는 그대로(밝은 판일수록 많이) */
    S.updateMotes = function () {
      if (!N) return;
      var P = o.geometry.attributes.position.array, Cc = o.geometry.attributes.color.array, nq = P.length / 18, w = [], tot = 0, q;
      for (q = 0; q < nq; q++) { var v = Cc[q * 18] + Cc[q * 18 + 1] + Cc[q * 18 + 2]; tot += v; w.push(tot); }
      for (var j = 0; j < N; j++) {
        var h = homes[j], o3 = j * 3;
        if (tot <= 1e-5) { mc[o3] = mc[o3 + 1] = mc[o3 + 2] = 0; continue; }
        var pick = h[0] * tot, lo = 0, hi = nq - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (w[mid] < pick) lo = mid + 1; else hi = mid; }
        var b = lo * 18;   // 판 꼭짓점: T0(0) B0(3) B1(6) … T1(15)
        var a = h[1], c = h[2];
        var tx = P[b] + (P[b + 15] - P[b]) * a, ty = P[b + 1] + (P[b + 16] - P[b + 1]) * a, tz = P[b + 2] + (P[b + 17] - P[b + 2]) * a;
        var bx = P[b + 3] + (P[b + 6] - P[b + 3]) * a, by = P[b + 4] + (P[b + 7] - P[b + 4]) * a, bz = P[b + 5] + (P[b + 8] - P[b + 5]) * a;
        var lx = P[b + 15] - P[b], ly = P[b + 16] - P[b + 1], lz = P[b + 17] - P[b + 2];   // 판의 길이 방향
        var nx = lz, nz = -lx, nl = Math.sqrt(nx * nx + nz * nz) || 1; nx /= nl; nz /= nl;   // 판에 수직(수평) — 위쪽(y)과 길이 방향에 수직
        mp[o3] = tx + (bx - tx) * c + nx * h[3]; mp[o3 + 1] = ty + (by - ty) * c; mp[o3 + 2] = tz + (bz - tz) * c + nz * h[3];
        var s3 = 1 / 3;   // 판 세기(정점 색 = 색 × 0.75 × 빛줄기 세기)를 먼지 밝기로, 색은 거의 흰빛(먼지는 햇빛 색)
        var lum = (Cc[b] + Cc[b + 1] + Cc[b + 2]) * s3;
        mc[o3] = lum * 1.0; mc[o3 + 1] = lum * 0.96; mc[o3 + 2] = lum * 0.88;
        void ly;
      }
      motes.geometry.attributes.position.needsUpdate = true; motes.geometry.attributes.aCol.needsUpdate = true;
      motes.geometry.computeBoundingSphere();
    };
    /** fx 패스가 그리기 직전(render.js): 카메라·깊이·화소 크기 */
    S.prepare = function (cam, depthTex, w, h) {
      C.uRes.value.set(w, h); C.uNF.value.set(cam.near, cam.far);
      C.tDepth.value = depthTex || null; C.uDepthOn.value = depthTex ? 1 : 0;
      su.uK.value = S.shaftK;
      if (mu) { mu.uK.value = S.moteK; mu.uPx.value = h / (2 * Math.tan(cam.fov * Math.PI / 360)); motes.visible = !S.reduced && S.moteK > 0.001; }
      shaft.visible = S.shaftK > 0.001;
    };
    S.setTime = function (t) { if (!S.reduced) C.uT.value = t; };
    S.setShadow = function (light) {
      var sh = light && light.castShadow && light.shadow, map = sh && sh.map;
      if (!map || NOLIT) { C.uShadowOn.value = 0; C.tShadow.value = null; return; }
      C.tShadow.value = map.texture; C.uShadowM.value.copy(sh.matrix); C.uShadowTexel.value.set(1 / map.width, 1 / map.height); C.uShadowOn.value = 1;
    };
    S.visibleWork = function () { return (S.shaftK > 0.001 || (motes && S.moteK > 0.001)); };
    S.dispose = function () { shaftMat.dispose(); if (motes) { motes.geometry.dispose(); motes.material.dispose(); } };
    return S;
  }

  root.ChurchShafts = { create: create, SHAFT_F: SHAFT_F, MOTE_V: MOTE_V };
})(typeof window !== 'undefined' ? window : this);
