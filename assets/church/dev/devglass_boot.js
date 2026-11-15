/* dev/devglass_boot.js — 개발용 임시 유리 진입점(E-4, docs/church/GLASS_DEV_PIPELINE.md).
   index.html·test.html 이 URL 에 devglass=1 이 있을 때만 이 파일을 부른다(main.js 바로 앞, 파서가 기다리는 document.write).
   이 폴더는 일반(배포) APK 에 없다 → 그때는 이 파일이 없어 아무 일도 일어나지 않는다.
   순서: 로더(devglass.js: ChurchWorld.create 에 끼어든다) → 성당별 대응표 → QA Gallery 빌더. 그림 팩(gpack_dev_*.js)은 그 성당에 들어갈 때 읽는다. */
(function () {
  'use strict';
  var files = ['devglass.js', 'devglass_milan.js', 'ch_qa_glass.js'];
  for (var i = 0; i < files.length; i++) document.write('<script src="dev/' + files[i] + '"><\/script>');
})();
