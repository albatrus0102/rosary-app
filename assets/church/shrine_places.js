/* shrine_places.js — 성당별 '성모 기도 자리' 표(순수 자료). shrine.js 가 읽는다.
   x,z = 성상 받침 중심(벽 앞 0.3m), yaw = 성상이 바라보는 방향(도; 0 = +z(입구 쪽), 90 = +x, -90 = -x, 180 = -z), y = 바닥 높이(기본 0).
   kind: 'mary'(받침 + 성모상 + 뒤판) | 'plain'(문양 없는 단순 성상) | 'pond'(단순 성상 + 그 앞 둥근 연못에 초를 띄움) | 'existing'(빌더가 이미 세운 성모상 앞: 봉헌초 받침·무릎틀만).
   icon: true 는 성상 대신 실제 성화(사진, art_maggiore.js)를 모신 자리(마조레). go_ko: '가기' 메뉴 이름(기본 '성모상').
   img: 성모상 그림 키(statue3d_<img>.js — AI 생성 그림 + 그림에서 만든 깊이, tools/statues/make_statue3d.py. shrine.js 가 그 성당에 들어올 때만 읽어 변위 메시 입체로 세운다). 없으면 kit 도형 성상.
   mesh: 3D 성모상 묶음 키(statue3d_<mesh>.js — Meshy AI 로 만든 대리석 성모상, tools/statues/meshy_*.mjs). 있으면 이 입체 메쉬를 세우고 img 그림 변위 성상은 묶음을 못 읽을 때의 예비. 명동(한복)·마조레(성화)는 mesh 없음.
   pending: true 인 성당은 건너뛴다(구조 확정 뒤 배치). 자리를 바꾸면 node tools/church_web/export_layouts.mjs 로 서버 레이아웃을 다시 만든다. */
(function (root) {
  'use strict';
  var P = {
    basic: { x: -11.7, z: -12.3, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 벽 맨 앞(성소 계단 아래). 성소 위 기존 성모상 앞은 전례 장식(구유 등) 동선과 겹쳐 쓰지 않음' },
    myeongdong: { x: -13.2, z: -8.0, yaw: 90, kind: 'mary', img: 'hanbok_rosary', label_ko: '성모상 앞', note: '기존 성모상(후진 제대 뒤, z -29)은 걷기 경계 밖이라 왼쪽 익랑 끝 벽에 따로 모심' },
    lateran: { x: -13.6, z: -4.6, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 바깥 측랑 앞쪽 벽' },
    stpaul: { x: -16.9, z: -11.5, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 익랑 쪽 벽' },
    milan: { x: -19.4, z: -16.7, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽(북) 익랑 벽 — 실제 마돈나 델 알베로 제대 쪽' },
    danggogae: { x: 6.95, z: 13.5, yaw: 270, kind: 'pond', img: 'plain_white', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '입구 홀 오른쪽 끝벽(성당 문을 바라볼 때 오른쪽). 사용자 제보: 성모상 앞 지름 약 1.5m 둥근 연못에 초를 띄운다 — 연못이 봉헌초 대(원형 18칸)' },
    yeouido: { x: -7.6, z: -7.35, yaw: 0, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '제단 앞 왼쪽(왼쪽 큰 피어 앞, 계단 옆 신자석 쪽 바닥)에서 신랑을 바라봄. 사용자 사진(2026-11-16)에서 제단 앞 왼쪽 나무 받침 위에 성모상이 있다 — 그 자리는 제단 출입 금지 구역 안이라 구역 밖 피어 앞으로 옮김. 성상은 앱 공용 3D 성모상(실제 성상의 모사가 아님)' },
    florence: { x: -7.5, z: -4.7, yaw: 90, kind: 'mary', img: 'immaculate_blue', mesh: 'mary_meshy', label_ko: '성모상 앞', note: '왼쪽 측랑 맨 앞 벽면(팔각 통로 바로 앞)' },
    maggiore: { x: -27.2, z: -9.965, yaw: 90, kind: 'existing', icon: true, go_ko: '로마 백성의 구원 성화', label_ko: '로마 백성의 구원 앞', note: "파올리나 경당 제단의 '로마 백성의 구원' 성화 앞(제단 계단 아래, 기도 좌석 앞). 성상은 세우지 않음" },
    stpeter: { x: -13.825, z: -24.25, yaw: 0, kind: 'existing', img: 'immaculate_blue', mesh: 'mary_meshy', altar_d: -0.88, altar_h: 1.14, label_ko: '성모상 앞', note: "서쪽 왼쪽 모서리 경당 '기둥의 성모(Madonna della Colonna)' 제대 앞(제대 단 앞 가장자리). 기둥의 성모는 성화(사진 미확보)이므로 이 성상은 그 성화를 대신하는 재현이 아닌 일반 성모상이다 — 이름을 '기둥의 성모상'이라 하지 않는다. 제대 위(뒤 제단화 앞)에 입체 성모상을 모심(altar_d = 제대 중심까지 뒤로, altar_h = 제대 윗면 높이)" }
  };
  root.ChurchShrinePlaces = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
