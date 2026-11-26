// three r149 examples/jsm 중 이 패키지가 쓰는 조각만 하나의 클래식 스크립트(window.ThreeX)로 묶는다(MIT, three.js 저자).
// 원본 엔진 판에서 Sky·SSAOPass·SMAAPass·RGBELoader 를 뺐다(쓰지 않음 — 용량 절감).
export { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
export { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
export { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { Reflector } from 'three/examples/jsm/objects/Reflector.js';
