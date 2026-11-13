/* glass_placements.js — G-29 대응표: 번들된 진본 사진 창 → 우리 3D 성당의 창 자리(슬롯).
   근거·좌표·비율 맞춤은 docs/church/GLASS_PLACEMENTS.md. 값은 데이터뿐(빌더가 ctx.glassPhoto(slot, i) 로 읽는다).
   - slot: 빌더가 정한 자리 이름(그 성당 빌더 안에서만 뜻이 있다).
   - wins: [{id, aspect}] — 카탈로그 id 와 사진 비율(가로/세로, glass_catalog.json 의 aspect_w_over_h 와 같아야 한다: glass_place.test.mjs).
           자리가 여러 개인 슬롯(repeat)은 자리 번호 순서로 번갈아 쓴다.
   - use: 'authentic' 만 싣는다(그 성당의 실제 창). 'reference'(다른 성당 창)는 성당 안에 걸지 않는다 → alabaster_slab(라벤나)은 없음.
   - certainty: 'catalog' = 카탈로그 location 이 그 자리를 명시 · 'literature' = 일반 문헌 지식(1차 자료 미확인) · 'assumed' = 같은 건물의 같은 종류 창이지만 정확한 자리는 모름.
   시험·비교용: URL ?photoglass=0 이면 대응표를 끈다(절차적 유리만, 개구부도 예전 치수). */
(function (root) {
  'use strict';
  var CHURCHES = {
    florence: [
      { slot: 'facade_center', wins: [{ id: 'oculus_florence_ghiberti_1', aspect: 1.0 }], shape: 'circle', use: 'authentic', certainty: 'catalog',
        where_ko: '정면(입구) 벽 중앙 오큘러스' },
      { slot: 'drum_e', wins: [{ id: 'oculus_florence_donatello', aspect: 1.0 }], shape: 'circle', use: 'authentic', certainty: 'literature',
        where_ko: '쿠폴라 드럼 동쪽 면(제대 위, 신랑에서 정면으로 보이는 창)' },
      { slot: 'drum_ne', wins: [{ id: 'oculus_florence_ghiberti_2', aspect: 1.0 }], shape: 'circle', use: 'authentic', certainty: 'assumed',
        where_ko: '쿠폴라 드럼(여덟 면 중 어느 면인지 미확인 → 대관 창 옆 북동 면에 둠)' }
    ],
    stpeter: [
      { slot: 'gloria', wins: [{ id: 'dove_stpeter', aspect: 0.6904 }], shape: 'ellipse', use: 'authentic', certainty: 'catalog',
        where_ko: '후진 중앙, 사도좌(카테드라 페트리) 위 글로리아의 타원 창' }
    ],
    stpaul: [
      { slot: 'aisle', repeat: true, wins: [{ id: 'alabaster_stpaul_1', aspect: 0.521 }, { id: 'alabaster_stpaul_2', aspect: 0.5086 }], shape: 'arch', use: 'authentic', certainty: 'assumed',
        where_ko: '측랑 바깥벽 창(같은 대성전의 알라바스터 창 사진 2장을 번갈아 반복. 낱낱의 석판 무늬는 실제 그 자리와 다르다)' },
      { slot: 'clerestory', repeat: true, wins: [{ id: 'alabaster_stpaul_2', aspect: 0.5086 }, { id: 'alabaster_stpaul_1', aspect: 0.521 }], shape: 'arch', use: 'authentic', certainty: 'assumed',
        where_ko: '신랑 고창(같은 사진 2장을 번갈아 반복)' }
    ],
    milan: [
      { slot: 'apse_center_lower', wins: [{ id: 'milan_apse_lower', aspect: 1.7502 }], shape: 'rect', use: 'authentic', certainty: 'assumed',
        where_ko: '후진 큰 창의 아래 여섯 단(세 창 중 어느 창인지 미확인 → 가운데 창 아랫부분에 둠, 위쪽은 절차적 유리)' }
    ]
  };

  function enabled() {
    try { return !(root.location && /[?&]photoglass=0/.test(root.location.search || '')); } catch (e) { return true; }
  }
  // 그 성당·슬롯·자리 번호에 걸 사진 창. 없으면 null. → {win, aspect, slot, index, shape}
  function forSlot(church, slot, index) {
    if (!enabled()) return null;
    var list = CHURCHES[church];
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.slot !== slot || e.use !== 'authentic' || !e.wins || !e.wins.length) continue;
      var k = index | 0;
      if (k < 0 || (!e.repeat && k >= e.wins.length)) return null;
      var w = e.wins[k % e.wins.length];
      return { win: w.id, aspect: w.aspect, slot: slot, index: k, shape: e.shape || 'rect' };
    }
    return null;
  }
  // 그 성당에 걸리는 사진 창 id 목록(중복 없이)
  function winsOf(church) {
    var out = [];
    (CHURCHES[church] || []).forEach(function (e) { if (e.use === 'authentic') e.wins.forEach(function (w) { if (out.indexOf(w.id) < 0) out.push(w.id); }); });
    return out;
  }
  // 사진 비율(a = 가로/세로)을 지키며 상자(bw × bh) 안에 넣는다(contain) → {w, h}
  function contain(a, bw, bh) { return a > bw / bh ? { w: bw, h: bw / a } : { w: bh * a, h: bh }; }

  var P = { version: 1, churches: CHURCHES, forSlot: forSlot, winsOf: winsOf, contain: contain, enabled: enabled };
  root.ChurchGlassPlacements = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
