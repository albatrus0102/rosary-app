# 산타 마리아 델 피오레(피렌체 대성당, `florence`) — 북 측랑 벽 그림 3점

2026-11-15 추가. 구조 수정 때 '도형으로 그린 말 탄 사람' 자리 표시였던 그림 3점을 실제 작품 사진으로 바꿨다(우스꽝스러운 도형 그림 제거: `docs/church/REVERENCE.md`).
모두 위키미디어 공용 파일 설명 페이지(API extmetadata)에서 라이선스를 확인했다(2026-11-15). 500px 표준 섬네일을 받아 틀 비율로 가운데를 잘라 WebP 로 줄였다.

| 자리 | 작품 | 원본 파일 | 라이선스 | 변경 |
|---|---|---|---|---|
| 2칸(z 17.85) | 안드레아 델 카스타뇨 〈니콜로 다 톨렌티노 기마 기념상〉 1456, 프레스코(캔버스로 옮김) | [Andrea del castagno, momumento a niccolò da tolentino.jpg](https://commons.wikimedia.org/wiki/File:Andrea_del_castagno,_momumento_a_niccol%C3%B2_da_tolentino.jpg) (780×990, sha1 878d8899bf150c6738ddb4d38d2a0db171790958, 출처 Web Gallery of Art) | 원작·사진 Public domain(PD-Art) | 340×540, WebP q70, 60KB |
| 3칸(z 13.7) | 파올로 우첼로 〈존 호크우드 기마 기념상〉 1436, 프레스코 | [Paolo uccello, Monumento equestre di John Hawkwood, 1436, 01-edit.jpg](https://commons.wikimedia.org/wiki/File:Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01-edit.jpg) (1773×2845, sha1 aaaafe08cc92e6d7c3ad890f984795d1737396b4) | 원작 Public domain · 사진 **CC BY 3.0, 저작자 Sailko**(표기 의무: 앱 '성화 출처'·OSS 화면) | 377×600, WebP q74, 53KB |
| 4칸(z 5.55) | 도메니코 디 미켈리노 〈단테와 신곡〉 1465, 패널 템페라 | [Dante Domenico di Michelino Duomo Florence.jpg](https://commons.wikimedia.org/wiki/File:Dante_Domenico_di_Michelino_Duomo_Florence.jpg) (1530×1150, 촬영 Jastrow) | 원작·사진 Public domain | 449×370, WebP q80, 42KB |

저장: 원본(번들 밖) `art/images_src/florence/*.webp` → `node tools/church_web/build_art_florence.mjs` → `assets/church/art_florence.js`(data URI, 206KB). `ch_florence.js` 가 그 성당에 들어올 때만 읽는다(읽기 전·실패 때는 어두운 빈 화면 + 돌 틀).
남은 확인: 호크우드 사진의 CC BY 표기(Sailko)를 출시 화면에서 확인. 단테 PD 사진의 다른 후보(`Domenico-Di-Michelino-Dante-and-the-Three-Kingdoms.jpg`, CC0)는 출처가 복제화 판매 사이트라 쓰지 않았다.
