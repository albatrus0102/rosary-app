/* 사이버 성당 공용 색상표/상수 (SPEC 4절). 순서를 바꾸지 말 것: 서버·Flutter가 같은 인덱스를 사용한다. */
(function (root) {
  'use strict';
  var P = {
    // 피부색 4 (깨끗한 따뜻한 클레이 톤: 밝음, 보통, 구릿빛, 짙음)
    skin: ['#F7D9C4', '#EDBE9A', '#C98E64', '#8A5738'],
    // 머리 모양 4 + 성별(g: 0 여성, 1 남성). style 0..3 은 성별마다 따로 해석한다(사실적인 머리 모양).
    stylesF: ['단발', '어깨 길이', '포니테일', '낮은 쪽머리'],
    stylesM: ['짧게 친 머리', '가르마', '웨이브', '넓은 이마'],
    // 머리색 10 (검정, 짙은 갈색, 갈색, 밤색, 적갈색, 어두운 금발, 금발, 회색, 은백색, 짙은 적색)
    hair: ['#2B2320', '#4A2C1E', '#6B3A22', '#8C4B26', '#B5532A', '#C99A4B', '#EBC76A', '#9A9A9E', '#E3E1DA', '#8A2E28'],
    // 옷색 12 (친근하지만 차분한 색: 네이비, 차콜, 블랙, 카멜, 올리브, 버건디, 포레스트, 크림, 토프, 더스티 블루, 플럼, 테라코타)
    outfit: ['#2F4A8A', '#4A4E57', '#2A2A30', '#D09A55', '#8A9A3F', '#9A2F45', '#2F7A5A', '#F1E6CB', '#A58E7E', '#6FA0C8', '#8A4F8C', '#D9694B'],
    // 바지색 12 (옷색과 같은 인덱스: 아바타 하의, 차분한 톤)
    pants: ['#BCA982', '#5C7FA8', '#7A7F8C', '#3E4F7A', '#E2D8C0', '#4A5470', '#BCA982', '#6B86AE', '#3E4F7A', '#E2D8C0', '#8A8E98', '#3E4F7A'],
    // 세례명 목록은 baptismal_names.js(ChurchNames; tools/names/build_names.py 생성물)에 있다.
    // 촛불 지향 프리셋 8 (index = intention)
    intentions: [
      '가족과 이웃을 위해', '아픈 이들을 위해', '세상의 평화를 위해', '돌아가신 이들을 위해',
      '감사의 마음으로', '시험과 일을 위해', '통회와 용서를 위해', '나라와 교회를 위해'
    ]
  };
  root.ChurchPalette = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
