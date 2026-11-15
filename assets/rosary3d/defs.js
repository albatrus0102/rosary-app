/* defs.js — 묵주 정의 데이터(JSON 형식). 새 묵주는 이 표에 한 항목을 더하면 된다(형식: docs/rosary/ROSARY_3D.md).
   단위: 작은 알 지름 = 1. 재질 이름은 materials.js 의 MAT, 형태 이름은 models.js 의 빌더와 맞춘다.
   Flutter 쪽 목록(lib/rosary3d/rosary_catalog.dart)과 id 가 같아야 한다(tools/church_web/rosary3d.test.mjs 가 확인). */
(function (root) {
  'use strict';
  var DEFS = {
    olive: {
      id: 'olive', name: '올리브 원목 묵주', category: 'wood',
      bead: { shape: 'ellipsoid', small: 1.0, big: 1.32, aspect: 1.13, irregular: 0.035, material: 'oliveWood' },
      link: { type: 'cord', material: 'cordBrown', gap: 0.42, width: 0.11, knot: true },
      cross: { type: 'woodLatin', material: 'oliveWoodDark', trim: 'antiqueSilver', corpus: 'antiqueSilver', height: 5.6, width: 3.4, depth: 0.42 },
      medal: { type: 'oval', material: 'antiqueSilver', height: 1.9 }
    },
    pearl: {
      id: 'pearl', name: '아이보리 진주 묵주', category: 'pearl',
      bead: { shape: 'sphere', small: 1.0, big: 1.28, aspect: 1.0, irregular: 0.012, material: 'pearl', caps: 'gold' },
      link: { type: 'eyepin', material: 'gold', gap: 0.5, width: 0.07 },
      cross: { type: 'budded', material: 'gold', corpus: 'goldBright', height: 5.2, width: 3.3, depth: 0.22 },
      medal: { type: 'filigreeOval', material: 'gold', height: 2.0 }
    },
    crystal: {
      id: 'crystal', name: '청색 수정 묵주', category: 'crystal',
      bead: { shape: 'faceted', small: 1.0, big: 1.3, aspect: 0.9, irregular: 0.0, material: 'crystalBlue', caps: 'silver' },
      link: { type: 'chain', material: 'silver', gap: 0.56, width: 0.065 },
      cross: { type: 'filigree', material: 'silver', corpus: 'silver', height: 5.4, width: 3.4, depth: 0.2 },
      medal: { type: 'round', material: 'silver', height: 1.85 }
    }
  };
  var ORDER = ['olive', 'pearl', 'crystal'];
  var API = { DEFS: DEFS, ORDER: ORDER, get: function (id) { return DEFS[id] || DEFS.olive; } };
  root.RosaryDefs = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
