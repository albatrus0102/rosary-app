"""bake.py — 공방(ch_house) 라이트맵을 Blender(배경 모드, Cycles CPU)로 굽는다. 주 대상 5.3, 3.6~4.x 도 — 판마다 다른 API 는 hasattr/try 로 고른다.

실행(보통은 run_bake.ps1 / run_bake.cmd 가 대신 부른다):
  blender -b --factory-startup -noaudio --python-exit-code 1 -P pc_bake/bake.py -- --time day,night --quality normal

하는 일:
  1. scene/house.glb(굽기 묶음마다 메시 1, 라이트맵 uv2) + house_lights.json + house_targets.json 을 읽는다(tools/lm_export.mjs 가 만든 것).
  2. --time 마다 빛을 세운다: 등불(점·원뿔)·창 포털·하늘(위/아래 두 색)·해/달. 단위는 three 물리 조명 → Blender(W) 로 바꾼다(점·원뿔 W = 4π·I, 해 W/m² = 조도, 하늘 = 복사휘도).
  3. 대상마다 Cycles CPU 로 '확산(직접+간접, 색 없음)' 을 uv2 에 굽는다. 해/달은 앱이 실시간 그림자로 그리므로(manifest key 'realtime')
     해/달만 켠 직접광 굽기를 한 번 더 해서 뺀다 → 라이트맵 = 하늘 + 등불 + 해/달의 간접광.
  4. ×π(Blender 확산 패스 = 조도/π) → OpenImageDenoise(합성기 Denoise, CPU) → RGBM 8비트 PNG(기본) 또는 16비트 PNG.
  5. 대상 하나가 끝날 때마다 바로 저장하고 state/ 에 적는다 → 꺼졌다 다시 켜면 끝난 대상은 건너뛴다(이어 굽기).
  6. 끝나면 manifest.json + uv2.bin 을 넣고 out/house_<화질>.zip 으로 묶는다. 진행률·남은 시간은 화면과 bake_log.txt 에.
"""
import argparse
import json
import math
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lmcodec  # noqa: E402

try:
    import bpy  # noqa: F401
    import mathutils
except ImportError:  # Blender 밖(시험·문법 확인)
    bpy = None
    mathutils = None


def parse_args(argv):
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []
    ap = argparse.ArgumentParser(prog='bake.py')
    ap.add_argument('--time', default='day,night', help='day | night | day,night')
    ap.add_argument('--quality', default='normal', choices=['smoke', 'fast', 'normal', 'high'])
    ap.add_argument('--scene', default=os.path.join(HERE, 'scene'))
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--format', default='rgbm', choices=['rgbm', 'png16'])
    ap.add_argument('--threads', type=int, default=0, help='0 = all cores')
    ap.add_argument('--only', default='', help='comma separated target ids (default: all, smoke: the smoke list)')
    ap.add_argument('--no-denoise', action='store_true')
    a = ap.parse_args(argv)
    a.times = [t for t in a.time.replace(' ', '').split(',') if t]
    for t in a.times:
        if t not in ('day', 'night'):
            ap.error('--time must be day and/or night')
    return a


class Log(object):
    def __init__(self, path):
        self.f = open(path, 'a', encoding='utf-8')

    def __call__(self, msg):
        line = time.strftime('%Y-%m-%d %H:%M:%S ') + msg
        print(line, flush=True)
        self.f.write(line + '\n')
        self.f.flush()


# ---------- 좌표: three/glTF(Y 위) → Blender(Z 위) ----------
def b_vec(v):
    return mathutils.Vector((v[0], -v[2], v[1]))


def rot_track(dir_b, track='-Z'):
    """local track 축이 dir_b 를 보게 하는 회전(오일러)"""
    return dir_b.normalized().to_track_quat(track, 'Y').to_euler()


# ---------- 장면 ----------
def call_op(op, log, tries):
    """같은 연산자를 인자 묶음 여럿으로 차례로 시도(판마다 없어진·새로 생긴 인자). 마지막 실패는 그대로 올린다."""
    err = None
    for kw in tries:
        try:
            return op(**kw)
        except TypeError as e:   # 모르는 인자
            err = e
            log('note: %s rejected %s (%s) - retrying with fewer options' % (op.idname() if hasattr(op, 'idname') else 'op', sorted(kw), e))
    raise err


def set_if(obj, attr, value):
    """있으면 넣는다(판마다 없는 속성은 건너뜀). 넣었으면 True"""
    if obj is not None and hasattr(obj, attr):
        try:
            setattr(obj, attr, value)
            return True
        except (TypeError, AttributeError, ValueError):
            return False
    return False


def use_nodes(idblock):
    # 5.x: 재질·월드는 늘 노드(use_nodes 는 낡은 속성) — 있으면 켠다
    try:
        if hasattr(idblock, 'use_nodes') and not idblock.use_nodes:
            idblock.use_nodes = True
    except Exception:  # noqa: BLE001
        pass


def reset_and_import(glb, log):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
    except Exception:  # noqa: BLE001 - 이미 켜져 있거나 이름이 다름
        pass
    call_op(bpy.ops.import_scene.gltf, log, [dict(filepath=glb, merge_vertices=False, import_shading='NORMALS'), dict(filepath=glb, import_shading='NORMALS'), dict(filepath=glb)])
    objs = {}
    for o in bpy.data.objects:
        if o.type == 'MESH':
            objs[o.name.split('.')[0]] = o
    log('imported %d meshes from %s' % (len(objs), os.path.basename(glb)))
    return objs


def make_material(obj, tid, albedo_attr):
    mat = bpy.data.materials.new('lm_' + tid)
    use_nodes(mat)
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfDiffuse')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    if albedo_attr:
        at = nt.nodes.new('ShaderNodeAttribute')
        at.attribute_name = albedo_attr
        nt.links.new(at.outputs['Color'], bsdf.inputs['Color'])
    else:
        bsdf.inputs['Color'].default_value = (0.6, 0.6, 0.6, 1.0)
    img = nt.nodes.new('ShaderNodeTexImage')
    img.name = 'lm_target'
    nt.nodes.active = img
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return img


def setup_render(scn, q, threads):
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = q['samples']
    cy = scn.cycles
    for k, v in (('use_adaptive_sampling', False), ('max_bounces', q['bounces'] + 2), ('diffuse_bounces', q['bounces']), ('glossy_bounces', 0),
                 ('transmission_bounces', 0), ('transparent_max_bounces', 2), ('caustics_reflective', False), ('caustics_refractive', False),
                 ('use_light_tree', True),   # 4.0+: 등불 18개 — 빛 나무가 표본을 고르게
                 ('use_denoising', False), ('use_guiding', False)):
        set_if(cy, k, v)
    if threads > 0:
        scn.render.threads_mode = 'FIXED'
        scn.render.threads = threads
    else:
        scn.render.threads_mode = 'AUTO'
    bk = scn.render.bake
    for k, v in (('use_pass_direct', True), ('use_pass_indirect', True), ('use_pass_color', False), ('margin_type', 'EXTEND'), ('target', 'IMAGE_TEXTURES'),
                 ('use_selected_to_active', False), ('use_clear', True)):
        set_if(bk, k, v)


def build_world(scn):
    w = bpy.data.worlds.new('lm_world')
    scn.world = w
    use_nodes(w)
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -0.15
    mr.inputs['From Max'].default_value = 0.15
    up = nt.nodes.new('ShaderNodeBackground')
    dn = nt.nodes.new('ShaderNodeBackground')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], mix.inputs[0])
    nt.links.new(dn.outputs['Background'], mix.inputs[1])
    nt.links.new(up.outputs['Background'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return {'up': up, 'down': dn}


def set_world(wn, wdef, k=1.0):
    for key in ('up', 'down'):
        c = wdef[key]
        m = max(c[0], c[1], c[2], 1e-9)
        wn[key].inputs['Color'].default_value = (c[0] / m, c[1] / m, c[2] / m, 1.0)
        wn[key].inputs['Strength'].default_value = m * k


def add_light(scn, name, kind):
    ld = bpy.data.lights.new(name, kind)
    ob = bpy.data.objects.new(name, ld)
    scn.collection.objects.link(ob)
    return ob


def build_lights(scn, L):
    lamps = []
    for d in L['lamps']:
        ob = add_light(scn, 'lamp_' + d['name'], 'SPOT' if d['light'] == 'spot' else 'POINT')
        ob.location = b_vec(d['pos'])
        ob.data.color = tuple(d['color'])
        set_if(ob.data, 'shadow_soft_size', d.get('radius', 0.03))
        set_if(ob.data, 'use_soft_falloff', False)   # 4.0+: 점광원 가까운 곳 부드럽게 — three 의 1/d² 와 맞추려고 끈다
        if d['light'] == 'spot':
            ob.data.spot_size = math.radians(d.get('angle', 100))
            ob.data.spot_blend = d.get('blend', 0.5)
            ob.rotation_euler = rot_track(b_vec(d.get('dir', [0, -1, 0])), '-Z')
        lamps.append((ob, d))
    for p in L['portals']:
        ob = add_light(scn, 'portal_' + p['name'], 'AREA')
        ob.data.shape = 'RECTANGLE'
        ob.data.size = p['size'][0]
        ob.data.size_y = p['size'][1]
        if not set_if(getattr(ob.data, 'cycles', None), 'is_portal', True):
            set_if(ob.data, 'is_portal', True)
        ob.location = b_vec(p['center'])
        n = b_vec(p['normal']).normalized()          # 안쪽 = 빛이 나가는 쪽 = 지역 -Z
        z = -n
        y = mathutils.Vector((0.0, 0.0, 1.0))
        x = y.cross(z).normalized()
        y = z.cross(x).normalized()
        m = mathutils.Matrix((x, y, z)).transposed()
        ob.rotation_euler = m.to_euler()
    key = add_light(scn, 'key_light', 'SUN')
    return lamps, key


def set_time(lamps, key, wn, L, tm, log):
    T = L['times'][tm]
    for ob, d in lamps:
        I = d['intensity'][tm]
        ob.data.energy = 4.0 * math.pi * I       # three 점광원 세기(1 m 조도) → Blender W
        ob.hide_render = I <= 0
    kd = T['key']
    irr = kd['irradiance']
    m = max(irr[0], irr[1], irr[2], 1e-9)
    key.data.energy = m                           # W/m² = 조도
    key.data.color = (irr[0] / m, irr[1] / m, irr[2] / m)
    set_if(key.data, 'angle', math.radians(kd.get('angleDeg', 1.5)))
    key.rotation_euler = rot_track(b_vec(kd['dir']), 'Z')   # +Z 가 해 쪽 → 빛은 -Z 로
    set_world(wn, T['world'])
    log('%s: %d lamps (lampK %.2f), %s irradiance %.2f, sky up %.3f' % (tm, len(lamps), T['lampK'], kd['type'], m, max(T['world']['up'])))


def pixels_of(img):
    import numpy as np
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[:, :, :3].copy()          # 아래→위(Blender)


def bake_pass(obj, img_node, w, h, margin, passes, samples, scn, tag, log):
    img = bpy.data.images.new('lm_%s' % tag, w, h, alpha=False, float_buffer=True)
    img_node.image = img
    scn.cycles.samples = samples
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mat = obj.data.materials[0]
    mat.node_tree.nodes.active = img_node
    bk = scn.render.bake
    set_if(bk, 'margin', margin)
    set_if(bk, 'use_pass_direct', 'DIRECT' in passes)
    set_if(bk, 'use_pass_indirect', 'INDIRECT' in passes)
    set_if(bk, 'use_pass_color', False)
    call_op(bpy.ops.object.bake, log, [dict(type='DIFFUSE', pass_filter=passes, margin=margin, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES'),
                                       dict(type='DIFFUSE', pass_filter=passes, margin=margin, use_clear=True),
                                       dict(type='DIFFUSE')])
    px = pixels_of(img)
    img_node.image = None
    bpy.data.images.remove(img)
    return px


_dn = {'scene': None}


def _comp_tree(scn):
    """합성기 노드 트리: 5.x 는 scene.compositing_node_group(노드 그룹 + Group Output), 4.x 이하는 scene.node_tree + Composite"""
    if hasattr(scn, 'compositing_node_group'):
        nt = scn.compositing_node_group
        if nt is None:
            nt = bpy.data.node_groups.new('lm_denoise_tree', 'CompositorNodeTree')
            scn.compositing_node_group = nt
        nt.nodes.clear()
        if hasattr(nt, 'interface') and not any(getattr(i, 'in_out', '') == 'OUTPUT' for i in nt.interface.items_tree):
            nt.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        out = nt.nodes.new('NodeGroupOutput')
        return nt, out.inputs[0]
    set_if(scn, 'use_nodes', True)
    nt = scn.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('CompositorNodeComposite')
    return nt, out.inputs['Image']


def denoise(px, tmp_dir, log):
    """합성기 Denoise(OpenImageDenoise, CPU). 실패하면 원본 그대로(로그에 남김)."""
    import numpy as np
    h, w = px.shape[:2]
    src = None
    try:
        scn = _dn['scene']
        if scn is None:
            scn = bpy.data.scenes.new('lm_denoise')
            scn.render.engine = 'BLENDER_WORKBENCH'
            cam = bpy.data.objects.new('lm_cam', bpy.data.cameras.new('lm_cam'))
            scn.collection.objects.link(cam)
            scn.camera = cam
            vs = scn.view_settings
            set_if(vs, 'view_transform', 'Standard')   # AgX/Filmic 말고 그대로(EXR 은 어차피 선형)
            set_if(vs, 'look', 'None')
            set_if(vs, 'exposure', 0.0)
            set_if(vs, 'gamma', 1.0)
            ims = scn.render.image_settings
            set_if(ims, 'media_type', 'IMAGE')         # 5.x
            ims.file_format = 'OPEN_EXR'
            set_if(ims, 'color_depth', '32')
            _dn['scene'] = scn
        scn.render.resolution_x = w
        scn.render.resolution_y = h
        scn.render.resolution_percentage = 100
        nt, out_sock = _comp_tree(scn)
        src = bpy.data.images.new('lm_dn_in', w, h, alpha=False, float_buffer=True)
        rgba = np.ones((h, w, 4), dtype=np.float32)
        rgba[:, :, :3] = px
        src.pixels.foreach_set(rgba.ravel())
        n_in = nt.nodes.new('CompositorNodeImage')
        n_in.image = src
        n_dn = nt.nodes.new('CompositorNodeDenoise')
        set_if(n_dn, 'use_hdr', True)
        set_if(n_dn, 'prefilter', 'NONE')
        set_if(n_dn, 'quality', 'HIGH')
        if 'HDR' in n_dn.inputs:                       # 5.x: 설정이 입력 소켓으로 옮겨진 경우
            try:
                n_dn.inputs['HDR'].default_value = True
            except Exception:  # noqa: BLE001
                pass
        nt.links.new(n_in.outputs['Image'], n_dn.inputs['Image'])
        nt.links.new(n_dn.outputs['Image'], out_sock)
        bpy.ops.render.render(scene=scn.name, write_still=False)
        res = bpy.data.images['Render Result']
        exr = os.path.join(tmp_dir, 'lm_denoise.exr')
        res.save_render(exr, scene=scn)
        got = bpy.data.images.load(exr)
        out = pixels_of(got)
        bpy.data.images.remove(got)
        try:
            os.remove(exr)
        except OSError:
            pass
        if out.shape != px.shape or not np.isfinite(out).all():
            raise RuntimeError('denoise output shape %s vs %s' % (out.shape, px.shape))
        return np.maximum(out, 0.0), True
    except Exception as e:  # noqa: BLE001
        log('WARN denoise failed (%s: %s) - keeping raw bake' % (type(e).__name__, e))
        return px, False
    finally:
        if src is not None:
            try:
                bpy.data.images.remove(src)
            except Exception:  # noqa: BLE001
                pass


def main():
    a = parse_args(sys.argv)
    TJ = json.load(open(os.path.join(a.scene, 'house_targets.json'), encoding='utf-8'))
    L = json.load(open(os.path.join(a.scene, TJ['lights']), encoding='utf-8'))
    q = TJ['quality'][a.quality]
    name = '%s_%s' % (TJ['scene'], a.quality)
    out = os.path.join(a.out, name)
    os.makedirs(out, exist_ok=True)
    log = Log(os.path.join(out, 'bake_log.txt'))
    if bpy is None:
        log('ERROR: run this inside Blender: blender -b -P bake.py -- ...')
        return 2
    log('=== bake %s quality=%s times=%s format=%s blender=%s' % (TJ['scene'], a.quality, ','.join(a.times), a.format, bpy.app.version_string))
    enc = {'encoding': 'rgbm' if a.format == 'rgbm' else 'linear', 'range': lmcodec.RANGE, 'gamma': lmcodec.GAMMA}
    with open(os.path.join(a.scene, TJ['glb']), 'rb') as f:
        import hashlib
        scene_hash = hashlib.sha1(f.read()).hexdigest()[:16]
    only = [s for s in a.only.split(',') if s] or (TJ['smoke']['targets'] if a.quality == 'smoke' else [])
    targets = [t for t in TJ['targets'] if t['lm'] and (not only or t['id'] in only)]
    objs = reset_and_import(os.path.join(a.scene, TJ['glb']), log)
    scn = bpy.context.scene
    setup_render(scn, q, a.threads)
    attr = {}
    for tid, ob in objs.items():
        ca = getattr(ob.data, 'color_attributes', None)
        an = ca[0].name if ca and len(ca) else None
        uvl = ob.data.uv_layers
        if len(uvl) > 1:
            uvl.active = uvl[1]
        attr[tid] = make_material(ob, tid, an)
    missing = [t['id'] for t in targets if t['id'] not in objs]
    if missing:
        log('WARN not in glb: ' + ', '.join(missing))
        targets = [t for t in targets if t['id'] in objs]
    wn = build_world(scn)
    lamps, key = build_lights(scn, L)
    jobs = []
    for tm in a.times:
        for t in targets:
            w, h = lmcodec.size_for(t['w'], t['h'], q)
            kp = q['keySamples'] if L['times'][tm]['key']['mode'] == 'realtime' else 0
            jobs.append((tm, t, w, h, w * h * (q['samples'] + kp) + 2e5))
    prog = lmcodec.Progress(sum(j[4] for j in jobs))
    log('%d jobs, %.2fM texels per time, samples %d (+%d key)' % (len(jobs), sum(j[2] * j[3] for j in jobs) / 1e6 / max(1, len(a.times)), q['samples'], q['keySamples']))
    cur_time = None
    for tm, t, w, h, wt in jobs:
        sig = lmcodec.job_sig(t, q, a.quality, tm, scene_hash, enc)
        if lmcodec.is_done(out, tm, t['id'], sig):
            prog.skip(wt)
            log(prog.line('%s/%s done before - skipped' % (tm, t['id'])))
            continue
        if cur_time != tm:
            set_time(lamps, key, wn, L, tm, log)
            cur_time = tm
        t0 = time.time()
        ob, node = objs[t['id']], attr[t['id']]
        margin = lmcodec.margin_for(TJ['base']['pad'], w, t['w'])
        A = bake_pass(ob, node, w, h, margin, {'DIRECT', 'INDIRECT'}, q['samples'], scn, 'full', log)
        if L['times'][tm]['key']['mode'] == 'realtime':
            # 해/달 직접광만 → 빼기(앱이 실시간 그림자로 그린다)
            hidden = [(lo, lo.hide_render) for lo, _d in lamps]
            for lo, _d in lamps:
                lo.hide_render = True
            set_world(wn, L['times'][tm]['world'], 0.0)
            B = bake_pass(ob, node, w, h, margin, {'DIRECT'}, q['keySamples'], scn, 'key', log)
            for lo, hr in hidden:
                lo.hide_render = hr
            set_world(wn, L['times'][tm]['world'])
            A = A - B
        import numpy as np
        E = np.maximum(A, 0.0) * math.pi                  # 확산 패스(조도/π) → 조도
        dn = False
        if not a.no_denoise:
            E, dn = denoise(E, out, log)
        E = E[::-1]                                       # 위→아래(PNG·glTF uv v 아래 방향)
        os.makedirs(os.path.join(out, tm), exist_ok=True)
        rel = '%s/%s.png' % (tm, t['id'])
        if enc['encoding'] == 'rgbm':
            nb = lmcodec.write_png(os.path.join(out, rel), lmcodec.encode_rgbm(E), 8)
        else:
            nb = lmcodec.write_png(os.path.join(out, rel), lmcodec.encode_linear16(E), 16)
        lmcodec.mark_done(out, tm, t['id'], sig, {'file': rel, 'w': w, 'h': h, 'seconds': round(time.time() - t0, 1), 'denoised': dn, 'bytes': nb,
                                                    'mean': [round(float(v), 4) for v in E.reshape(-1, 3).mean(axis=0)]})
        prog.step(wt)
        log(prog.line('%s/%s %dx%d %dspp %s' % (tm, t['id'], w, h, q['samples'], lmcodec.fmt_dur(time.time() - t0))))
    shutil.copyfile(os.path.join(a.scene, TJ['uv2']), os.path.join(out, 'uv2.bin'))
    man = lmcodec.build_manifest(TJ, L, out, a.quality, a.times, info={'blender': bpy.app.version_string, 'samples': q['samples'], 'scene_hash': scene_hash,
                                                                    'only': only, 'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}, enc=enc)
    lmcodec.write_json(os.path.join(out, 'manifest.json'), man)
    z = lmcodec.zip_dir(out, os.path.join(a.out, name + '.zip'))
    log('DONE -> %s (%.1f MB) complete=%s' % (z, os.path.getsize(z) / 1e6, man['complete']))
    return 0


if __name__ == '__main__':
    rc = main()
    if rc:
        sys.exit(rc)
