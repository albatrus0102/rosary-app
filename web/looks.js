/* looks.js — 장면별 '룩' 프리셋. 조명·톤·후처리 값만 데이터로 둔다(지오메트리·재질은 빌더).
   world.js 가 시간대 값(KEYS)을 뽑은 뒤 곱/섞기로 적용하고(env.*), render.js 가 최종 패스·블룸에 env.grade 를 쓴다.
   낮 값 + night(밤 0..1 로 선형 보간되는 덮어쓰기). 지정하지 않은 값은 DEFAULT.
   키(모두 선택): keyK/keyTint/keyTintK 해(달) 직사광 · ambK/ambTint/ambTintK 반구광 · expK 노출 · envK 환경 반사 · lampK 빌더 등불 ·
     beamK 창 햇빛 무늬 · fogTint/fogTintK 안개 · dust/dustK/dustNight 먼지 · sat warm vig con 최종 색보정 · bloomT bloomS bloomR bloomKnee 블룸 ·
     midBloomS 보통 단계 블룸 · reflK 바닥 반사 · glassK 발광 유리 밝기 · aoK aoDir giK 구운 AO·빛 번짐(있을 때만). */
(function (root) {
  'use strict';
  var DEFAULT = {
    keyK: 1, keyTint: 0xffffff, keyTintK: 0, ambK: 1, ambTint: 0xffffff, ambTintK: 0, expK: 1, envK: 1, lampK: 1, beamK: 1,
    fogTint: 0xffffff, fogTintK: 0, dust: 40, dustK: 1, dustNight: 0,
    sat: 0.94, warm: 0.03, vig: 0.16, con: 0, bloomT: 0.92, bloomS: 0.3, bloomR: 0.55, midBloomS: 0.8, reflK: 1, aoK: 1, aoDir: 0.6,
    bloomKnee: 0.3, giK: 1, glassK: 1,
    night: {}
  };
  // 장면별 룩. 낮 값 + night(밤에 덮어쓰기). 공방(house): 낮은 밝고 부드럽게, 밤은 따뜻한 실내등이 주인공.
  var LOOKS = {
    house: { keyK: 0.85, keyTint: 0xffe6c4, keyTintK: 0.25, ambK: 0.9, ambTint: 0xfff0dc, ambTintK: 0.25, expK: 0.92, envK: 0.8, beamK: 0.5, lampK: 1.0,
      dust: 0, sat: 1.0, warm: 0.06, vig: 0.2, con: 0.14, bloomT: 0.86, bloomS: 0.36, reflK: 0.5,
      night: { lampK: 1.4, keyK: 0.45, ambK: 0.22, expK: 0.85, warm: 0.08, bloomT: 0.84, bloomS: 0.38 } }
  };
  var DRAFTS = {};   // 새 장면 룩 초안은 여기에 넣고 ?looks=all 로 확인한 뒤 LOOKS 로 옮긴다
  try {
    var qm = /[?&]looks=([a-z,]+)/.exec(root.location.search);
    if (qm) {
      if (qm[1] === 'all') { for (var dk in DRAFTS) LOOKS[dk] = DRAFTS[dk]; }
      else { var keep = qm[1].split(','); for (var lk in LOOKS) if (keep.indexOf(lk) < 0) delete LOOKS[lk]; }   // 'off' 는 어떤 id 도 아니므로 전부 지워진다
    }
  } catch (e) { /* ignore */ }
  var NUM = ['keyK', 'keyTintK', 'ambK', 'ambTintK', 'expK', 'envK', 'lampK', 'beamK', 'fogTintK', 'dustK', 'dustNight', 'sat', 'warm', 'vig', 'con', 'bloomT', 'bloomS', 'bloomR', 'midBloomS', 'glassK', 'bloomKnee'];

  function get(id) {
    var src = LOOKS[id] || {}, out = {}, k;
    for (k in DEFAULT) out[k] = DEFAULT[k];
    for (k in src) if (k !== 'night') out[k] = src[k];
    out.night = {};
    for (k in DEFAULT.night) out.night[k] = DEFAULT.night[k];
    var n = src.night || {};
    for (k in n) out.night[k] = n[k];
    out.id = LOOKS[id] ? id : 'default';
    return out;
  }
  // 밤 정도(0..1)로 섞은 숫자 값 → out
  function blend(look, night, out) {
    out = out || {};
    for (var i = 0; i < NUM.length; i++) {
      var k = NUM[i], a = look[k], b = look.night[k];
      out[k] = b === undefined ? a : a + (b - a) * night;
    }
    return out;
  }
  root.RoomLooks = { get: get, blend: blend, DEFAULT: DEFAULT, LOOKS: LOOKS, DRAFTS: DRAFTS, NUM: NUM };
  if (typeof module === 'object' && module.exports) module.exports = root.RoomLooks;
})(typeof window !== 'undefined' ? window : this);
