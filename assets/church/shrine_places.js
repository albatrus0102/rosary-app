/* shrine_places.js — 성당별 '성모 기도 자리' 표(순수 자료). shrine.js 가 읽는다.
   x,z = 성상 받침 중심(벽 앞 0.3m), yaw = 성상이 바라보는 방향(도; 0 = +z(입구 쪽), 90 = +x, -90 = -x, 180 = -z), y = 바닥 높이(기본 0).
   kind: 'mary'(받침 + 성모상 + 뒤판) | 'plain'(문양 없는 단순 성상) | 'existing'(빌더가 이미 세운 성모상 앞: 봉헌초 받침·무릎틀만).
   pending: true 인 성당은 건너뛴다(구조 확정 뒤 배치). 자리를 바꾸면 node tools/church_web/export_layouts.mjs 로 서버 레이아웃을 다시 만든다. */
(function (root) {
  'use strict';
  var P = {
    basic: { x: -8.5, z: -17.75, y: 0.5, yaw: 0, kind: 'existing', label_ko: '성모상 앞', note: '성소 왼쪽의 기존 성모상(ch_basic) 앞' },
    myeongdong: { x: -13.2, z: -8.0, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '기존 성모상(후진 제대 뒤, z -29)은 걷기 경계 밖이라 왼쪽 익랑 끝 벽에 따로 모심' },
    lateran: { x: -13.6, z: -4.6, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 바깥 측랑 앞쪽 벽' },
    stpaul: { x: -16.9, z: -11.5, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽 익랑 쪽 벽' },
    milan: { x: -19.4, z: -16.7, yaw: 90, kind: 'mary', label_ko: '성모상 앞', note: '왼쪽(북) 익랑 벽 — 실제 마돈나 델 알베로 제대 쪽' },
    danggogae: { x: -7.0, z: 12.1, yaw: 90, kind: 'plain', label_ko: '성모상 앞', note: '입구 홀(봉헌초 맞은편 벽). 실내 성모상 위치 미확인 — 문양 없는 단순 형태' },
    florence: { pending: true, note: '구조 확정(병합) 후 배치' },
    maggiore: { pending: true, note: '구조 확정(병합) 후 배치 — 파올리나 경당(로마 백성의 구원) 제대 앞' },
    stpeter: { pending: true, note: '구조 확정(병합) 후 배치' }
  };
  root.ChurchShrinePlaces = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
