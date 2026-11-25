/* stations.js — 만든 파일(손대지 마세요): node web_demo/gen_prayers.mjs. 십자가의 길: 앱과 같은 원본
   data/stations_prayers.json(『가톨릭 기도서』 공식 기도문, 글자 그대로) · data/stations_of_cross.json · data/stations_series.json.
   연작은 출시 빌드 규칙(release_gate.dart: hidden ["previati"] → {"stpeter":"oreilly"})대로. 그림은 장면의 cross_pack*.js 를 다시 쓴다.
   한국어 말고는 확인된 십자가의 길 본문이 없어 화면이 「공식 본문을 받는 대로 넣습니다」를 보인다. */
(function (root) { root.DemoStations = {
 "credit": "기도문: 한국천주교주교회의 『가톨릭 기도서』(개정판) ‘십자가의 길’ © 한국천주교주교회의",
 "markers": {
  "leader": {
   "g": "┼",
   "o": "집전자 또는 주송자"
  },
  "cantor": {
   "g": "○",
   "o": "계 또는 선창자"
  },
  "response": {
   "g": "●",
   "o": "응"
  },
  "all": {
   "g": "◎",
   "o": "합송"
  }
 },
 "openingRubric": "먼저 깊이 뉘우치고 아래의 기도를 바친다.",
 "opening": {
  "role": "leader",
  "lines": [
   "주 예수님,",
   "저희를 위하여 온갖 수난을 겪으신",
   "주님의 사랑을 묵상하며",
   "성모님과 함께",
   "십자가의 길을 걷고자 하나이다.",
   "저희에게 죄를 뉘우치고",
   "주님의 수난을 함께 나눌 마음을 주시어",
   "언제나 주님을 사랑하게 하시며",
   "성직자들을 거룩하게 하시고",
   "모든 죄인이 회개하도록 은혜를 내려 주소서."
  ]
 },
 "toStation": {
  "rubric": "제{n}처로 가며",
  "role": "all",
  "lines": [
   "어머니께 청하오니",
   "제 맘속에 주님 상처 깊이 새겨 주소서."
  ]
 },
 "verse": [
  {
   "role": "leader",
   "lines": [
    "주님께서는 십자가로 온 세상을 구원하셨나이다."
   ]
  },
  {
   "role": "all",
   "lines": [
    "예수 그리스도님,",
    {
     "rubric": "깊은 절을 하며"
    },
    "경배하며 찬송하나이다."
   ]
  }
 ],
 "after": [
  "잠깐 묵상한다.",
  "주님의 기도, 성모송, 영광송."
 ],
 "closing": "주님, 십자가의 길을 함께 걸었습니다. 주님께서 보여 주신 사랑을 기억하며 오늘 만나는 이웃에게 그 사랑을 나누게 하소서. 아멘.",
 "disclosure": "이 그림은 이 성당에 실제로 걸린 작품이 아니라 로사리움이 고른 대체 성화입니다.",
 "def": "fugel",
 "assign": {
  "basic": "fugel",
  "light": "fugel",
  "stpeter": "oreilly",
  "lateran": "oreilly",
  "stpaul": "fahnroth",
  "milan": "hermann_paul",
  "florence": "mosler",
  "myeongdong": "fugel_munich",
  "danggogae": "tiepolo",
  "yeouido": "fugel",
  "assisi": "fugel"
 },
 "series": {
  "fugel": {
   "pack": "cross_pack.js",
   "ko": "게프하르트 푸겔 〈십자가의 길〉, 1921, 바트 자울가우 성 안토니오 성당(독일). 사진·스캔 Andreas Praefcke. Public domain. 가장자리를 자르고 크기를 줄임.",
   "artist": "Gebhard Fugel",
   "year": "1921",
   "photo": "Andreas Praefcke",
   "license": "Public domain"
  },
  "oreilly": {
   "pack": "cross_pack_oreilly.js",
   "ko": "《가톨릭 진리의 아름다운 진주》 십자가의 길 삽화, 1897, 버나드 오라일리 엮음 《Beautiful Pearls of Catholic Truth》(1897) 삽화. 사진·스캔 University of California Libraries 스캔(Internet Archive). Public domain. 책장의 제목·여백을 잘라 내고 크기를 줄임.",
   "artist": "Unknown (American Lithographic Co., N.Y.); in B. O'Reilly, Beautiful Pearls of Catholic Truth",
   "year": "1897",
   "photo": "",
   "license": "Public domain"
  },
  "corot": {
   "pack": "cross_pack_corot.js",
   "ko": "장바티스트 카미유 코로 〈로즈니 성당 십자가의 길〉, 1853–59, 로즈니쉬르센 성당(프랑스). 사진·스캔 미확인(도판 복제, Commons 출처 amolenuvolette.it). Public domain (PD-Art). 크기를 줄임.",
   "artist": "Jean-Baptiste-Camille Corot",
   "year": "1853–59",
   "photo": "",
   "license": "Public domain (PD-Art)"
  },
  "hermann_paul": {
   "pack": "cross_pack_hermann_paul.js",
   "ko": "헤르만 폴 〈Via Crucis〉, 1929, 아우구스토 달마르·헤르만 폴 《Via Crucis》(파리 Henry Babou, 1929) 목판화. 사진·스캔 Uto. CC0 1.0. 책장 여백을 잘라 내고 크기를 줄임.",
   "artist": "René Georges Hermann-Paul",
   "year": "1929",
   "photo": "Uto",
   "license": "CC0 1.0"
  },
  "mosler": {
   "pack": "cross_pack_mosler.js",
   "ko": "D. 모슬러 《The Stations of the Cross》 삽화, 1859, 《The Stations of the Cross. With fourteen illustrations by D. Mosler》(런던 Burns & Lambert, 1859). 사진·스캔 Google Books 스캔(Internet Archive 사본). Public domain. 책장에서 삽화만 잘라 내고 크기를 줄임.",
   "artist": "D. Mosler",
   "year": "1859",
   "photo": "",
   "license": "Public domain"
  },
  "tiepolo": {
   "pack": "cross_pack_tiepolo.js",
   "ko": "조반니 도메니코 티에폴로 〈Via Crucis〉 동판화, 1749, 암스테르담 국립미술관(Rijksmuseum) 소장 동판화(베네치아 산 폴로 성당 유화 연작을 작가가 직접 새김). 사진·스캔 Rijksmuseum. CC0 1.0. 아래 글귀와 여백을 잘라 내고 크기를 줄임(용량을 위해 살짝 흐림).",
   "artist": "Giovanni Domenico Tiepolo",
   "year": "1749",
   "photo": "Rijksmuseum",
   "license": "CC0 1.0"
  },
  "fugel_munich": {
   "pack": "cross_pack_fugel_munich.js",
   "ko": "게프하르트 푸겔 〈뮌헨 성 요셉 성당 십자가의 길〉, 1904–08, 뮌헨 성 요셉 성당(독일; 원작은 1944년 소실) — 1908년경 그림엽서. 사진·스캔 1908년경 그림엽서 스캔(Commons 올린 이의 스캔). Public domain. 엽서 여백을 잘라 내고 크기를 줄임.",
   "artist": "Gebhard Fugel",
   "year": "1904–08",
   "photo": "",
   "license": "Public domain"
  },
  "fahnroth": {
   "pack": "cross_pack_fahnroth.js",
   "ko": "요제프 판로트 〈노이루핀 예수 성심 성당 십자가의 길〉, 1886, 노이루핀 예수 성심 성당(독일). 사진·스캔 미확인(Commons 출처 herz-jesu-neuruppin.de). Public domain (PD-Art). 크기를 줄임.",
   "artist": "Joseph Fahnroth",
   "year": "1886",
   "photo": "",
   "license": "Public domain (PD-Art)"
  }
 },
 "stations": [
  {
   "n": 1,
   "roman": "I",
   "title": "예수님께서 사형 선고 받으심",
   "refs": "마태 27,22-26; 마르 15,6-15; 루카 23,13-25; 요한 19,1-16",
   "tradition": false,
   "meditation": "죄 없으신 예수님께서 빌라도 앞에 서셨습니다. 군중의 외침 속에서 사형 선고가 내려졌지만, 주님께서는 아무 변명 없이 그 길을 받아들이셨습니다.",
   "petition": "주님, 남을 쉽게 판단하지 않고 억울한 이들 곁에 서게 하소서.",
   "announce": "예수님께서 사형 선고 받으심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "저희를 위하여",
    "아무런 죄도 없이 극심한 모욕과 사형 선고를 받으셨으니",
    "죄인들이 마땅히 받아야 할 영원한 벌에서",
    "저희를 구원하소서."
   ]
  },
  {
   "n": 2,
   "roman": "II",
   "title": "예수님께서 십자가 지심",
   "refs": "요한 19,17; 마태 27,31; 마르 15,20",
   "tradition": false,
   "meditation": "예수님께서 무거운 십자가를 어깨에 지셨습니다. 그 나무에는 우리의 잘못과 세상의 아픔이 함께 실려 있었습니다.",
   "petition": "주님, 제게 주어진 십자가를 피하지 않고 주님과 함께 지게 하소서.",
   "announce": "예수님께서 십자가 지심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "저희를 사랑하신 까닭에",
    "이 무거운 십자가를 기꺼이 지고 가셨으니",
    "저희도 주님을 사랑하며",
    "주님께서 허락하시는 모든 십자가를",
    "기꺼이 지게 하소서."
   ]
  },
  {
   "n": 3,
   "roman": "III",
   "title": "예수님께서 기력이 떨어져 넘어지심",
   "refs": "전승(성경에 직접 나오지 않음)",
   "tradition": true,
   "meditation": "십자가의 무게에 눌려 예수님께서 땅에 넘어지셨습니다. 그러나 주님께서는 다시 일어나 걸음을 이어 가셨습니다.",
   "petition": "주님, 넘어질 때마다 다시 일어날 힘을 주소서.",
   "announce": "예수님께서 기력이 떨어져 넘어지심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "무거운 십자가에 눌려 넘어지시는",
    "고통과 모욕을 당하셨으니",
    "저희가 언제나 주님을 변함없이 섬기며",
    "죄에 떨어지는 일이 없게 하소서."
   ]
  },
  {
   "n": 4,
   "roman": "IV",
   "title": "예수님께서 성모님을 만나심",
   "refs": "전승(참조: 루카 2,34-35; 요한 19,25-27)",
   "tradition": true,
   "meditation": "십자가의 길에서 어머니 마리아께서 아드님을 만나셨습니다. 말없이 마주친 눈길에 어머니의 아픔과 깊은 믿음이 함께 담겨 있었습니다.",
   "petition": "성모님, 고통 중에 있는 이들 곁에 머무는 사랑을 가르쳐 주소서.",
   "announce": "예수님께서 성모님을 만나심을 묵상합시다.",
   "prayer": [
    "구세주 예수님과 성모 마리아님,",
    "괴로운 십자가의 길에서 서로 만나시어",
    "사무치는 아픔을 겪으셨으니",
    "저희 마음에 사랑을 북돋아 주시어",
    "주님과 성모님을 사랑하는 데에",
    "장애되는 모든 것을 물리치게 하소서."
   ]
  },
  {
   "n": 5,
   "roman": "V",
   "title": "시몬이 예수님을 도와 십자가 짐",
   "refs": "마태 27,32; 마르 15,21; 루카 23,26",
   "tradition": false,
   "meditation": "군인들이 길을 지나던 키레네 사람 시몬에게 십자가를 지게 하였습니다. 뜻하지 않게 짊어진 짐이었지만, 그는 주님의 짐을 함께 나눈 사람이 되었습니다.",
   "petition": "주님, 이웃의 무거운 짐을 기꺼이 함께 지게 하소서.",
   "announce": "시몬이 예수님을 도와 십자가 짐을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "시몬이 주님을 도와 십자가를 졌으니",
    "저희도 주님께서 맡겨 주시는 십자가를",
    "날마다 기꺼이 지고 가게 하소서."
   ]
  },
  {
   "n": 6,
   "roman": "VI",
   "title": "베로니카, 수건으로 예수님의 얼굴을 닦아 드림",
   "refs": "전승(성경에 직접 나오지 않음)",
   "tradition": true,
   "meditation": "전승에 따르면 베로니카라는 여인이 용기를 내어 예수님의 얼굴을 수건으로 닦아 드렸습니다. 작은 사랑의 손길이 고통 속의 주님을 위로하였습니다.",
   "petition": "주님, 고통받는 이웃의 얼굴에서 주님을 알아보게 하소서.",
   "announce": "베로니카, 수건으로 예수님의 얼굴을 닦아 드림을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "나쁜 무리가 주님의 얼굴에 침을 뱉고",
    "주님을 업신여기며 모욕하였듯이",
    "저희도 죄를 지을 때마다",
    "주님의 얼굴을 더럽히는 것이오니",
    "통회의 눈물로",
    "주님의 얼굴을 씻어 드리게 하소서."
   ]
  },
  {
   "n": 7,
   "roman": "VII",
   "title": "기력이 다하신 예수님께서 두 번째 넘어지심",
   "refs": "전승(성경에 직접 나오지 않음)",
   "tradition": true,
   "meditation": "기운이 다하신 예수님께서 다시 넘어지셨습니다. 거듭되는 약함 속에서도 주님께서는 우리를 향한 사랑을 거두지 않으셨습니다.",
   "petition": "주님, 같은 잘못을 되풀이할 때에도 주님의 자비를 믿고 다시 일어서게 하소서.",
   "announce": "기력이 다하신 예수님께서 두 번째 넘어지심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "저희를 위하여 두 번째 넘어지시는 고욕을 당하셨으니",
    "주님을 한결같이 섬기지 못하고",
    "다시 죄에 떨어져",
    "주님의 사랑을 저버리는 저희에게 자비를 베푸시어",
    "다시는 세속과 육신의 간교한 유혹에 빠지지 않게 하소서."
   ]
  },
  {
   "n": 8,
   "roman": "VIII",
   "title": "예수님께서 예루살렘 부인들을 위로하심",
   "refs": "루카 23,27-31",
   "tradition": false,
   "meditation": "예수님을 따르며 슬피 우는 여인들을 주님께서 돌아보셨습니다. 당신의 고통 속에서도 주님께서는 그들과 그 자녀들을 걱정하셨습니다.",
   "petition": "주님, 슬퍼하는 이들을 위로하시고 저희 마음을 회개로 이끄소서.",
   "announce": "예수님께서 예루살렘 부인들을 위로하심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "저희 죄로 상처를 받으시고",
    "온몸이 헤어지셨으니",
    "저희에게 풍부한 은총을 내리시어",
    "지난날에 지은 모든 죄를 뉘우치며",
    "주님의 품을 찾아들게 하소서."
   ]
  },
  {
   "n": 9,
   "roman": "IX",
   "title": "예수님께서 세 번째 넘어지심",
   "refs": "전승(성경에 직접 나오지 않음)",
   "tradition": true,
   "meditation": "골고타 가까이에서 예수님께서 세 번째로 넘어지셨습니다. 마지막 힘을 다해 일어나신 주님께서는 끝까지 사랑의 길을 걸으셨습니다.",
   "petition": "주님, 지치고 낙심한 이들에게 끝까지 걸어갈 희망을 주소서.",
   "announce": "예수님께서 세 번째 넘어지심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "무거운 저희 죄에 눌리시어",
    "세 번이나 무참히 넘어지셨으니",
    "그 수난의 공로를 저희에게 나누어 주시어",
    "저희가 이미 지은 죄에서 다시 일어나게 하소서."
   ]
  },
  {
   "n": 10,
   "roman": "X",
   "title": "예수님께서 옷 벗김 당하심",
   "refs": "마태 27,33-35; 마르 15,24; 루카 23,34; 요한 19,23-24",
   "tradition": false,
   "meditation": "군인들이 예수님의 옷을 벗기고 그 옷을 나누어 가졌습니다. 주님께서는 모든 것을 빼앗기시고도 아버지께 당신을 온전히 맡기셨습니다.",
   "petition": "주님, 존엄을 짓밟힌 이들을 지켜 주시고 저희가 가난한 마음을 지니게 하소서.",
   "announce": "예수님께서 옷 벗김 당하심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "병사들이 난폭하게 주님의 옷을 벗길 때에",
    "살이 묻어나는 극도의 고통을 당하셨으며",
    "죄수로 군중 앞에 서시는 모욕을 당하셨으니",
    "저희가 모든 죄를 벗어 버리게 하소서."
   ]
  },
  {
   "n": 11,
   "roman": "XI",
   "title": "예수님께서 십자가에 못 박히심",
   "refs": "마태 27,35-38; 마르 15,24-27; 루카 23,33; 요한 19,18",
   "tradition": false,
   "meditation": "예수님께서 십자가에 못 박히셨습니다. 그 고통 속에서도 주님께서는 당신을 못 박은 이들을 위하여 아버지께 용서를 청하셨습니다.",
   "petition": "주님, 제게 상처를 준 사람을 용서할 수 있는 마음을 주소서.",
   "announce": "예수님께서 십자가에 못 박히심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "알몸으로 십자가에 못 박혀 달리셨으니",
    "저희도 주님과 같이",
    "몸과 마음을 희생 제물로 봉헌하게 하소서."
   ]
  },
  {
   "n": 12,
   "roman": "XII",
   "title": "예수님께서 십자가 위에서 돌아가심",
   "refs": "마태 27,45-56; 마르 15,33-41; 루카 23,44-49; 요한 19,28-30",
   "tradition": false,
   "meditation": "어둠이 온 땅을 덮은 가운데 예수님께서 아버지께 당신 영을 맡기시고 숨을 거두셨습니다. 십자가 위에서 하느님의 사랑이 끝까지 드러났습니다.",
   "petition": "주님, 잠시 침묵하며 주님의 죽음 앞에 머뭅니다. 주님께서 주신 생명을 감사하며 살게 하소서.",
   "announce": "예수님께서 십자가 위에서 돌아가심을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "저희를 위하여 십자가 위에서 숨을 거두셨으니",
    "저희도 십자가에 못 박혀",
    "다시는 저희 자신을 위하여 살지 않고",
    "주님을 위하여 살게 하소서.",
    "구세주 예수님,",
    "혹시라도 영원히 주님을 떠날 불행이 저희에게 닥칠 양이면",
    "차라리 지금 주님과 함께 죽는 행복을 내려 주소서."
   ]
  },
  {
   "n": 13,
   "roman": "XIII",
   "title": "제자들이 예수님 시신을 십자가에서 내림",
   "refs": "마태 27,57-59; 마르 15,42-46; 루카 23,50-53; 요한 19,38",
   "tradition": false,
   "meditation": "아리마태아 사람 요셉이 예수님의 시신을 십자가에서 내렸습니다. 전승은 성모님께서 아드님의 몸을 품에 안으셨다고 전합니다.",
   "petition": "성모님, 사랑하는 이를 잃고 슬퍼하는 이들을 위로해 주소서.",
   "announce": "제자들이 예수님 시신을 십자가에서 내림을 묵상합시다.",
   "prayer": [
    "구세주 예수님,",
    "주님의 시신을 십자가에서 내려 품에 안으신",
    "성모님의 전구를 들으시어",
    "저희도 성모님 품 안에서",
    "효성스러운 자녀로 살다가",
    "마침내 그 품 안에서 죽게 하소서."
   ]
  },
  {
   "n": 14,
   "roman": "XIV",
   "title": "예수님께서 무덤에 묻히심",
   "refs": "마태 27,59-61; 마르 15,46-47; 루카 23,53-56; 요한 19,39-42",
   "tradition": false,
   "meditation": "예수님의 시신은 아마포에 싸여 바위 무덤에 모셔졌습니다. 무덤의 침묵 속에서 세상은 부활의 아침을 기다립니다.",
   "petition": "주님, 저희의 슬픔과 죽음까지도 부활의 희망 안에 머물게 하소서.",
   "announce": "예수님께서 무덤에 묻히심을 묵상합시다.",
   "prayer": [
    "돌무덤에 묻히신 구세주 예수님,",
    "저희가 주님의 죽음을 생각하며",
    "언제나 깨끗한 마음으로 정성을 다하여",
    "사랑의 성체를 받아 모시게 하소서."
   ]
  }
 ]
}; if (typeof module !== 'undefined' && module.exports) module.exports = root.DemoStations; })(typeof window !== 'undefined' ? window : globalThis);
