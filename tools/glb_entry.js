// GLB 아바타(이미지→3D 서비스로 소유자가 만든 사람 — 4절 B 길)를 읽는 조각만 따로 묶는다: window.ThreeGLB = {GLTFLoader}(MIT, three.js 저자).
// 첫 설치 묶음에 넣지 않고 GLB 아바타를 쓸 때만 싣는다(three_glb.js).
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
