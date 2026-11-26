/* palette.js — 아바타 공용 색상표. 순서를 바꾸지 말 것: 서버·앱이 같은 인덱스를 쓴다(피부 4·머리 모양 4×2·머리색 10·옷색 12). */
(function (root) {
  'use strict';
  var P = {
    // 색은 모두 채도를 절제한 따뜻한 중간 채도 한 벌. 색의 뜻(이름)은 그대로다.
    // 피부색 4 (깨끗한 따뜻한 클레이 톤: 밝음, 보통, 구릿빛, 짙음)
    skin: ['#F6DCCB', '#EAC4A4', '#C89C7C', '#8F654C'],
    // 머리 모양 4 + 성별(g: 0 여성, 1 남성). style 0..3 은 성별마다 따로 해석한다(사실적인 머리 모양).
    stylesF: ['bob', 'shoulder length', 'ponytail', 'low bun'],
    stylesM: ['crew cut', 'side part', 'wavy', 'high forehead'],
    // 머리색 10 (검정, 짙은 갈색, 갈색, 밤색, 적갈색, 어두운 금발, 금발, 회색, 은백색, 짙은 적색)
    hair: ['#2E2826', '#4B352B', '#6A4734', '#85573B', '#9C5D40', '#B8945E', '#D9BF86', '#9C9A9B', '#DEDBD3', '#7E3D37'],
    // 옷색 12 (친근하지만 차분한 색: 네이비, 차콜, 블랙, 카멜, 올리브, 버건디, 포레스트, 크림, 토프, 더스티 블루, 플럼, 테라코타)
    outfit: ['#455A8C', '#60646E', '#3C3C44', '#C29B68', '#7F8A58', '#964C5A', '#4D7C68', '#EFE6D1', '#A39385', '#7F9DBB', '#866389', '#BF725C'],
    // 바지색 12 (옷색과 같은 인덱스: 아바타 하의, 차분한 톤)
    pants: ['#B9AB8F', '#6F86A3', '#80848F', '#4A587A', '#DDD5C3', '#555D74', '#B9AB8F', '#7388A6', '#4A587A', '#DDD5C3', '#8E9099', '#4A587A'],
    // 옷 트림 2 (깃·소맷부리 크림, 아랫단 금색). 모든 아바타가 같은 트림을 써서 군중이 한 벌처럼 보인다.
    trim: ['#F0E6D0', '#C6A562']
    // (이름은 아바타 cfg.label 문자열로 준다)
  };
  root.RoomPalette = P;
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof window !== 'undefined' ? window : this);
