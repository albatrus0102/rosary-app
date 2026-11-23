# 소개 영상 렌더러

허락 요청 편지에 붙일 1~2분 영상(1280x720, 30fps, H.264+AAC)을 오프라인으로 만든다. 영상 파일은 저장소에 넣지 않는다.

```
node tools/church_web/video/render_video.mjs <성당id> <ko|it|en|es|pt> [--out 경로] [--scratch 폴더] [--clip 초] [--size 1280x720] [--quality high] [--no-audio]
```

- 앱(`assets/church/test.html`)을 헤드리스 Chromium(SwiftShader)에서 열고 `requestAnimationFrame` 을 가짜로 바꿔 프레임마다 1/30초씩 직접 한 번 돌린다. 걷기·초 켜기·앉기·무릎 꿇기는 앱의 진짜 API(`walkTo`·`lightCandle`·`sit`·`setPrayerPosture`)를 부른다.
- 그림은 같은 JS 작업 안에서 2D 캔버스에 자막·카드와 합쳐 JPEG 로 뽑아 ffmpeg 표준 입력으로 흘린다(프레임 폴더 없음).
- 자막은 `docs/legal/church_permission/package/<id>/video_plan.md` 표(13행)의 2~12행. 제목·마침 카드는 이 스크립트의 문구표(`STR`)를 쓴다. 폰트는 `assets/fonts/Pretendard`.
- 소리: `assets/music/organ_ave_maria.m4a` 를 작게 깔고 앞뒤로 페이드(`--no-audio` 로 끔).
- 결과: `<id>_<lang>.mp4` 와 12장 접촉표 `<id>_<lang>_sheet.jpg`, 자막 시각 `<id>_<lang>.captions.json`.
- 속도: 1280x720 high 에서 프레임당 약 1.7초(성 베드로 기준, 4코어에서 병렬로 돌려도 총 처리량은 같다). 90초 영상 하나에 약 1시간 안팎.

## 요청이 있을 때 영상 하나 만들기

영상은 미리 만들지 않는다(사용자 결정 2026-11-23: 받는 곳이 요청할 때만). 필요하면:

```
node tools/church_web/video/render_video.mjs stpeter it --quality mid --crf 20 --out /경로/stpeter_it.mp4 --scratch /경로/tmp
node tools/church_web/video/render_overview.mjs ko --out /경로/overview_ko.mp4   # 안내 영상(화면 캡처 슬라이드; 3D 조각은 --raw 렌더 + --seg)
```

- 측정(4코어 SwiftShader): 1280x720 mid 에서 프레임당 1.6~2.4초 → 60초 영상 하나 약 45~50분(high 는 더 느리다). 병렬로 돌려도 총 처리량은 같다. 디스크는 임시 파일 외에 결과 mp4(15~20MB)만 쓴다.
- 시계를 가짜로 고정(`performance.now`)해 느린 프레임에서도 dt 가 음수가 되지 않는다(이 고정 없이는 high 단계에서 카메라가 폭주했다).
- 명동대성당 자막은 `docs/legal/church_permission/package/seoul-archdiocese/video_plan_myeongdong.md`. 확인한 것: 눈높이 설정 샷·걷기·제단 경계(앞으로 밀어도 z 불변)·성호·초 켜기·앉기/무릎 꿇기·마침 카드 장면은 저해상도 시험 클립으로 접촉표 확인. 최종 해상도 전체 영상은 만들지 않았다.
