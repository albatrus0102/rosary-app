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
