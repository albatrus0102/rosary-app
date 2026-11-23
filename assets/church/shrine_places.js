/* shrine_places.js — 성당별 '성모 기도 자리' 표(순수 자료). shrine.js 가 읽는다.
   x,z = 성상 받침 중심(벽 앞 0.3m), yaw = 성상이 바라보는 방향(도; 0 = +z(입구 쪽), 90 = +x, -90 = -x, 180 = -z), y = 바닥 높이(기본 0).
   kind: 'mary'(받침 + 성모상 + 뒤판) | 'plain'(문양 없는 단순 성상) | 'pond'(단순 성상 + 그 앞 둥근 연못에 초를 띄움) | 'existing'(빌더가 이미 세운 성모상 앞: 봉헌초 받침·무릎틀만).
   icon: true 는 성상 대신 실제 성화(사진, art_maggiore.js)를 모신 자리(마조레). go_ko: '가기' 메뉴 이름(기본 '성모상').
   img: 성모상 그림 키(statue3d_<img>.js — AI 생성 그림 + 그림에서 만든 깊이, tools/statues/make_statue3d.py. shrine.js 가 그 성당에 들어올 때만 읽어 변위 메시 입체로 세운다). 없으면 kit 도형 성상.
   mesh: 3D 성모상 묶음 키(statue3d_<mesh>.js — Meshy AI 로 만든 대리석 성모상, tools/statues/meshy_*.mjs). 있으면 이 입체 메쉬를 세우고 img 그림 변위 성상은 묶음을 못 읽을 때의 예비. 명동(한복)·마조레(성화)는 mesh 없음.
   stand: 'wood' 면 봉헌초 받침을 쇠 대신 나무 받침(같은 슬롯 높이)으로, kneeler: false 면 무릎틀을 놓지 않는다(여의도동 로비 벽감 — 사진에 없다).
   pending: true 인 성당은 건너뛴다(구조 확정 뒤 배치). 자리를 바꾸면 node tools/church_web/export_layouts.mjs 로 서버 레이아웃을 다시 만든다. */
(function (root) {
  'use strict';
  var P = {
    basic: { x: -11.7, z: -12.3, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 벽 맨 앞(성소 계단 아래). 성소 위 기존 성모상 앞은 전례 장식(구유 등) 동선과 겹쳐 쓰지 않음' },
    // 빛의 성당(가상): 메달 홀(성모 경당) 북쪽 벽. 앱 공용 3D 성모상은 자리표시 — 이 성당 전용 성상(사용자 그림 → 3D)은 2단계
    // 2단계(2026-11-24): 빌더(ch_light.js)가 금빛 고딕 벽감(참고 c_medal_hall_madonna)을 짓고, 그 턱(altar_h) 위에 실물 스캔 성모자상(크루즐로바의 성모, 1410년경 채색 목조,
    // CC BY 4.0 — light/scan3d_madonna_kruzlowa.js, 개발용 빌드만)을 모신다(scan). 스캔을 못 읽으면 앱 공용 Meshy 성모상(mesh)·그림 성상(img)이 예비.
    light: { x: -9.9, z: 68.5, yaw: 90, kind: 'existing', scan: 'madonna_kruzlowa', scan_h: 1.75, altar_d: -0.95, altar_h: 0.95, img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '메달 홀(묵주의 메달 자리) 북쪽 벽의 금빛 고딕 벽감 앞. 설계 시안 C 정거장 11' },
    myeongdong: { x: -13.2, z: -8.0, yaw: 90, kind: 'mary', img: 'hanbok_rosary', label_ko: '성모상 앞', note: '기존 성모상(후진 제대 뒤, z -29)은 걷기 경계 밖이라 왼쪽 익랑 끝 벽에 따로 모심' },
    lateran: { x: -13.6, z: -4.6, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 바깥 측랑 앞쪽 벽' },
    stpaul: { x: -16.9, z: -11.5, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 익랑 쪽 벽' },
    milan: { x: -19.4, z: -16.7, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽(북) 익랑 벽 — 실제 마돈나 델 알베로 제대 쪽' },
    danggogae: { x: 6.95, z: 13.5, yaw: 270, kind: 'pond', img: 'plain_white', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '입구 홀 오른쪽 끝벽(성당 문을 바라볼 때 오른쪽). 사용자 제보: 성모상 앞 지름 약 1.5m 둥근 연못에 초를 띄운다 — 연못이 봉헌초 대(원형 18칸)' },
    yeouido: { x: 3.8, z: 21.8, fy: 0, yaw: 0, kind: 'existing', img: 'immaculate_blue', mesh: 'mary_meshy', mesh_s: 0.4, altar_d: -0.42, altar_h: 1.0, stand: 'wood', kneeler: false, label_ko: '성모상 앞', note: '로비(성당 문 밖) 뒷벽의 밝은 벽감 — 사용자 사진(2026-11-22): 실제 봉헌초 자리가 이 벽감이고 그 앞에 나무 초 받침이 있다. 벽감은 빌더(ch_yeouido.js)가 짓고, 성상(앱 공용 3D 성모상, 실제 성상의 모사가 아님)은 벽감 턱(altar_h 1.0m) 위, 초 받침은 나무(stand wood), 무릎틀 없음(사진에 없다). 예전 자리(신랑 제단 앞 왼쪽)는 뺐다' },
    florence: { x: -7.5, z: -4.7, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 측랑 맨 앞 벽면(팔각 통로 바로 앞)' },
    maggiore: { x: -27.2, z: -9.965, yaw: 90, kind: 'existing', icon: true, go_ko: '로마 백성의 구원 성화', label_ko: '로마 백성의 구원 앞', note: "파올리나 경당 제단의 '로마 백성의 구원' 성화 앞(제단 계단 아래, 기도 좌석 앞). 성상은 세우지 않음" },
    stpeter: { x: -13.825, z: -24.25, yaw: 0, kind: 'existing', img: 'immaculate_blue', mesh: 'mary_meshy', altar_d: -0.88, altar_h: 1.14, label_ko: '성모상 앞', note: "서쪽 왼쪽 모서리 경당 '기둥의 성모(Madonna della Colonna)' 제대 앞(제대 단 앞 가장자리). 기둥의 성모는 성화(사진 미확보)이므로 이 성상은 그 성화를 대신하는 재현이 아닌 일반 성모상이다 — 이름을 '기둥의 성모상'이라 하지 않는다. 제대 위(뒤 제단화 앞)에 입체 성모상을 모심(altar_d = 제대 중심까지 뒤로, altar_h = 제대 윗면 높이)" },
    // 아시시: 하부 성당 북쪽(오른쪽) 트란셉트 동벽 — 그 트란셉트에 치마부에의 「마에스타(성모와 천사 넷, 성 프란치스코)」(1280년경)가 있다(조사 §3-3).
    // 벽화는 옮기지 않고 앱 공용 3D 성모상(실제 성상의 모사가 아님)을 그 벽 앞에 모신다. fy = 하부 성당 바닥 높이(여러 층 — 상부 성당 바로 아래)
    // x 6.4(2026-11-23, 예전 5.6): 5.6 은 경당 사이 돌덩이(x 3.6~5.6, z −0.45~0.45 — 트란셉트 쪽으로 0.45m 튀어나옴)의 옆면이 성상 한가운데를 지나
    // 성상 왼쪽 절반이 돌 속에 묻혔다(얼굴·목이 빠져 머리가 떠 보임 — 사용자 제보 「아시시 성모상 왜 이래」). 6.4 는 돌덩이·트란셉트 끝벽(x 7.2) 모두에서 띄운다.
    assisi: { x: 6.4, z: -0.35, yaw: 180, fy: 3.6, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', go_ko: '성모상(하부 성당)', note: '하부 성당 북쪽 트란셉트 동벽(치마부에 마에스타가 있는 팔) 앞, 경당 사이 돌덩이와 트란셉트 끝벽 사이. 상부 성당 바로 아래 층' }
  };
  root.ChurchShrinePlaces = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
