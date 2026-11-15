/* shrine_places.js — 성당별 '성모 기도 자리' 표(순수 자료). shrine.js 가 읽는다.
   x,z = 성상 받침 중심(벽 앞 0.3m), yaw = 성상이 바라보는 방향(도; 0 = +z(입구 쪽), 90 = +x, -90 = -x, 180 = -z), y = 바닥 높이(기본 0).
   kind: 'mary'(받침 + 성모상 + 뒤판) | 'plain'(문양 없는 단순 성상) | 'existing'(빌더가 이미 세운 성모상 앞: 봉헌초 받침·무릎틀만).
   pending: true 인 성당은 건너뛴다(구조 확정 뒤 배치). 자리를 바꾸면 node tools/church_web/export_layouts.mjs 로 서버 레이아웃을 다시 만든다. */
(function (root) {
  'use strict';
  var P = {
    basic: { x: -11.7, z: -12.3, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 벽 맨 앞(성소 계단 아래). 성소 위 기존 성모상 앞은 전례 장식(구유 등) 동선과 겹쳐 쓰지 않음' },
    myeongdong: { x: -13.2, z: -8.0, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '기존 성모상(후진 제대 뒤, z -29)은 걷기 경계 밖이라 왼쪽 익랑 끝 벽에 따로 모심' },
    lateran: { x: -13.6, z: -4.6, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 바깥 측랑 앞쪽 벽' },
    stpaul: { x: -16.9, z: -11.5, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 익랑 쪽 벽' },
    milan: { x: -19.4, z: -16.7, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽(북) 익랑 벽 — 실제 마돈나 델 알베로 제대 쪽' },
    danggogae: { x: -4.6, z: 15.2, yaw: 180, kind: 'plain', label_ko: '성모상 앞', note: '입구 홀 뒷벽(봉헌초 맞은편). 실내 성모상 위치 미확인 — 문양 없는 단순 형태' },
    florence: { x: -7.5, z: -4.7, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 측랑 맨 앞 벽면(팔각 통로 바로 앞)' },
    maggiore: { x: -27.2, z: -9.965, yaw: 90, kind: 'existing', label_ko: '로마 백성의 구원 앞', note: "파올리나 경당 제단의 '로마 백성의 구원' 성화 앞(제단 계단 아래, 기도 좌석 앞). 성상은 세우지 않음" },
    stpeter: { x: -13.8, z: -24.25, yaw: 0, kind: 'existing', label_ko: '기둥의 성모 앞', note: "서쪽 왼쪽 모서리 경당 '기둥의 성모(Madonna della Colonna)' 제대 앞(제대 단 앞 가장자리). 성상은 세우지 않음(제단화)" }
  };
  root.ChurchShrinePlaces = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
