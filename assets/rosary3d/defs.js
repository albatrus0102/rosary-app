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
      bead: { shape: 'faceted', small: 1.0, big: 1.3, aspect: 0.9, irregular: 0.0, material: 'crystalBlue', caps: 'silver', shadow: false },
      link: { type: 'chain', material: 'silver', gap: 0.56, width: 0.065 },
      cross: { type: 'filigree', material: 'silver', corpus: 'silver', height: 5.4, width: 3.4, depth: 0.2 },
      medal: { type: 'round', material: 'silver', height: 1.85 }
    },
    ebony: {
      id: 'ebony', name: '흑단 원목 묵주', category: 'wood',
      bead: { shape: 'cylinder', small: 0.92, big: 1.18, aspect: 1.25, irregular: 0.01, material: 'ebony' },
      link: { type: 'chain', material: 'antiqueSilver', gap: 0.5, width: 0.07 },
      cross: { type: 'benedict', material: 'antiqueSilver', corpus: 'silver', height: 5.4, width: 3.4, depth: 0.24 },
      medal: { type: 'round', material: 'antiqueSilver', height: 1.8 }
    },
    rosewood: {
      id: 'rosewood', name: '로즈우드 묵주', category: 'wood',
      bead: { shape: 'sphere', small: 1.06, big: 1.42, aspect: 1.0, irregular: 0.02, material: 'rosewood' },
      link: { type: 'cord', material: 'cordBrown', gap: 0.36, width: 0.12, knot: true },
      cross: { type: 'woodLatin', material: 'rosewoodCross', trim: 'gold', corpus: 'gold', height: 5.8, width: 3.5, depth: 0.46 },
      medal: { type: 'oval', material: 'gold', height: 1.9 }
    },
    glass: {
      id: 'glass', name: '초록 유리 묵주', category: 'glass',
      bead: { shape: 'sphere', small: 1.0, big: 1.3, aspect: 0.96, irregular: 0.035, material: 'glassGreen', caps: 'silver', shadow: false },
      link: { type: 'eyepin', material: 'silver', gap: 0.48, width: 0.07 },
      cross: { type: 'plain', material: 'silver', corpus: 'silver', height: 5.0, width: 3.2, depth: 0.22 },
      medal: { type: 'heart', material: 'silver', height: 1.7 }
    },
    amethyst: {
      id: 'amethyst', name: '자수정 묵주', category: 'glass',
      bead: { shape: 'faceted', small: 0.95, big: 1.25, aspect: 1.28, irregular: 0.0, material: 'amethyst', shadow: false },
      link: { type: 'eyepin', material: 'silver', gap: 0.52, width: 0.06 },
      cross: { type: 'filigree', material: 'silver', corpus: 'silver', height: 5.6, width: 3.4, depth: 0.2 },
      medal: { type: 'filigreeOval', material: 'silver', height: 1.95 }
    },
    rosequartz: {
      id: 'rosequartz', name: '장미석 묵주', category: 'glass',
      bead: { shape: 'sphere', small: 1.0, big: 1.3, aspect: 1.0, irregular: 0.008, material: 'roseQuartz', caps: 'roseGold', shadow: false },
      link: { type: 'eyepin', material: 'roseGold', gap: 0.46, width: 0.065 },
      cross: { type: 'budded', material: 'roseGold', corpus: 'roseGold', height: 5.0, width: 3.2, depth: 0.22 },
      medal: { type: 'heart', material: 'roseGold', height: 1.8 }
    },
    amber: {
      id: 'amber', name: '호박 묵주', category: 'gem',
      bead: { shape: 'nugget', small: 1.02, big: 1.34, aspect: 1.12, irregular: 0.085, material: 'amber', shadow: false },
      link: { type: 'cord', material: 'cordAmber', gap: 0.34, width: 0.1, knot: true },
      cross: { type: 'celtic', material: 'bronze', corpus: 'gold', height: 5.4, width: 3.4, depth: 0.26 },
      medal: { type: 'round', material: 'bronze', height: 1.85 }
    },
    lapis: {
      id: 'lapis', name: '청금석 묵주', category: 'gem',
      bead: { shape: 'cube', small: 0.92, big: 1.2, aspect: 1.0, irregular: 0.0, material: 'lapis' },
      link: { type: 'chain', material: 'gold', gap: 0.5, width: 0.07 },
      cross: { type: 'benedict', material: 'gold', corpus: 'goldBright', height: 5.4, width: 3.4, depth: 0.24 },
      medal: { type: 'round', material: 'gold', height: 1.85 }
    },
    jade: {
      id: 'jade', name: '옥 묵주', category: 'gem',
      bead: { shape: 'rondelle', small: 1.08, big: 1.36, aspect: 0.66, irregular: 0.0, material: 'jade', caps: 'gold' },
      link: { type: 'cord', material: 'cordRed', gap: 0.4, width: 0.11, knot: true },
      cross: { type: 'woodLatin', material: 'jade', trim: 'gold', corpus: 'gold', height: 5.4, width: 3.3, depth: 0.4 },
      medal: { type: 'oval', material: 'gold', height: 1.85 }
    },
    silver: {
      id: 'silver', name: '앤티크 실버 세공 묵주', category: 'metal',
      bead: { shape: 'sphere', small: 0.96, big: 1.3, aspect: 1.0, irregular: 0.0, material: 'silverCarved' },
      link: { type: 'chain', material: 'antiqueSilver', gap: 0.42, width: 0.08 },
      cross: { type: 'filigree', material: 'antiqueSilver', corpus: 'silver', height: 5.8, width: 3.6, depth: 0.24 },
      medal: { type: 'oval', material: 'antiqueSilver', height: 2.0 }
    },
    gold: {
      id: 'gold', name: '금도금 묵주', category: 'metal',
      bead: { shape: 'melon', small: 0.94, big: 1.26, aspect: 1.0, irregular: 0.0, material: 'goldPlated' },
      link: { type: 'chain', material: 'gold', gap: 0.4, width: 0.065 },
      cross: { type: 'celtic', material: 'goldBright', corpus: 'gold', height: 5.4, width: 3.4, depth: 0.22 },
      medal: { type: 'filigreeOval', material: 'gold', height: 1.95 }
    },
    ceramic: {
      id: 'ceramic', name: '세라믹 묵주', category: 'ceramic',
      bead: { shape: 'ellipsoid', small: 1.05, big: 1.38, aspect: 1.08, irregular: 0.03, material: 'ceramic' },
      link: { type: 'cord', material: 'cordBlue', gap: 0.38, width: 0.1, knot: false },
      cross: { type: 'plain', material: 'ceramic', trim: 'silver', corpus: 'silver', height: 5.2, width: 3.3, depth: 0.42 },
      medal: { type: 'round', material: 'silver', height: 1.8 }
    }
,
    knot: {
      id: 'knot', name: '매듭 묵주', category: 'cord',
      bead: { shape: 'knot', small: 0.9, big: 1.15, aspect: 1.0, irregular: 0.0, material: 'twine' },
      link: { type: 'cord', material: 'cordTwine', gap: 0.3, width: 0.13, knot: false },
      cross: { type: 'plain', material: 'bronze', corpus: 'bronze', height: 4.6, width: 3.0, depth: 0.2 },
      medal: { type: 'round', material: 'bronze', height: 1.6 }
    },
    pastel: {
      id: 'pastel', name: '파스텔 묵주', category: 'acrylic',
      bead: { shape: 'sphere', small: 0.96, big: 1.24, aspect: 1.0, irregular: 0.0, material: 'pastelAcrylic', caps: 'silver',
        palette: ['#f6b6c8', '#b9dcf4', '#fbeaa0', '#bfe9cc', '#d8c6f2'] },
      link: { type: 'eyepin', material: 'silver', gap: 0.46, width: 0.06 },
      cross: { type: 'budded', material: 'silver', corpus: 'silver', height: 4.8, width: 3.1, depth: 0.2 },
      medal: { type: 'heart', material: 'silver', height: 1.6 }
    }
  };
  var ORDER = ['olive', 'ebony', 'rosewood', 'pearl', 'crystal', 'glass', 'amethyst', 'rosequartz', 'amber', 'lapis', 'jade', 'silver', 'gold', 'ceramic', 'knot', 'pastel'];
  var API = { DEFS: DEFS, ORDER: ORDER, get: function (id) { return DEFS[id] || DEFS.olive; } };
  root.RosaryDefs = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
