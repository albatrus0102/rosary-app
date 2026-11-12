/* geo.js — 합쳐진 지오메트리 배치(Batch), 도형 캐시, 캔버스 텍스처 도우미. three.js r149 클래식 빌드 필요.
   색 관리: sRGB 입력 -> 선형 작업공간(ColorManagement.legacyMode=false). 렌더러는 sRGB 출력 + ACES 톤매핑을 쓴다. */
(function (root) {
  'use strict';
  var T = root.THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;

  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function toColor(c) { return (c && c.isColor) ? c : new T.Color(c === undefined ? 0xffffff : c); }

  var _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(), _nm = new T.Matrix3();
  var _p = [0, 0, 0, 0, 0, 0, 0, 0, 0], _n = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var _c1 = new T.Color(), _c2 = new T.Color(), _hsl = { h: 0, s: 0, l: 0 };

  function Batch(seed) {
    this.p = []; this.n = []; this.c = []; this.u = null; this.uvTile = null;
    this.rand = rng(seed || 7);
    this.vertexCount = 0;
  }
  // 월드 좌표 박스 투영 UV (타일 크기 미터). 평면 법선의 우세 축으로 투영한다.
  Batch.prototype.enableUV = function (tw, th) { this.u = []; this.uvTile = [tw || 1, th || tw || 1]; };
  Batch.prototype._uv = function (b, fx, fy, fz) {
    // b: 9개 위치(_p) 배열, f: 면 법선
    var ax = Math.abs(fx), ay = Math.abs(fy), az = Math.abs(fz), tw = this.uvTile[0], th = this.uvTile[1], U = this.u;
    for (var j = 0; j < 3; j++) {
      var x = b[j * 3], y = b[j * 3 + 1], z = b[j * 3 + 2];
      if (ay >= ax && ay >= az) U.push(x / tw, z / th);
      else if (ax >= az) U.push(z / tw, y / th);
      else U.push(x / tw, y / th);
    }
  };

  // geom: BufferGeometry (indexed 또는 아님). color: hex/CSS/Color.
  // o: x,y,z, rx,ry,rz, s | r | sx,sy,sz, flat(bool), vary(0..), c2(위쪽 색, 로컬 y 그라디언트), q(Quaternion)
  Batch.prototype.add = function (geom, color, o) {
    o = o || {};
    if (o.q) _q.copy(o.q); else { _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); }
    var s = o.s !== undefined ? o.s : (o.r !== undefined ? o.r : 1);
    _s.set(o.sx !== undefined ? o.sx : s, o.sy !== undefined ? o.sy : s, o.sz !== undefined ? o.sz : s);
    _v.set(o.x || 0, o.y || 0, o.z || 0);
    _m.compose(_v, _q, _s);
    _nm.getNormalMatrix(_m);
    var me = _m.elements, ne = _nm.elements;
    var vary = o.vary === undefined ? 0.04 : o.vary;
    var k = 1 + (this.rand() * 2 - 1) * vary;
    _c1.copy(toColor(color));
    var grad = o.c2 !== undefined;
    if (grad) _c2.copy(toColor(o.c2));
    var pos = geom.attributes.position, nor = geom.attributes.normal, idx = geom.index;
    var minY = 0, rangeY = 1;
    if (grad) {
      if (!geom.boundingBox) geom.computeBoundingBox();
      minY = geom.boundingBox.min.y; rangeY = (geom.boundingBox.max.y - minY) || 1;
    }
    var n = idx ? idx.count : pos.count;
    var P = this.p, N = this.n, C = this.c;
    var tri = [0, 0, 0];
    for (var i = 0; i < n; i += 3) {
      for (var j = 0; j < 3; j++) tri[j] = idx ? idx.getX(i + j) : (i + j);
      for (j = 0; j < 3; j++) {
        var x = pos.getX(tri[j]), y = pos.getY(tri[j]), z = pos.getZ(tri[j]);
        _p[j * 3] = me[0] * x + me[4] * y + me[8] * z + me[12];
        _p[j * 3 + 1] = me[1] * x + me[5] * y + me[9] * z + me[13];
        _p[j * 3 + 2] = me[2] * x + me[6] * y + me[10] * z + me[14];
        if (!o.flat && nor) {
          var nx = nor.getX(tri[j]), ny = nor.getY(tri[j]), nz = nor.getZ(tri[j]);
          var ax = ne[0] * nx + ne[3] * ny + ne[6] * nz, ay = ne[1] * nx + ne[4] * ny + ne[7] * nz, az = ne[2] * nx + ne[5] * ny + ne[8] * nz;
          var l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
          _n[j * 3] = ax / l; _n[j * 3 + 1] = ay / l; _n[j * 3 + 2] = az / l;
        }
        if (grad) {
          var t = (y - minY) / rangeY;
          C.push((_c1.r + (_c2.r - _c1.r) * t) * k, (_c1.g + (_c2.g - _c1.g) * t) * k, (_c1.b + (_c2.b - _c1.b) * t) * k);
        } else C.push(_c1.r * k, _c1.g * k, _c1.b * k);
      }
      var ux = _p[3] - _p[0], uy = _p[4] - _p[1], uz = _p[5] - _p[2];
      var vx = _p[6] - _p[0], vy = _p[7] - _p[1], vz = _p[8] - _p[2];
      var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      var fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
      fx /= fl; fy /= fl; fz /= fl;
      if (o.flat || !nor) { for (j = 0; j < 3; j++) { _n[j * 3] = fx; _n[j * 3 + 1] = fy; _n[j * 3 + 2] = fz; } }
      if (this.u) this._uv(_p, fx, fy, fz);
      for (j = 0; j < 9; j++) { P.push(_p[j]); N.push(_n[j]); }
    }
    this.vertexCount += n;
  };

  // 자유 삼각형(평면 정점 배열 [x,y,z,...]; 3개씩 삼각형). hint=[x,y,z]: 면의 앞쪽이 이 점을 향하도록 자동 뒤집기.
  // colors: 단일 색 또는 정점별 색 배열(Color)
  Batch.prototype.addTris = function (verts, color, hint, opts) {
    opts = opts || {};
    var P = this.p, N = this.n, C = this.c;
    var vary = opts.vary === undefined ? 0 : opts.vary;
    var k = 1 + (this.rand() * 2 - 1) * vary;
    var cols = Array.isArray(color) ? color : null;
    var c0 = cols ? null : toColor(color);
    var cnt = verts.length / 9;
    var tmp = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var t = 0; t < cnt; t++) {
      var b = t * 9;
      var ax = verts[b], ay = verts[b + 1], az = verts[b + 2];
      var bx = verts[b + 3], by = verts[b + 4], bz = verts[b + 5];
      var cx = verts[b + 6], cy = verts[b + 7], cz = verts[b + 8];
      var ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      var fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
      if (fl < 1e-12) continue;
      fx /= fl; fy /= fl; fz /= fl;
      var swap = false;
      if (hint) {
        var mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mz = (az + bz + cz) / 3;
        if (fx * (hint[0] - mx) + fy * (hint[1] - my) + fz * (hint[2] - mz) < 0) swap = true;
      }
      var order = swap ? [0, 2, 1] : [0, 1, 2];
      if (swap) { fx = -fx; fy = -fy; fz = -fz; }
      for (var q = 0; q < 3; q++) {
        var vi = order[q];
        if (this.u && opts.uvs) this.u.push(opts.uvs[t * 6 + vi * 2], opts.uvs[t * 6 + vi * 2 + 1]);
        P.push(verts[b + vi * 3], verts[b + vi * 3 + 1], verts[b + vi * 3 + 2]);
        tmp[q * 3] = verts[b + vi * 3]; tmp[q * 3 + 1] = verts[b + vi * 3 + 1]; tmp[q * 3 + 2] = verts[b + vi * 3 + 2];
        N.push(fx, fy, fz);
        var cc = cols ? cols[t * 3 + vi] : c0;
        C.push(cc.r * k, cc.g * k, cc.b * k);
      }
      if (this.u && !opts.uvs) this._uv(tmp, fx, fy, fz);
      this.vertexCount += 3;
    }
  };

  // uv: 선택 [ua,va, ub,vb, uc,vc, ud,vd]
  Batch.prototype.addQuad = function (a, b, c, d, color, hint, opts, uv) {
    var o2 = opts;
    if (uv) { o2 = Object.assign({}, opts || {}); o2.uvs = [uv[0], uv[1], uv[2], uv[3], uv[4], uv[5], uv[0], uv[1], uv[4], uv[5], uv[6], uv[7]]; }
    this.addTris([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]], color, hint, o2);
  };

  var _d = new T.Vector3(), _up = new T.Vector3(0, 1, 0), _zero = new T.Vector3(), _mm = new T.Matrix4(), _qq = new T.Quaternion();
  // p0->p1 방향으로 긴 상자(길이 L, 굵기 t(위아래), 깊이 d(옆)). 색 하나.
  Batch.prototype.addBeam = function (p0, p1, t, d, color, o) {
    _d.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    var L = _d.length();
    if (L < 1e-6) return;
    _d.multiplyScalar(1 / L);
    var up = Math.abs(_d.y) > 0.98 ? new T.Vector3(1, 0, 0) : _up;
    _mm.lookAt(_zero, _d, up);
    _qq.setFromRotationMatrix(_mm);
    o = o || {};
    this.add(Geo.boxC(), color, { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, z: (p0[2] + p1[2]) / 2, q: _qq, sx: d, sy: t, sz: L * (o.overlap || 1.04), flat: o.flat !== false, vary: o.vary });
  };

  // 정점 AO 굽기: 바닥 근처 세로면과 아래를 향한 면을 어둡게(먼지/모서리 어둠).
  Batch.prototype.bakeAO = function (o) {
    o = o || {};
    var fk = o.floor === undefined ? 0.36 : o.floor, uk = o.under === undefined ? 0.28 : o.under, fh = o.height || 0.5, ck = o.ceil === undefined ? 0.0 : o.ceil;
    var P = this.p, N = this.n, C = this.c, n = P.length / 3;
    for (var i = 0; i < n; i++) {
      var y = P[i * 3 + 1], ny = N[i * 3 + 1], f = Math.exp(-Math.max(0, y) / fh), k = 1;
      if (Math.abs(ny) < 0.7) k -= fk * f;
      else if (ny < -0.5) k -= uk * (y < 3 ? 1 : 0.4);
      else if (ny > 0.5 && y < 0.02) k -= 0.0;
      if (ck && y > (o.ceilY || 8)) k -= ck * Math.min(1, (y - (o.ceilY || 8)) / 3);
      if (k < 0.2) k = 0.2;
      C[i * 3] *= k; C[i * 3 + 1] *= k; C[i * 3 + 2] *= k;
    }
  };

  // opts: {cast, receive}
  Batch.prototype.build = function (material, name, opts) {
    opts = opts || {};
    var group = new T.Group();
    if (name) group.name = name;
    var total = this.p.length / 3, CH = 60000;
    for (var s = 0; s < total; s += CH) {
      var e = Math.min(total, s + CH);
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(this.p.slice(s * 3, e * 3)), 3));
      g.setAttribute('normal', new T.BufferAttribute(new Float32Array(this.n.slice(s * 3, e * 3)), 3));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(this.c.slice(s * 3, e * 3)), 3));
      if (this.u) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(this.u.slice(s * 2, e * 2)), 2));
      g.computeBoundingSphere();
      var mesh = new T.Mesh(g, material);
      mesh.castShadow = !!opts.cast; mesh.receiveShadow = opts.receive !== false;
      group.add(mesh);
    }
    group.userData.vertexCount = total;
    return group;
  };

  // ---- 공용 단위 도형(바닥 기준: y 0..1, 중심 xz) ----
  var cache = {};
  var Geo = {
    boxC: function () { return cache.boxc || (cache.boxc = new T.BoxGeometry(1, 1, 1)); },
    box: function () { return cache.box || (cache.box = new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)); },
    cyl: function (seg, rTop) {
      var key = 'cyl' + seg + '_' + (rTop === undefined ? 1 : rTop);
      return cache[key] || (cache[key] = new T.CylinderGeometry(rTop === undefined ? 1 : rTop, 1, 1, seg, 1).translate(0, 0.5, 0));
    },
    sph: function (w, h) { var key = 'sph' + w + '_' + h; return cache[key] || (cache[key] = new T.SphereGeometry(1, w, h)); },
    hemi: function (w, h) { var key = 'hem' + w + '_' + h; return cache[key] || (cache[key] = new T.SphereGeometry(1, w, h, 0, Math.PI * 2, 0, Math.PI / 2)); },
    ico: function (d) { var key = 'ico' + d; return cache[key] || (cache[key] = new T.IcosahedronGeometry(1, d)); },
    cap: function (r, l) { var key = 'cap' + r + '_' + l; return cache[key] || (cache[key] = new T.CapsuleGeometry(r, l, 4, 8)); }
  };

  // ---- 캔버스 ----
  function makeCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  // linear:true 면 데이터 텍스처(법선·거칠기·알파)
  function canvasTexture(w, h, draw, repeat, linear) {
    var c = makeCanvas(w, h);
    var g = c.getContext('2d');
    draw(g, w, h);
    var t = new T.CanvasTexture(c);
    if (repeat !== false) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.anisotropy = 4;
    t.encoding = linear ? T.LinearEncoding : T.sRGBEncoding;
    return t;
  }
  function css(c) { return '#' + toColor(c).getHexString(); }

  root.ChurchGeo = { Batch: Batch, Geo: Geo, rng: rng, toColor: toColor, makeCanvas: makeCanvas, canvasTexture: canvasTexture, css: css };
})(typeof window !== 'undefined' ? window : this);
