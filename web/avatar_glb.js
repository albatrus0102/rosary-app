/* avatar_glb.js — GLB 사람(소유자가 이미지→3D 서비스에서 「휴머노이드 자동 리깅」으로 받은 몸)을 지금 아바타 뼈대로 움직인다(리타깃).
   - 동작은 하나도 새로 만들지 않는다: avatar.js 가 하던 걷기·앉기·읽기·컵 들기·인사를 우리 뼈 18개가 그대로 하고,
     매 프레임 그 회전을 GLB 의 같은 이름 뼈에 옮긴다(휴식 자세가 T 자·A 자여도 뼈 방향 맞춤 회전으로 맞춘다). 골반은 위치도 옮긴다.
   - 이름: Mixamo 형(Hips, Spine, Spine2, Neck, Head, LeftArm, LeftForeArm, LeftHand, LeftUpLeg, LeftLeg, LeftFoot …, 'mixamorig:' 등 머리말 무시)과
     Meshy·Tripo 의 흔한 변형(spine01/02, neck_01, upperarm_l 등). 못 찾은 뼈는 휴식 자세 그대로(부모를 따라간다).
   - 쓰는 법: <script src="three_glb.js"> 다음 이 파일. RoomGlb.setPack({0:'avatar/glb/F1.glb', …}) — 번호마다 GLB 를 주면
     그 번호 아바타는 반실사 몸 대신 GLB 를 입는다(못 읽으면 반실사 몸 그대로). 한 GLB 를 여러 사람이 쓰면 뼈대째 복제한다(SkeletonUtils).
   - 크기: GLB 의 골반 높이를 우리 골반(0.93 m)에 맞춘다. 앞: GLB 는 보통 +Z 를 보므로 180° 돌린다(opts.faceZ = -1 이면 돌리지 않는다). */
(function (root) {
  'use strict';
  var T = root.THREE; if (!T) return;
  var OURS = ['hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'haL', 'uaR', 'faR', 'haR', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR'];
  var OUR_I = { hips: 1, spine: 2, chest: 3, neck: 4, head: 5, uaL: 6, faL: 7, haL: 8, uaR: 9, faR: 10, haR: 11, ulL: 12, llL: 13, ftL: 14, ulR: 15, llR: 16, ftR: 17 };
  var OUR_CHILD = { hips: 'spine', spine: 'chest', chest: 'neck', neck: 'head', uaL: 'faL', faL: 'haL', uaR: 'faR', faR: 'haR', ulL: 'llL', llL: 'ftL', ulR: 'llR', llR: 'ftR' };
  // 우리 뼈 → GLB 이름 후보(소문자, 머리말·구분자 뺀 꼴)
  var ALIAS = {
    hips: ['hips', 'pelvis', 'hip', 'root'], spine: ['spine', 'spine01', 'spine1'], chest: ['spine2', 'spine02', 'chest', 'spine03', 'upperchest'], neck: ['neck', 'neck01'], head: ['head'],
    uaL: ['leftarm', 'upperarml', 'larm', 'leftupperarm'], faL: ['leftforearm', 'lowerarml', 'lforearm', 'leftlowerarm'], haL: ['lefthand', 'handl', 'lhand'],
    uaR: ['rightarm', 'upperarmr', 'rarm', 'rightupperarm'], faR: ['rightforearm', 'lowerarmr', 'rforearm', 'rightlowerarm'], haR: ['righthand', 'handr', 'rhand'],
    ulL: ['leftupleg', 'thighl', 'leftthigh', 'leftupperleg'], llL: ['leftleg', 'calfl', 'leftshin', 'leftlowerleg'], ftL: ['leftfoot', 'footl', 'lfoot'],
    ulR: ['rightupleg', 'thighr', 'rightthigh', 'rightupperleg'], llR: ['rightleg', 'calfr', 'rightshin', 'rightlowerleg'], ftR: ['rightfoot', 'footr', 'rfoot']
  };
  function norm(n) { return String(n || '').toLowerCase().replace(/^.*[:|]/, '').replace(/^mixamorig/, '').replace(/[^a-z0-9]/g, '').replace(/^(armature|skeleton)/, ''); }
  function findBones(obj) {
    var all = {}, out = {};
    obj.traverse(function (o) { if (o.isBone) all[norm(o.name)] = o; });
    OURS.forEach(function (k) { for (var i = 0; i < ALIAS[k].length; i++) if (all[ALIAS[k][i]]) { out[k] = all[ALIAS[k][i]]; break; } });
    return out;
  }
  var _m = new T.Matrix4(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3(), _s = new T.Vector3();
  function qOf(m, out) { m.decompose(_v, out, _s); return out; }

  /** avatar(RoomAvatar.Avatar)에 GLB 장면(gltf.scene 또는 그 복제)을 입힌다. 돌려줌: {sync(), dispose(), bones, scale} */
  function attach(av, scene, opts) {
    opts = opts || {};
    var G = new T.Group(); G.name = 'glbRoot';
    G.add(scene);
    if (opts.faceZ !== -1) G.rotation.y = Math.PI;
    av.body.add(G);
    var bones = findBones(scene);
    if (!bones.hips) { av.body.remove(G); return null; }
    // 크기: 골반 높이를 0.93 에 — 휴식 자세에서 잰다
    G.updateMatrixWorld(true); av.body.updateMatrixWorld(true);
    var bodyInv = new T.Matrix4().copy(av.body.matrixWorld).invert();
    _m.multiplyMatrices(bodyInv, bones.hips.matrixWorld); _v.setFromMatrixPosition(_m);
    var feet = 0; ['ftL', 'ftR'].forEach(function (k) { if (bones[k]) { _m.multiplyMatrices(bodyInv, bones[k].matrixWorld); feet += new T.Vector3().setFromMatrixPosition(_m).y / 2; } });
    var sc = opts.scale || (0.93 - 0.08) / Math.max(0.05, _v.y - feet);
    G.scale.setScalar(sc);
    G.position.y = -(feet * sc - 0.08 * 1);
    G.updateMatrixWorld(true);
    bodyInv.copy(av.body.matrixWorld).invert();
    // 뼈마다: 휴식 세계 회전(몸 공간) + 방향 맞춤 A(GLB 뼈 방향 → 우리 뼈 방향)
    var rig = {};
    var BABS = av.bones.map(function (b) { b.updateMatrixWorld(true); _m.multiplyMatrices(bodyInv, b.matrixWorld); return new T.Vector3().setFromMatrixPosition(_m); });
    OURS.forEach(function (k) {
      var gb = bones[k]; if (!gb) return;
      _m.multiplyMatrices(bodyInv, gb.matrixWorld);
      var rest = qOf(_m, new T.Quaternion()), A = new T.Quaternion();
      var ck = OUR_CHILD[k];
      if (ck && bones[ck]) {
        var p0 = new T.Vector3().setFromMatrixPosition(_m), p1 = new T.Vector3().setFromMatrixPosition(_m.clone().multiplyMatrices(bodyInv, bones[ck].matrixWorld));
        var dg = p1.sub(p0).normalize(), dO = BABS[OUR_I[ck]].clone().sub(BABS[OUR_I[k]]).normalize();
        A.setFromUnitVectors(dg, dO);
      }
      rig[k] = { gb: gb, rest: rest, A: A };
    });
    // 뼈를 부모 먼저 순서로
    var order = OURS.filter(function (k) { return rig[k]; }).sort(function (a, b) { return depth(rig[a].gb) - depth(rig[b].gb); });
    function depth(o) { var d = 0; while (o.parent) { d++; o = o.parent; } return d; }
    var hipsRest0 = BABS[OUR_I.hips].clone(), glbHips0 = new T.Vector3().setFromMatrixPosition(new T.Matrix4().multiplyMatrices(bodyInv, bones.hips.matrixWorld));
    var api = {
      bones: bones, scale: sc, group: G,
      sync: function () {
        av.body.updateMatrixWorld(true);
        bodyInv.copy(av.body.matrixWorld).invert();
        for (var i = 0; i < order.length; i++) {
          var k = order[i], R = rig[k], ob = av.bones[OUR_I[k]];
          _m.multiplyMatrices(bodyInv, ob.matrixWorld); qOf(_m, _q);           // 우리 뼈의 지금 회전(몸 공간; 휴식 = 단위)
          _q.multiply(R.A).multiply(R.rest);                                     // 원하는 GLB 뼈 회전(몸 공간)
          var par = R.gb.parent; par.updateMatrixWorld(true);
          _m.multiplyMatrices(bodyInv, par.matrixWorld); qOf(_m, _q2);
          R.gb.quaternion.copy(_q2.invert().multiply(_q));
          if (k === 'hips') {
            // 골반 이동: 우리 골반이 휴식에서 옮긴 만큼(몸 공간, m)을 GLB 골반 휴식 자리에 더해 부모 공간으로
            _m.multiplyMatrices(bodyInv, ob.matrixWorld); _v.setFromMatrixPosition(_m).sub(hipsRest0).add(glbHips0);
            _m.multiplyMatrices(bodyInv, par.matrixWorld).invert(); R.gb.position.copy(_v.applyMatrix4(_m));
          }
          R.gb.updateMatrixWorld(true);
        }
      },
      dispose: function () { if (G.parent) G.parent.remove(G); }
    };
    return api;
  }

  // ---- 번호별 GLB 묶음(선택): setPack({n: url}) → 그 번호 아바타는 GLB 를 입는다 ----
  var pack = {}, cache = {};
  function loadGLB(url) {
    if (cache[url]) return cache[url];
    var X = root.ThreeGLB;
    cache[url] = !X || !X.GLTFLoader ? Promise.reject(new Error('three_glb.js (GLTFLoader) missing')) : new Promise(function (res, rej) { new X.GLTFLoader().load(url, res, undefined, rej); });
    return cache[url];
  }
  function cloneScene(gltf) { var X = root.ThreeGLB; return X && X.cloneSkinned ? X.cloneSkinned(gltf.scene) : gltf.scene.clone(true); }
  // avatar.js 가 부른다: 그 번호에 GLB 가 있으면 입히고 true(비동기 — 다 읽으면 반실사 몸을 숨긴다)
  function dress(av, n) {
    var url = pack[n]; if (!url) return false;
    if (av._glbN === n) return true;
    av._glbN = n;
    loadGLB(url).then(function (gltf) {
      if (av._glbN !== n) return;
      if (av.glb) av.glb.dispose();
      var sc = cloneScene(gltf);
      sc.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      av.glb = attach(av, sc, {});
      if (av.glb && av._applyGeom) { av._applyGeom(); }
    }, function (e) { if (root.console) console.warn('[glb] ' + url + ' ' + (e && e.message || e)); av._glbN = -1; });
    return true;
  }
  root.RoomGlb = { attach: attach, findBones: findBones, norm: norm, ALIAS: ALIAS, dress: dress, load: loadGLB,
    setPack: function (o) { pack = {}; for (var k in (o || {})) if (o[k]) pack[+k] = String(o[k]); }, pack: function () { return pack; } };
})(typeof window !== 'undefined' ? window : this);
