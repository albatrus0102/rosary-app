/* cross_data.js — 생성 파일(직접 고치지 말 것). 원본 data/stations_of_cross.json,
   data/stations_series.json, python3 tools/stations/build_stations.py.
   성당 3D 14처 판(way_cross.js)이 번호·로마 숫자와 성당별 그림 연작(series)을 쓴다. */
(function (root) {
  'use strict';
  var D = {
 "version": 2,
 "stations": [
  {
   "n": 1,
   "roman": "I",
   "short": "사형 선고",
   "title": "예수님께서 사형 선고 받으심"
  },
  {
   "n": 2,
   "roman": "II",
   "short": "십자가를 지심",
   "title": "예수님께서 십자가 지심"
  },
  {
   "n": 3,
   "roman": "III",
   "short": "처음 넘어지심",
   "title": "예수님께서 기력이 떨어져 넘어지심"
  },
  {
   "n": 4,
   "roman": "IV",
   "short": "성모님을 만나심",
   "title": "예수님께서 성모님을 만나심"
  },
  {
   "n": 5,
   "roman": "V",
   "short": "시몬이 십자가를 짐",
   "title": "시몬이 예수님을 도와 십자가 짐"
  },
  {
   "n": 6,
   "roman": "VI",
   "short": "베로니카",
   "title": "베로니카, 수건으로 예수님의 얼굴을 닦아 드림"
  },
  {
   "n": 7,
   "roman": "VII",
   "short": "두 번째 넘어지심",
   "title": "기력이 다하신 예수님께서 두 번째 넘어지심"
  },
  {
   "n": 8,
   "roman": "VIII",
   "short": "부인들을 위로하심",
   "title": "예수님께서 예루살렘 부인들을 위로하심"
  },
  {
   "n": 9,
   "roman": "IX",
   "short": "세 번째 넘어지심",
   "title": "예수님께서 세 번째 넘어지심"
  },
  {
   "n": 10,
   "roman": "X",
   "short": "옷 벗김을 당하심",
   "title": "예수님께서 옷 벗김 당하심"
  },
  {
   "n": 11,
   "roman": "XI",
   "short": "못 박히심",
   "title": "예수님께서 십자가에 못 박히심"
  },
  {
   "n": 12,
   "roman": "XII",
   "short": "돌아가심",
   "title": "예수님께서 십자가 위에서 돌아가심"
  },
  {
   "n": 13,
   "roman": "XIII",
   "short": "십자가에서 내림",
   "title": "제자들이 예수님 시신을 십자가에서 내림"
  },
  {
   "n": 14,
   "roman": "XIV",
   "short": "무덤에 묻히심",
   "title": "예수님께서 무덤에 묻히심"
  }
 ],
 "series": {
  "default": "fugel",
  "churches": {
   "basic": "fugel",
   "light": "fugel",
   "stpeter": "previati",
   "lateran": "oreilly",
   "maggiore": "corot",
   "stpaul": "fahnroth",
   "milan": "hermann_paul",
   "florence": "mosler",
   "myeongdong": "fugel_munich",
   "danggogae": "tiepolo",
   "yeouido": "fugel",
   "assisi": "fugel"
  },
  "packs": {
   "fugel": {
    "file": "cross_pack.js",
    "title": "게프하르트 푸겔 〈십자가의 길〉"
   },
   "previati": {
    "file": "dev/cross_pack_previati.js",
    "title": "가에타노 프레비아티 〈십자가의 길〉"
   },
   "oreilly": {
    "file": "cross_pack_oreilly.js",
    "title": "《가톨릭 진리의 아름다운 진주》 십자가의 길 삽화"
   },
   "corot": {
    "file": "cross_pack_corot.js",
    "title": "장바티스트 카미유 코로 〈로즈니 성당 십자가의 길〉"
   },
   "hermann_paul": {
    "file": "cross_pack_hermann_paul.js",
    "title": "헤르만 폴 〈Via Crucis〉"
   },
   "mosler": {
    "file": "cross_pack_mosler.js",
    "title": "D. 모슬러 《The Stations of the Cross》 삽화"
   },
   "tiepolo": {
    "file": "cross_pack_tiepolo.js",
    "title": "조반니 도메니코 티에폴로 〈Via Crucis〉 동판화"
   },
   "fugel_munich": {
    "file": "cross_pack_fugel_munich.js",
    "title": "게프하르트 푸겔 〈뮌헨 성 요셉 성당 십자가의 길〉"
   },
   "fahnroth": {
    "file": "cross_pack_fahnroth.js",
    "title": "요제프 판로트 〈노이루핀 예수 성심 성당 십자가의 길〉"
   }
  }
 }
};
  if (typeof module === 'object' && module.exports) module.exports = D;
  else root.ChurchCrossData = D;
})(typeof window !== 'undefined' ? window : this);
