/* avatar.js — 귀여운 큰 머리 저폴리 아바타 (크림 후드 스타일), 애니메이션, 이름표, 블롭 그림자 */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, Geo = G.Geo, P = root.ChurchPalette;
  var PI = Math.PI;

  var HIP = 0.36, NECK = 0.88, HEAD_R = 0.37;
  var PANTS = 0x6b5446;
  var mat = new T.MeshLambertMaterial({ vertexColors: true });
  var geoCache = {};

  function sphereCap(thetaLen, w, h) { return new T.SphereGeometry(1, w, h, 0, PI * 2, 0, thetaLen); }

  function buildHead(cfg) {
    var b = new G.Batch(5 + cfg.hair);
    var skin = P.skin[cfg.skin], hairC = P.hair[cfg.hair];
    var R = HEAD_R;
    var dark = new T.Color(hairC).multiplyScalar(0.85).getHex();
    // 머리(피부)
    b.add(Geo.sph(18, 14), skin, { sx: R, sy: R * 0.97, sz: R, vary: 0 });
    // 귀
    [-1, 1].forEach(function (s) { b.add(Geo.sph(8, 6), skin, { x: s * R * 0.97, y: -0.03, z: 0.02, sx: 0.07, sy: 0.085, sz: 0.06, vary: 0 }); });
    // 눈(검은 타원 + 하이라이트)
    [-1, 1].forEach(function (s) {
      var ex = s * 0.135, ey = 0.0;
      var ez = -Math.sqrt(Math.max(0.01, R * R - ex * ex - ey * ey)) + 0.004;
      b.add(Geo.sph(10, 8), 0x2a2220, { x: ex, y: ey, z: ez, sx: 0.052, sy: 0.066, sz: 0.03, vary: 0 });
      b.add(Geo.sph(6, 5), 0xffffff, { x: ex + 0.016, y: ey + 0.026, z: ez - 0.014, sx: 0.02, sy: 0.02, sz: 0.012, vary: 0 });
      b.add(Geo.sph(6, 5), 0xffffff, { x: ex - 0.014, y: ey - 0.02, z: ez - 0.012, sx: 0.009, sy: 0.009, sz: 0.007, vary: 0 });
      // 볼
      var cx = s * 0.225, cy = -0.095;
      var cz = -Math.sqrt(Math.max(0.01, R * R - cx * cx - cy * cy)) + 0.012;
      b.add(Geo.sph(8, 6), 0xff9fb0, { x: cx, y: cy, z: cz, sx: 0.065, sy: 0.04, sz: 0.02, vary: 0 });
    });
    // 코
    b.add(Geo.sph(6, 5), new T.Color(skin).multiplyScalar(0.92).getHex(), { x: 0, y: -0.055, z: -R + 0.005, sx: 0.022, sy: 0.018, sz: 0.018, vary: 0 });
    // 입(작은 곡선)
    b.add(Geo.sph(6, 4), 0xc9736f, { x: 0, y: -0.125, z: -R * 0.955, sx: 0.034, sy: 0.011, sz: 0.01, vary: 0 });
    // 머리카락 (각진 패싯)
    var style = cfg.style;
    var capScale = style === 3 ? 1.16 : 1.065;
    b.add(sphereCap(1.95, 9, 6), hairC, { y: 0.0, z: 0.015, rx: 0.5, sx: R * capScale, sy: R * capScale, sz: R * capScale, flat: true, vary: 0.05, c2: dark });
    // 앞머리 몇 가닥
    [[-0.15, 0.2], [0.0, 0.215], [0.14, 0.2]].forEach(function (f, i) {
      b.add(Geo.ico(0), hairC, { x: f[0], y: f[1] + 0.05, z: -R * 0.9, sx: 0.12, sy: 0.075, sz: 0.06, ry: (i - 1) * 0.3, rz: (i - 1) * -0.3, flat: true, vary: 0.05 });
    });
    if (style === 0) {
      b.add(Geo.cyl(5, 0.15), hairC, { x: 0.03, y: R * 0.98, z: 0.04, sx: 0.045, sy: 0.14, sz: 0.045, rz: -0.35, rx: 0.25, flat: true, vary: 0 });
      [-1, 1].forEach(function (s) { b.add(Geo.ico(0), hairC, { x: s * R * 0.95, y: 0.02, z: -0.02, sx: 0.07, sy: 0.13, sz: 0.1, flat: true, vary: 0.05 }); });
    } else if (style === 1) {
      b.add(Geo.sph(10, 8), hairC, { x: 0, y: -0.07, z: 0.08, sx: R * 1.1, sy: R * 0.88, sz: R * 1.0, flat: true, vary: 0.05 });
      [-1, 1].forEach(function (s) { b.add(Geo.ico(1), hairC, { x: s * R * 0.98, y: -0.1, z: -0.05, sx: 0.085, sy: 0.2, sz: 0.12, flat: true, vary: 0.05 }); });
    } else if (style === 2) {
      b.add(Geo.ico(1), hairC, { x: 0, y: R * 1.08, z: 0.09, r: 0.15, sx: 0.16, sy: 0.15, sz: 0.16, flat: true, vary: 0 });
      b.add(Geo.cyl(8, 1), 0xe58aa8, { x: 0, y: R * 0.98, z: 0.05, sx: 0.1, sy: 0.03, sz: 0.1, flat: true, vary: 0 });
      [-1, 1].forEach(function (s) { b.add(Geo.ico(0), hairC, { x: s * R * 0.95, y: 0.02, z: -0.02, sx: 0.07, sy: 0.12, sz: 0.1, flat: true, vary: 0.05 }); });
    } else {
      var rr = G.rng(3);
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * PI * 2;
        b.add(Geo.ico(1), hairC, { x: Math.cos(a) * R * 1.02, y: R * 0.35 + Math.sin(i * 2.1) * 0.07, z: Math.sin(a) * R * 1.02 + 0.03, r: 0.13 + rr() * 0.03, flat: true, vary: 0.06 });
      }
      b.add(Geo.ico(1), hairC, { x: 0, y: R * 1.02, z: 0.0, r: 0.2, flat: true, vary: 0.04 });
      b.add(Geo.ico(1), hairC, { x: 0.12, y: R * 0.98, z: 0.1, r: 0.15, flat: true, vary: 0.04 });
      b.add(Geo.ico(1), hairC, { x: -0.12, y: R * 0.98, z: 0.1, r: 0.15, flat: true, vary: 0.04 });
    }
    return b;
  }
  function buildTorso(cfg) {
    var oc = P.outfit[cfg.outfit], b = new G.Batch(9 + cfg.outfit);
    var light = new T.Color(oc).multiplyScalar(1.06).getHex(), shade = new T.Color(oc).multiplyScalar(0.9).getHex();
    b.add(Geo.cyl(12, 1.25), light, { y: -0.02, sx: 0.21, sy: 0.52, sz: 0.19, flat: false, vary: 0, c2: oc });
    b.add(Geo.cyl(12, 1), shade, { y: -0.03, sx: 0.268, sy: 0.07, sz: 0.226, flat: false, vary: 0 });       // 밑단
    // 후드(목 뒤)
    b.add(Geo.sph(10, 8), shade, { x: 0, y: 0.5, z: 0.1, sx: 0.23, sy: 0.15, sz: 0.14, flat: false, vary: 0 });
    b.add(Geo.sph(10, 8), oc, { x: 0, y: 0.49, z: 0.04, sx: 0.2, sy: 0.07, sz: 0.19, flat: false, vary: 0 });
    // 주머니 + 끈
    b.add(Geo.box(), shade, { x: 0, y: 0.06, z: -0.2, sx: 0.28, sy: 0.14, sz: 0.04, flat: true, vary: 0 });
    [-1, 1].forEach(function (s) { b.add(Geo.cyl(5, 1), 0xfff8ee, { x: s * 0.055, y: 0.3, z: -0.205, sx: 0.011, sy: 0.12, sz: 0.011, flat: true, vary: 0 }); });
    return b;
  }
  function buildArm(cfg) {
    var oc = P.outfit[cfg.outfit], skin = P.skin[cfg.skin], b = new G.Batch(2);
    b.add(Geo.cap(0.088, 0.2), oc, { y: -0.17, flat: false, vary: 0 });
    b.add(Geo.cyl(8, 1), new T.Color(oc).multiplyScalar(0.88).getHex(), { y: -0.325, sx: 0.088, sy: 0.04, sz: 0.088, flat: false, vary: 0 });
    b.add(Geo.sph(10, 8), skin, { y: -0.375, sx: 0.074, sy: 0.074, sz: 0.074, vary: 0 });
    return b;
  }
  function buildLeg(cfg) {
    var skin = P.skin[cfg.skin], b = new G.Batch(3);
    b.add(Geo.cyl(8, 1), PANTS, { y: -0.22, sx: 0.112, sy: 0.22, sz: 0.112, flat: false, vary: 0 });
    b.add(Geo.cyl(8, 1), skin, { y: -0.3, sx: 0.072, sy: 0.1, sz: 0.072, flat: false, vary: 0 });
    b.add(Geo.sph(10, 8), 0xfdfaf3, { y: -0.3, z: -0.035, sx: 0.105, sy: 0.07, sz: 0.17, flat: false, vary: 0 });
    b.add(Geo.sph(8, 6), 0xd9d2c4, { y: -0.335, z: -0.035, sx: 0.1, sy: 0.03, sz: 0.165, flat: false, vary: 0 });
    return b;
  }
  function parts(cfg) {
    var key = cfg.skin + '_' + cfg.style + '_' + cfg.hair + '_' + cfg.outfit;
    if (geoCache[key]) return geoCache[key];
    function mk(b) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(b.p), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(b.n), 3)); g.setAttribute('color', new T.BufferAttribute(new Float32Array(b.c), 3)); g.computeBoundingSphere(); return g; }
    var o = { head: mk(buildHead(cfg)), torso: mk(buildTorso(cfg)), arm: mk(buildArm(cfg)), leg: mk(buildLeg(cfg)) };
    geoCache[key] = o;
    return o;
  }

  // 이름표 텍스처 (이름 인덱스별 캐시)
  var tagCache = {};
  function tagMaterial(nameIdx) {
    if (tagCache[nameIdx]) return tagCache[nameIdx];
    var text = P.names[nameIdx] || '';
    var c = G.makeCanvas(256, 72), g = c.getContext('2d');
    g.font = 'bold 34px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    var w = Math.min(244, g.measureText(text).width + 40);
    var x = (256 - w) / 2;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    if (g.roundRect) g.roundRect(x, 8, w, 54, 27); else g.rect(x, 8, w, 54);
    g.fill();
    g.fillStyle = '#4a3a34'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 36);
    var t = new T.CanvasTexture(c);
    var m = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false });
    tagCache[nameIdx] = m;
    return m;
  }
  var shadowMat = null;
  function getShadowMat() {
    if (shadowMat) return shadowMat;
    var t = G.canvasTexture(64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(60,40,30,0.5)'); gr.addColorStop(0.6, 'rgba(60,40,30,0.25)'); gr.addColorStop(1, 'rgba(60,40,30,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, false);
    shadowMat = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return shadowMat;
  }
  var shadowGeo = null;

  var _v = new T.Vector3(), _down = new T.Vector3(0, -1, 0), _q = new T.Quaternion();
  var IDLE = [0.13, -1, 0], PRAY = [0.26, 0.0, -0.3], LAP = [0.08, -0.85, -0.5];
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function Avatar(cfg, opts) {
    opts = opts || {};
    this.root = new T.Group();
    this.rig = new T.Group(); this.root.add(this.rig);
    this.hip = new T.Group(); this.hip.position.y = HIP; this.rig.add(this.hip);
    this.upper = new T.Group(); this.hip.add(this.upper);
    this.torso = new T.Mesh(new T.BufferGeometry(), mat); this.torso.position.y = 0.26; this.upper.add(this.torso);
    this.neck = new T.Group(); this.neck.position.y = NECK - HIP; this.upper.add(this.neck);
    this.head = new T.Mesh(new T.BufferGeometry(), mat); this.head.position.y = HEAD_R * 0.93; this.neck.add(this.head);
    this.armL = new T.Group(); this.armL.position.set(-0.28, 0.42, 0); this.upper.add(this.armL);
    this.armR = new T.Group(); this.armR.position.set(0.28, 0.42, 0); this.upper.add(this.armR);
    this.armLm = new T.Mesh(new T.BufferGeometry(), mat); this.armL.add(this.armLm);
    this.armRm = new T.Mesh(new T.BufferGeometry(), mat); this.armR.add(this.armRm);
    this.legL = new T.Group(); this.legL.position.set(-0.115, 0, 0); this.hip.add(this.legL);
    this.legR = new T.Group(); this.legR.position.set(0.115, 0, 0); this.hip.add(this.legR);
    this.legLm = new T.Mesh(new T.BufferGeometry(), mat); this.legL.add(this.legLm);
    this.legRm = new T.Mesh(new T.BufferGeometry(), mat); this.legR.add(this.legRm);
    if (!shadowGeo) shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    this.shadow = new T.Mesh(shadowGeo, getShadowMat()); this.shadow.scale.set(0.95, 1, 0.95); this.shadow.position.y = 0.035; this.shadow.renderOrder = 2;
    this.root.add(this.shadow);
    this.tag = null;
    this.showTag = opts.showTag !== false;
    // 상태
    this.walkTarget = 0; this.walkAmt = 0; this.phase = 0;
    this.sitTarget = 0; this.sitAmt = 0; this.prayTarget = 0; this.prayAmt = 0;
    this.emote = -1; this.emoteT = 0; this.nod = false; this.nodPh = Math.random() * 6;
    this.off = Math.random() * 6.28;
    this.cfg = null; this.key = '';
    this.setConfig(cfg);
  }
  Avatar.prototype.setConfig = function (cfg) {
    cfg = cfg || {};
    var c = { skin: (cfg.skin | 0) % 4, style: (cfg.style | 0) % 4, hair: (cfg.hair | 0) % 10, outfit: (cfg.outfit | 0) % 12, name: (cfg.name | 0) % 40 };
    var key = c.skin + '_' + c.style + '_' + c.hair + '_' + c.outfit;
    this.cfg = c;
    if (key !== this.key) {
      var p = parts(c);
      this.head.geometry = p.head; this.torso.geometry = p.torso; this.armLm.geometry = p.arm; this.armRm.geometry = p.arm; this.legLm.geometry = p.leg; this.legRm.geometry = p.leg;
      this.key = key;
    }
    if (this.showTag) {
      if (!this.tag) { this.tag = new T.Sprite(tagMaterial(c.name)); this.tag.scale.set(1.0, 0.28, 1); this.tag.position.y = 2.0; this.tag.renderOrder = 8; this.root.add(this.tag); }
      else this.tag.material = tagMaterial(c.name);
    }
  };
  // 멀리 있는 아바타는 draw call 을 줄인다: 1 = 이름표 숨김, 2 = 팔·다리도 숨김
  Avatar.prototype.setLod = function (l) {
    if (l === this.lod) return;
    this.lod = l;
    if (this.tag) this.tag.visible = l === 0;
    this.armLm.visible = this.armRm.visible = this.legLm.visible = this.legRm.visible = l < 2;
    this.shadow.visible = l < 2;
  };
  Avatar.prototype.lod = 0;
  Avatar.prototype.setWalk = function (v) { this.walkTarget = v; };
  Avatar.prototype.setSeated = function (b) { this.sitTarget = b ? 1 : 0; };
  Avatar.prototype.setPray = function (b) { this.prayTarget = b ? 1 : 0; };
  Avatar.prototype.playEmote = function (e) { this.emote = e | 0; this.emoteT = 0; };
  Avatar.prototype.setPose = function (x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; };
  Avatar.prototype.snapPose = function () { this.sitAmt = this.sitTarget; this.prayAmt = this.prayTarget; this.walkAmt = this.walkTarget; };

  function aimArm(arm, x, y, z) {
    _v.set(x, y, z).normalize();
    arm.quaternion.setFromUnitVectors(_down, _v);
  }
  var EMOTE_DUR = [2.4, 3.4, 1.7];
  var CROSS = [[-0.29, 0.52, -0.3], [-0.29, -0.03, -0.32], [-0.58, 0.0, -0.25], [0.0, 0.0, -0.3]];

  Avatar.prototype.update = function (dt, t) {
    var k = Math.min(1, dt * 10);
    this.walkAmt += (this.walkTarget - this.walkAmt) * k;
    this.sitAmt += (this.sitTarget - this.sitAmt) * Math.min(1, dt * 7);
    this.prayAmt += (this.prayTarget - this.prayAmt) * Math.min(1, dt * 5);
    var wa = this.walkAmt * (1 - this.sitAmt), sa = this.sitAmt, pa = this.prayAmt * sa;
    this.phase += dt * 9.5 * this.walkAmt;
    var sw = Math.sin(this.phase) * 0.75 * wa;
    this.legL.rotation.x = sw * (1 - sa) + sa * 1.4;
    this.legR.rotation.x = -sw * (1 - sa) + sa * 1.4;
    this.legL.rotation.z = -0.05 * sa; this.legR.rotation.z = 0.05 * sa;
    // 몸
    var bob = Math.abs(Math.sin(this.phase)) * 0.045 * wa + Math.sin(t * 2.1 + this.off) * 0.006 * (1 - wa);
    this.rig.position.y = sa * 0.115 + bob;
    var emoting = this.emote >= 0;
    var eU = 0, eEnv = 0;
    if (emoting) {
      this.emoteT += dt;
      eU = this.emoteT / EMOTE_DUR[this.emote];
      if (eU >= 1) { this.emote = -1; emoting = false; eU = 0; }
      else eEnv = Math.min(smooth(eU / 0.12), smooth((1 - eU) / 0.12));
    }
    var bow = 0;
    if (emoting && this.emote === 2) bow = Math.sin(eU * PI) ;
    this.upper.rotation.x = -0.06 * wa - 0.07 * pa - 0.45 * bow;
    var nodv = 0;
    if (this.nod && pa > 0.5) { var ph = Math.sin(t * 0.55 + this.nodPh); nodv = ph > 0.93 ? (ph - 0.93) * 4 : 0; }
    this.neck.rotation.x = -0.5 * pa - 0.25 * bow - nodv;
    this.neck.rotation.z = Math.sin(this.phase * 0.5) * 0.05 * wa + Math.sin(t * 1.3 + this.off) * 0.012;
    this.neck.rotation.y = 0;
    // 팔
    var bl = 1 - pa, ax, ay, az;
    // 왼팔
    ax = (-IDLE[0] * (1 - sa) - LAP[0] * sa) * bl + PRAY[0] * pa;
    ay = (IDLE[1] * (1 - sa) + LAP[1] * sa) * bl + PRAY[1] * pa;
    az = ((-sw * 0.8) * (1 - sa) + LAP[2] * sa) * bl + PRAY[2] * pa;
    aimArm(this.armL, ax, ay, az);
    // 오른팔
    ax = (IDLE[0] * (1 - sa) + LAP[0] * sa) * bl - PRAY[0] * pa;
    ay = (IDLE[1] * (1 - sa) + LAP[1] * sa) * bl + PRAY[1] * pa;
    az = ((sw * 0.8) * (1 - sa) + LAP[2] * sa) * bl + PRAY[2] * pa;
    if (emoting && this.emote === 0) {
      var wv = Math.sin(this.emoteT * 11) * 0.28;
      ax = ax * (1 - eEnv) + (0.55 + wv) * eEnv; ay = ay * (1 - eEnv) + 0.85 * eEnv; az = az * (1 - eEnv) + (-0.1) * eEnv;
    } else if (emoting && this.emote === 1) {
      var u = Math.max(0, Math.min(0.999, (eU - 0.12) / 0.76)) * 4, idx = Math.floor(u), f = smooth(u - idx);
      var A = CROSS[Math.min(3, idx)], B = CROSS[Math.min(3, idx + 1)];
      var cx = A[0] + (B[0] - A[0]) * f, cy = A[1] + (B[1] - A[1]) * f, cz = A[2] + (B[2] - A[2]) * f;
      ax = ax * (1 - eEnv) + cx * eEnv; ay = ay * (1 - eEnv) + cy * eEnv; az = az * (1 - eEnv) + cz * eEnv;
    }
    aimArm(this.armR, ax, ay, az);
    this.shadow.position.y = 0.035 + sa * this.seatLift;
  };
  Avatar.prototype.seatLift = 0.45;

  root.ChurchAvatar = { Avatar: Avatar, tagMaterial: tagMaterial, HEIGHT: 1.7 };
})(typeof window !== 'undefined' ? window : this);
