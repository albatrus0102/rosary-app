/* avatar_glb.js — glb 캐릭터(이미지→3D + Mixamo 리깅, tools/avatar_glb 로 최적화) 런타임. avatar.js(코드로 그린 아바타)를 대신할 수 있는 같은 공개 API.
   아직 index.html/test.html 에 연결하지 않았다(연결 절차: docs/church/SPEC.md '새 캐릭터 런타임', docs/art/CHARACTER_3D_PIPELINE.md §10).
   필요: 전역 THREE(r149), window.ThreeGLB(tools/avatar_glb/build_loader.mjs: GLTFLoader + MeshoptDecoder). 선택: ChurchPalette, ChurchAvatar(tagMaterial·normalizeCfg·대체 아바타), ChurchLabelFit.

   데이터 전달: file:// WebView 에서는 fetch/XHR 이 막히므로 <script src="apack_<id>.js"> 가 window.ChurchAvatarPack['<id>'] = '<base64 glb>' 를 넣는다
   (avatar_glb.mjs pack; 글라스 gpack_* 와 같은 방식). http(s)(시험 서버·루프백) 에서는 load(id, {url}) 로 glb 를 직접 읽을 수 있다.

   구조
   - CharType(캐릭터 1종): LOD0/1/2 지오메트리·재질·뼈대 틀(이름·휴식 자세·IBM)·좌석 수치(scene.extras.rosary). 모든 사람이 지오메트리를 공유한다.
   - AnimSet(동작 묶음 1개): 정규 이름 클립(idle, walk, sit_down, sit_idle, stand_up, pray, kneel_*, bow, wave). 캐릭터 간 공유(Hips 이동만 키 비율로 맞춘 사본).
   - GlbAvatar(사람 1명): 뼈대 1벌(장면 밖 '포즈 공간', 앞 +Z) + LOD 별 SkinnedMesh(detached bind) + AnimationMixer.
       · 상태머신: 서기(idle↔walk 섞기, 걸음 속도에 맞춘 timeScale) / 앉기(sit_down → sit_idle) / 일어서기(stand_up) / 무릎 꿇기 / 이모트.
       · 절차 오버레이(클립 위에 뼈 회전을 덧입힘; 뼈 축 규약과 무관하게 '방향 맞추기'로 계산): 좌석 정합(엉덩이 높이·발 디딤 IK),
         무릎 꿇기 다리 IK, 기도 손(클립 없을 때), 성호(이모트 1), 손 흔들기(클립 없을 때), 절(클립 없거나 앉아 있을 때), 촛불 봉헌(이모트 3), 손가락 굽힘.
       · 군중 비용 절감: LOD1 은 2프레임, LOD2 는 4프레임마다 갱신(엇갈리게). sharePose 가 켜지면 LOD2 는 같은 (캐릭터·상태) 끼리 머리 없는 대표 1명의 뼈대를 공유(믹서 0개).
   좌표: 앱 앞 = -z. 모델은 +Z 를 보므로 body 를 y 축으로 180° 돌린다. */
(function (root) {
  'use strict';
  var T = root.THREE;
  if (!T) return;
  var PI = Math.PI;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function sm(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ------------------------------------------------------------------ 설정(좌석 기하는 신자석 재설계 결과에 맞춰 바꾼다)
  var CFG = {
    seat: { h: 0.45, back: 0.14 },        // 좌석 윗면 높이(m), 앉을 때 골반을 좌석 중심에서 뒤로(m) (avatar.js SEAT_BACK 과 같은 뜻)
    kneel: { fwd: 1.22, y: 0.145, rail: true, thigh: 0.12, dur: 0.7 },   // 기본 무릎 자리(ChurchLogic.kneelSpot 형식) + 허벅지 기울기(rad)
    walkMax: 3.2,                          // setWalk(1) 의 이동 속도(m/s). main.js: setWalk(speed/3.2)
    sitDur: 1.0, standDur: 0.9,            // 앉기·일어서기 전환 길이(s). 클립이 더 길면 빠르게 재생
    lodEvery: [1, 2, 4],                   // LOD 별 갱신 간격(프레임)
    sharePose: true,                       // LOD2 포즈 공유
    tagLift: 0.24                          // 머리 뼈 위로 이름표 높이(m)
  };
  var EMOTE_DUR = [2.4, 3.4, 1.7, 3.0];    // 0 인사, 1 성호, 2 절, 3 촛불 봉헌

  // ------------------------------------------------------------------ 데이터 읽기
  function b64ToBuf(s) {
    var bin = root.atob(s), n = bin.length, u8 = new Uint8Array(n);
    for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  function source(id, opts) {
    if (opts && opts.buffer) return Promise.resolve(opts.buffer);
    if (opts && opts.url) return root.fetch(opts.url).then(function (r) { if (!r.ok) throw new Error('glb ' + r.status); return r.arrayBuffer(); });
    var packs = root.ChurchAvatarPack || {}, s = packs[id];
    if (!s) return Promise.reject(new Error('avatar pack 없음: ' + id + ' (apack_' + id + '.js 를 <script> 로 넣었는지)'));
    var buf = b64ToBuf(s);
    if (!(opts && opts.keepPack)) delete packs[id];     // base64 문자열 메모리를 바로 놓는다
    return Promise.resolve(buf);
  }
  function parseGlb(buf) {
    var X = root.ThreeGLB;
    if (!X || !X.GLTFLoader) return Promise.reject(new Error('ThreeGLB(GLTFLoader) 없음'));
    var ready = X.MeshoptDecoder && X.MeshoptDecoder.ready ? X.MeshoptDecoder.ready : Promise.resolve();
    return ready.then(function () {
      return new Promise(function (res, rej) {
        var l = new X.GLTFLoader();
        if (X.MeshoptDecoder) l.setMeshoptDecoder(X.MeshoptDecoder);
        l.parse(buf, '', res, rej);
      });
    });
  }

  // ------------------------------------------------------------------ CharType
  var types = {}, animSets = {}, pending = {};
  function CharType(id, gltf) {
    var self = this;
    this.id = id;
    var scene = gltf.scene;
    this.meta = (scene.userData && scene.userData.rosary) || {};
    if (!this.meta.height) this.meta.height = 1.75;
    this.s = this.meta.height / 1.75;   // 성인 키 대비 비율(오버레이 목표점 크기)
    scene.updateMatrixWorld(true);
    // 뼈대 틀: Hips 아래 계층(DFS). 스킨 관절이 아닌 노드도 이름이 있으면 넣는다(동작 트랙 대상).
    var hips = scene.getObjectByName('Hips');
    if (!hips) throw new Error(id + ': Hips 없음');
    var nodes = [], index = {};
    (function walk(o, p) {
      var i = nodes.length;
      nodes.push({ name: o.name, parent: p, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone() });
      index[o.name] = i;
      for (var c = 0; c < o.children.length; c++) if (!o.children[c].isMesh && !o.children[c].isSkinnedMesh) walk(o.children[c], i);
    })(hips, -1);
    this.rigNodes = nodes; this.rigIndex = index;
    this.rigBase = hips.parent ? hips.parent.matrixWorld.clone() : new T.Matrix4();   // Hips 부모(보통 단위 행렬)
    // LOD 메시
    this.lods = [[], [], []];
    this.skelSigs = [];   // [{bones: [이름], inv: [Matrix4]}]
    var bs = new T.Sphere();
    ['LOD0', 'LOD1', 'LOD2'].forEach(function (nm, k) {
      var o = scene.getObjectByName(nm);
      if (!o) return;
      o.traverse(function (m) {
        if (!m.isSkinnedMesh) return;
        var names = m.skeleton.bones.map(function (b) { return b.name; });
        var sig = -1;
        for (var q = 0; q < self.skelSigs.length; q++) if (sameSig(self.skelSigs[q], names, m.skeleton.boneInverses)) { sig = q; break; }
        if (sig < 0) { sig = self.skelSigs.length; self.skelSigs.push({ bones: names, inv: m.skeleton.boneInverses.map(function (x) { return x.clone(); }) }); }
        var g = m.geometry;
        if (!g.boundingSphere) g.computeBoundingSphere();
        g.boundingSphere.radius += 1.4;   // 앉기·무릎 꿇기로 몸이 휴식 자세 밖으로 나가도 잘리지 않게
        self.lods[k].push({ geometry: g, material: m.material, sig: sig });
      });
    });
    if (!this.lods[0].length) throw new Error(id + ': LOD0 없음');
    for (var k = 1; k < 3; k++) if (!this.lods[k].length) this.lods[k] = this.lods[k - 1];
    // 틴트: 마스크(R 피부, G 머리) 또는 재질 이름 슬롯
    this.mask = null;
    this.ready = Promise.resolve();
    var mats = (gltf.parser && gltf.parser.json.materials) || [];
    for (var mi = 0; mi < mats.length; mi++) if (mats[mi].name === '__tintmask') {
      this.ready = gltf.parser.getDependency('material', mi).then(function (m) { self.mask = m.map || null; if (self.mask) self.mask.encoding = T.LinearEncoding; });
    }
    var ref = this.meta.tintRef || {};
    this.ref = { skin: ref.skin ? new T.Color().setRGB(ref.skin[0] / 255, ref.skin[1] / 255, ref.skin[2] / 255) : null, hair: ref.hair ? new T.Color().setRGB(ref.hair[0] / 255, ref.hair[1] / 255, ref.hair[2] / 255) : null };
    if (T.ColorManagement && !T.ColorManagement.legacyMode) { if (this.ref.skin) this.ref.skin.convertSRGBToLinear(); if (this.ref.hair) this.ref.hair.convertSRGBToLinear(); }
    this.matCache = {};   // tintKey → {mats: Map(원래 → 사본), refs}
    this.users = 0;
  }
  function sameSig(sg, names, inv) {
    if (sg.bones.length !== names.length) return false;
    for (var i = 0; i < names.length; i++) {
      if (sg.bones[i] !== names[i]) return false;
      var a = sg.inv[i].elements, b = inv[i].elements;
      for (var j = 0; j < 16; j++) if (Math.abs(a[j] - b[j]) > 1e-5) return false;
    }
    return true;
  }
  function slotOf(name) {
    var n = String(name || '').toLowerCase();
    if (/hair/.test(n)) return 'hair';
    if (/(^|[^a-z])(skin|face)([^a-z]|$)/.test(n) || /^skin/.test(n)) return 'skin';
    return null;
  }
  // 팔레트색 ÷ 기준색(선형). 기준색이 없으면 팔레트색 그대로 곱한다.
  function tintFactor(hex, ref) {
    var c = new T.Color(hex);
    if (ref) { c.r = clamp(c.r / Math.max(0.02, ref.r), 0, 4); c.g = clamp(c.g / Math.max(0.02, ref.g), 0, 4); c.b = clamp(c.b / Math.max(0.02, ref.b), 0, 4); }
    return c;
  }
  CharType.prototype.materials = function (skinHex, hairHex) {
    var key = (skinHex || '-') + '|' + (hairHex || '-'), e = this.matCache[key], self = this;
    if (e) { e.refs++; return e; }
    e = { key: key, refs: 1, map: new Map() };
    var tS = skinHex ? tintFactor(skinHex, this.ref.skin) : null, tH = hairHex ? tintFactor(hairHex, this.ref.hair) : null;
    this.lods.forEach(function (lod) {
      lod.forEach(function (p) {
        if (e.map.has(p.material)) return;
        var m = p.material.clone();
        if (self.mask && (tS || tH)) {
          var uS = { value: tS || new T.Color(1, 1, 1) }, uH = { value: tH || new T.Color(1, 1, 1) }, uM = { value: self.mask };
          m.onBeforeCompile = function (sh) {
            sh.uniforms.tintSkin = uS; sh.uniforms.tintHair = uH; sh.uniforms.tintMask = uM;
            sh.fragmentShader = 'uniform vec3 tintSkin;\nuniform vec3 tintHair;\nuniform sampler2D tintMask;\n' + sh.fragmentShader.replace('#include <map_fragment>',
              '#include <map_fragment>\n#ifdef USE_MAP\n{ vec4 tm = texture2D( tintMask, vUv ); diffuseColor.rgb *= mix( vec3( 1.0 ), tintSkin, tm.r ) * mix( vec3( 1.0 ), tintHair, tm.g ); }\n#endif');
          };
          m.customProgramCacheKey = function () { return 'glbtint'; };   // 틴트가 달라도 프로그램은 하나
        } else {
          var sl = slotOf(m.name);
          if (sl === 'skin' && tS) m.color.multiply(tS);
          if (sl === 'hair' && tH) m.color.multiply(tH);
        }
        e.map.set(p.material, m);
      });
    });
    this.matCache[key] = e;
    return e;
  };
  CharType.prototype.releaseMaterials = function (e) {
    if (!e || --e.refs > 0) return;
    e.map.forEach(function (m) { m.dispose(); });
    delete this.matCache[e.key];
  };
  CharType.prototype.dispose = function () {
    var seen = new Set();
    this.lods.forEach(function (lod) { lod.forEach(function (p) { if (!seen.has(p.geometry)) { seen.add(p.geometry); p.geometry.dispose(); } if (!seen.has(p.material)) { seen.add(p.material); disposeMat(p.material); } }); });
    for (var k in this.matCache) this.matCache[k].map.forEach(function (m) { m.dispose(); });
    this.matCache = {};
    if (this.mask) this.mask.dispose();
    delete types[this.id];
  };
  function disposeMat(m) { ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(function (k) { if (m[k]) m[k].dispose(); }); m.dispose(); }

  // ------------------------------------------------------------------ AnimSet
  function AnimSet(id, gltf) {
    this.id = id;
    var ex = (gltf.scene.userData && gltf.scene.userData.rosary) || {};
    this.meta = ex.clips || {};
    this.restHipsY = ex.restHipsY || 1;
    this.clips = {};
    var self = this;
    gltf.animations.forEach(function (c) { self.clips[c.name] = c; });
    this.scaled = {};   // 키 비율별 사본(Hips.position 만 다름)
  }
  // ratio = 캐릭터 Hips 높이 ÷ 동작 뼈대 Hips 높이. 2% 이내면 원본.
  AnimSet.prototype.clip = function (name, ratio) {
    var c = this.clips[name];
    if (!c || Math.abs(ratio - 1) < 0.02) return c || null;
    var key = name + '@' + ratio.toFixed(2), s = this.scaled[key];
    if (s) return s;
    s = c.clone();
    s.tracks.forEach(function (tr) {
      if (/^Hips\.position$/.test(tr.name)) { var v = tr.values = tr.values.slice(); for (var i = 0; i < v.length; i++) v[i] *= ratio; }
    });
    return (this.scaled[key] = s);
  };
  AnimSet.prototype.has = function (name) { return !!this.clips[name]; };

  // 클립을 직접 표본 추출(믹서 없이): 윗몸 층(기도·손 흔들기)을 앉기·무릎 꿇기 위에 덮을 때 쓴다.
  var UPPER = /^(Spine1|Spine2|Neck|Head|(Left|Right)(Shoulder|Arm|ForeArm|Hand.*))\.quaternion$/;
  function Sampler(clip) {
    this.clip = clip; this.items = [];
    var self = this;
    clip.tracks.forEach(function (tr) {
      if (!UPPER.test(tr.name)) return;
      self.items.push({ bone: tr.name.slice(0, tr.name.indexOf('.')), interp: tr.createInterpolant(new Float32Array(4)) });
    });
  }
  var _qs = new T.Quaternion();
  Sampler.prototype.apply = function (bones, t, w) {
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i], b = bones[it.bone];
      if (!b) continue;
      var r = it.interp.evaluate(t);
      _qs.set(r[0], r[1], r[2], r[3]);
      b.quaternion.slerp(_qs, w);
    }
  };

  // ------------------------------------------------------------------ 포즈 공간 IK·방향 맞추기 도우미 (뼈 로컬 축 규약과 무관)
  var _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _d = new T.Vector3(), _e = new T.Vector3(), _f = new T.Vector3();
  var _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion(), _q4 = new T.Quaternion();
  function wpos(b, out) { return out.setFromMatrixPosition(b.matrixWorld); }
  // bone 을 회전해 (child - bone) 방향이 (target - bone) 을 향하게. w = 섞는 비율. 하위 월드 행렬을 갱신한다.
  function aim(bone, child, target, w) {
    if (!bone || !child || w <= 0) return;
    wpos(bone, _a); wpos(child, _b);
    _c.subVectors(_b, _a).normalize(); _d.subVectors(target, _a);
    if (_d.lengthSq() < 1e-10) return;
    _d.normalize();
    _q1.setFromUnitVectors(_c, _d);                                  // 월드 회전 델타
    rotateWorld(bone, _q1, w);
  }
  // 월드 공간 델타 dq 를 bone 에 적용(부모 월드 기준으로 로컬 변환), w 만큼
  function rotateWorld(bone, dq, w) {
    bone.matrixWorld.decompose(_e, _q2, _f);
    _q3.copy(dq).multiply(_q2);                                      // 새 월드 회전
    if (bone.parent) { bone.parent.matrixWorld.decompose(_e, _q4, _f); _q4.invert(); _q3.premultiply(_q4); }
    bone.quaternion.slerp(_q3, w);
    bone.updateMatrixWorld(true);
  }
  // 2관절 IK: a(위팔/허벅지) → b(아래팔/종아리) → c(손/발). target 끝 위치, pole 무릎·팔꿈치가 향할 방향(포즈 공간 벡터).
  var _p0 = new T.Vector3(), _p1 = new T.Vector3(), _p2 = new T.Vector3(), _tg = new T.Vector3(), _ax = new T.Vector3(), _el = new T.Vector3();
  function ik2(a, b, c, target, pole, w) {
    if (!a || !b || !c || w <= 0) return;
    wpos(a, _p0); wpos(b, _p1); wpos(c, _p2);
    var la = _p0.distanceTo(_p1), lb = _p1.distanceTo(_p2);
    _tg.copy(target).sub(_p0);
    var d = clamp(_tg.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-4);
    _tg.normalize();
    var along = (la * la + d * d - lb * lb) / (2 * d), h = Math.sqrt(Math.max(0, la * la - along * along));
    _ax.copy(pole).addScaledVector(_tg, -pole.dot(_tg));
    if (_ax.lengthSq() < 1e-8) _ax.set(0, 0, 1).addScaledVector(_tg, -_tg.z);
    _ax.normalize();
    _el.copy(_p0).addScaledVector(_tg, along).addScaledVector(_ax, h);
    aim(a, b, _el, w);
    _el.copy(_p0).addScaledVector(_tg, d);
    aim(b, c, target, w);
  }
  // 손 방향: 손가락 방향 fdir(손목→가운데 손가락), 손바닥 법선 ndir 을 포즈 공간 벡터로 맞춘다.
  var _f0 = new T.Vector3(), _n0 = new T.Vector3(), _i1 = new T.Vector3(), _k1 = new T.Vector3(), _fd = new T.Vector3(), _nd = new T.Vector3();
  function orientHand(B, side, fdir, ndir, w) {
    var pre = side > 0 ? 'Right' : 'Left', hand = B[pre + 'Hand'], mid = B[pre + 'HandMiddle1'], idx = B[pre + 'HandIndex1'], pin = B[pre + 'HandPinky1'];
    if (!hand || !mid || !idx || !pin || w <= 0) return;
    wpos(hand, _a); wpos(mid, _f0); wpos(idx, _i1); wpos(pin, _k1);
    _f0.sub(_a).normalize();
    // 손바닥 법선: (검지→새끼 가로축) × 손가락 방향. 왼손·오른손 모두 손바닥 쪽을 가리키게 부호를 맞춘다.
    _n0.subVectors(_i1, _k1).cross(_f0).normalize(); if (side < 0) _n0.negate();
    _fd.copy(fdir).normalize(); _nd.copy(ndir).addScaledVector(_fd, -ndir.dot(_fd)).normalize();
    _q1.setFromUnitVectors(_f0, _fd);
    _n0.applyQuaternion(_q1).addScaledVector(_fd, -_n0.dot(_fd)).normalize();
    _q2.setFromUnitVectors(_n0, _nd);
    _q1.premultiply(_q2);
    rotateWorld(hand, _q1, w);
  }
  // 손가락 굽히기: 손의 가로축(검지 뿌리→새끼 뿌리) 둘레로 각 마디를 amt(rad) 만큼(엄지 제외).
  function curlFingers(B, side, amt) {
    if (Math.abs(amt) < 1e-3) return;
    var pre = side > 0 ? 'Right' : 'Left', idx = B[pre + 'HandIndex1'], pin = B[pre + 'HandPinky1'];
    if (!idx || !pin) return;
    wpos(idx, _i1); wpos(pin, _k1);
    _ax.subVectors(_k1, _i1).normalize(); if (side > 0) _ax.negate();
    var fs = ['Index', 'Middle', 'Ring', 'Pinky'];
    for (var f = 0; f < 4; f++) for (var k = 1; k <= 3; k++) {
      var b = B[pre + 'Hand' + fs[f] + k]; if (!b) continue;
      _q1.setFromAxisAngle(_ax, amt * (k === 1 ? 0.8 : 1));
      rotateWorld(b, _q1, 1);
    }
  }
  // 포즈 공간 축 둘레로 bone 을 angle 만큼(앞으로 숙이기 = +X 둘레 양수)
  function bend(bone, ax, ay, az, angle) {
    if (!bone || Math.abs(angle) < 1e-4) return;
    _ax.set(ax, ay, az); _q1.setFromAxisAngle(_ax, angle);
    rotateWorld(bone, _q1, 1);
  }

  // ------------------------------------------------------------------ 이름표·그림자(avatar.js 와 같은 모양)
  var VIEW = { on: false, c: { x: 0, y: 0, z: 0 }, f: { x: 0, y: 0, z: -1 }, h: 640, fov: 52 };
  function setView(cam, viewH) {
    var e = cam.matrixWorld.elements;
    VIEW.c.x = e[12]; VIEW.c.y = e[13]; VIEW.c.z = e[14]; VIEW.f.x = -e[8]; VIEW.f.y = -e[9]; VIEW.f.z = -e[10];
    VIEW.h = viewH; VIEW.fov = cam.fov; VIEW.on = true;
  }
  var shadowMat = null, shadowGeo = null;
  function getShadow() {
    if (shadowMat) return shadowMat;
    var c = root.document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(40,28,22,0.38)'); gr.addColorStop(0.55, 'rgba(40,28,22,0.18)'); gr.addColorStop(1, 'rgba(40,28,22,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    var t = new T.CanvasTexture(c);
    shadowMat = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    return shadowMat;
  }

  // ------------------------------------------------------------------ GlbAvatar
  var BASE = ['idle', 'walk', 'sit_down', 'sit_idle', 'stand_up', 'kneel_idle', 'bow'];
  var LOOP = { idle: 1, walk: 1, sit_idle: 1, kneel_idle: 1, pray: 1 };
  var uid = 0;
  var IDENT = new T.Matrix4();

  function palette() { return root.ChurchPalette || null; }
  function normCfg(cfg) { var A = root.ChurchAvatar; return A && A.normalizeCfg ? A.normalizeCfg(cfg) : (cfg || {}); }

  /** new GlbAvatar(cfg, {type: CharType|id, anims: AnimSet|id, self, showTag, headless, seat, kneel})
   *  type/anims 를 주지 않으면 카탈로그(ChurchGlb.setCatalog)에서 cfg(성별·옷)로 고른다. 미리 load 되어 있어야 한다(ChurchGlb.create 는 없으면 옛 아바타로 대신). */
  function GlbAvatar(cfg, opts) {
    opts = opts || {};
    this.id = ++uid;
    this.headless = !!opts.headless;
    this.root = new T.Group(); this.root.userData.avatar = true;
    this.body = new T.Group(); this.body.rotation.y = PI; this.root.add(this.body);
    this.shadow = null;
    if (!this.headless) { getShadow(); this.shadow = new T.Mesh(shadowGeo, shadowMat); this.shadow.scale.set(0.9, 1, 0.9); this.shadow.position.y = 0.03; this.shadow.renderOrder = 2; this.root.add(this.shadow); }
    this.tag = null; this.showTag = opts.showTag !== false && !this.headless; this.tagSelf = !!opts.self; this.tagY = 1.9; this.tagPx = 0; this.tagPpm = 0;
    this.seat = opts.seat || null; this.kneelSpot = null;
    // 상태(avatar.js 와 같은 이름: 다른 코드가 읽는다)
    this.walkTarget = 0; this.walkAmt = 0; this.sitTarget = 0; this.sitAmt = 0; this.prayTarget = 0; this.prayAmt = 0;
    this.kneelTarget = 0; this.kneelLin = 0; this.kneelAmt = 0; this.kneelFwd = 0; this.kneelY = 0; this.kneelRail = 0;
    this.emote = -1; this.emoteT = 0; this.nod = false; this.nodPh = Math.random() * 6; this.off = Math.random() * 6.28;
    this.base = 'stand'; this.trans = null; this.w = {}; this.lod = -1; this.acc = 0; this.cnt = this.id;
    this.pooled = null; this.cfg = null; this.key = ''; this.type = null; this.anims = null;
    this.reach = null;   // 촛불 봉헌 목표(포즈 공간). null 이면 몸 앞.
    this._opts = opts;
    this.setConfig(cfg);
    this.setLod(0);
  }
  var GP = GlbAvatar.prototype;
  GP.seatLift = 0.45;

  GP._build = function (type, anims) {
    this._teardown();
    this.type = type; this.anims = anims; type.users++;
    // 뼈대(포즈 공간; 장면 밖)
    var rig = this.rig = new T.Group(); rig.matrixAutoUpdate = true;
    rig.applyMatrix4(type.rigBase);
    var B = this.B = {}, list = [];
    type.rigNodes.forEach(function (n) {
      var b = new T.Bone(); b.name = n.name; b.position.copy(n.pos); b.quaternion.copy(n.quat); b.scale.copy(n.scale);
      (n.parent < 0 ? rig : list[n.parent]).add(b); list.push(b); B[n.name] = b;
    });
    this.boneList = list;
    rig.updateMatrixWorld(true);
    this.rest = list.map(function (b) { return b.quaternion.clone(); });
    this.hips0 = B.Hips.position.clone();
    // 믹서 출력(오버레이 전) 포즈. PropertyMixer 는 값이 지난 프레임과 같으면 다시 쓰지 않으므로(r149 PropertyMixer.apply),
    // 오버레이를 지울 때 휴식 자세가 아니라 이 포즈로 되돌려야 상수 트랙(정지한 팔 등)이 사라지지 않는다.
    this.pose = list.map(function (b) { return b.quaternion.clone(); });
    this.hipsPose = B.Hips.position.clone();
    // 뼈대 서명별 Skeleton(IBM 이 같은 LOD 끼리 공유)
    var self = this;
    this.skels = type.skelSigs.map(function (sg) { return new T.Skeleton(sg.bones.map(function (n) { return B[n]; }), sg.inv); });
    // 믹서
    this.mixer = new T.AnimationMixer(rig);
    this.actions = {};
    this.ratio = (type.meta.hipsY || 1) / (anims.restHipsY || 1);
    this.samplers = {};
    if (!this.headless) {
      var c = this.cfg, P = palette();
      this.mats = type.materials(P ? P.skin[c.skin] : null, P ? P.hair[c.hair] : null);
      this.meshes = type.lods.map(function (lod) {
        return lod.map(function (p) {
          var m = new T.SkinnedMesh(p.geometry, self.mats.map.get(p.material) || p.material);
          m.bindMode = 'detached'; m.bind(self.skels[p.sig], IDENT);
          m.castShadow = false; m.receiveShadow = true; m.visible = false; m.userData.sig = p.sig;
          self.body.add(m);
          return m;
        });
      });
    }
    this.w = {}; this.trans = null; this.base = 'stand';
    this._setW('idle', 1);
  };
  GP._teardown = function () {
    if (!this.type) return;
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.rig); }
    if (this.meshes) this.meshes.forEach(function (l) { l.forEach(function (m) { if (m.parent) m.parent.remove(m); }); });
    if (this.skels) this.skels.forEach(function (s) { s.dispose(); });
    if (this.mats) this.type.releaseMaterials(this.mats);
    this.type.users--;
    this.meshes = null; this.skels = null; this.mats = null; this.mixer = null; this.type = null;
  };
  GP.dispose = function () {
    this._unpool();
    this._teardown();
    if (this.root.parent) this.root.parent.remove(this.root);
  };

  GP.setConfig = function (cfg) {
    var c = normCfg(cfg), o = this._opts;
    var prevSkin = this.cfg && this.cfg.skin, prevHair = this.cfg && this.cfg.hair;
    this.cfg = c;
    this.key = c.g + '_' + c.skin + '_' + c.style + '_' + c.hair + '_' + c.outfit;
    var tid = o.type ? (typeof o.type === 'string' ? o.type : o.type.id) : typeFor(c);
    var aid = o.anims ? (typeof o.anims === 'string' ? o.anims : o.anims.id) : animsFor(c);
    var type = types[tid], anims = animSets[aid];
    if (!type || !anims) throw new Error('glb 캐릭터 미적재: ' + tid + '/' + aid);
    if (type !== this.type || anims !== this.anims) { var l = this.lod; this._build(type, anims); this.lod = -1; if (l >= 0) this.setLod(l); }
    else if (!this.headless && (prevSkin !== c.skin || prevHair !== c.hair)) {
      var P = palette(), old = this.mats, self = this;
      this.mats = type.materials(P ? P.skin[c.skin] : null, P ? P.hair[c.hair] : null);
      type.lods.forEach(function (lod, k) { lod.forEach(function (p, i) { self.meshes[k][i].material = self.mats.map.get(p.material) || p.material; }); });
      type.releaseMaterials(old);
    }
    if (this.showTag && root.ChurchAvatar && root.ChurchAvatar.tagMaterial) {
      if (!this.tag) { this.tag = new T.Sprite(root.ChurchAvatar.tagMaterial(c.name)); this.tag.scale.set(0.78, 0.195, 1); this.tag.renderOrder = 8; this.root.add(this.tag); this.tag.visible = this.lod <= 0; }
      else this.tag.material = root.ChurchAvatar.tagMaterial(c.name);
    }
  };
  // 거리별 단계: 0 근접(이름표 O), 1 중간, 2 원거리(공유 포즈 가능)
  GP.setLod = function (l) {
    if (l === this.lod || this.headless) { this.lod = l; return; }
    this.lod = l;
    for (var k = 0; k < 3; k++) for (var i = 0; i < this.meshes[k].length; i++) this.meshes[k][i].visible = k === l;
    if (this.tag) this.tag.visible = l === 0;
    if (this.shadow) this.shadow.visible = l < 2;
    if (l === 2 && CFG.sharePose) this._pool(); else this._unpool();
  };
  GP.setWalk = function (v) { this.walkTarget = v; };
  GP.setSeated = function (b) { this.sitTarget = b ? 1 : 0; };
  GP.setPray = function (b) { this.prayTarget = b ? 1 : 0; };
  // spot = ChurchLogic.kneelSpot(seatId): {fwd 좌석 중심에서 무릎까지 앞으로(m), y 무릎 받침 높이, rail 앞 등받이에 손 얹기}
  GP.setKneel = function (b, spot) {
    this.kneelTarget = b ? 1 : 0;
    if (b) { spot = spot || CFG.kneel; this.kneelFwd = spot.fwd; this.kneelY = spot.y; this.kneelRail = spot.rail ? 1 : 0; }
  };
  GP.kneelOffset = function () { return this.kneelAmt * this.sitAmt * this.kneelFwd; };
  GP.playEmote = function (e) { this.emote = e | 0; this.emoteT = 0; if (e === 2 && this.anims && this.anims.has('bow') && this.sitTarget === 0) this._play('bow'); };
  GP.setReach = function (v) { this.reach = v ? new T.Vector3(v.x, v.y, v.z) : null; };   // 촛불 봉헌 손 목표(포즈 공간: 앞 +Z, 발 기준)
  GP.setSeatGeom = function (s) { this.seat = s; };
  GP.setPose = function (x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; };
  GP.snapPose = function () {
    this.sitAmt = this.sitTarget; this.prayAmt = this.prayTarget; this.walkAmt = this.walkTarget; this.kneelLin = this.kneelTarget; this.kneelAmt = this.kneelTarget;
    this.trans = null;
    this.base = this.sitTarget ? (this.kneelTarget ? 'kneel' : 'sit') : 'stand';
    for (var k in this.w) this._setW(k, 0);
    this._setW(this.base === 'stand' ? 'idle' : (this.base === 'kneel' && this.anims.has('kneel_idle') ? 'kneel_idle' : 'sit_idle'), 1);
  };

  // ---- 믹서 가중치(직접 관리; 합이 1 이 되게 정규화)
  GP._action = function (name) {
    var a = this.actions[name];
    if (a !== undefined) return a;
    var clip = this.anims.clip(name, this.ratio);
    if (!clip) return (this.actions[name] = null);
    a = this.mixer.clipAction(clip);
    if (!LOOP[name]) { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; }
    a.weight = 0; a.enabled = false;
    return (this.actions[name] = a);
  };
  GP._setW = function (name, w) { this.w[name] = w; };
  GP._play = function (name, dur) {   // 한 번 재생하는 전환 클립(앉기·일어서기·절)
    var a = this._action(name); if (!a) return false;
    a.reset(); a.timeScale = dur ? Math.max(1, a.getClip().duration / dur) : 1; a.play();
    this.trans = { name: name, a: a };
    return true;
  };
  GP._mix = function (dt) {
    var tw = {}, k, tr = this.trans;
    // 상태 → 목표 가중치
    if (tr) {
      var a = tr.a, d = a.getClip().duration, u = a.time / d;
      tw[tr.name] = 1;
      tr.u = u;
      if (u >= 0.999 || !a.isRunning()) { this.trans = null; tr = null; }
      else if (u > 0.8) {   // 끝나기 전에 다음 상태로 섞기 시작
        var nx = this.base === 'stand' ? 'idle' : (this.base === 'kneel' && this.anims.has('kneel_idle') ? 'kneel_idle' : 'sit_idle');
        tw[nx] = (u - 0.8) / 0.2; tw[tr.name] = 1 - tw[nx];
      }
    }
    if (!tr) {
      if (this.base === 'stand') {
        var ww = sm(this.walkAmt * 4);
        tw.walk = this.anims.has('walk') ? ww : 0; tw.idle = 1 - tw.walk;
      } else if (this.base === 'kneel' && this.anims.has('kneel_idle')) tw.kneel_idle = 1;
      else tw.sit_idle = 1;
    }
    // 부드럽게 따라가기
    var rate = Math.min(1, dt * 8), sum = 0;
    for (k in tw) if (this.w[k] === undefined) this.w[k] = 0;
    for (k in this.w) { var t = tw[k] || 0; this.w[k] = tr && tw[k] !== undefined ? t : this.w[k] + (t - this.w[k]) * rate; if (this.w[k] < 0.002) this.w[k] = 0; sum += this.w[k]; }
    for (k in this.w) {
      var act = this._action(k); if (!act) continue;
      var wv = sum > 0 ? this.w[k] / sum : 0;
      if (wv > 0) { if (!act.enabled || !act.isRunning()) { act.enabled = true; if (LOOP[k]) { act.play(); } } act.setEffectiveWeight(wv); }
      else if (act.enabled) { act.enabled = false; act.stop(); }
    }
    // 걷기 속도 맞추기
    var walk = this.actions.walk;
    if (walk && walk.enabled) {
      var sp = (this.anims.meta.walk && this.anims.meta.walk.speed) ? this.anims.meta.walk.speed * this.ratio : 1.3;
      walk.timeScale = clamp(this.walkAmt * CFG.walkMax / sp, 0.5, 2.2);
    }
  };

  // ---- 상태 전환(목표가 바뀌면)
  GP._state = function () {
    var want = this.sitTarget ? (this.kneelTarget ? 'kneel' : 'sit') : 'stand';
    if (want === this.base) return;
    var from = this.base; this.base = want;
    if (want === 'sit' && from === 'stand') this._play('sit_down', CFG.sitDur);
    else if (want === 'stand' && from !== 'stand') this._play('stand_up', CFG.standDur);
    // 앉기 ↔ 무릎 꿇기는 클립 없이 섞고, 다리는 IK(오버레이)가 맡는다
  };

  GP.update = function (dt, t) {
    if (!this.type) return;
    // 공통 상태량(avatar.js 와 같은 속도)
    var k = Math.min(1, dt * 10);
    this.walkAmt += (this.walkTarget - this.walkAmt) * k;
    this.sitAmt += (this.sitTarget - this.sitAmt) * Math.min(1, dt * 7);
    this.prayAmt += (this.prayTarget - this.prayAmt) * Math.min(1, dt * 5);
    var kl = this.kneelLin, kt = this.kneelTarget;
    if (kl !== kt) { kl += (kt > kl ? 1 : -1) * dt / CFG.kneel.dur; this.kneelLin = kl = clamp01(kt > this.kneelLin ? Math.min(kl, kt) : Math.max(kl, kt)); this.kneelAmt = sm(kl); }
    if (this.emote >= 0) { this.emoteT += dt; if (this.emoteT >= EMOTE_DUR[this.emote]) this.emote = -1; }
    if (this.pooled) {   // 대표(머리 없는 아바타)가 포즈를 만든다. 상태가 바뀌면 다른 대표로 옮긴다.
      if (poseKey(this) !== this.pooled.key) this._pool();
      if (this.pooled) { this._placeExtras(); return; }
    }
    // LOD 별 갱신 간격(아바타마다 엇갈리게)
    var every = this.headless ? 1 : CFG.lodEvery[Math.max(0, this.lod)] || 1;
    this.acc += dt;
    if (every > 1 && ((++this.cnt) % every) !== 0) return;
    var step = this.acc; this.acc = 0;
    this._state();
    // 오버레이가 남긴 회전이 쌓이지 않게 지난 믹서 출력으로 되돌린 뒤 믹서가 (바뀐 트랙만) 덮는다
    var i, bl = this.boneList;
    for (i = 0; i < bl.length; i++) bl[i].quaternion.copy(this.pose[i]);
    this.B.Hips.position.copy(this.hipsPose);
    this._mix(step);
    this.mixer.update(step);
    for (i = 0; i < bl.length; i++) this.pose[i].copy(bl[i].quaternion);
    this.hipsPose.copy(this.B.Hips.position);
    this.rig.updateMatrixWorld(true);
    this._overlay(t, this.headless || this.lod < 2);
    this._placeExtras();
  };

  // ---- 절차 오버레이
  var _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _v4 = new T.Vector3(), _pole = new T.Vector3();
  var CROSS = [   // 성호 경로: [목표 기준 뼈, 오프셋(x,y,z × 키 비율), 손가락 방향, 손바닥 방향]  (포즈 공간: +X 왼쪽, +Z 앞)
    ['Head', [0.0, 0.02, 0.15], [0, 0.88, -0.48], [0, -0.48, -0.88]],
    ['Spine2', [-0.02, -0.12, 0.19], [0.25, 0.9, 0.1], [0, 0.1, -1]],
    ['LeftArm', [-0.055, -0.06, 0.16], [0.95, 0.3, 0.0], [0, 0.05, -1]],
    ['RightArm', [0.045, -0.05, 0.16], [-0.95, 0.3, 0.0], [0, 0.05, -1]]
  ];
  GP._overlay = function (t, full) {
    var B = this.B, s = this.type.s, meta = this.type.meta;
    var sa = this.sitAmt, ka = this.kneelAmt * sa, pa = this.prayAmt;
    var seat = this.seat || CFG.seat;
    var tr = this.trans, fit = sa;
    if (tr && (tr.name === 'sit_down' || tr.name === 'stand_up')) fit = tr.name === 'sit_down' ? sm(tr.u / 0.85) : 1 - sm(tr.u / 0.6);
    // 1) 앉기 정합: 골반을 좌석 위(높이 = 좌석 + 앉은 살두께, 뒤로 back)로, 발은 바닥에
    var hips = B.Hips;
    if (fit > 0.001 && ka < 0.999) {
      var w = fit * (1 - ka);
      var hy = seat.h + (meta.seatDrop || 0.12) + ((meta.hipsY || 1) - (meta.hipJointY || meta.hipsY || 1));
      _v1.set(hips.position.x, hy, -seat.back);
      // 발목 원위치(클립)를 기억해 두고 골반을 옮긴 뒤 다시 디딘다
      var fl = B.LeftFoot, fr = B.RightFoot, ay = meta.ankleY || 0.08;
      if (fl) { wpos(fl, _v2); _v2.y = lerp(_v2.y, ay, w); }
      if (fr) { wpos(fr, _v3); _v3.y = lerp(_v3.y, ay, w); }
      hips.position.lerp(_v1, w); hips.updateMatrixWorld(true);
      if (full) {
        _pole.set(0, 0, 1);
        if (fl) ik2(B.LeftUpLeg, B.LeftLeg, fl, _v2, _pole, 1);
        if (fr) ik2(B.RightUpLeg, B.RightLeg, fr, _v3, _pole, 1);
      }
    }
    // 2) 무릎 꿇기: 무릎을 받침 위에, 허벅지 거의 수직, 정강이는 뒤로 눕고 발목은 바닥
    if (ka > 0.001) {
      var thigh = meta.thigh || 0.42 * s, shin = meta.shin || 0.42 * s, kf = meta.kneeFront || 0.05, ayk = meta.ankleY || 0.08;
      var kneeY = this.kneelY + kf, th = CFG.kneel.thigh;
      var hipJ = kneeY + thigh * Math.cos(th), kz = this.kneelFwd;
      var off = (meta.hipsY || 1) - (meta.hipJointY || meta.hipsY || 1);
      _v1.set(hips.position.x, hipJ + off, kz - thigh * Math.sin(th));
      hips.position.lerp(_v1, ka); hips.updateMatrixWorld(true);
      if (full) for (var sd = -1; sd <= 1; sd += 2) {
        var pre = sd > 0 ? 'Right' : 'Left', up = B[pre + 'UpLeg'], kn = B[pre + 'Leg'], ft = B[pre + 'Foot'], toe = B[pre + 'ToeBase'];
        if (!up || !kn || !ft) continue;
        wpos(up, _v2);
        _v3.set(_v2.x, kneeY, kz);
        aim(up, kn, _v3, ka);
        var dy = Math.max(0, kneeY - ayk), dz = Math.sqrt(Math.max(0, shin * shin - dy * dy));
        wpos(kn, _v3); _v4.set(_v3.x, ayk, _v3.z - dz);
        aim(kn, ft, _v4, ka);
        if (toe) { wpos(ft, _v3); _v4.set(_v3.x, Math.max(0.02, ayk - 0.05), _v3.z - 0.15 * s); aim(ft, toe, _v4, ka); }
      }
    }
    if (!full) return;
    // 3) 기도: 클립(윗몸만) 또는 절차(두 손을 가슴 앞에 모음). 무릎 꿇고 앞 등받이가 있으면 손을 그 윗단에.
    var A = this.anims;
    if (pa > 0.001) {
      if (A.has('pray')) this._sample('pray', t, pa);
      else {
        var ch = B.Spine2; wpos(ch, _v1);
        var kr = ka * this.kneelRail;
        _v1.y += lerp(-0.08, -0.14, kr) * s; _v1.z += lerp(0.21, 0.36, kr) * s;
        bend(B.Neck, 1, 0, 0, 0.20 * pa); bend(B.Head, 1, 0, 0, 0.26 * pa);
        if (this.nod && pa > 0.5) { var p2 = Math.sin(t * 0.55 + this.nodPh); if (p2 > 0.93) bend(B.Head, 1, 0, 0, (p2 - 0.93) * 2.4); }
        for (var sd2 = -1; sd2 <= 1; sd2 += 2) {
          var pr = sd2 > 0 ? 'Right' : 'Left';
          _v2.copy(_v1); _v2.x += -sd2 * 0.012 * s;   // 오른손(sd=+1)은 -X 쪽
          _pole.set(-sd2 * 0.55, -1, -0.35);
          ik2(B[pr + 'Arm'], B[pr + 'ForeArm'], B[pr + 'Hand'], _v2, _pole, pa);
          _v3.set(0, 0.72, 0.69); _v4.set(sd2, 0, 0);   // 손가락 위·앞, 손바닥은 맞은편 손 쪽
          orientHand(B, sd2, _v3, _v4, pa);
        }
      }
    }
    // 4) 이모트
    if (this.emote >= 0) {
      var eU = this.emoteT / EMOTE_DUR[this.emote], env = Math.min(sm(eU / 0.12), sm((1 - eU) / 0.12));
      if (this.emote === 0) {
        if (A.has('wave') && sa < 0.5) this._sample('wave', this.emoteT, env);
        else {
          wpos(B.RightArm, _v1); _v1.x -= 0.14 * s; _v1.y += 0.32 * s; _v1.z += 0.10 * s;
          _pole.set(-0.9, -0.8, -0.3); ik2(B.RightArm, B.RightForeArm, B.RightHand, _v1, _pole, env);
          var wv = Math.sin(this.emoteT * 11) * 0.38;
          _v3.set(-Math.sin(wv), Math.cos(wv), 0.22); _v4.set(0, 0, 1); orientHand(B, 1, _v3, _v4, env);
        }
      } else if (this.emote === 1) {
        var u = clamp((eU - 0.12) / 0.76, 0, 0.999) * 4, ix = Math.floor(u), f = sm(u - ix);
        var Ak = CROSS[Math.min(3, ix)], Bk = CROSS[Math.min(3, ix + 1)];
        this._crossPt(Ak, _v1); this._crossPt(Bk, _v2); _v1.lerp(_v2, f);
        _pole.set(-0.6, -1, -0.3); ik2(B.RightArm, B.RightForeArm, B.RightHand, _v1, _pole, env);
        _v3.fromArray(Ak[2]).lerp(_v2.fromArray(Bk[2]), f); _v4.fromArray(Ak[3]).lerp(_v2.fromArray(Bk[3]), f);
        orientHand(B, 1, _v3, _v4, env);
      } else if (this.emote === 2) {
        if (!(this.actions.bow && this.trans && this.trans.name === 'bow')) {
          var bw = Math.sin(eU * PI);
          bend(B.Spine, 1, 0, 0, 0.30 * bw * (1 - sa * 0.5)); bend(B.Spine1, 1, 0, 0, 0.15 * bw); bend(B.Neck, 1, 0, 0, 0.12 * bw); bend(B.Head, 1, 0, 0, 0.10 * bw);
        }
      } else if (this.emote === 3) {
        // 촛불 봉헌: 오른손을 앞으로 뻗어 초를 꽂고(손가락 쥐기) 돌아온다
        var rr = Math.sin(clamp01(eU / 0.9) * PI);
        if (this.reach) _v1.copy(this.reach); else { wpos(B.Spine2, _v1); _v1.x -= 0.06 * s; _v1.y -= 0.22 * s; _v1.z += 0.42 * s; }
        bend(B.Spine, 1, 0, 0, 0.14 * rr);
        _pole.set(-0.5, -1, -0.2); ik2(B.RightArm, B.RightForeArm, B.RightHand, _v1, _pole, env * sm(rr * 1.5));
        _v3.set(-0.1, 0.1, 1); _v4.set(1, 0, 0); orientHand(B, 1, _v3, _v4, env * rr);
        curlFingers(B, 1, 0.9 * env);
      }
    }
  };
  GP._crossPt = function (row, out) {
    var b = this.B[row[0]], s = this.type.s; wpos(b, out);
    out.x += row[1][0] * s; out.y += row[1][1] * s; out.z += row[1][2] * s;
    return out;
  };
  GP._sample = function (name, t, w) {
    var sp = this.samplers[name];
    if (sp === undefined) { var c = this.anims.clip(name, 1); sp = this.samplers[name] = c ? new Sampler(c) : null; }
    if (!sp) return;
    var d = sp.clip.duration || 1;
    sp.apply(this.B, LOOP[name] ? t % d : Math.min(t, d), w);
    this.rig.updateMatrixWorld(true);
  };
  // 이름표·그림자 위치(포즈 공간 → root 로컬: x,z 부호 반전)
  GP._placeExtras = function () {
    if (this.headless) return;
    var src = this.pooled ? this.pooled.B : this.B;
    var h = src.Hips, hd = src.Head;
    if (this.shadow) { this.shadow.position.set(-h.matrixWorld.elements[12], 0.03, -h.matrixWorld.elements[14]); }
    if (!this.tag) return;
    var ty = hd ? hd.matrixWorld.elements[13] + CFG.tagLift * this.type.s : 1.9;
    this.tagY = ty;
    this.tag.position.set(-h.matrixWorld.elements[12], ty, -h.matrixWorld.elements[14]);
    var LF = root.ChurchLabelFit;
    if (LF && VIEW.on && this.lod === 0) {
      var pr = LF.PRESETS[this.tagSelf ? 'self' : 'peer'], rp = this.root.position;
      var dep = LF.depthOf(VIEW.c, VIEW.f, rp.x, rp.y + ty, rp.z);
      if (dep > 0.1) {
        var ff = LF.farFade(dep, pr), fh = LF.fit(dep, VIEW.h, VIEW.fov, pr).h * (0.75 + 0.25 * ff);
        this.tag.visible = ff > 0;
        this.tag.scale.set(fh * (0.78 / 0.195), fh, 1);
        this.tag.position.y = ty + LF.anchorLift(fh, pr);
        this.tagPpm = LF.pxPerMeter(dep, VIEW.h, VIEW.fov);
        this.tagPx = fh * pr.pill * this.tagPpm;
      }
    }
  };

  // ---- 포즈 공유(LOD2): 같은 (캐릭터·동작 묶음·상태·무릎 자리) 끼리 머리 없는 대표 1명의 뼈대에 묶는다
  var pools = {};
  function poseKey(a) {
    var st = a.sitTarget ? (a.kneelTarget ? 'k' + a.kneelFwd.toFixed(2) + '_' + a.kneelY.toFixed(2) + (a.kneelRail ? 'r' : '') : 's') + (a.prayTarget ? 'p' : '') : (a.walkTarget > 0.05 ? 'w' : 'i');
    var se = a.seat || CFG.seat;
    return a.type.id + '|' + a.anims.id + '|' + st + '|' + se.h + '_' + se.back;
  }
  GP._pool = function () {
    if (this.headless || !this.type) return;
    var key = poseKey(this);
    if (this.pooled && this.pooled.key === key) return;
    this._unpool();
    var p = pools[key];
    if (!p) {
      var h = new GlbAvatar(this.cfg, { type: this.type, anims: this.anims, headless: true, seat: this.seat });
      h.setSeated(!!this.sitTarget); h.setPray(!!this.prayTarget); h.setWalk(this.walkTarget);
      if (this.kneelTarget) h.setKneel(true, { fwd: this.kneelFwd, y: this.kneelY, rail: !!this.kneelRail });
      h.snapPose();
      p = pools[key] = { key: key, av: h, B: h.B, users: 0, frame: -1 };
    }
    p.users++;
    this.pooled = p;
    var self = this;
    this.meshes[2].forEach(function (m) { m.bind(p.av.skels[m.userData.sig], IDENT); });
    void self;   // (self 는 아래 _unpool 과 대칭)
  };
  GP._unpool = function () {
    var p = this.pooled; if (!p) return;
    this.pooled = null;
    var self = this;
    if (this.meshes) this.meshes[2].forEach(function (m) { m.bind(self.skels[m.userData.sig], IDENT); });
    if (--p.users <= 0) { p.av.dispose(); delete pools[p.key]; }
  };
  // 포즈 공유 대표들을 갱신한다. 매 프레임 한 번 부른다(아바타 update 와 같은 dt).
  function tick(dt, t) {
    for (var k in pools) pools[k].av.update(dt, t);
  }

  // ------------------------------------------------------------------ 카탈로그·공개 API
  // catalog: {F: ['F01', ...], M: ['M01', ...], anims: {F: 'anims_F', M: 'anims_M'}}  — cfg.g(0 여성, 1 남성) + cfg.outfit 으로 고른다.
  var catalog = { F: [], M: [], anims: { F: 'anims', M: 'anims' } };
  function typeFor(c) { var l = c.g === 1 ? catalog.M : catalog.F; if (!l.length) l = catalog.F.length ? catalog.F : catalog.M; return l.length ? l[(c.outfit | 0) % l.length] : null; }
  function animsFor(c) { return c.g === 1 ? catalog.anims.M : catalog.anims.F; }
  function load(id, opts) {
    if (types[id]) return Promise.resolve(types[id]);
    if (pending[id]) return pending[id];
    return (pending[id] = source(id, opts).then(parseGlb).then(function (g) { var ct = new CharType(id, g); return ct.ready.then(function () { delete pending[id]; return (types[id] = ct); }); }));
  }
  function loadAnims(id, opts) {
    if (animSets[id]) return Promise.resolve(animSets[id]);
    if (pending['a:' + id]) return pending['a:' + id];
    return (pending['a:' + id] = source(id, opts).then(parseGlb).then(function (g) { delete pending['a:' + id]; return (animSets[id] = new AnimSet(id, g)); }));
  }
  function available(cfg) { var c = normCfg(cfg), t = typeFor(c), a = animsFor(c); return !!(t && types[t] && animSets[a]); }
  /** 적재된 glb 캐릭터가 있으면 GlbAvatar, 없으면 옛 코드 아바타(ChurchAvatar.Avatar) — 불러오기 실패 시 대체 */
  function create(cfg, opts) {
    if (available(cfg)) { try { return new GlbAvatar(cfg, opts); } catch (e) { if (root.console) root.console.warn('GlbAvatar', e); } }
    return root.ChurchAvatar ? new root.ChurchAvatar.Avatar(cfg, opts) : null;
  }
  function stats() {
    var out = { types: {}, anims: Object.keys(animSets), pools: Object.keys(pools).length };
    for (var k in types) out.types[k] = { lods: types[k].lods.map(function (l) { return l.reduce(function (s, p) { return s + (p.geometry.index ? p.geometry.index.count / 3 : 0); }, 0); }), bones: types[k].skelSigs[0] ? types[k].skelSigs[0].bones.length : 0, users: types[k].users, mats: Object.keys(types[k].matCache).length };
    return out;
  }

  root.ChurchGlb = {
    GlbAvatar: GlbAvatar, CharType: CharType, AnimSet: AnimSet,
    load: load, loadAnims: loadAnims, create: create, available: available, tick: tick, setView: setView, stats: stats,
    setCatalog: function (c) { catalog = { F: c.F || [], M: c.M || [], anims: c.anims || { F: 'anims', M: 'anims' } }; },
    types: types, animSets: animSets, CFG: CFG, EMOTE_DUR: EMOTE_DUR,
    _dbg: { aim: aim, ik2: ik2, orientHand: orientHand, curlFingers: curlFingers, pools: pools, b64ToBuf: b64ToBuf }
  };
})(typeof window !== 'undefined' ? window : this);
