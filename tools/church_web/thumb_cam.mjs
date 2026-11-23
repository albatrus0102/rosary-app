// thumb_cam.mjs — 빌더 thumb.cam({pos, look, fov})이 있으면 앱 카메라 리그 대신 그 고정 시점으로 다시 그린다(여러 층 성당 — 아시시). thumbs.mjs 도 같이 쓴다.
// 돌려주는 값: 고정 시점으로 그렸으면 그 화면의 PNG(data URL — page.screenshot 은 무거운 장면에서 30초를 넘기곤 했다), 아니면 null.
export async function fixedCam(page) {
  return page.evaluate(() => {
    const A = window.__church, th = A && A.world && A.world.builder && A.world.builder.thumb, v = th && th.cam;
    if (!v) return null;
    const cam = A.camera;
    A.meAv.root.visible = false;
    A.scene.traverse((o) => { if (o.userData && o.userData.isAvatar) o.visible = false; });
    cam.fov = v.fov || cam.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    cam.position.set(v.pos[0], v.pos[1], v.pos[2]); cam.lookAt(v.look[0], v.look[1], v.look[2]); cam.updateMatrixWorld();
    A.me.x = v.pos[0]; A.me.z = v.pos[2];
    if (A.world.setViewer) A.world.setViewer(v.pos[1] - 1.7);
    for (let i = 0; i < 40; i++) A.world.update(1 / 10, A.t + i / 10, A.me, cam);
    for (let i = 0; i < 6; i++) {
      A.world.update(1 / 30, A.t + 4 + i / 30, A.me, cam);
      if (A.world.probeStep) { try { A.world.probeStep(A.renderer); } catch (e) { /* ignore */ } }
      A.R.setExposure(A.world.env.exp * (A.expK || 1));
      if (A.R.setGrade) A.R.setGrade(A.world.env.grade);
      A.R.render(A.scene, cam, 1 / 30, A.world);
    }
    const c = A.renderer.domElement, cv = document.createElement('canvas');
    cv.width = c.width; cv.height = c.height;
    A.R.render(A.scene, cam, 1 / 30, A.world);
    cv.getContext('2d').drawImage(c, 0, 0);
    return cv.toDataURL('image/png');
  });
}
