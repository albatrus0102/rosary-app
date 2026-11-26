/* plants.js — 사진 오림 식물(소유자 제공 P01~P07, tex/plant_<종류>.webp)을 '교차 알파 카드'로 심는다.
   - 포기 하나 = 세로 판 2~3장을 같은 축에서 60~90° 씩 돌려 겹친 것(어느 쪽에서 봐도 덤불 부피가 있다). 크기·방향·색조는 포기마다 조금씩 다르다.
   - 알파: alphaTest 0.45 + alphaToCoverage(MSAA 가 있을 때 가장자리가 부드럽다). 그림자도 같은 알파로 오려진다(three 가 깊이 재질에 map·alphaTest 를 옮긴다).
   - 법선: 판 법선 대신 포기 가운데에서 바깥으로 향하는 '둥근 법선' + 위쪽(잎 덤불처럼 부드럽게 밝아진다). 양면 모두 같은 법선(뒷면이 까맣게 뒤집히지 않게).
   - 그리기 수: 종류마다 메시 1(모든 포기의 판을 한 지오메트리로 합친다) — 7종이면 draw call 7.
   - 나무 잎: leaf(kind, {...}) 로 그림의 일부(uv 사각형)를 아무 방향으로나 놓은 잎 카드(나무 둘레 둥근 법선).
   - 담쟁이: flat(kind, {...}) 로 벽에 붙인 판 한 장.
   쓰는 법(빌더): var P = root.RoomPlants.create(ctx); P.add('rose', {x, y, z, h}); … ; P.build();
   KINDS 의 aspect(가로/세로)는 tex/plant_*.webp 의 실제 크기와 같아야 한다(test/plants.test.mjs). */
(function (root) {
  'use strict';
  var KINDS = {
    rose: { aspect: 416 / 512, h: 0.75 },
    echinacea: { aspect: 384 / 512, h: 0.7 },
    daisy: { aspect: 473 / 512, h: 0.5 },
    lavender: { aspect: 512 / 499, h: 0.55 },
    hydrangea: { aspect: 512 / 503, h: 0.75 },
    tree: { aspect: 703 / 1024, h: 3.2 },
    ivy: { aspect: 107 / 512, h: 0.9 }
  };
  // 나무 그림(plant_tree)에서 잎 덩어리만 있는 부분(uv, 아래 0 → 위 1)
  var TREE_CANOPY_UV = [0.05, 0.38, 0.95, 1.0];

  function create(ctx) {
    var T = ctx.THREE, Ph = root.RoomPhotos, acc = {}, rnd = ctx.rng ? ctx.rng(311) : Math.random, built = [];
    function bucket(kind) {
      return acc[kind] || (acc[kind] = { p: [], n: [], u: [], c: [], cards: 0, plants: 0 });
    }
    function tintCol(t) {
      var c = new T.Color(t === undefined ? 0xffffff : t);
      return c;
    }
    // 판 한 장: 가운데 (cx,cy,cz), 가로 단위 벡터 R, 세로 단위 벡터 U, 크기 w×h, uv 사각형, 둥근 법선 중심 O, 색
    function quad(B, cx, cy, cz, R, U, w, h, uv, O, col, upK) {
      var hw = w / 2, hh = h / 2, k;
      var cs = [[-1, -1, uv[0], uv[1]], [1, -1, uv[2], uv[1]], [1, 1, uv[2], uv[3]], [-1, 1, uv[0], uv[3]]];
      var V = [];
      for (k = 0; k < 4; k++) {
        var s = cs[k], x = cx + R[0] * s[0] * hw + U[0] * s[1] * hh, y = cy + R[1] * s[0] * hw + U[1] * s[1] * hh, z = cz + R[2] * s[0] * hw + U[2] * s[1] * hh;
        var nx = x - O[0], ny = y - O[1], nz = z - O[2], l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= l; ny = ny / l + upK; nz /= l; l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        V.push([x, y, z, nx / l, ny / l, nz / l, s[2], s[3]]);
      }
      [0, 1, 2, 0, 2, 3].forEach(function (i) {
        var v = V[i];
        B.p.push(v[0], v[1], v[2]); B.n.push(v[3], v[4], v[5]); B.u.push(v[6], v[7]); B.c.push(col.r, col.g, col.b);
      });
      B.cards++;
    }
    var P = {
      KINDS: KINDS,
      // 포기 하나: o = {x, y(땅 높이), z, h(높이 m, 기본 종류 값), planes(2|3), rot(라디안), tint(hex), lean(기울기 rad)}
      add: function (kind, o) {
        var K = KINDS[kind]; if (!K) return;
        var B = bucket(kind), h = (o.h || K.h) * (o.s || 1), w = h * K.aspect, n = o.planes || 3, rot = o.rot === undefined ? rnd() * Math.PI : o.rot;
        var col = tintCol(o.tint), lean = o.lean || 0;
        var O = [o.x, o.y + h * 0.35, o.z];
        for (var i = 0; i < n; i++) {
          var a = rot + i * Math.PI / n, R = [Math.cos(a), 0, -Math.sin(a)];
          // 판마다 아주 조금 기울여(바깥으로) 덤불이 위로 벌어지게
          var la = lean + (rnd() - 0.5) * 0.12, F = [Math.sin(a), 0, Math.cos(a)];
          var U = [F[0] * Math.sin(la), Math.cos(la), F[2] * Math.sin(la)];
          quad(B, o.x + U[0] * h / 2, o.y - 0.02 + U[1] * h / 2, o.z + U[2] * h / 2, R, U, w, h, [0, 0, 1, 1], O, col, 0.9);
        }
        B.plants++;
      },
      // 잎 카드(나무 잎 덩어리): o = {x,y,z, size, center:[x,y,z], uv?, tint}
      leaf: function (kind, o) {
        var B = bucket(kind), col = tintCol(o.tint), uv = o.uv || TREE_CANOPY_UV;
        // 아무 방향: 법선 n 을 무작위로, R·U 는 n 에 수직
        var th = rnd() * Math.PI * 2, ph = (rnd() - 0.5) * Math.PI * 0.8;
        var nx = Math.cos(ph) * Math.cos(th), ny = Math.sin(ph), nz = Math.cos(ph) * Math.sin(th);
        var R = [-Math.sin(th), 0, Math.cos(th)];                         // 수평(법선에 수직)
        var U = [ny * R[2] - nz * R[1], nz * R[0] - nx * R[2], nx * R[1] - ny * R[0]];
        if (U[1] < 0) U = [-U[0], -U[1], -U[2]];                          // 그림 위쪽이 하늘을 향하게
        var asp = KINDS[kind].aspect * (uv[2] - uv[0]) / (uv[3] - uv[1]);
        quad(B, o.x, o.y, o.z, R, U, o.size * asp, o.size, uv, o.center, col, 0.6);
        B.plants += 0;
      },
      // 벽에 붙인 판 한 장(담쟁이): o = {x, y(위 끝), z, h, nrm:[nx,0,nz](벽에서 나오는 방향), tint, flip}
      flat: function (kind, o) {
        var K = KINDS[kind], B = bucket(kind), h = o.h || K.h, w = h * K.aspect, N = o.nrm;
        var R = [N[2], 0, -N[0]], U = [0, 1, 0], col = tintCol(o.tint);
        var uv = o.flip ? [1, 0, 0, 1] : [0, 0, 1, 1];
        quad(B, o.x + N[0] * 0.012, o.y - h / 2, o.z + N[2] * 0.012, R, U, w, h, uv, [o.x - N[0] * 0.6, o.y - h / 2, o.z - N[2] * 0.6], col, 0.1);
        B.plants++;
      },
      // 합쳐서 장면에 넣는다. 반환: 메시 목록
      build: function () {
        Object.keys(acc).forEach(function (kind) {
          var B = acc[kind]; if (!B.cards) return;
          var g = new T.BufferGeometry();
          g.setAttribute('position', new T.Float32BufferAttribute(B.p, 3));
          g.setAttribute('normal', new T.Float32BufferAttribute(B.n, 3));
          g.setAttribute('uv', new T.Float32BufferAttribute(B.u, 2));
          g.setAttribute('color', new T.Float32BufferAttribute(B.c, 3));
          g.computeBoundingSphere();
          var m = P.material(kind);
          var mesh = new T.Mesh(g, m);
          mesh.name = 'plant_' + kind; mesh.castShadow = true; mesh.receiveShadow = true;
          mesh.userData.plantCards = B.cards; mesh.userData.plants = B.plants;
          (ctx.add || function (x) { ctx.root.add(x); })(mesh);
          built.push(mesh);
        });
        return built;
      },
      material: function (kind) {
        var map = Ph ? Ph.get('plant_' + kind, { enc: 'srgb' }) : null;
        var m = new T.MeshStandardMaterial({ map: map, vertexColors: true, alphaTest: 0.45, side: T.DoubleSide, roughness: 0.78, metalness: 0, envMapIntensity: 0.8 });
        // 잎을 비쳐 나오는 빛(얇은 잎·꽃잎은 그늘에서도 까맣지 않다): 낮에만 아주 약한 자체 밝기(밤에는 0)
        m.emissive = new T.Color(0xffffff); m.emissiveMap = map; m.emissiveIntensity = 0.12;
        if (ctx.onHour) ctx.onHour(function (env) { m.emissiveIntensity = 0.16 * (1 - (env.night || 0)) + 0.02; });
        m.alphaToCoverage = true;
        m.userData.plantCard = kind;
        // 양면이 같은 둥근 법선을 쓰게(뒷면 뒤집기 끔) + 잎 사이로 비치는 빛(뒤에서 오는 햇빛을 조금 통과)
        m.onBeforeCompile = function (sh) {
          sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;');
        };
        m.customProgramCacheKey = function () { return 'plantCard1'; };
        if (ctx._ && ctx._.physMats) ctx._.physMats.push({ m: m, envK: 0.8, cc: 0, em: 0 });
        return m;
      },
      stats: function () {
        var s = { kinds: 0, cards: 0, plants: 0, tris: 0 };
        Object.keys(acc).forEach(function (k) { var B = acc[k]; if (!B.cards) return; s.kinds++; s.cards += B.cards; s.plants += B.plants; s.tris += B.cards * 2; });
        return s;
      }
    };
    return P;
  }
  root.RoomPlants = { create: create, KINDS: KINDS, TREE_CANOPY_UV: TREE_CANOPY_UV };
})(typeof window !== 'undefined' ? window : this);
