/* light_pilgrim.js — 빛의 성당(ch_light.js) 안내 순례 정거장 46곳(순수 자료, 화면은 아직 없다 — 2단계).
   원본: 설계 시안 C 「돌로 지은 묵주」(스크래치패드 light_cathedral_concepts.html, 생성 lc/gen.py, Claude Fable 5.2, 2026-11-23).
   title·what·meaning 은 설계 문서의 글자 그대로다(바꾸지 않는다).
   좌표: plan = 설계 평면도 좌표 [px(동쪽 +, 제단 쪽), py(남쪽 +)] — 로툰다 중심 (0,0).
         월드(앱) 좌표는 x = py(남쪽 +x), z = -px(제단이 -z) — ch_light.js 와 같다.
   at   = 사람이 서는(카메라가 머무는) 자리. 걸을 수 있는 곳이어야 한다(시험 light.test.mjs).
          대상 물건 자리와 겹치는 정거장(십자고상·성수반)은 앞으로 옮겼다(moved: true). 후진 창 정거장은 회중석(2단계 부채꼴) 사이 가운데 통로로.
   look = 바라보는 곳(x,y,z). zone = 구역(Z1~Z7, ch_light.js zones).
   built: false = 아직 짓지 않은 곳(북문 밖 세례당 Z6 · 남문 밖 회랑 Z7, 2단계). 그 정거장은 지금 문이 닫혀 있어 갈 수 없다.
   제단·후진 정거장(27~31)은 제단 출입 금지 구역 밖(제단 난간 앞)에서 본다.
   브라우저: window.ChurchLightPilgrim, Node: require. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchLightPilgrim = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var MYS = {
    joyful: ['환희', [['수태고지', '"예" 하고 응답하신 성모님의 순종'], ['엘리사벳 방문', '그리스도를 모시고 이웃에게 달려가는 사랑'], ['예수님 탄생', '가난한 구유에 오신 하느님'], ['성전 봉헌', '가장 귀한 것을 하느님께 드림'], ['성전에서 찾으심', '잃었던 예수님을 다시 찾는 기쁨']]],
    luminous: ['빛', [['요르단 강 세례', '하느님의 사랑받는 자녀라는 선언'], ['카나 혼인 잔치', '"무엇이든지 그가 시키는 대로 하여라"'], ['하느님 나라 선포', '회개와 복음으로 부르심'], ['거룩한 변모', '십자가 너머의 영광을 미리 봄'], ['성체성사 제정', '당신 자신을 양식으로 내어 주심']]],
    sorrowful: ['고통', [['겟세마니의 기도', '"아버지 뜻대로 하소서"'], ['매 맞으심', '우리 죄를 대신 지신 상처'], ['가시관 쓰심', '조롱 속에 계신 참된 임금'], ['십자가 지심', '날마다 제 십자가를 지고 따르는 길'], ['십자가에서 돌아가심', '끝까지 사랑하심']]],
    glorious: ['영광', [['부활', '죽음을 이긴 생명'], ['승천', '우리의 본향은 하늘'], ['성령 강림', '교회의 탄생과 파견'], ['성모 승천', '온전히 구원된 인간의 미래'], ['성모 대관', '겸손한 이를 높이시는 하느님']]]
  };
  // 신비 경당의 가운데 각(도, 설계 평면 — 동쪽 0, 북쪽 +90, 시계 방향으로 줄어든다): 묶음 첫 경당 = 시작각 − 6.5
  var START = { joyful: 165, luminous: 80, sorrowful: -15, glorious: -100 };
  var R_STOP = 49.5, R_WIN = 56.4, WIN_Y = 9.0;
  function rad(d) { return d * Math.PI / 180; }
  function world(px, py) { return { x: py, z: -px }; }
  function polar(r, deg) { return { x: -r * Math.sin(rad(deg)), z: -r * Math.cos(rad(deg)) }; }
  function r1(v) { return Math.round(v * 100) / 100; }

  var out = [];
  function add(o) {
    var w = world(o.plan[0], o.plan[1]);
    var at = o.at || w;
    out.push({
      id: 'L' + (out.length + 1 < 10 ? '0' : '') + (out.length + 1), n: out.length + 1,
      title: o.title, what: o.what, meaning: o.meaning,
      plan: o.plan, at: { x: r1(at.x), z: r1(at.z) }, look: o.look, zone: o.zone,
      built: o.built !== false, moved: !!o.moved, kind: o.kind || 'place', window: o.window || null
    });
  }
  function mystery(set, zone) {
    var M = MYS[set];
    for (var i = 0; i < 5; i++) {
      var deg = START[set] - 6.5 - 13 * i, p = polar(R_STOP, deg), wv = polar(R_WIN, deg);
      add({
        title: M[0] + ' ' + (i + 1) + '단 · ' + M[1][i][0],
        what: '신비 경당의 랜싯 창 (windows/' + set + '_' + (i + 1) + '). 다가가면 창 감상 모드',
        meaning: M[1][i][1],
        plan: [r1(R_STOP * Math.cos(rad(deg))), r1(-R_STOP * Math.sin(rad(deg)))],
        at: p, look: { x: r1(wv.x), y: WIN_Y, z: r1(wv.z) }, zone: zone, kind: 'mystery', window: set + '_' + (i + 1)
      });
    }
  }

  add({ title: '광장의 묵주 지도', what: '광장 바닥에 성당 평면(묵주 모양)을 청동으로 박아 놓았다', meaning: '이 성당을 걷는 일이 곧 묵주기도 한 꿰미', plan: [-196, 6], look: { x: 6, y: 0, z: 199 }, zone: 'Z1' });
  add({ title: '정면과 성모 장미창', what: '두 종탑 사이 성모 장미창(기존 glass_rose_marian, exterior_facade 응용)', meaning: '묵주(로사리오)는 장미 화관이라는 뜻', plan: [-196, -6], look: { x: 0, y: 15.5, z: 186 }, zone: 'Z1' });
  add({ title: '십자가 전실 · 큰 십자고상', what: '십자가 모양 전실 한가운데 채색 목조 십자고상(CC0). 발치에서 들어와 머리 쪽으로 걷는다', meaning: '묵주기도는 십자가를 쥐고 사도신경으로 시작한다', plan: [-159, 0], at: { x: 0, z: 164 }, moved: true, look: { x: 0, y: 7.4, z: 157 }, zone: 'Z1' });
  add({ title: '열두 사도', what: '전실 벽감의 사도상 열둘(베드로·바오로 입상 CC0, 사도 부조 퍼블릭 도메인)', meaning: '사도신경 열두 조목, 사도들에게서 이어받은 믿음', plan: [-159, -22], look: { x: -29, y: 4, z: 159 }, zone: 'Z1' });
  add({ title: '성수반', what: '십자가 발치의 성수반', meaning: '세례로 그리스도와 함께 묻히고 함께 살아남', plan: [-178, 5], at: { x: 5, z: 176.6 }, moved: true, look: { x: 5, y: 1, z: 178.3 }, zone: 'Z1' });
  add({ title: '주님의 기도 방', what: '첫 큰 구슬. 산 위에서 가르치시는 그리스도의 궁륭 모자이크', meaning: '"이렇게 기도하여라"', plan: [-134, 0], look: { x: 0, y: 20, z: 134 }, zone: 'Z2' });
  add({ title: '믿음의 방', what: '작은 구슬 1. 닻이 아닌 십자가를 든 믿음의 상징 모자이크', meaning: '첫 성모송은 믿음을 청함', plan: [-119, 0], look: { x: 0, y: 15, z: 119 }, zone: 'Z2' });
  add({ title: '희망의 방', what: '작은 구슬 2. 별을 바라보는 희망의 모자이크', meaning: '둘째 성모송은 희망을 청함', plan: [-111, 0], look: { x: 0, y: 15, z: 111 }, zone: 'Z2' });
  add({ title: '사랑의 방', what: '작은 구슬 3. 불타는 심장의 모자이크', meaning: '셋째 성모송은 사랑을 청함', plan: [-103, 0], look: { x: 0, y: 15, z: 103 }, zone: 'Z2' });
  add({ title: '영광송 방', what: '둘째 큰 구슬. 삼위일체를 세 겹 빛의 고리로 그린 궁륭', meaning: '"영광이 성부와 성자와 성령께"', plan: [-88, 0], look: { x: 0, y: 20, z: 88 }, zone: 'Z2' });
  add({ title: '메달 홀(성모 경당)', what: '묵주의 가운데 메달 자리. 성모상과 봉헌초(기존 성모 경당 그림)', meaning: '모든 단이 성모님 손을 거쳐 예수님께 이어진다', plan: [-69, 0], look: { x: -11, y: 1.6, z: 69 }, zone: 'Z3' });
  // 로툰다 첫 전망(50 m): 서문 문간(경당 고리의 서쪽 칸, 구역 Z5)에서 돔 아래를 처음 본다
  add({ title: '로툰다 첫 전망', what: '지름 60 m 돔 아래 둥근 회중석, 그 둘레에 스무 경당의 색유리가 한 바퀴 돈다', meaning: '하늘의 예루살렘, 열두 문과 한가운데의 어린양(묵시 21장)', plan: [-50, 0], look: { x: 0, y: 12, z: 0 }, zone: 'Z5' });
  add({ title: '돔과 쉰 개의 창', what: '돔 받침에 작은 창 50개, 열두 갈래 별 리브, 꼭대기 등탑', meaning: '성모송 쉰 번의 빛, 열두 별의 관(묵시 12,1)', plan: [-8, -8], look: { x: 0, y: 60, z: 0 }, zone: 'Z4' });
  add({ title: '묵주 등', what: '돔 아래 매달린 지름 30 m 고리 등. 작은 등 50개와 큰 등 5개', meaning: '기도가 빛의 화관이 되어 올라감', plan: [-8, 8], look: { x: 0, y: 28, z: 0 }, zone: 'Z4' });
  mystery('joyful', 'Z5');
  add({ title: '북문 · 팔각 세례당', what: '환희와 빛 사이의 문을 나서면 세례당(기존 baptistery_cloister)', meaning: '빛의 신비 1단, 주님의 세례로 이어지는 자리', plan: [0, -76], look: { x: -76, y: 3, z: 0 }, zone: 'Z6', built: false });
  add({ title: '성 요셉 경당', what: '세례당 옆 작은 경당의 성 요셉상(CC BY)', meaning: '성가정의 보호자', plan: [-17, -69], look: { x: -69, y: 2, z: 20 }, zone: 'Z6', built: false });
  mystery('luminous', 'Z5');
  add({ title: '제단 앞', what: '빛 5단(성체성사)과 고통 1단(겟세마니) 사이, 첫 계단 앞에서 멈춘다. 금빛 닫집과 제대(기존 high_altar)', meaning: '최후의 만찬과 수난 사이에 제대가 있다. 미사는 그 둘을 하나로 잇는다', plan: [20, 0], look: { x: 0, y: 2.5, z: -40 }, zone: 'Z4' });
  add({ title: '감실과 성체등', what: '고딕 첨탑 장식벽 가운데 감실', meaning: '"내가 세상 끝 날까지 너희와 함께 있다"', plan: [21, -8], look: { x: 0, y: 3, z: -50.5 }, zone: 'Z4' });
  add({ title: '후진 창 〈약속〉', what: '제단 왼쪽 큰 창(기존 그림)', meaning: '구약의 약속', plan: [21, 8], look: { x: -8.4, y: 13, z: -67 }, zone: 'Z4' });
  add({ title: '후진 창 〈묵주기도의 성모〉', what: '제단 뒤 가운데 창. 성모자께서 묵주를 건네신다', meaning: '이 성당 전체의 열쇠가 되는 그림', plan: [14, -4], at: { x: -0.9, z: -14 }, moved: true, look: { x: 0, y: 13, z: -69.6 }, zone: 'Z4' });
  add({ title: '후진 창 〈교회와 모든 성인〉', what: '제단 오른쪽 창. 한국 순교 성인 포함', meaning: '약속의 열매인 교회', plan: [14, 4], at: { x: 0.9, z: -14 }, moved: true, look: { x: 8.4, y: 13, z: -67 }, zone: 'Z4' });
  mystery('sorrowful', 'Z5');
  add({ title: '남문 · 회랑 정원', what: '고통과 영광 사이의 문을 나서면 성모상과 분수의 정원(기존 baptistery_cloister)', meaning: '무덤이 있던 동산, 부활 아침의 정원', plan: [0, 70], look: { x: 91, y: 2, z: 0 }, zone: 'Z7', built: false });
  add({ title: '한국 순교자 경당', what: '회랑 서쪽 경당(기존 side_chapels_4)', meaning: '고통의 신비를 삶으로 산 이들', plan: [-33, 90], look: { x: 90, y: 2, z: 36 }, zone: 'Z7', built: false });
  add({ title: '성체 조배실', what: '회랑 동쪽의 조용한 경당. 닫힌 감실과 성체등', meaning: '부활하신 주님 곁에 머묾', plan: [33, 90], look: { x: 90, y: 2, z: -36 }, zone: 'Z7', built: false });
  mystery('glorious', 'Z5');
  add({ title: '오르간과 설교대', what: '메달 홀 아치 위 오르간 발코니와 나선 계단 설교대(기존 organ_pulpit)', meaning: '말씀과 찬미', plan: [-36, -12], look: { x: 0, y: 14, z: 44 }, zone: 'Z4' });
  add({ title: '바닥의 묵주', what: '로툰다 바닥 돌 상감이 구슬 59알의 묵주를 그리며 입구로 되돌아간다', meaning: '기도는 끝나지 않고 삶으로 이어진다', plan: [-36, 12], look: { x: 0, y: 0, z: 27 }, zone: 'Z4' });

  var order = [];
  ['joyful', 'luminous', 'sorrowful', 'glorious'].forEach(function (s) { for (var i = 1; i <= 5; i++) order.push(s + '_' + i); });
  return { stops: out, mysteryOrder: order, source: 'light_cathedral_concepts.html 시안 C (2026-11-23)' };
});
