// 생성 파일 — 직접 고치지 말 것.
// 원본: data/stations_of_cross.json → python3 tools/stations/build_stations.py
// 모든 문구: 사제·교구 검수 필요 (docs/ux/STATIONS_OF_CROSS.md 검수표).

part of 'stations_of_cross.dart';

// dart format off
const String _acclamation = "우리는 당신을 경배하며 찬미하나이다. 거룩한 십자가로 세상을 구하셨나이다.";
const String _opening = "주님, 사랑으로 걸으신 십자가의 길을 저희도 따라 걷습니다. 한 처 한 처에서 주님의 고통을 묵상하며 저희 마음을 새롭게 하소서.";
const String _closing = "주님, 십자가의 길을 함께 걸었습니다. 주님께서 보여 주신 사랑을 기억하며 오늘 만나는 이웃에게 그 사랑을 나누게 하소서. 아멘.";
const String _artCredit = "게프하르트 푸겔, 〈십자가의 길〉, 1921, 바트 자울가우 성 안토니오 성당. 사진 Andreas Praefcke. Public domain, Wikimedia Commons";
const int _dataVersion = 1;

const List<StationOfCross> _stations = [
  StationOfCross(
    n: 1,
    title: "예수님께서 사형 선고를 받으심",
    short: "사형 선고",
    refs: "마태 27,22-26; 마르 15,6-15; 루카 23,13-25; 요한 19,1-16",
    tradition: false,
    meditation: "죄 없으신 예수님께서 빌라도 앞에 서셨습니다. 군중의 외침 속에서 사형 선고가 내려졌지만, 주님께서는 아무 변명 없이 그 길을 받아들이셨습니다.",
    petition: "주님, 남을 쉽게 판단하지 않고 억울한 이들 곁에 서게 하소서.",
  ),
  StationOfCross(
    n: 2,
    title: "예수님께서 십자가를 지심",
    short: "십자가를 지심",
    refs: "요한 19,17; 마태 27,31; 마르 15,20",
    tradition: false,
    meditation: "예수님께서 무거운 십자가를 어깨에 지셨습니다. 그 나무에는 우리의 잘못과 세상의 아픔이 함께 실려 있었습니다.",
    petition: "주님, 제게 주어진 십자가를 피하지 않고 주님과 함께 지게 하소서.",
  ),
  StationOfCross(
    n: 3,
    title: "예수님께서 처음 넘어지심",
    short: "처음 넘어지심",
    refs: "전승(성경에 직접 나오지 않음)",
    tradition: true,
    meditation: "십자가의 무게에 눌려 예수님께서 땅에 넘어지셨습니다. 그러나 주님께서는 다시 일어나 걸음을 이어 가셨습니다.",
    petition: "주님, 넘어질 때마다 다시 일어날 힘을 주소서.",
  ),
  StationOfCross(
    n: 4,
    title: "예수님께서 성모님을 만나심",
    short: "성모님을 만나심",
    refs: "전승(참조: 루카 2,34-35; 요한 19,25-27)",
    tradition: true,
    meditation: "십자가의 길에서 어머니 마리아께서 아드님을 만나셨습니다. 말없이 마주친 눈길에 어머니의 아픔과 깊은 믿음이 함께 담겨 있었습니다.",
    petition: "성모님, 고통 중에 있는 이들 곁에 머무는 사랑을 가르쳐 주소서.",
  ),
  StationOfCross(
    n: 5,
    title: "키레네 사람 시몬이 예수님을 도와 십자가를 짐",
    short: "시몬이 십자가를 짐",
    refs: "마태 27,32; 마르 15,21; 루카 23,26",
    tradition: false,
    meditation: "군인들이 길을 지나던 키레네 사람 시몬에게 십자가를 지게 하였습니다. 뜻하지 않게 짊어진 짐이었지만, 그는 주님의 짐을 함께 나눈 사람이 되었습니다.",
    petition: "주님, 이웃의 무거운 짐을 기꺼이 함께 지게 하소서.",
  ),
  StationOfCross(
    n: 6,
    title: "베로니카가 수건으로 예수님의 얼굴을 닦아 드림",
    short: "베로니카",
    refs: "전승(성경에 직접 나오지 않음)",
    tradition: true,
    meditation: "전승에 따르면 베로니카라는 여인이 용기를 내어 예수님의 얼굴을 수건으로 닦아 드렸습니다. 작은 사랑의 손길이 고통 속의 주님을 위로하였습니다.",
    petition: "주님, 고통받는 이웃의 얼굴에서 주님을 알아보게 하소서.",
  ),
  StationOfCross(
    n: 7,
    title: "예수님께서 두 번째 넘어지심",
    short: "두 번째 넘어지심",
    refs: "전승(성경에 직접 나오지 않음)",
    tradition: true,
    meditation: "기운이 다하신 예수님께서 다시 넘어지셨습니다. 거듭되는 약함 속에서도 주님께서는 우리를 향한 사랑을 거두지 않으셨습니다.",
    petition: "주님, 같은 잘못을 되풀이할 때에도 주님의 자비를 믿고 다시 일어서게 하소서.",
  ),
  StationOfCross(
    n: 8,
    title: "예수님께서 예루살렘 부인들을 위로하심",
    short: "부인들을 위로하심",
    refs: "루카 23,27-31",
    tradition: false,
    meditation: "예수님을 따르며 슬피 우는 여인들을 주님께서 돌아보셨습니다. 당신의 고통 속에서도 주님께서는 그들과 그 자녀들을 걱정하셨습니다.",
    petition: "주님, 슬퍼하는 이들을 위로하시고 저희 마음을 회개로 이끄소서.",
  ),
  StationOfCross(
    n: 9,
    title: "예수님께서 세 번째 넘어지심",
    short: "세 번째 넘어지심",
    refs: "전승(성경에 직접 나오지 않음)",
    tradition: true,
    meditation: "골고타 가까이에서 예수님께서 세 번째로 넘어지셨습니다. 마지막 힘을 다해 일어나신 주님께서는 끝까지 사랑의 길을 걸으셨습니다.",
    petition: "주님, 지치고 낙심한 이들에게 끝까지 걸어갈 희망을 주소서.",
  ),
  StationOfCross(
    n: 10,
    title: "예수님께서 옷 벗김을 당하심",
    short: "옷 벗김을 당하심",
    refs: "마태 27,33-35; 마르 15,24; 루카 23,34; 요한 19,23-24",
    tradition: false,
    meditation: "군인들이 예수님의 옷을 벗기고 그 옷을 나누어 가졌습니다. 주님께서는 모든 것을 빼앗기시고도 아버지께 당신을 온전히 맡기셨습니다.",
    petition: "주님, 존엄을 짓밟힌 이들을 지켜 주시고 저희가 가난한 마음을 지니게 하소서.",
  ),
  StationOfCross(
    n: 11,
    title: "예수님께서 십자가에 못 박히심",
    short: "못 박히심",
    refs: "마태 27,35-38; 마르 15,24-27; 루카 23,33; 요한 19,18",
    tradition: false,
    meditation: "예수님께서 십자가에 못 박히셨습니다. 그 고통 속에서도 주님께서는 당신을 못 박은 이들을 위하여 아버지께 용서를 청하셨습니다.",
    petition: "주님, 제게 상처를 준 사람을 용서할 수 있는 마음을 주소서.",
  ),
  StationOfCross(
    n: 12,
    title: "예수님께서 십자가 위에서 돌아가심",
    short: "돌아가심",
    refs: "마태 27,45-56; 마르 15,33-41; 루카 23,44-49; 요한 19,28-30",
    tradition: false,
    meditation: "어둠이 온 땅을 덮은 가운데 예수님께서 아버지께 당신 영을 맡기시고 숨을 거두셨습니다. 십자가 위에서 하느님의 사랑이 끝까지 드러났습니다.",
    petition: "주님, 잠시 침묵하며 주님의 죽음 앞에 머뭅니다. 주님께서 주신 생명을 감사하며 살게 하소서.",
  ),
  StationOfCross(
    n: 13,
    title: "예수님의 시신을 십자가에서 내림",
    short: "십자가에서 내림",
    refs: "마태 27,57-59; 마르 15,42-46; 루카 23,50-53; 요한 19,38",
    tradition: false,
    meditation: "아리마태아 사람 요셉이 예수님의 시신을 십자가에서 내렸습니다. 전승은 성모님께서 아드님의 몸을 품에 안으셨다고 전합니다.",
    petition: "성모님, 사랑하는 이를 잃고 슬퍼하는 이들을 위로해 주소서.",
  ),
  StationOfCross(
    n: 14,
    title: "예수님께서 무덤에 묻히심",
    short: "무덤에 묻히심",
    refs: "마태 27,59-61; 마르 15,46-47; 루카 23,53-56; 요한 19,39-42",
    tradition: false,
    meditation: "예수님의 시신은 아마포에 싸여 바위 무덤에 모셔졌습니다. 무덤의 침묵 속에서 세상은 부활의 아침을 기다립니다.",
    petition: "주님, 저희의 슬픔과 죽음까지도 부활의 희망 안에 머물게 하소서.",
  ),
];
// dart format on
