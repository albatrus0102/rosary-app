/* looks.js — 성당별 '룩' 프리셋(LOOK_DEV.md, SPEC §34). 조명·톤·후처리 값만 데이터로 둔다(지오메트리·재질은 빌더).
   world.js 가 시간대 값(KEYS)을 뽑은 뒤 곱/섞기로 적용하고(env.*), render.js 가 걷기 프로필의 최종 패스·블룸에 env.grade 를 쓴다.
   낮 값 + night(밤 0..1 로 선형 보간되는 덮어쓰기). 지정하지 않은 값은 DEFAULT(= 예전 화면과 같은 값)를 쓴다.
   사진 창 화소는 어떤 룩에서도 보정·톤매핑·블룸을 받지 않는다(render.js 알파 0 경로) → 창 색 불변.

   키(모두 선택):
     keyK      태양(달) 직사광 세기 배율          keyTint/keyTintK  직사광 색을 이 색 쪽으로 섞는 정도(0..1)
     ambK      반구광(앰비언트) 세기 배율         ambTint/ambTintK  반구광 하늘색을 섞는 정도
     expK      노출 배율                          envK      환경 반사(PMREM) 세기 배율
     lampK     빌더 등불(점광원·발광 스프라이트) 배율   candleK   촛불 봉헌대 빛 배율
     beamK     창 빛줄기·빛무늬 배율               fogTint/fogTintK  안개 색 섞기
     dust      먼지 입자 수(high·mid, 0 이면 없음)  dustK     먼지 밝기 배율(빛줄기 세기에 곱)  dustNight 밤 먼지 밝기(촛불빛)
     sat warm vig con   최종 패스: 채도·난색 이동·비네트·S 곡선 대비(0..1)
     bloomT bloomS bloomR   블룸 임계·세기·반경(걷기 프로필)
     midBloomS  보통(mid) 단계의 블룸 세기 배율       reflK  바닥 반사 세기 배율(만들 때 한 번) */
(function (root) {
  'use strict';
  var DEFAULT = {
    keyK: 1, keyTint: 0xffffff, keyTintK: 0, ambK: 1, ambTint: 0xffffff, ambTintK: 0, expK: 1, envK: 1, lampK: 1, candleK: 1, beamK: 1,
    fogTint: 0xffffff, fogTintK: 0, dust: 90, dustK: 1, dustNight: 0,
    sat: 0.94, warm: 0.03, vig: 0.16, con: 0, bloomT: 0.92, bloomS: 0.3, bloomR: 0.55, midBloomS: 0.8, reflK: 1,
    night: {}
  };
  var LOOKS = {
    // 성 베드로: 따뜻한 금빛 키, 낮은 앰비언트, 강한 대비, 청동·금의 번짐, 비네트. 낮의 하얗게 뜬 화면을 누른다.
    stpeter: {
      keyK: 0.9, keyTint: 0xffc887, keyTintK: 0.5, ambK: 0.45, ambTint: 0xffd9a8, ambTintK: 0.4, expK: 0.78, envK: 0.55, lampK: 2.0, candleK: 1.4, beamK: 0.45,
      fogTint: 0xb08a5c, fogTintK: 0.5, dust: 140, dustK: 1.5, dustNight: 0.25, reflK: 0.55,
      sat: 0.98, warm: 0.07, vig: 0.36, con: 0.32, bloomT: 0.74, bloomS: 0.5, bloomR: 0.62,
      night: { expK: 0.95, ambK: 0.7, lampK: 2.2, candleK: 1.6, con: 0.22, bloomT: 0.7, bloomS: 0.6, vig: 0.38 }
    },
  };
  // 초안(아직 적용하지 않음): 성당마다 화면을 보고 검증한 뒤 LOOKS 로 옮긴다(LOOK_DEV_HANDOFF.md). 개발 중 ?looks=all 이면 적용해 볼 수 있다.
  var DRAFTS = {
    // 라테라노: 흰 대리석·금 천장. 성 베드로보다 차분하게(약한 난색, 중간 대비)
    lateran: { keyK: 0.9, keyTint: 0xffdcae, keyTintK: 0.3, ambK: 0.7, expK: 0.88, lampK: 1.4, sat: 0.97, warm: 0.05, vig: 0.26, con: 0.18, bloomT: 0.84, bloomS: 0.4, night: { lampK: 1.7 } },
    // 마조레: 금 격자 천장·모자이크. 금빛을 살려 따뜻하게
    maggiore: { keyK: 0.9, keyTint: 0xffcf96, keyTintK: 0.35, ambK: 0.65, ambTint: 0xffe2b8, ambTintK: 0.3, expK: 0.87, lampK: 1.5, sat: 0.98, warm: 0.06, vig: 0.28, con: 0.2, bloomT: 0.82, bloomS: 0.42, night: { lampK: 1.8 } },
    // 성 바오로: 넓고 밝은 회랑·설화석고 창. 서늘한 돌빛 유지, 대비만 조금
    stpaul: { keyK: 0.95, ambK: 0.8, expK: 0.92, sat: 0.95, warm: 0.02, vig: 0.24, con: 0.15, bloomT: 0.86, bloomS: 0.36 },
    // 밀라노: 어두운 고딕 석재와 보석색 창. 앰비언트를 깊게, 창빛·촛불이 도드라지게
    milan: { keyK: 0.85, ambK: 0.5, ambTint: 0xb9c3e0, ambTintK: 0.25, expK: 0.85, beamK: 1.15, lampK: 1.6, candleK: 1.5, fogTint: 0x2a2a3a, fogTintK: 0.3, dust: 120, dustK: 1.2, dustNight: 0.2,
      sat: 1.04, warm: 0.0, vig: 0.36, con: 0.28, bloomT: 0.75, bloomS: 0.5, bloomR: 0.6, night: { lampK: 2.0, bloomT: 0.68 } },
    // 피렌체: 흰·초록 대리석, 밝은 르네상스 공간. 약한 난색과 중간 대비
    florence: { keyK: 0.95, keyTint: 0xffe0b8, keyTintK: 0.25, ambK: 0.75, expK: 0.9, sat: 0.97, warm: 0.04, vig: 0.24, con: 0.16, bloomT: 0.86, bloomS: 0.36 },
    // 명동: 붉은 벽돌 고딕. 따뜻한 벽돌빛·낮은 앰비언트·촛불
    myeongdong: { keyK: 0.9, keyTint: 0xffc890, keyTintK: 0.35, ambK: 0.62, ambTint: 0xffcfa0, ambTintK: 0.35, expK: 0.88, lampK: 1.6, candleK: 1.4, fogTint: 0x5a3020, fogTintK: 0.25, dust: 110,
      sat: 1.0, warm: 0.07, vig: 0.3, con: 0.22, bloomT: 0.8, bloomS: 0.45, night: { lampK: 1.9 } },
    // 우리 본당: 소박한 밝은 성당. 거의 예전 그대로, 난색·비네트만 조금
    basic: { ambK: 0.85, expK: 0.95, warm: 0.05, vig: 0.22, con: 0.12, bloomT: 0.88, bloomS: 0.34 }
  };
  try { if (/[?&]looks=all/.test(root.location.search)) for (var dk in DRAFTS) LOOKS[dk] = DRAFTS[dk]; } catch (e) { /* ignore */ }
  var NUM = ['keyK', 'keyTintK', 'ambK', 'ambTintK', 'expK', 'envK', 'lampK', 'candleK', 'beamK', 'fogTintK', 'dustK', 'dustNight', 'sat', 'warm', 'vig', 'con', 'bloomT', 'bloomS', 'bloomR', 'midBloomS'];

  function get(id) {
    var src = LOOKS[id] || {}, out = {}, k;
    for (k in DEFAULT) out[k] = DEFAULT[k];
    for (k in src) if (k !== 'night') out[k] = src[k];
    out.night = {};
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
  root.ChurchLooks = { get: get, blend: blend, DEFAULT: DEFAULT, LOOKS: LOOKS, DRAFTS: DRAFTS, NUM: NUM };
  if (typeof module === 'object' && module.exports) module.exports = root.ChurchLooks;
})(typeof window !== 'undefined' ? window : this);
