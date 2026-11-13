// 캐릭터 glb 파이프라인의 순수 규칙(파일·WebGL 불필요; node --test 로 검사): 뼈 이름 정규화, 동작 이름 매핑, 검증 규칙, 한도.
// 문서: docs/art/CHARACTER_3D_PIPELINE.md §8~§10

/** 한도(앱 용량 APK 20MB대·모바일 성능 기준). validate 와 build 가 같이 쓴다. */
export const LIMITS = {
  bytes: 0.8 * 1024 * 1024,        // 캐릭터 glb 1개(meshopt 압축 후) 상한
  animBytes: 0.5 * 1024 * 1024,     // 동작 묶음(anims glb) 상한
  tris: [8000, 4000, 1500],         // LOD0 내 캐릭터·가까운 사람 / LOD1 중간 / LOD2 먼 사람
  trisSlack: 1.05,                  // 단순화 결과가 목표를 이만큼까지 넘어도 통과(경고 없음)
  joints: 65,                       // 스키닝 본 수(Mixamo Standard Skeleton 65 joints; 모바일 유니폼 한도 고려)
  texture: 1024,                    // 텍스처 긴 변 상한
  materials: 3,                     // 캐릭터 1개 재질(=그리기 호출) 수 권장 상한(넘으면 경고)
  height: [1.3, 2.2]                // 서 있는 키(m). 벗어나면 단위(cm)·축 문제
};

/** Mixamo 접두 제거: 'mixamorig:Hips', 'mixamorig1:Hips', 'mixamorig_Hips', 'mixamorig9:LeftHand' → 'Hips'.
 *  Blender 를 거친 이름('mixamorig:LeftArm.001', 'Armature|mixamorig:Hips')도 정리한다. 그 밖의 이름은 그대로. */
export function normalizeBoneName(name) {
  let n = String(name || '');
  const bar = n.lastIndexOf('|'); if (bar >= 0) n = n.slice(bar + 1);
  n = n.replace(/^mixamorig\d*[:_]/i, '');
  n = n.replace(/\.\d{3}$/, '');
  return n;
}

const SIDES = ['Left', 'Right'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
/** 휴머노이드 필수 뼈(정규화된 이름). 손가락은 합장·묵주에 필요하므로 필수(Mixamo 'No Fingers(25)' 는 거부). */
export const REQUIRED_BONES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  ...SIDES.flatMap((s) => [`${s}Shoulder`, `${s}Arm`, `${s}ForeArm`, `${s}Hand`, `${s}UpLeg`, `${s}Leg`, `${s}Foot`, `${s}ToeBase`]),
  ...SIDES.flatMap((s) => FINGERS.flatMap((f) => [1, 2, 3].map((k) => `${s}Hand${f}${k}`)))
];
/** Mixamo 65 관절 전체(끝 뼈 포함). 스키닝에는 무게가 있는 뼈만 들어가므로 보통 52개 안팎이 스킨에 남는다. */
export const MIXAMO_65 = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'LeftEye', 'RightEye',
  ...SIDES.flatMap((s) => [`${s}Shoulder`, `${s}Arm`, `${s}ForeArm`, `${s}Hand`,
    ...FINGERS.flatMap((f) => [1, 2, 3, 4].map((k) => `${s}Hand${f}${k}`)),
    `${s}UpLeg`, `${s}Leg`, `${s}Foot`, `${s}ToeBase`, `${s}Toe_End`])
];
/** 윗몸(기도·손 흔들기 층을 앉기/무릎 꿇기 위에 덮을 때 쓰는 뼈 마스크). */
export function isUpperBody(bone) {
  const n = normalizeBoneName(bone);
  return /^(Spine1|Spine2|Neck|Head|HeadTop_End|LeftEye|RightEye)$/.test(n) || /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(n);
}

/** 앱이 쓰는 동작 이름(정규). loop = 반복 재생, need = 필수(없으면 검증 실패) / 권장(없으면 경고, 런타임이 절차 동작으로 대신). */
export const CLIPS = {
  idle:       { loop: true,  need: true,  root: 'detrend' },
  walk:       { loop: true,  need: true,  root: 'detrend' },
  sit_down:   { loop: false, need: true,  root: 'relative' },
  sit_idle:   { loop: true,  need: true,  root: 'detrend' },
  stand_up:   { loop: false, need: true,  root: 'relative' },
  pray:       { loop: true,  need: false, root: 'detrend' },
  kneel_down: { loop: false, need: false, root: 'relative' },
  kneel_idle: { loop: true,  need: false, root: 'detrend' },
  kneel_up:   { loop: false, need: false, root: 'relative' },
  bow:        { loop: false, need: false, root: 'relative' },
  wave:       { loop: false, need: false, root: 'relative' }
};
export const CLIP_NAMES = Object.keys(CLIPS);

// Mixamo 동작 이름(파일명·테이크 이름) → 정규 이름. 위에서부터 처음 맞는 것. 'anim_<정규이름>' 은 그대로 받는다.
const CLIP_RULES = [
  ['sit_down', /(stand(ing)?[ _-]*to[ _-]*sit|sit(ting)?[ _-]*down)/],
  ['stand_up', /(sit(ting)?[ _-]*to[ _-]*stand|stand(ing)?[ _-]*up|get(ting)?[ _-]*up)/],
  ['kneel_down', /(stand(ing)?[ _-]*to[ _-]*kneel|kneel(ing)?[ _-]*down)/],
  ['kneel_up', /(kneel(ing)?[ _-]*to[ _-]*stand|kneel(ing)?[ _-]*up)/],
  ['kneel_idle', /kneel/],
  ['pray', /pray/],
  ['sit_idle', /sit/],
  ['bow', /bow/],
  ['wave', /(wav(e|ing)|greet|hello)/],
  ['walk', /walk/],
  ['idle', /(idle|breath)/]
];
/** 파일 이름이나 테이크 이름에서 정규 동작 이름을 고른다(못 고르면 null). */
export function clipNameFor(src) {
  let s = String(src || '').replace(/\\/g, '/').split('/').pop().replace(/\.(fbx|glb|gltf)$/i, '').toLowerCase();
  s = s.replace(/^anim[ _-]+/, '').replace(/^mixamo\.com$/, '');
  if (CLIPS[s]) return s;
  for (const [name, re] of CLIP_RULES) if (re.test(s)) return name;
  return null;
}

/** 재질 이름 → 틴트 슬롯('skin' | 'hair' | null). 규약: 재질 이름에 skin/body_skin/face 가 들어가면 피부, hair 면 머리. */
export function tintSlotFor(materialName) {
  const n = String(materialName || '').toLowerCase();
  if (/hair/.test(n)) return 'hair';
  if (/(^|[^a-z])(skin|face)([^a-z]|$)/.test(n) || /^skin/.test(n)) return 'skin';
  return null;
}

/** 걷기 등 반복 동작의 Hips 수평 이동(m) 이 이보다 크면 'In Place 꺼짐'으로 보고 경고하고 제거한다. */
export const ROOT_DRIFT_WARN = 0.2;

/**
 * 검증(순수 함수). summary 는 build/inspect 가 만든 요약:
 *  { kind: 'character'|'anims', bytes, joints: [정규 이름], lods: [tris...], textures: [{w,h,mime}], materials: [이름], height,
 *    clips: [{name, duration, drift}] }
 * 반환 { ok, errors: [], warnings: [] }. 메시지는 사용자에게 그대로 보여 줄 한국어.
 */
export function validateSummary(summary, limits = LIMITS) {
  const errors = [], warnings = [];
  const s = summary || {};
  const kind = s.kind || 'character';
  const joints = new Set((s.joints || []).map(normalizeBoneName));
  const missingBones = REQUIRED_BONES.filter((b) => !joints.has(b));
  if (missingBones.length) {
    const fingersOnly = missingBones.every((b) => /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(b));
    errors.push(`필수 뼈 ${missingBones.length}개 없음${fingersOnly ? '(손가락 — Mixamo Skeleton LOD 를 Standard 65 joints 로)' : ''}: ${missingBones.slice(0, 12).join(', ')}${missingBones.length > 12 ? ' …' : ''}`);
  }
  if (kind === 'character') {
    const nj = s.skinJoints != null ? s.skinJoints : joints.size;
    if (nj > limits.joints) errors.push(`스킨 뼈 ${nj}개 > 한도 ${limits.joints}`);
    const lods = s.lods || [];
    if (lods.length < 3) errors.push(`LOD ${lods.length}단계(3단계 필요: LOD0/LOD1/LOD2)`);
    lods.forEach((t, i) => {
      const lim = limits.tris[i];
      if (lim && t > lim * limits.trisSlack) errors.push(`LOD${i} 삼각형 ${t} > 한도 ${lim}`);
    });
    if (s.bytes > limits.bytes) errors.push(`용량 ${(s.bytes / 1048576).toFixed(2)}MB > 한도 ${(limits.bytes / 1048576).toFixed(2)}MB`);
    for (const t of s.textures || []) {
      if (Math.max(t.w, t.h) > limits.texture) errors.push(`텍스처 ${t.name || ''} ${t.w}x${t.h} > ${limits.texture}`);
      if (t.mime && t.mime !== 'image/webp') warnings.push(`텍스처 ${t.name || ''} 형식 ${t.mime}(WebP 권장)`);
    }
    if ((s.materials || []).length > limits.materials) warnings.push(`재질 ${s.materials.length}개(그리기 호출 수) > 권장 ${limits.materials}`);
    if (s.height != null && (s.height < limits.height[0] || s.height > limits.height[1])) errors.push(`키 ${s.height.toFixed(2)}m 가 ${limits.height[0]}~${limits.height[1]}m 밖(단위 cm 이거나 축이 돌아감)`);
    if ((s.materials || []).length && !(s.materials || []).some((m) => tintSlotFor(m)) && !s.tintMask) warnings.push('skin/hair 재질 슬롯·틴트 마스크 없음 → 피부색·머리색 변경 불가(모델 색 고정)');
  } else {
    if (s.bytes > limits.animBytes) errors.push(`동작 묶음 ${(s.bytes / 1048576).toFixed(2)}MB > 한도 ${(limits.animBytes / 1048576).toFixed(2)}MB`);
  }
  if (kind === 'anims' || (s.clips && s.clips.length)) {
    const have = new Set((s.clips || []).map((c) => c.name));
    const missNeed = CLIP_NAMES.filter((n) => CLIPS[n].need && !have.has(n));
    const missOpt = CLIP_NAMES.filter((n) => !CLIPS[n].need && !have.has(n));
    if (missNeed.length) errors.push(`필수 동작 없음: ${missNeed.join(', ')}`);
    if (missOpt.length) warnings.push(`권장 동작 없음(런타임이 절차 동작으로 대신): ${missOpt.join(', ')}`);
    for (const c of s.clips || []) {
      if (!CLIPS[c.name]) warnings.push(`알 수 없는 동작 이름 ${c.name}(무시됨)`);
      if (c.drift > ROOT_DRIFT_WARN && CLIPS[c.name] && CLIPS[c.name].loop) warnings.push(`${c.name}: 원본 Hips 수평 이동 ${c.drift.toFixed(2)}m(In Place 꺼짐) → 루트 모션 제거함`);
      if (c.duration != null && c.duration < 0.2) errors.push(`${c.name}: 길이 ${c.duration.toFixed(2)}s 가 너무 짧음`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** 키프레임 값(Hips 위치)에서 수평 이동 제거. mode: 'detrend' = 시작~끝 직선 경향을 빼서 제자리(흔들림은 남김),
 *  'relative' = 첫 프레임을 원점으로(앉기·일어나기처럼 의도된 이동은 남김). values = [x,y,z, x,y,z, ...] (Float32Array 가능). 복사본을 돌려준다. */
export function stripRootMotion(values, mode) {
  const out = Float32Array.from(values), n = out.length / 3;
  if (n < 1) return { values: out, drift: 0 };
  const x0 = out[0], z0 = out[2], x1 = out[(n - 1) * 3], z1 = out[(n - 1) * 3 + 2];
  const drift = Math.hypot(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0;
    if (mode === 'detrend') { out[i * 3] -= x0 + (x1 - x0) * f; out[i * 3 + 2] -= z0 + (z1 - z0) * f; }
    else { out[i * 3] -= x0; out[i * 3 + 2] -= z0; }
  }
  return { values: out, drift };
}
