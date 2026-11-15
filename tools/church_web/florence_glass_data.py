#!/usr/bin/env python3
"""data/glass_windows/florence.json 의 '모델 개구부' 절을 지금 빌더에 맞춰 다시 쓴다(I-3). 저장소 루트에서 실행한다.

    node tools/church_web/church_openings.mjs florence --json > /tmp/florence_openings.json
    python3 tools/church_web/florence_glass_data.py /tmp/florence_openings.json
    node tools/church_web/church_openings.mjs --check

- model.openings / opening_count / by_zone 를 측정값으로 바꾼다(실제 창 조사 행은 그대로 둔다).
- 트리부나 윗창 15행(FL-U01…15): 개구부를 뚫었으므로 분류 b → a, opening_keys 를 그 창이 있을 수 있는 트리부나의 윗창 key 로 잇는다
  (ICCD 문맥으로 트리부나를 아는 5행은 그 트리부나, 가운데 창으로 확인되는 1행은 그 창, 나머지는 15곳 전부 = 순서 추정).
"""
import json
import sys

PATH = 'data/glass_windows/florence.json'
m = json.load(open(sys.argv[1], encoding='utf8'))
d = json.load(open(PATH, encoding='utf8'))

ops, by_zone = [], {}
for o in m['openings']:
    by_zone[o['zone']] = by_zone.get(o['zone'], 0) + 1
    ops.append({'key': o['key'], 'zone': o['zone'], 'kind': o['kind'], 'shape': o['shape'], 'x': o['x'], 'y': o['y'], 'z': o['z'], 'yawDeg': o['yawDeg'],
                'w': o['w'], 'h': o['h'], 'sill': o['sill'], 'aspect': o['aspect'], 'real_m': [o['realW'], o['realH']], 'glass_now': o['glassNow'], 'photo': o['photo']})
d['model'].update({'opening_count': len(ops), 'window_count': len(ops), 'photo_slot_count': sum(1 for o in ops if o['photo']), 'by_zone': by_zone, 'openings': ops})

keys = {t: ['trib%s_u%d' % (t, i) for i in range(1, 6)] for t in 'ESN'}
for w in d['real_windows']:
    if w['zone'] != 'tribune_upper':
        continue
    pos = w['position_ko']
    if '가운데 창' in w['subject_ko']:
        ks = ['tribE_u3']            # 성 자노비 경당(동 트리부나 가운데) 위
    elif '동(성 자노비)' in pos:
        ks = keys['E']
    elif '남(S. Antonio)' in pos:
        ks = keys['S']
    else:
        ks = keys['E'] + keys['S'] + keys['N']
    w['cls'] = 'a'
    w['opening_keys'] = ks
    w['size_app_m'] = [0.86, 2.67]
    w['match_note'] = ('I-3 에서 뚫음: 경당 아치(정점 6.3m) 위 벽에 0.86×2.67m 첨두 창, 창턱 8.6m(실제 환산 19.1m — 스그릴리 1733 단면에서 잰 18.8m), 꼭대기 11.27m(25.0m). '
                       '어느 창이 어느 자리인지는 ' + ('문맥으로 확인(가운데 창)' if len(ks) == 1 else '순서 추정'))
    w['placeholder'] = 'ai_sheet:florence-D 또는 절차적 색조 패널(개발용)'
for w in d['real_windows']:
    if w['zone'] == 'tribune_chapel':
        w['match_note'] = 'I-3: 트리부나를 정팔각 배열(경당이 0°·±45°·±90° 변)로 고쳐 창 자리가 바뀌었다. 창 0.8×2.78m(실제 환산 1.78×6.17m ↔ 실제 1.8×6.3m), 창턱 3.1m(6.9m)'
d['real_counts']['by_class'] = {'a': 44, 'b': 0, 'c': 0, 'd': 0, 'e': 1}
d['status'] = '조사 데이터 + 모델 개구부(I-3 구조 수정 반영: 트리부나 팔각 배열·윗창 15개 개통). 그림은 아직 걸지 않았다. 앱 번들(pubspec assets)에 포함되지 않는 경로다.'
for it in d['work_items']:
    if '윗창 15곳' in it['what']:
        it['done'] = 'I-3(2026-11-15): tribune() 에 윗창 15개 개통 — key tribE/S/N_u1…u5'
json.dump(d, open(PATH, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
open(PATH, 'a', encoding='utf8').write('\n')
print('openings', len(ops), by_zone)
