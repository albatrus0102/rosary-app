/* glass_gen.js — 절차 생성 스테인드글라스(docs/church/GLASS_INVENTORY.md). 성당 하나의 창 그림을 캔버스 아틀라스 한 장에 그린다.
   - 실제 작품을 옮기지 않는다: 시대·양식(13세기 메달리온, 15~16세기 밀라노 서사 패널, 19세기 성인 층, 피렌체 르네상스 오쿨루스,
     장식·그리자유·무색 격자·설화석고, 현대 추상 색면)의 '짜임새'만 따른 창작 무늬다. 특정 장면·인물·화풍을 따라 그리지 않는다.
   - 저작권이 살아 있는 현대 창 자리(밀라노 하이날·카르피·티부리오, 마조레 장미창, 명동 이남규 반월창, 여의도·우리 본당)는
     인물 없는 추상 색면(kind 'abstract')만 쓴다. 당고개 한지 창은 이 파일을 쓰지 않는다(빌더의 한지 빛 판).
   - 쓰임: kit.js 가 창마다 '칸(tile)' = {style, part:'body'|'head'|'disc', variant} 을 등록하고, _prepare 에서 atlas(tiles) 로
     한 장(긴 변 ≤ 2048px, 높음·보통 칸 256px / 간단 128px)을 그린 뒤 유리 배치 UV 를 그 칸으로 옮긴다 → 유리 draw call 은 그대로 1.
     body = 1×2 칸(세로로 이어 붙는 모듈: 위아래 끝이 가로 철물), head = 1×1(아치 머리), disc = 2×2(원창).
   - three·DOM 없이 계산(layout·STYLES·beam)은 node 에서 돈다. 그리기는 2D 캔버스만 쓴다(가짜 캔버스에서도 오류 없이 지나간다).
   ChurchGlassGen = { STYLES, PAL, SIZE, layout(tiles, unit, maxW, maxH), atlas(tiles, opts) → {canvas, w, h, unit, rects, mb}, beam(style), mean(style), has(style) } */
(function (root) {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function cl(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
  function shade(c, k) { return (cl(Math.round(((c >> 16) & 255) * k)) << 16) | (cl(Math.round(((c >> 8) & 255) * k)) << 8) | cl(Math.round((c & 255) * k)); }
  function mix(a, b, t) {
    var r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t;
    return (cl(Math.round(r)) << 16) | (cl(Math.round(g)) << 8) | cl(Math.round(bl));
  }
  function css(c, a) { return a === undefined ? '#' + ('00000' + c.toString(16)).slice(-6) : 'rgba(' + ((c >> 16) & 255) + ',' + ((c >> 8) & 255) + ',' + (c & 255) + ',' + a + ')'; }
  function pick(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }

  // ---- 팔레트(유리 색은 빛을 받은 투과색: 밝고 깊게. 납은 거의 검정) ----
  var LEAD = 0x15110e, FLESH = 0xefcfae, WHITE = 0xeee7d0, GOLD = 0xe9b13a;
  var PAL = {
    // 13세기풍 메달리온(명동 1898 프랑스 공방 창의 짜임새도 이 계열): 코발트 바탕 + 루비 테두리
    french19: { ground: [0x1f4fb4, 0x2a5fc4, 0x2456ba], ground2: [0xa81e2c, 0xb72a33], border: [0xb3242c, 0xe2a632, 0x2f7d5b], robe: [0xb3242c, 0x2a5fc4, 0x2f7d5b, 0x6c3d8c, 0xe2a632, WHITE], gold: GOLD, white: WHITE, accent: [0xe2a632, 0xd2c38e] },
    gothic: { ground: [0x1d3f9a, 0x23479f, 0x1b3a8e], ground2: [0x9e1d27, 0xaa2430], border: [0xa8222c, 0xe0a93c, 0x2f7d5b], robe: [0xa8222c, 0x2a56b8, 0x2f7d5b, 0x6a3a86, 0xe0a93c, WHITE], gold: GOLD, white: WHITE, accent: [0xe0a93c, 0xcfc28f] },
    // 밀라노 15~16세기 서사 창: 짙은 파랑·포도주빛 빨강·풀빛 초록·노랑 은빛 착색, 흰 건축 틀
    milan15: { ground: [0x23449a, 0x2a4fa6, 0x1f3d8c], ground2: [0x8e1c2a, 0x9c2431], border: [0xe6b23c, 0xece2c4, 0x9c2431], robe: [0x9c2431, 0x2f5bb0, 0x3f7f3a, 0x6b3a7a, 0xe6b23c, 0x8a5a2b, WHITE], gold: 0xe6b23c, white: 0xece2c4, accent: [0xd98c3a, 0xb7c46a] },
    // 19세기 베르티니 공방풍(밀라노)·피렌체 재제작: 채도 높은 루비·사파이어, 흰·금 고딕 캐노피
    bertini: { ground: [0xb3171f, 0xa8121c, 0x2556b8], ground2: [0x2556b8, 0x1d469f], border: [0xf0c040, 0xf2ecd8, 0x2f8f55], robe: [0x2556b8, 0xb3171f, 0x2f8f55, 0x6b3fa6, 0xf0c040, WHITE], gold: 0xf0c040, white: 0xf2ecd8, accent: [0x7fb0e0, 0xe8a0a0] },
    // 피렌체 15세기(기베르티 밑그림 계열): 초록·자주·붉은 갈색·금, 흰 대리석 감실
    ren15: { ground: [0x2f55a0, 0x2b4d94, 0x7a2032], ground2: [0x3d7a3a, 0x2f6a35], border: [0xd9a030, 0x3d7a3a, 0x9a2228], robe: [0x9a2228, 0x6b2f6e, 0x3d7a3a, 0xd9a030, 0x2f55a0, 0xe6dcc2, 0x7a4a2a], gold: 0xd9a030, white: 0xe6dcc2, accent: [0x9ac0e0, 0xc87a3a] },
    // 장식 무늬 창(명동 신자석·고측창 '꽃 모양' 무늬창): 옅은 바탕 + 색 꽃무늬·띠
    flower: { ground: [0xdfe0c8, 0xd8dcc4, 0xe4dcc0], ground2: [0xc9d4c0, 0xd3cdb4], border: [0x2a5fc4, 0xb3242c, 0xe2a632], robe: [0xb3242c, 0x2a5fc4, 0xe2a632, 0x2f7d5b, 0x6c3d8c], gold: GOLD, white: 0xf3eedb, accent: [0x2f7d5b, 0xe2a632] },
    // 밀라노 고창 1950년대 장식 유리: 서사 없는 기하·식물 무늬, 금·호박·청록
    deco50: { ground: [0xd9c48a, 0xe3cf98, 0xcbb67c], ground2: [0x3a7a8a, 0x2f6a7a], border: [0x2a5aa8, 0xb32a2a, 0xe9b13a], robe: [0x2a5aa8, 0xb32a2a, 0x3a8a6a, 0xe9b13a, 0x7a4a9a], gold: GOLD, white: 0xf0e6c8, accent: [0xb32a2a, 0x2a5aa8] },
    // 그리자유(옅은 회백 유리 + 갈색 그림 선 + 얇은 색 테두리)
    grisaille: { ground: [0xe6e2d0, 0xdedbc8, 0xe9e4d2], ground2: [0xd6d4c0, 0xdcd8c6], border: [0xc9a54a, 0x9e3a34, 0x3a6aa0], robe: [0xc9a54a, 0x9e3a34], gold: 0xc9a54a, white: 0xf1ede0, accent: [0x9e3a34, 0x3a6aa0] },
    // 무색 격자(쿼리) 유리: 아주 옅은 초록·회백
    clear: { ground: [0xeef0e8, 0xe6eae0, 0xf2f1e8, 0xe2e6dc], ground2: [0xe8ecdf], border: [0xe9e2c2, 0xdcd6b8], robe: [0xeef0e8], gold: 0xe4d9a8, white: 0xf4f3ec, accent: [0xe4d9a8] },
    clear_warm: { ground: [0xf3e9cc, 0xeee0bb, 0xf6efd8, 0xe9dcb4], ground2: [0xece3c4], border: [0x4f72b0, 0xb5574a, 0xd9b45a, 0x5e8f6c], robe: [0xf3e9cc], gold: 0xd9b45a, white: 0xf8f3e4, accent: [0xd9b45a] },
    // 설화석고(성 바오로): 꿀빛·크림·호박, 결 무늬
    alabaster: { ground: [0xf0cf96, 0xe8be7c, 0xf3dcb0, 0xe2b06c], ground2: [0xd99a50, 0xc98a44], border: [0x8a6a4a], robe: [0xf3dcb0], gold: 0xf6e4c0, white: 0xfbf0d8, accent: [0xc98a44, 0xfff4dc] },
    // 현대 추상 색면 — 권리가 있는 자리(원작의 구도·인물·선을 옮기지 않는다)
    abs_milan: { ground: [0x23449a, 0x2a5aa8, 0x1e3a86, 0x9c2431, 0xb8402a, 0xe6b23c, 0x3f7f3a, 0xe8dcc0], ground2: [0x6b3a7a], border: [0x2a4f9a], robe: [], gold: 0xe6b23c, white: 0xe8dcc0, accent: [] },
    abs_tiburio: { ground: [0x2a5aa8, 0x3f74c0, 0x1e3a86, 0xe6b23c, 0xf0d890, 0xb8402a, 0xe8dcc0, 0x6b8ac0], ground2: [0x9c2431], border: [0x2a4f9a], robe: [], gold: 0xe6b23c, white: 0xe8dcc0, accent: [] },
    abs_marian: { ground: [0x2552b0, 0x2f66c4, 0x1d3f90, 0xe8b23a, 0xf2d27a, 0xe9e2cc, 0x7aa0d8], ground2: [0xb3242c], border: [0x1d3f90], robe: [], gold: 0xe8b23a, white: 0xe9e2cc, accent: [] },
    abs_pale: { ground: [0xe9d9a8, 0xcfdbe0, 0xf0ead8, 0xd3dcc6, 0xe3cf98, 0xc3d2da, 0xe8e0c8], ground2: [0xc9d6bd], border: [0xd8c898], robe: [], gold: 0xe3cf98, white: 0xf0ead8, accent: [] },
    // 여의도동 로비 무지개 모티프 색유리 자리(작가 미확인): 사진의 색 분위기(위 파랑, 초록·노랑·주황, 맑은 칸)만 — 무지개 띠·구도는 옮기지 않는다
    abs_yeouido_lobby: { ground: [0x2f62b4, 0x4a8fd6, 0x7cb6e4, 0x3f8a54, 0x6aa84a, 0xe2b640, 0xe08a3a, 0xeef1f0, 0x2a58a8, 0xd8e6ea], ground2: [0x1d3c86], border: [0x2a4f8a], robe: [], gold: 0xe2b640, white: 0xeef1f0, accent: [] },
    abs_yeouido: { ground: [0x2f62b4, 0x4a8fd6, 0x1d3c86, 0x7cb6e4, 0x2a58a8, 0xeef1f4, 0x3a70c0, 0xc83a4a, 0x2f62b4, 0x5a9ad8, 0xe7a0b8, 0x1d3c86], ground2: [0x1d3c86], border: [0x1d3c86], robe: [], gold: 0xe7a0b8, white: 0xeef1f4, accent: [] },
    // 아시시 상부 성당(13세기 창 자리, assisi.md §4): 코발트 바탕 + 루비 테두리 + 초록·금·흰 조각. 인물 없는 추상 모자이크
    assisi13: { ground: [0x1c3c96, 0x22469f, 0x1a378a], ground2: [0xa31f2a, 0xb02a33], border: [0xa8222c, 0xd9a23a, 0x2f7d5b], robe: [0xa8222c, 0x2a56b8, 0x2f7d5b, 0xd9a23a, 0xe6dcc0, 0x6a3a86, 0xc8602a], gold: 0xd9a23a, white: 0xe6dcc0, accent: [0x2f7d5b, 0xd9a23a] },
    // 우리 본당(가상): 한국 현대 본당 풍 — 색면 + 단순한 상징(창작)
    parish: { ground: [0x2a62b4, 0x3f82cc, 0x23887a, 0xd9a43a, 0x2a62b4, 0xb8383f, 0x76489f, 0x3f82cc, 0xd8d4c4], ground2: [0x1c3f8a], border: [0xd9a43a], robe: [], gold: 0xe9b83e, white: 0xf3efe0, accent: [0xc0393f] }
  };
  // kind: body/head/disc 그리는 방식. variants = 서로 다른 몸통 무늬 수(창마다 seed 로 고른다). 머리·원창은 heads(기본 1)·discs(기본 1)개.
  // 아틀라스 한 장(2048×1024 = 칸 32개)에 한 성당이 쓰는 양식이 다 들어가도록 변주 수를 정했다(몸통 2칸, 머리 1칸, 원창 4칸).
  var STYLES = {
    myeongdong_medal: { pal: 'french19', body: 'medallion', head: 'tracery', disc: 'rose', variants: 3, era: '1898 프랑스 공방풍 메달리온(창작)' },
    myeongdong_figure: { pal: 'french19', body: 'tiers', head: 'tracery', disc: 'rose', variants: 2, era: '19세기 말 인물 층(창작, 인물 특정 없음)' },
    myeongdong_flower: { pal: 'flower', body: 'ornament', head: 'ornament', disc: 'rose', variants: 2, era: '무늬창(인물 없음)' },
    myeongdong_clere: { pal: 'french19', body: 'ornament', head: 'tracery', disc: 'rose', variants: 2, era: '무늬 색유리(인물 없음)' },
    myeongdong_tymp: { pal: 'abs_pale', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 1, era: '중립 추상(1989 현대 창은 옮기지 않음)' },
    milan_narr: { pal: 'milan15', body: 'narrative', head: 'tracery', disc: 'rose', variants: 3, era: '15~16세기 서사 패널(창작)' },
    milan_bertini: { pal: 'bertini', body: 'tiers', head: 'tracery', disc: 'rose', variants: 2, era: '19세기 성인 층(창작)' },
    milan_saints16: { pal: 'milan15', body: 'tiers', head: 'tracery', disc: 'rose', variants: 1, era: '16세기 입상 인물 층(창작)' },
    milan_apse19: { pal: 'bertini', body: 'narrative', head: 'tracery', disc: 'rose', variants: 2, era: '19세기 서사 패널(창작)' },
    milan_deco: { pal: 'deco50', body: 'ornament', head: 'ornament', disc: 'rose', variants: 2, era: '1950년대 장식 유리(창작)' },
    milan_abstract: { pal: 'abs_milan', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 2, era: '저작권 존속 창 자리: 추상 색면' },
    milan_tiburio: { pal: 'abs_tiburio', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 2, era: '1968 티부리오 자리: 추상 색면' },
    gothic_medal: { pal: 'gothic', body: 'medallion', head: 'tracery', disc: 'rose', variants: 3, era: '고딕 메달리온(창작)' },
    florence_saints: { pal: 'ren15', body: 'tiers', head: 'shell', disc: 'oculus', variants: 3, canopy: 'ren', era: '15세기 피렌체 트리부나 성인·예언자 층(창작)' },
    florence_gothic: { pal: 'ren15', body: 'tiers', head: 'tracery', disc: 'oculus', variants: 2, canopy: 'gothic', era: '1394~96 측랑 성인 층(창작)' },
    florence_oculus: { pal: 'ren15', body: 'tiers', head: 'shell', disc: 'oculus', variants: 1, discs: 3, era: '15세기 피렌체 오쿨루스(창작)' },
    florence_plain: { pal: 'grisaille', body: 'grisaille', head: 'grisaille', disc: 'grisaille', variants: 1, era: '그림 없는 옅은 장식 유리' },
    grisaille: { pal: 'grisaille', body: 'grisaille', head: 'grisaille', disc: 'grisaille', variants: 2, era: '그리자유' },
    clear: { pal: 'clear', body: 'quarry', head: 'quarry', disc: 'quarry', variants: 1, era: '무색 격자 유리' },
    clear_warm: { pal: 'clear_warm', body: 'quarry', head: 'quarry', disc: 'quarry', variants: 1, era: '옅은 호박빛 격자 유리 + 색 테두리(그림 없음)' },
    alabaster: { pal: 'alabaster', body: 'alabaster', head: 'alabaster', disc: 'alabaster', variants: 3, era: '설화석고 판' },
    marian_abstract: { pal: 'abs_marian', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 1, era: '저작권 존속 장미창 자리: 추상 방사 색면' },
    yeouido_abstract: { pal: 'abs_yeouido', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 2, era: '현대 추상 색면(원작 구도 없음)' },
    yeouido_lobby: { pal: 'abs_yeouido_lobby', body: 'abstract', head: 'abstract', disc: 'abstract', variants: 2, era: '현대 추상 색면(로비 색유리 벽 자리, 원작 구도 없음)' },
    parish: { pal: 'parish', body: 'parish', head: 'parish', disc: 'parish', variants: 5, era: '가상 본당 창작(색면 + 단순 상징)' },
    assisi_medieval: { pal: 'assisi13', body: 'mosaic13', head: 'mosaic13', disc: 'rose', variants: 2, era: '13세기풍 추상 색 모자이크(인물 없음 — 실제 창의 구도·인물을 옮기지 않음)' }
  };
  var SIZE = { body: [1, 2], head: [1, 1], disc: [2, 2] };
  function has(id) { return !!STYLES[id]; }
  function palOf(id) { var s = STYLES[id]; return s ? PAL[s.pal] : PAL.gothic; }
  // 창의 평균 투과색(텍스처가 없을 때의 대역, 빛줄기 색의 바탕)
  function mean(id) { var p = palOf(id), cs = p.ground.concat(p.border).concat(p.robe), r = 0, g = 0, b = 0; cs.forEach(function (c) { r += (c >> 16) & 255; g += (c >> 8) & 255; b += c & 255; }); var n = cs.length || 1; return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n); }
  // 빛줄기·바닥 빛무늬 색 3개: 유리의 주된 색을 흰빛과 섞는다(빛줄기가 색 유리를 지나온 빛처럼 물들게)
  function beam(id) {
    var p = palOf(id), cs = [p.ground[0], (p.border[0] !== undefined ? p.border[0] : p.ground[1] || p.ground[0]), p.gold];
    var pale = p === PAL.clear || p === PAL.grisaille || p === PAL.alabaster || p === PAL.abs_pale;
    return cs.map(function (c) { return mix(c, 0xfff4dc, pale ? 0.55 : 0.32); });
  }

  // ---- 아틀라스 배치: 칸 단위 선반 쌓기. tiles: {key:{style, part, variant}} → {w, h(칸), rects:{key:[x,y,w,h](칸)}} ----
  function layout(tiles, maxW, maxH) {
    maxW = maxW || 8; maxH = maxH || 4;
    var keys = Object.keys(tiles).sort(function (a, b) { var sa = SIZE[tiles[a].part] || [1, 1], sb = SIZE[tiles[b].part] || [1, 1]; return (sb[1] - sa[1]) || (sb[0] - sa[0]) || (a < b ? -1 : 1); });
    var area = 0; keys.forEach(function (k) { var s = SIZE[tiles[k].part] || [1, 1]; area += s[0] * s[1]; });
    var W = 2; while (W < maxW && W * W * (W >= 4 ? 0.5 : 1) < area) W *= 2;
    function tryW(W) {
      // 위에서부터 칸 격자를 채운다(occupancy): 높이 2 짜리를 먼저 두고 높이 1 이 빈 곳을 메운다
      var occ = [], rects = {}, Hn = 0;
      function free(x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) { if (i >= W) return false; if (occ[j] && occ[j][i]) return false; } return true; }
      function take(x, y, w, h) { for (var j = y; j < y + h; j++) { occ[j] = occ[j] || []; for (var i = x; i < x + w; i++) occ[j][i] = 1; } }
      for (var n = 0; n < keys.length; n++) {
        var s = SIZE[tiles[keys[n]].part] || [1, 1], done = false;
        for (var y = 0; !done && y < 64; y++) for (var x = 0; x + s[0] <= W; x++) if (free(x, y, s[0], s[1])) { take(x, y, s[0], s[1]); rects[keys[n]] = [x, y, s[0], s[1]]; Hn = Math.max(Hn, y + s[1]); done = true; break; }
      }
      var H = 1; while (H < Hn) H *= 2;
      return { w: W, h: H, used: Hn, rects: rects };
    }
    var L = tryW(W);
    while (L.h > maxH && W < maxW) { W *= 2; L = tryW(W); }
    L.fits = L.h <= maxH && L.w <= maxW;
    L.area = area;
    return L;
  }

  // ======================================================================= 그리기
  // 한 칸 그리기 상태: g = 2D 문맥(칸 좌표: 가로 0..cw, 세로 0..ch, 단위 '칸'), s = 픽셀/칸, r = rng, pal
  function Painter(g, s, r, pal, lw) { this.g = g; this.s = s; this.r = r; this.pal = pal; this.lw = lw || 0.013; this.leads = []; }
  // 유리 조각: 경로를 채우고(조각마다 밝기·색조 조금씩 다르게 + 한쪽으로 기우는 명암) 납선을 기록한다(나중에 한꺼번에 긋는다)
  Painter.prototype.piece = function (path, c, o) {
    var g = this.g, r = this.r; o = o || {};
    var k = o.flat ? 1 : 0.9 + r() * 0.2, col = shade(c, k);
    g.beginPath(); path(g);
    if (!o.flat && g.createLinearGradient) {
      var bb = o.bb || [0, 0, 1, 1], ang = r() * TAU, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, rr = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.6;
      var gr = g.createLinearGradient(cx - Math.cos(ang) * rr, cy - Math.sin(ang) * rr, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      gr.addColorStop(0, css(shade(col, 1.12))); gr.addColorStop(1, css(shade(col, 0.84)));
      g.fillStyle = gr;
    } else g.fillStyle = css(col);
    g.fill();
    if (o.lead !== false) this.leads.push({ path: path, w: o.lw || this.lw });
  };
  Painter.prototype.lead = function (path, w) { this.leads.push({ path: path, w: w || this.lw }); };
  Painter.prototype.flushLeads = function () {
    var g = this.g;
    g.strokeStyle = css(LEAD); g.lineJoin = 'round'; g.lineCap = 'round';
    for (var i = 0; i < this.leads.length; i++) { var L = this.leads[i]; g.lineWidth = L.w; g.beginPath(); L.path(g); g.stroke(); }
    this.leads = [];
  };
  // 그리자유 물감 선(갈색 반투명): 옷 주름·얼굴·건축 선
  Painter.prototype.paint = function (fn, w, a) { var g = this.g; g.strokeStyle = css(0x3a2414, a === undefined ? 0.55 : a); g.lineWidth = w || 0.006; g.lineCap = 'round'; g.beginPath(); fn(g); g.stroke(); };
  function P_rect(x0, y0, x1, y1) { return function (g) { g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, y1); g.lineTo(x0, y1); g.closePath(); }; }
  function P_poly(pts) { return function (g) { g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }; }
  function P_circ(x, y, rad) { return function (g) { g.moveTo(x + rad, y); g.arc(x, y, rad, 0, TAU); }; }
  function P_ell(x, y, rx, ry) { return function (g) { g.moveTo(x + rx, y); if (g.ellipse) g.ellipse(x, y, rx, ry, 0, 0, TAU); else g.arc(x, y, rx, 0, TAU); }; }
  function P_ring(x, y, r0, r1, a0, a1) { return function (g) { g.moveTo(x + Math.cos(a0) * r1, y + Math.sin(a0) * r1); g.arc(x, y, r1, a0, a1); g.lineTo(x + Math.cos(a1) * r0, y + Math.sin(a1) * r0); g.arc(x, y, r0, a1, a0, true); g.closePath(); }; }
  function bbOf(pts) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return [x0, y0, x1, y1]; }

  // ---- 공통 부품 ----
  // 세로 테두리 띠(구슬 박힌 조각 띠): 칸 x0..x1, 세로 y0..y1, 조각 높이 step
  function borderStrip(P, x0, x1, y0, y1, step, cols, pearls) {
    var n = Math.max(1, Math.round((y1 - y0) / step)), h = (y1 - y0) / n, i;
    for (i = 0; i < n; i++) {
      var a = y0 + h * i, c = cols[i % cols.length];
      P.piece(P_rect(x0, a, x1, a + h), c, { bb: [x0, a, x1, a + h] });
      if (pearls) { var rr = Math.min(x1 - x0, h) * 0.22; P.piece(P_circ((x0 + x1) / 2, a + h / 2, rr), P.pal.white, { flat: true, lw: P.lw * 0.7 }); }
    }
  }
  // 바탕 무늬(마름모 격자 납선 + 교차점의 작은 색 조각): 밋밋한 면이 아니라 유리 조각으로 짠 바탕
  function diaper(P, x0, y0, x1, y1, step, base, dot) {
    var g = P.g, i, j;
    P.piece(P_rect(x0, y0, x1, y1), base, { bb: [x0, y0, x1, y1], lead: false });
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    var span = (x1 - x0) + (y1 - y0);
    for (i = -span; i <= span; i += step) {
      (function (o) {
        P.lead(function (g2) { g2.moveTo(x0 + o, y0); g2.lineTo(x0 + o + (y1 - y0), y1); }, P.lw * 0.55);
        P.lead(function (g2) { g2.moveTo(x1 - o, y0); g2.lineTo(x1 - o - (y1 - y0), y1); }, P.lw * 0.55);
      })(i);
    }
    if (dot !== undefined) for (j = y0 + step / 2; j < y1; j += step) for (i = x0 + ((Math.round((j - y0) / step) % 2) ? step / 2 : 0); i <= x1; i += step) {
      var rr = step * 0.17; P.piece(P_poly([[i, j - rr], [i + rr, j], [i, j + rr], [i - rr, j]]), dot, { flat: true, lw: P.lw * 0.5 });
    }
    P.flushLeads();
    g.restore();
  }
  // 인물(특정 성인·장면이 아닌 일반 형태): 발 (x, yb), 키 hgt, 옷·겉옷 색, 자세 0..4
  function figure(P, x, yb, hgt, robe, mantle, pose, opt) {
    var r = P.r, g = P.g; opt = opt || {};
    var hr = hgt * 0.075, hy = yb - hgt + hr * 1.25, sh = hgt * 0.17, lean = (pose === 1 ? 1 : pose === 2 ? -1 : 0) * hgt * 0.04;
    var kneel = pose === 3, top = hy + hr * 1.1, bot = kneel ? yb - hgt * 0.02 : yb;
    if (!opt.noHalo) P.piece(P_circ(x + lean, hy, hr * 1.75), P.pal.gold, { bb: [x - hr * 2, hy - hr * 2, x + hr * 2, hy + hr * 2] });
    // 옷(아래로 넓어지는 굽은 사다리꼴)
    var bw = kneel ? sh * 1.5 : sh * 1.25, robeP = [[x + lean - sh * 0.55, top], [x + lean + sh * 0.55, top], [x + bw * 0.62, bot - hgt * 0.02], [x + bw * 0.5, bot], [x - bw * 0.5, bot], [x - bw * 0.62, bot - hgt * 0.02]];
    if (kneel) robeP = [[x + lean - sh * 0.5, top], [x + lean + sh * 0.5, top], [x + sh * 0.55, yb - hgt * 0.3], [x + bw * 0.9, yb - hgt * 0.08], [x + bw * 0.8, yb], [x - bw * 0.5, yb], [x - bw * 0.55, yb - hgt * 0.1]];
    P.piece(function (g2) {
      g2.moveTo(robeP[0][0], robeP[0][1]);
      for (var i = 1; i < robeP.length; i++) { var a = robeP[i - 1], b = robeP[i]; g2.quadraticCurveTo((a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.08, (a[1] + b[1]) / 2, b[0], b[1]); }
      g2.closePath();
    }, robe, { bb: bbOf(robeP) });
    // 겉옷(한쪽 어깨에서 비스듬히 감싸 내려오는 천)
    var side = r() < 0.5 ? -1 : 1, mP = [[x + lean + side * sh * 0.6, top + hgt * 0.02], [x + lean - side * sh * 0.2, top + hgt * 0.06], [x - side * bw * 0.35, bot - hgt * (kneel ? 0.12 : 0.28)], [x - side * bw * 0.56, bot - hgt * (kneel ? 0.05 : 0.1)], [x + side * bw * 0.55, bot - hgt * 0.04], [x + side * bw * 0.62, top + hgt * 0.35]];
    P.piece(P_poly(mP), mantle, { bb: bbOf(mP) });
    // 손(몸짓): 자세마다 다른 자리
    var hx = x + lean + (pose === 4 ? -1 : 1) * sh * (pose === 1 ? 0.85 : 0.45), hyy = top + hgt * (pose === 1 ? 0.06 : 0.2);
    P.piece(P_ell(hx, hyy, hr * 0.45, hr * 0.55), FLESH, { flat: true, lw: P.lw * 0.7 });
    if (pose === 2 || pose === 4) {      // 책·지팡이 같은 들고 있는 것(무엇인지 특정하지 않는 형태)
      if (r() < 0.5) P.piece(P_rect(hx - hr * 0.7, hyy - hr * 0.2, hx + hr * 0.7, hyy + hr * 1.1), pick([P.pal.gold, 0x8a5a2b, P.pal.white], r), { flat: true, lw: P.lw * 0.7 });
      else P.lead(function (g2) { g2.moveTo(hx, hyy - hgt * 0.35); g2.lineTo(hx, bot); }, P.lw * 1.4);
    }
    // 머리·얼굴
    P.piece(P_ell(x + lean, hy, hr * 0.9, hr * 1.1), FLESH, { flat: true });
    P.piece(function (g2) { g2.moveTo(x + lean - hr * 0.95, hy); g2.quadraticCurveTo(x + lean, hy - hr * 1.7, x + lean + hr * 0.95, hy); g2.quadraticCurveTo(x + lean, hy - hr * 0.6, x + lean - hr * 0.95, hy); g2.closePath(); }, pick([0x6a4426, 0x8a6a3a, 0x3a2a1a, 0xc9a050], r), { flat: true, lw: P.lw * 0.6 });
    P.flushLeads();
    // 물감 선: 눈·코, 옷 주름(세로 곡선 몇 줄)
    P.paint(function (g2) { g2.moveTo(x + lean - hr * 0.35, hy + hr * 0.05); g2.lineTo(x + lean - hr * 0.12, hy + hr * 0.05); g2.moveTo(x + lean + hr * 0.12, hy + hr * 0.05); g2.lineTo(x + lean + hr * 0.35, hy + hr * 0.05); g2.moveTo(x + lean, hy + hr * 0.15); g2.lineTo(x + lean - hr * 0.08, hy + hr * 0.45); }, hr * 0.12, 0.7);
    P.paint(function (g2) {
      for (var f = 0; f < 4; f++) { var fx = x + (f - 1.5) * bw * 0.28 + (r() - 0.5) * bw * 0.1, fy0 = top + hgt * (0.25 + r() * 0.15); g2.moveTo(fx, fy0); g2.quadraticCurveTo(fx + (r() - 0.5) * bw * 0.25, (fy0 + bot) / 2, fx + (r() - 0.5) * bw * 0.2, bot - hgt * 0.03); }
    }, hgt * 0.012, 0.42);
  }
  // 고딕 감실(캐노피): 흰·금 건축 — 박공, 작은 첨두 창, 작은 첨탑
  function canopy(P, x0, x1, y0, y1, gothic) {
    var r = P.r, w = x1 - x0, cx = (x0 + x1) / 2, wh = P.pal.white, stone = shade(wh, 0.82), dark = pick(P.pal.ground2.concat(P.pal.ground), r);
    P.piece(P_rect(x0, y0, x1, y1), shade(dark, 0.85), { bb: [x0, y0, x1, y1] });
    if (gothic) {
      // 가운데 박공 + 양옆 작은 첨탑 두 개
      var gb = [[x0 + w * 0.14, y1 - (y1 - y0) * 0.22], [cx, y0 + (y1 - y0) * 0.08], [x1 - w * 0.14, y1 - (y1 - y0) * 0.22], [x1 - w * 0.14, y1], [x0 + w * 0.14, y1]];
      P.piece(P_poly(gb), wh, { bb: bbOf(gb) });
      var ia = [[cx - w * 0.18, y1 - (y1 - y0) * 0.12], [cx, y0 + (y1 - y0) * 0.36], [cx + w * 0.18, y1 - (y1 - y0) * 0.12], [cx + w * 0.18, y1], [cx - w * 0.18, y1]];
      P.piece(P_poly(ia), pick(P.pal.ground, r), { bb: bbOf(ia) });
      [-1, 1].forEach(function (sd) {
        var px = cx + sd * w * 0.36, pt = [[px - w * 0.07, y1], [px - w * 0.07, y0 + (y1 - y0) * 0.35], [px, y0], [px + w * 0.07, y0 + (y1 - y0) * 0.35], [px + w * 0.07, y1]];
        P.piece(P_poly(pt), stone, { bb: bbOf(pt) });
        P.piece(P_rect(px - w * 0.03, y0 + (y1 - y0) * 0.5, px + w * 0.03, y0 + (y1 - y0) * 0.8), pick(P.pal.ground2, r), { flat: true, lw: P.lw * 0.6 });
      });
      P.piece(P_circ(cx, y0 + (y1 - y0) * 0.58, w * 0.06), P.pal.gold, { flat: true, lw: P.lw * 0.7 });
    } else {
      // 르네상스 감실: 둥근 조개 벽감 + 처마
      P.piece(P_rect(x0 + w * 0.06, y1 - (y1 - y0) * 0.2, x1 - w * 0.06, y1), stone, { bb: [x0, y0, x1, y1] });
      var nr = w * 0.36, ny = y1 - (y1 - y0) * 0.2;
      for (var k = 0; k < 7; k++) P.piece(P_ring(cx, ny, nr * 0.25, nr, PI + PI * k / 7, PI + PI * (k + 1) / 7), k % 2 ? wh : P.pal.gold, { bb: [cx - nr, ny - nr, cx + nr, ny] });
      P.piece(P_rect(x0 + w * 0.04, y0 + (y1 - y0) * 0.12, x1 - w * 0.04, y0 + (y1 - y0) * 0.28), stone, { bb: [x0, y0, x1, y1] });
    }
    P.flushLeads();
    P.paint(function (g2) { for (var q = 0; q < 3; q++) { var yy = y0 + (y1 - y0) * (0.3 + q * 0.2); g2.moveTo(x0 + w * 0.2, yy); g2.lineTo(x1 - w * 0.2, yy); } }, w * 0.008, 0.25);
  }
  // 작은 건물(서사 장면의 배경): 탑·지붕
  function building(P, x, yb, w, h) {
    var r = P.r, wall = pick([0xe7d3b0, 0xd9b6a0, 0xc9d0b0, P.pal.white], r), roof = pick([0x9c2431, 0x3f7f3a, 0x8a5a2b, P.pal.gold], r);
    P.piece(P_rect(x - w / 2, yb - h, x + w / 2, yb), wall, { bb: [x - w / 2, yb - h, x + w / 2, yb] });
    P.piece(P_poly([[x - w * 0.6, yb - h], [x, yb - h - w * 0.55], [x + w * 0.6, yb - h]]), roof, { flat: true });
    P.piece(P_rect(x - w * 0.15, yb - h * 0.55, x + w * 0.15, yb - h * 0.2), shade(pick(P.pal.ground, r), 0.7), { flat: true, lw: P.lw * 0.6 });
  }
  // 바닥(언덕·땅)
  function ground(P, x0, x1, y, h) {
    var c = pick([0x3f7f3a, 0x5a8a3a, 0x8a6a3a, 0x4a7a4a], P.r);
    P.piece(function (g2) { g2.moveTo(x0, y + h); g2.lineTo(x0, y + h * 0.3); g2.quadraticCurveTo((x0 + x1) / 2, y - h * 0.4, x1, y + h * 0.25); g2.lineTo(x1, y + h); g2.closePath(); }, c, { bb: [x0, y - h * 0.3, x1, y + h] });
  }
  // 넓은 바탕을 여러 조각으로(실제 바탕 유리는 큰 판 한 장이 아니라 납선으로 이은 조각들): 굽은 납선 n 개
  function breakup(P, x0, y0, x1, y1, n) {
    var r = P.r, w = x1 - x0, h = y1 - y0;
    for (var i = 0; i < n; i++) {
      (function (ax, ay, bx, by, cx, cy) { P.lead(function (g2) { g2.moveTo(ax, ay); g2.quadraticCurveTo(cx, cy, bx, by); }, P.lw * 0.75); })(
        x0 + r() * w, y0 - 0.02, x0 + r() * w, y1 + 0.02, x0 + r() * w, y0 + r() * h);
      if (i % 2) (function (ay, by) { P.lead(function (g2) { g2.moveTo(x0 - 0.02, ay); g2.lineTo(x1 + 0.02, by); }, P.lw * 0.75); })(y0 + r() * h, y0 + r() * h);
    }
    P.flushLeads();
  }
  // 장면: 인물 1~3 + 배경 건물·땅
  function scene(P, x0, y0, x1, y1, n) {
    var r = P.r, w = x1 - x0, h = y1 - y0, i, robes = P.pal.robe;
    ground(P, x0, x1, y1 - h * 0.16, h * 0.16);
    if (r() < 0.6) building(P, x0 + w * (r() < 0.5 ? 0.22 : 0.78), y1 - h * 0.12, w * 0.22, h * 0.32);
    P.flushLeads();
    for (i = 0; i < n; i++) {
      var fx = x0 + w * (n === 1 ? 0.5 : 0.25 + 0.5 * i / (n - 1)) + (r() - 0.5) * w * 0.06;
      figure(P, fx, y1 - h * 0.06, h * (0.62 + r() * 0.1) * (n > 2 ? 0.9 : 1), pick(robes, r), pick(robes, r), Math.floor(r() * 5), { noHalo: r() < 0.35 });
    }
  }

  // ---- body 무늬들(칸 1×2: 가로 0..1, 세로 0..2; 위·아래 끝은 가로 철물 자리라 이어 붙여도 이음매가 납선으로 보인다) ----
  var BODY = {};
  BODY.medallion = function (P, v) {
    var r = P.r, pal = P.pal, bw = 0.13;
    borderStrip(P, 0, bw, 0, 2, 0.2, [pal.border[0], pal.border[1]], true);
    borderStrip(P, 1 - bw, 1, 0, 2, 0.2, [pal.border[0], pal.border[1]], true);
    diaper(P, bw, 0, 1 - bw, 2, 0.115, pal.ground[v % pal.ground.length], pal.ground2[v % pal.ground2.length]);
    // 메달리온 사이의 마름모(위·아래 끝 반쪽씩 → 이으면 온전한 마름모)
    [0, 2].forEach(function (yy) { var q = [[0.5, yy - 0.16], [0.68, yy], [0.5, yy + 0.16], [0.32, yy]]; P.piece(P_poly(q), pal.border[2] || pal.gold, { bb: bbOf(q) }); P.piece(P_circ(0.5, yy, 0.05), pal.white, { flat: true }); });
    // 메달리온: 원(또는 네잎) 고리 + 장면
    var cy = 1, R = 0.36, quatre = v % 3 === 1;
    if (quatre) {
      for (var k = 0; k < 4; k++) { var a = k * PI / 2; P.piece(P_circ(0.5 + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, R * 0.62), pal.border[0], { bb: [0.1, 0.6, 0.9, 1.4] }); }
    } else P.piece(P_circ(0.5, cy, R), pal.border[0], { bb: [0.14, 0.64, 0.86, 1.36] });
    P.flushLeads();
    var inner = quatre ? R * 0.88 : R * 0.86;
    P.piece(P_circ(0.5, cy, inner), pal.gold, { bb: [0.5 - inner, cy - inner, 0.5 + inner, cy + inner] });
    inner *= 0.92;
    P.piece(P_circ(0.5, cy, inner), pick([pal.ground2[0], pal.ground[0], 0x2f7d5b], r), { bb: [0.5 - inner, cy - inner, 0.5 + inner, cy + inner] });
    P.flushLeads();
    var g = P.g; g.save(); g.beginPath(); g.arc(0.5, cy, inner * 0.98, 0, TAU); g.clip();
    breakup(P, 0.5 - inner, cy - inner, 0.5 + inner, cy + inner, 5);
    scene(P, 0.5 - inner, cy - inner * 0.95, 0.5 + inner, cy + inner * 0.9, 1 + (v % 2) + (r() < 0.3 ? 1 : 0));
    g.restore();
    P.lead(P_circ(0.5, cy, inner), P.lw * 1.2); P.flushLeads();
    // 가로 철물(이음매)
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 2.6); P.flushLeads();
  };
  BODY.tiers = function (P, v) {
    var r = P.r, pal = P.pal, bw = 0.1, gothic = P.st && P.st.canopy ? P.st.canopy === 'gothic' : pal !== PAL.ren15;
    borderStrip(P, 0, bw, 0, 2, 0.16, [pal.border[0], pal.border[1], pal.border[0], pal.border[2] || pal.border[1]], true);
    borderStrip(P, 1 - bw, 1, 0, 2, 0.16, [pal.border[0], pal.border[1], pal.border[0], pal.border[2] || pal.border[1]], true);
    canopy(P, bw, 1 - bw, 0, 0.62, gothic);
    // 인물 뒤 바탕: 다마스크(작은 무늬를 그린 한 색 바탕)
    var bg = pal.ground[v % pal.ground.length];
    P.piece(P_rect(bw, 0.62, 1 - bw, 1.84), bg, { bb: [bw, 0.62, 1 - bw, 1.84] });
    P.flushLeads();
    P.paint(function (g2) { for (var yy = 0.7; yy < 1.8; yy += 0.12) for (var xx = bw + 0.06 + ((Math.round(yy / 0.12) % 2) ? 0.06 : 0); xx < 1 - bw; xx += 0.12) { g2.moveTo(xx + 0.025, yy); g2.arc(xx, yy, 0.025, 0, TAU); } }, 0.008, 0.3);
    var g0 = P.g; g0.save(); g0.beginPath(); g0.rect(bw, 0.62, 1 - 2 * bw, 1.22); g0.clip(); breakup(P, bw, 0.62, 1 - bw, 1.84, 5); g0.restore();
    figure(P, 0.5, 1.83, 1.12, pal.robe[(v * 2 + 1) % pal.robe.length], pal.robe[(v * 2 + 3) % pal.robe.length], v % 5, {});
    // 받침과 글귀 띠(읽을 수 없는 붓 자국)
    P.piece(P_rect(bw, 1.84, 1 - bw, 2), shade(pal.white, 0.88), { bb: [bw, 1.84, 1 - bw, 2] });
    P.piece(P_rect(bw + 0.04, 1.87, 1 - bw - 0.04, 1.97), 0xf0dc8a, { bb: [bw, 1.87, 1 - bw, 1.97] });
    P.flushLeads();
    P.paint(function (g2) { for (var q = 0; q < 9; q++) { var xx = bw + 0.08 + q * 0.07; g2.moveTo(xx, 1.9); g2.lineTo(xx + 0.03 * (r() - 0.3), 1.94); } }, 0.01, 0.6);
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); g2.moveTo(bw, 0.62); g2.lineTo(1 - bw, 0.62); }, P.lw * 2.4); P.flushLeads();
  };
  BODY.narrative = function (P, v) {
    var r = P.r, pal = P.pal, fw = 0.06;
    // 흰·노랑 틀 + 위쪽 삼엽 아치(작은 건축 틀) + 파랑/빨강 바탕의 장면
    P.piece(P_rect(0, 0, 1, 2), pal.border[v % 2 ? 1 : 0], { bb: [0, 0, 1, 2] });
    var bg = v % 2 ? pal.ground2[0] : pal.ground[v % pal.ground.length];
    P.piece(P_rect(fw, fw, 1 - fw, 2 - fw), bg, { bb: [fw, fw, 1 - fw, 2 - fw] });
    P.flushLeads();
    P.paint(function (g2) { for (var q = 0; q < 26; q++) { var xx = fw + r() * (1 - 2 * fw), yy = 0.45 + r() * 1.0; g2.moveTo(xx + 0.012, yy); g2.arc(xx, yy, 0.012, 0, TAU); } }, 0.006, 0.35);
    // 삼엽 아치 틀(흰 돌): 위 0.45
    var ay = 0.42;
    P.piece(function (g2) { g2.moveTo(fw, fw); g2.lineTo(1 - fw, fw); g2.lineTo(1 - fw, ay); g2.arc(0.5 + 0.22, ay, 0.16, 0, PI, true); g2.arc(0.5, ay - 0.08, 0.13, 0, PI, true); g2.arc(0.5 - 0.22, ay, 0.16, 0, PI, true); g2.lineTo(fw, ay); g2.closePath(); }, pal.white, { bb: [0, 0, 1, ay] });
    P.piece(P_poly([[0.42, fw + 0.02], [0.5, fw + 0.12], [0.58, fw + 0.02]]), pal.gold, { flat: true });
    P.piece(P_circ(0.2, fw + 0.12, 0.05), pick(pal.robe, r), { flat: true }); P.piece(P_circ(0.8, fw + 0.12, 0.05), pick(pal.robe, r), { flat: true });
    P.flushLeads();
    var g = P.g; g.save(); g.beginPath(); g.rect(fw, ay - 0.05, 1 - 2 * fw, 2 - fw - ay + 0.05); g.clip();
    breakup(P, fw, ay, 1 - fw, 2 - fw, 6);
    scene(P, fw, ay + 0.15, 1 - fw, 2 - fw, 2 + (v % 2));
    g.restore();
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 2.6); P.flushLeads();
  };
  // 꽃잎 경로(값을 묶어 두는 닫힘: 납선은 나중에 한꺼번에 긋는다)
  function petal(cx, cy, a, R) { return function (g2) { g2.moveTo(cx, cy); g2.quadraticCurveTo(cx + Math.cos(a - 0.5) * R * 1.1, cy + Math.sin(a - 0.5) * R * 1.1, cx + Math.cos(a) * R, cy + Math.sin(a) * R); g2.quadraticCurveTo(cx + Math.cos(a + 0.5) * R * 1.1, cy + Math.sin(a + 0.5) * R * 1.1, cx, cy); g2.closePath(); }; }
  BODY.ornament = function (P, v) {
    var r = P.r, pal = P.pal, bw = 0.11;
    borderStrip(P, 0, bw, 0, 2, 0.14, [pal.border[0], pal.border[2] || pal.border[1]], false);
    borderStrip(P, 1 - bw, 1, 0, 2, 0.14, [pal.border[0], pal.border[2] || pal.border[1]], false);
    P.piece(P_rect(bw, 0, 1 - bw, 2), pal.ground[v % pal.ground.length], { bb: [bw, 0, 1 - bw, 2] });
    P.flushLeads();
    // 그리자유 덩굴(물감 선)
    P.paint(function (g2) { for (var q = 0; q < 6; q++) { var yy = q * 0.36; g2.moveTo(bw + 0.03, yy); g2.bezierCurveTo(0.9, yy + 0.1, 0.1, yy + 0.25, 1 - bw - 0.03, yy + 0.36); } }, 0.012, 0.35);
    // 꽃(로제트) 두 송이: 위·아래 끝은 반 송이(이으면 온전)
    [[0.5, 0.5], [0.5, 1.5], [0.5, 0], [0.5, 2]].forEach(function (c, ci) {
      var R = ci < 2 ? 0.3 : 0.17, n = ci < 2 ? (v % 2 ? 8 : 6) : 4, a0 = ci % 2 ? PI / n : 0, pc = pal.border[(ci + v) % pal.border.length], cc = pal.gold;
      for (var k = 0; k < n; k++) {
        var a = a0 + k * TAU / n, px = c[0] + Math.cos(a) * R * 0.55, py = c[1] + Math.sin(a) * R * 0.55;
        P.piece(petal(c[0], c[1], a, R), k % 2 && ci < 2 ? (pal.robe[(k + v) % pal.robe.length]) : pc, { bb: [px - R / 2, py - R / 2, px + R / 2, py + R / 2] });
      }
      P.piece(P_circ(c[0], c[1], R * 0.24), cc, { flat: true });
      if (ci < 2) [-1, 1].forEach(function (sd) { var lx = c[0] + sd * 0.3, ly = c[1] + 0.32; P.piece(P_ell(lx, ly, 0.06, 0.11), pal.accent[0] || 0x2f7d5b, { flat: false, bb: [lx - 0.06, ly - 0.11, lx + 0.06, ly + 0.11] }); });
    });
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); g2.moveTo(bw, 1); g2.lineTo(0.2, 1); g2.moveTo(0.8, 1); g2.lineTo(1 - bw, 1); }, P.lw * 2.2); P.flushLeads();
  };
  BODY.grisaille = function (P, v) {
    var pal = P.pal, bw = 0.08, i, j;
    borderStrip(P, 0, bw, 0, 2, 0.25, [pal.border[v % pal.border.length], pal.white], false);
    borderStrip(P, 1 - bw, 1, 0, 2, 0.25, [pal.border[v % pal.border.length], pal.white], false);
    // 원·마름모 엮음 격자(옅은 유리), 원 안에 작은 색 조각
    for (j = 0; j < 4; j++) for (i = 0; i < 2; i++) {
      var x0 = bw + i * (1 - 2 * bw) / 2, x1 = x0 + (1 - 2 * bw) / 2, y0 = j * 0.5, y1 = y0 + 0.5;
      P.piece(P_rect(x0, y0, x1, y1), pal.ground[(i + j + v) % pal.ground.length], { bb: [x0, y0, x1, y1] });
    }
    for (j = 0; j < 4; j++) for (i = 0; i < 2; i++) {
      var cx = bw + (i + 0.5) * (1 - 2 * bw) / 2, cy = j * 0.5 + 0.25;
      P.piece(P_circ(cx, cy, 0.17), pal.ground[(i + j + v + 1) % pal.ground.length], { bb: [cx - 0.17, cy - 0.17, cx + 0.17, cy + 0.17] });
      if ((i + j + v) % 3 === 0) P.piece(P_circ(cx, cy, 0.05), pal.border[(i + j) % pal.border.length], { flat: true });
    }
    P.flushLeads();
    P.paint(function (g2) { for (j = 0; j < 4; j++) for (i = 0; i < 2; i++) { var cx2 = bw + (i + 0.5) * (1 - 2 * bw) / 2, cy2 = j * 0.5 + 0.25; for (var k = 0; k < 4; k++) { var a = k * PI / 2 + PI / 4; g2.moveTo(cx2, cy2); g2.quadraticCurveTo(cx2 + Math.cos(a + 0.5) * 0.12, cy2 + Math.sin(a + 0.5) * 0.12, cx2 + Math.cos(a) * 0.15, cy2 + Math.sin(a) * 0.15); } } }, 0.01, 0.45);
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 2); P.flushLeads();
  };
  BODY.quarry = function (P, v) {
    var r = P.r, pal = P.pal, bw = 0.06, s = 0.2, i, j;
    var bcs = pal.border.length > 2 ? pal.border : [pal.border[0], pal.border[1] || pal.border[0]], bstep = pal.border.length > 2 ? 0.25 : 0.4;
    borderStrip(P, 0, bw, 0, 2, bstep, bcs, false);
    borderStrip(P, 1 - bw, 1, 0, 2, bstep, bcs.slice().reverse(), false);
    var g = P.g; g.save(); g.beginPath(); g.rect(bw, 0, 1 - 2 * bw, 2); g.clip();
    for (j = -1; j <= 2 / (s * 0.7) + 1; j++) for (i = -1; i <= 1 / s + 1; i++) {
      var cx = bw + i * s + (j % 2 ? s / 2 : 0), cy = j * s * 0.7, q = [[cx, cy - s * 0.7], [cx + s / 2, cy], [cx, cy + s * 0.7], [cx - s / 2, cy]];
      P.piece(P_poly(q), pick(pal.ground, r), { bb: bbOf(q), lw: P.lw * 0.6 });
    }
    P.flushLeads(); g.restore();
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 1.6); P.flushLeads();
  };
  BODY.alabaster = function (P, v) {
    var r = P.r, pal = P.pal, g = P.g;
    // 판 두 장(위·아래) + 가는 돌 띠. 판마다 결(굽은 줄무늬)·얼룩
    [[0, 1], [1, 2]].forEach(function (yy, k) {
      var y0 = yy[0] + 0.02, y1 = yy[1] - 0.02, base = pal.ground[(v + k) % pal.ground.length];
      P.piece(P_rect(0.03, y0, 0.97, y1), base, { bb: [0, y0, 1, y1], lead: false });
      g.save(); g.beginPath(); g.rect(0.03, y0, 0.94, y1 - y0); g.clip();
      for (var q = 0; q < 26; q++) {
        var c = r() < 0.5 ? pal.ground2[q % pal.ground2.length] : pal.white, x = r(), y = y0 + r() * (y1 - y0), w = 0.004 + r() * 0.03;
        g.strokeStyle = css(c, 0.12 + r() * 0.25); g.lineWidth = w; g.beginPath(); g.moveTo(x - 0.4, y - 0.2);
        g.bezierCurveTo(x - 0.1, y + (r() - 0.5) * 0.5, x + 0.1, y + (r() - 0.5) * 0.5, x + 0.5, y + (r() - 0.5) * 0.4); g.stroke();
      }
      for (q = 0; q < 6; q++) { var bx = 0.1 + r() * 0.8, by = y0 + r() * (y1 - y0), br = 0.06 + r() * 0.15; if (g.createRadialGradient) { var gr = g.createRadialGradient(bx, by, 0, bx, by, br); gr.addColorStop(0, css(pal.white, 0.35)); gr.addColorStop(1, css(pal.white, 0)); g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2); } }
      g.restore();
    });
    g.fillStyle = css(0x5a4430); g.fillRect(0, 0, 0.03, 2); g.fillRect(0.97, 0, 0.03, 2); g.fillRect(0, 0, 1, 0.02); g.fillRect(0, 0.98, 1, 0.04); g.fillRect(0, 1.98, 1, 0.02);
  };
  // 추상 색면: 무작위 직선으로 거듭 자른 조각(격자 아님) + 큰 색 흐름(세로 그러데이션 + 띠)
  function cutPieces(r, poly, depth, out, minA) {
    var bb = bbOf(poly), w = bb[2] - bb[0], h = bb[3] - bb[1];
    if (depth <= 0 || w * h < minA) { out.push(poly); return; }
    var cx = bb[0] + w * (0.3 + r() * 0.4), cy = bb[1] + h * (0.3 + r() * 0.4), ang = (h > w ? 0 : PI / 2) + (r() - 0.5) * 1.4;
    var dx = Math.cos(ang), dy = Math.sin(ang), A = [], B = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length], sp = (p[0] - cx) * dy - (p[1] - cy) * dx, sq = (q[0] - cx) * dy - (q[1] - cy) * dx;
      if (sp >= 0) A.push(p); else B.push(p);
      if ((sp >= 0) !== (sq >= 0)) { var t = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; A.push(m); B.push(m); }
    }
    if (A.length < 3 || B.length < 3) { out.push(poly); return; }
    cutPieces(r, A, depth - 1, out, minA); cutPieces(r, B, depth - 1, out, minA);
  }
  function abstractField(P, poly, v, flowY) {
    var r = P.r, pal = P.pal, out = [], cs = pal.ground, i;
    cutPieces(r, poly, 6, out, 0.012);
    var bb = bbOf(poly), ph = r() * TAU, k0 = Math.floor(r() * cs.length);
    for (i = 0; i < out.length; i++) {
      var q = out[i], m = bbOf(q), cx = (m[0] + m[2]) / 2, cy = (m[1] + m[3]) / 2;
      // 색 흐름: 위치에 따라 팔레트를 천천히 돈다(이웃 조각끼리 비슷한 색 → 큰 색면), 가끔 튀는 색
      var f = (cy - bb[1]) / Math.max(0.01, bb[3] - bb[1]) * (flowY || 1.6) + Math.sin(cx * 3 + ph) * 0.35 + v * 0.37;
      var c = r() < 0.12 ? cs[Math.floor(r() * cs.length)] : cs[(k0 + Math.floor(Math.abs(f) * 2.2)) % cs.length];
      P.piece(P_poly(q), c, { bb: m, lw: P.lw * (0.8 + r() * 0.5) });
    }
    P.flushLeads();
  }
  BODY.abstract = function (P, v) {
    abstractField(P, [[0, 0], [1, 0], [1, 2], [0, 2]], v, 1.6);
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 2.2); P.flushLeads();
  };
  // 13세기풍 추상 모자이크(아시시): 테두리 띠 + 바탕 + 원형 메달리온 2개(안은 잘게 자른 색 조각 — 인물·장면 없음) + 사이 마름모
  function mosaicDisc(P, cx, cy, R, v, rimCol) {
    var r = P.r, pal = P.pal, poly = [], out = [], k;
    P.piece(P_circ(cx, cy, R + 0.04), rimCol, {});
    for (k = 0; k < 20; k++) { var a = k * TAU / 20; poly.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    cutPieces(r, poly, 5, out, 0.006);
    for (k = 0; k < out.length; k++) { var q = out[k]; P.piece(P_poly(q), pal.robe[Math.floor(r() * pal.robe.length)], { bb: bbOf(q) }); }
    P.piece(P_circ(cx, cy, R * 0.18), pal.gold, { flat: true });
    P.flushLeads();
  }
  BODY.mosaic13 = function (P, v) {
    var pal = P.pal, bw = 0.1;
    borderStrip(P, 0, bw, 0, 2, 0.12, [pal.border[0], pal.border[1]], false);
    borderStrip(P, 1 - bw, 1, 0, 2, 0.12, [pal.border[0], pal.border[1]], false);
    P.piece(P_rect(bw, 0, 1 - bw, 2), pal.ground[v % pal.ground.length], { bb: [bw, 0, 1 - bw, 2] });
    P.flushLeads();
    mosaicDisc(P, 0.5, 0.5, 0.3, v, pal.border[0]);
    mosaicDisc(P, 0.5, 1.5, 0.3, v + 1, pal.border[(v + 1) % 2 ? 1 : 0]);
    [[0.5, 1.0], [0.5, 0.0], [0.5, 2.0]].forEach(function (c) { var d = c[1] === 1 ? 0.12 : 0.08; P.piece(P_poly([[c[0], c[1] - d], [c[0] + d, c[1]], [c[0], c[1] + d], [c[0] - d, c[1]]]), pal.gold, {}); });
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); g2.moveTo(bw, 1); g2.lineTo(0.36, 1); g2.moveTo(0.64, 1); g2.lineTo(1 - bw, 1); }, P.lw * 2.2); P.flushLeads();
  };
  // 우리 본당(가상): 색면 + 가운데 단순한 상징 하나(십자가·비둘기·잔·장미·별)
  function symbol(P, kind, cx, cy, R) {
    var pal = P.pal, wh = pal.white, gold = pal.gold;
    if (kind === 0) { P.piece(P_rect(cx - R * 0.14, cy - R * 0.8, cx + R * 0.14, cy + R * 0.8), wh, {}); P.piece(P_rect(cx - R * 0.55, cy - R * 0.38, cx + R * 0.55, cy - R * 0.12), wh, {}); }
    else if (kind === 1) { P.piece(function (g2) { g2.moveTo(cx - R * 0.8, cy - R * 0.2); g2.quadraticCurveTo(cx - R * 0.3, cy - R * 0.6, cx, cy); g2.quadraticCurveTo(cx + R * 0.3, cy - R * 0.6, cx + R * 0.8, cy - R * 0.2); g2.quadraticCurveTo(cx + R * 0.3, cy + R * 0.1, cx + R * 0.1, cy + R * 0.5); g2.lineTo(cx - R * 0.1, cy + R * 0.5); g2.quadraticCurveTo(cx - R * 0.3, cy + R * 0.1, cx - R * 0.8, cy - R * 0.2); g2.closePath(); }, wh, {}); }
    else if (kind === 2) { P.piece(function (g2) { g2.moveTo(cx - R * 0.5, cy - R * 0.6); g2.lineTo(cx + R * 0.5, cy - R * 0.6); g2.quadraticCurveTo(cx + R * 0.45, cy, cx + R * 0.08, cy + R * 0.1); g2.lineTo(cx + R * 0.08, cy + R * 0.5); g2.lineTo(cx + R * 0.35, cy + R * 0.7); g2.lineTo(cx - R * 0.35, cy + R * 0.7); g2.lineTo(cx - R * 0.08, cy + R * 0.5); g2.lineTo(cx - R * 0.08, cy + R * 0.1); g2.quadraticCurveTo(cx - R * 0.45, cy, cx - R * 0.5, cy - R * 0.6); g2.closePath(); }, gold, {}); P.piece(P_circ(cx, cy - R * 0.85, R * 0.18), wh, {}); }
    else if (kind === 3) { for (var k = 0; k < 5; k++) { var a = k * TAU / 5 - PI / 2; P.piece(P_circ(cx + Math.cos(a) * R * 0.36, cy + Math.sin(a) * R * 0.36, R * 0.34), pal.accent[0] || 0xc8404a, {}); } P.piece(P_circ(cx, cy, R * 0.22), gold, {}); }
    else { var st = []; for (k = 0; k < 16; k++) { var b = k * TAU / 16 - PI / 2, rr = k % 2 ? R * 0.32 : R * 0.8; st.push([cx + Math.cos(b) * rr, cy + Math.sin(b) * rr]); } P.piece(P_poly(st), gold, { bb: bbOf(st) }); }
    P.flushLeads();
  }
  // 창 몸통은 색면만(빛줄기 같은 세로 띠), 상징은 아치 머리·원창 가운데에 한 번
  BODY.parish = function (P, v) {
    abstractField(P, [[0, 0], [1, 0], [1, 2], [0, 2]], v, 1.2);
    P.piece(function (g2) { g2.moveTo(0.42, 0); g2.quadraticCurveTo(0.56, 1, 0.44, 2); g2.lineTo(0.58, 2); g2.quadraticCurveTo(0.7, 1, 0.56, 0); g2.closePath(); }, P.pal.gold, { bb: [0.4, 0, 0.7, 2] });
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 0); g2.lineTo(1, 0); g2.moveTo(0, 2); g2.lineTo(1, 2); }, P.lw * 2.2); P.flushLeads();
  };

  // ---- head(아치 머리, 1×1: 아래 끝 = 기공선, 위 가운데 = 꼭대기) ----
  var HEAD = {};
  HEAD.tracery = function (P, v) {
    var r = P.r, pal = P.pal;
    P.piece(P_rect(0, 0, 1, 1), pal.ground[v % pal.ground.length], { bb: [0, 0, 1, 1] });
    // 세잎·네잎 트레이서리(납으로 짠 둥근 잎) + 작은 단검 조각
    var cx = 0.5, cy = 0.56, n = v % 2 ? 4 : 3, R = 0.2;
    for (var k = 0; k < n; k++) { var a = -PI / 2 + k * TAU / n; P.piece(P_circ(cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75, R * 0.6), pal.border[k % pal.border.length], { bb: [cx - R, cy - R, cx + R, cy + R] }); }
    P.piece(P_circ(cx, cy, R * 0.42), pal.gold, {});
    P.piece(P_circ(cx, cy, R * 0.18), pal.white, { flat: true });
    [-1, 1].forEach(function (sd) { var q = [[cx + sd * 0.24, 0.98], [cx + sd * 0.42, 0.98], [cx + sd * 0.36, 0.78]]; P.piece(P_poly(q), pick(pal.robe.length ? pal.robe : pal.border, r), {}); });
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 1); g2.lineTo(1, 1); }, P.lw * 2.4); P.flushLeads();
  };
  HEAD.shell = function (P, v) {
    var pal = P.pal, cx = 0.5, cy = 1, n = 9;
    P.piece(P_rect(0, 0, 1, 1), pal.ground[0], { bb: [0, 0, 1, 1] });
    for (var k = 0; k < n; k++) P.piece(P_ring(cx, cy, 0.18, 0.95, PI + PI * k / n, PI + PI * (k + 1) / n), k % 2 ? pal.gold : (v % 2 ? pal.ground2[0] : pal.ground[1]), { bb: [0, 0, 1, 1] });
    P.piece(P_ring(cx, cy, 0, 0.18, PI, TAU), pal.white, {});
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 1); g2.lineTo(1, 1); }, P.lw * 2.4); P.flushLeads();
  };
  HEAD.abstract = function (P, v) { abstractField(P, [[0, 0], [1, 0], [1, 1], [0, 1]], v + 3, 1.0); };
  HEAD.parish = function (P, v) { abstractField(P, [[0, 0], [1, 0], [1, 1], [0, 1]], v + 3, 1.0); P.piece(P_circ(0.5, 0.6, 0.22), P.pal.ground2[0], {}); P.flushLeads(); symbol(P, v % 5, 0.5, 0.6, 0.19); };
  HEAD.mosaic13 = function (P, v) {
    var pal = P.pal;
    P.piece(P_rect(0, 0, 1, 1), pal.ground[v % pal.ground.length], { bb: [0, 0, 1, 1] });
    P.flushLeads();
    mosaicDisc(P, 0.5, 0.62, 0.22, v + 3, pal.border[1]);
    P.lead(function (g2) { g2.moveTo(0, 1); g2.lineTo(1, 1); }, P.lw * 2.2); P.flushLeads();
  };
  HEAD.ornament = function (P, v) {
    var pal = P.pal;
    P.piece(P_rect(0, 0, 1, 1), pal.ground[v % pal.ground.length], { bb: [0, 0, 1, 1] });
    var cx = 0.5, cy = 0.6;
    for (var k = 0; k < 6; k++) { var a = k * TAU / 6; P.piece(P_circ(cx + Math.cos(a) * 0.14, cy + Math.sin(a) * 0.14, 0.1), pal.border[k % pal.border.length], {}); }
    P.piece(P_circ(cx, cy, 0.08), pal.gold, {});
    P.flushLeads();
    P.lead(function (g2) { g2.moveTo(0, 1); g2.lineTo(1, 1); }, P.lw * 2.2); P.flushLeads();
  };
  HEAD.grisaille = function (P, v) { BODY.grisaille(P, v); };
  HEAD.quarry = function (P, v) { BODY.quarry(P, v); };
  HEAD.alabaster = function (P, v) { BODY.alabaster(P, v); };

  // ---- disc(원창, 2×2: 가운데 (1,1), 반지름 1) ----
  var DISC = {};
  DISC.rose = function (P, v) {
    var r = P.r, pal = P.pal, cx = 1, cy = 1, n = v % 2 ? 12 : 10, k;
    P.piece(P_circ(cx, cy, 1), pal.ground[0], { bb: [0, 0, 2, 2] });
    for (k = 0; k < n * 2; k++) { var a = k * TAU / (n * 2); P.piece(P_circ(cx + Math.cos(a) * 0.86, cy + Math.sin(a) * 0.86, 0.1), pal.border[k % 2 ? 1 : 0], {}); }
    for (k = 0; k < n; k++) {
      var a0 = k * TAU / n, a1 = (k + 1) * TAU / n, am = (a0 + a1) / 2, q = [[cx + Math.cos(am) * 0.3, cy + Math.sin(am) * 0.3], [cx + Math.cos(a0 + 0.08) * 0.62, cy + Math.sin(a0 + 0.08) * 0.62], [cx + Math.cos(am) * 0.76, cy + Math.sin(am) * 0.76], [cx + Math.cos(a1 - 0.08) * 0.62, cy + Math.sin(a1 - 0.08) * 0.62]];
      P.piece(P_poly(q), k % 2 ? pal.border[0] : pick(pal.ground2.concat(pal.robe.length ? [pal.robe[k % pal.robe.length]] : []), r), { bb: bbOf(q) });
      P.piece(P_circ(cx + Math.cos(am) * 0.53, cy + Math.sin(am) * 0.53, 0.06), pal.gold, { flat: true });
    }
    for (k = 0; k < 8; k++) P.piece(P_ring(cx, cy, 0.1, 0.28, k * TAU / 8, (k + 1) * TAU / 8), k % 2 ? pal.gold : pal.border[0], {});
    P.piece(P_circ(cx, cy, 0.1), pal.white, {});
    P.flushLeads();
    P.lead(P_circ(cx, cy, 0.99), P.lw * 3); P.flushLeads();
  };
  DISC.oculus = function (P, v) {
    var r = P.r, pal = P.pal, cx = 1, cy = 1, k, n = 28;
    // 넓은 장식 테(피렌체 오쿨루스의 짜임: 색 조각·흰 구슬을 번갈아 두른 굵은 테) + 안쪽 장면
    for (k = 0; k < n; k++) P.piece(P_ring(cx, cy, 0.74, 0.98, k * TAU / n, (k + 1) * TAU / n), pal.border[k % pal.border.length], { bb: [0, 0, 2, 2] });
    for (k = 0; k < n; k++) { var a = (k + 0.5) * TAU / n; P.piece(P_circ(cx + Math.cos(a) * 0.86, cy + Math.sin(a) * 0.86, 0.035), pal.white, { flat: true, lw: P.lw * 0.6 }); }
    P.piece(P_circ(cx, cy, 0.74), pal.gold, {});
    P.piece(P_circ(cx, cy, 0.7), pal.ground[v % pal.ground.length], { bb: [0.3, 0.3, 1.7, 1.7] });
    P.flushLeads();
    var g = P.g; g.save(); g.beginPath(); g.arc(cx, cy, 0.69, 0, TAU); g.clip();
    P.paint(function (g2) { for (var q = 0; q < 18; q++) { var xx = 0.4 + r() * 1.2, yy = 0.35 + r() * 0.5; g2.moveTo(xx + 0.015, yy); g2.arc(xx, yy, 0.015, 0, TAU); } }, 0.008, 0.35);
    breakup(P, 0.3, 0.3, 1.7, 1.7, 7);
    scene(P, 0.3, 0.42, 1.7, 1.64, 2 + (v % 2));
    g.restore();
    P.lead(P_circ(cx, cy, 0.7), P.lw * 1.6); P.lead(P_circ(cx, cy, 0.99), P.lw * 3); P.flushLeads();
  };
  DISC.abstract = function (P, v) {
    // 방사 추상: 고리·부채꼴로 나눈 뒤 다시 자른 조각
    var r = P.r, cx = 1, cy = 1, rings = [0, 0.3, 0.62, 1.0], segs = [6, 10, 16], k, j;
    for (j = 0; j < 3; j++) for (k = 0; k < segs[j]; k++) {
      var a0 = k * TAU / segs[j] + j * 0.2, a1 = (k + 1) * TAU / segs[j] + j * 0.2, pts = [], s, ns = 4;
      for (s = 0; s <= ns; s++) { var a = a0 + (a1 - a0) * s / ns; pts.push([cx + Math.cos(a) * rings[j + 1], cy + Math.sin(a) * rings[j + 1]]); }
      for (s = ns; s >= 0; s--) { a = a0 + (a1 - a0) * s / ns; pts.push([cx + Math.cos(a) * rings[j], cy + Math.sin(a) * rings[j]]); }
      var out = []; cutPieces(r, pts, j === 0 ? 0 : 1, out, 0.02);
      var cs = P.pal.ground;
      out.forEach(function (q, qi) { P.piece(P_poly(q), cs[(k * (j + 1) + qi + v * 2 + (r() < 0.15 ? 3 : 0)) % cs.length], { bb: bbOf(q) }); });
    }
    P.flushLeads();
    P.lead(P_circ(cx, cy, 0.99), P.lw * 3); P.flushLeads();
  };
  DISC.parish = function (P, v) { DISC.abstract(P, v); P.piece(P_circ(1, 1, 0.34), P.pal.ground2[0], {}); P.flushLeads(); symbol(P, v % 5, 1, 1, 0.3); };
  // 무늬 판 두 장을 나란히(늘리지 않는다) + 둘레 납 고리
  function twoBodies(P, fn, v, ring) { var g = P.g; fn(P, v); g.save(); g.translate(1, 0); fn(P, v + 1); g.restore(); if (ring) { P.lead(P_circ(1, 1, 0.99), P.lw * 3); P.flushLeads(); } }
  DISC.grisaille = function (P, v) { twoBodies(P, BODY.grisaille, v, true); };
  DISC.quarry = function (P, v) { twoBodies(P, BODY.quarry, v, true); };
  DISC.alabaster = function (P, v) { twoBodies(P, BODY.alabaster, v, false); };

  // ---- 유리 질감: 조각을 다 그린 뒤 칸 전체에 얼룩(낮은 주파수)·기포(높은 주파수)·세로 결을 얹는다 ----
  var noiseCache = {};
  function noiseCanvas(n, seed, blur) {
    var key = n + ':' + seed;
    if (noiseCache[key]) return noiseCache[key];
    var c = root.document && root.document.createElement ? root.document.createElement('canvas') : null;
    if (!c || !c.getContext) return null;
    c.width = c.height = n;
    var g = c.getContext('2d'); if (!g || !g.createImageData) return null;
    var im = g.createImageData(n, n), r = rng(seed), d = im.data;
    if (!d || !d.length) return null;
    for (var i = 0; i < n * n; i++) { var v = 128 + (r() - 0.5) * 2 * blur; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    noiseCache[key] = c;
    return c;
  }
  function glassSurface(g, x, y, w, h, r) {
    if (!g.drawImage) return;
    var lo = noiseCanvas(16, 7, 120), hi = noiseCanvas(128, 11, 60);
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    var prev = g.globalCompositeOperation;
    try {
      g.globalCompositeOperation = 'soft-light';
      if (lo) { g.globalAlpha = 0.55; g.imageSmoothingEnabled = true; g.drawImage(lo, Math.floor(r() * 8), Math.floor(r() * 8), 8, 8, x, y, w, h); }
      if (hi) { g.globalAlpha = 0.35; g.drawImage(hi, 0, 0, 128, 128, x, y, Math.max(w, 128), Math.max(h, 128)); }
      // 세로 결(손으로 분 유리의 줄): 아주 옅은 밝은/어두운 가는 띠
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      for (var k = 0; k < Math.round(w / 6); k++) { var sx = x + r() * w; g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)'; g.fillRect(sx, y, 1 + r() * 2.5, h); }
    } catch (e) { /* 일부 합성 모드가 없는 환경 */ }
    g.globalCompositeOperation = prev || 'source-over'; g.globalAlpha = 1;
    g.restore();
  }

  // 칸 하나 그리기. px,py = 픽셀 위치, unit = 칸 px
  function drawTile(g, t, px, py, unit) {
    var st = STYLES[t.style] || STYLES.gothic_medal, pal = PAL[st.pal] || PAL.gothic, sz = SIZE[t.part] || [1, 1];
    var kind = t.part === 'disc' ? st.disc : (t.part === 'head' ? st.head : st.body);
    var fn = t.part === 'disc' ? DISC[kind] : (t.part === 'head' ? HEAD[kind] : BODY[kind]);
    var r = rng(hash(t.style + '|' + t.part + '|' + t.variant));
    g.save();
    g.beginPath(); g.rect(px, py, sz[0] * unit, sz[1] * unit); g.clip();
    g.fillStyle = css(LEAD); g.fillRect(px, py, sz[0] * unit, sz[1] * unit);
    g.translate(px, py); g.scale(unit, unit);
    // 납선 굵기: 칸 256px 기준 약 3.3px(멀리서도 납선이 읽히게), 128px 에서는 같은 비율
    var P = new Painter(g, unit, r, pal, kind === 'abstract' || kind === 'parish' ? 0.016 : 0.013);
    P.st = st;
    if (fn) fn(P, t.variant | 0);
    g.restore();
    glassSurface(g, px, py, sz[0] * unit, sz[1] * unit, r);
  }

  // tiles: {key:{style, part, variant}} → {canvas, w, h, unit, rects:{key:[u0,v0,u1,v1]}(WebGL: v 위가 1), mb}
  // opts.unit: 칸 px(기본 256), opts.maxW/maxH: 칸 수 상한(기본 8×4 = 2048×1024). 넘치면 칸 px 를 반으로(같은 메모리 상한).
  function atlas(tiles, opts) {
    opts = opts || {};
    var unit = opts.unit || 256, maxW = opts.maxW || 8, maxH = opts.maxH || 4;
    var L = layout(tiles, maxW, maxH);
    while (!L.fits && unit > 64) { unit /= 2; maxW *= 2; maxH *= 2; L = layout(tiles, maxW, maxH); }
    var W = L.w * unit, H = L.h * unit, inset = 1.5;
    var doc = root.document, cv = opts.canvas || (doc && doc.createElement ? doc.createElement('canvas') : null);
    var rects = {};
    Object.keys(L.rects).forEach(function (k) {
      var q = L.rects[k], x0 = q[0] * unit + inset, y0 = q[1] * unit + inset, x1 = (q[0] + q[2]) * unit - inset, y1 = (q[1] + q[3]) * unit - inset;
      rects[k] = [x0 / W, 1 - y1 / H, x1 / W, 1 - y0 / H];
    });
    var res = { canvas: cv, w: W, h: H, unit: unit, cells: [L.w, L.h], rects: rects, mb: W * H * 4 * 4 / 3 / 1048576, tiles: Object.keys(tiles).length };
    if (!cv || opts.noDraw) return res;
    cv.width = W; cv.height = H;
    var g = cv.getContext && cv.getContext('2d');
    if (!g) return res;
    var t0 = (root.performance && root.performance.now) ? root.performance.now() : 0;
    g.fillStyle = css(LEAD); if (g.fillRect) g.fillRect(0, 0, W, H);
    Object.keys(L.rects).forEach(function (k) { var q = L.rects[k]; drawTile(g, tiles[k], q[0] * unit, q[1] * unit, unit); });
    res.ms = t0 ? Math.round(((root.performance.now()) - t0) * 10) / 10 : 0;
    return res;
  }

  root.ChurchGlassGen = { STYLES: STYLES, PAL: PAL, SIZE: SIZE, layout: layout, atlas: atlas, beam: beam, mean: mean, has: has, drawTile: drawTile };
  if (typeof module === 'object' && module.exports) module.exports = root.ChurchGlassGen;
})(typeof window !== 'undefined' ? window : this);
