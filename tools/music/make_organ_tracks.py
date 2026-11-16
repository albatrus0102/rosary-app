#!/usr/bin/env python3
"""기도 배경 성가(오르간) 트랙을 만든다 — 그레고리오 성가 선율을 합성 오르간으로 연주한다.

선율은 GregoBase(https://gregobase.selapa.net, 채보 전부 CC0)의 GABC 악보(tools/music/scores/)에서
음높이만 읽는다(솔렘 리듬 기호는 쓰지 않고, 쉼표 앞 음만 길게 한다 = 바티칸판 관행).
반주(선법 화음·페달)와 오르간 소리(가산 합성 + 합성 잔향)는 이 스크립트가 만든다.
녹음물을 쓰지 않으므로 실연자·음반 제작자의 권리가 없고, 결과물은 CC0 1.0 으로 둔다.

    python3 tools/music/make_organ_tracks.py            # 4곡 모두 → assets/music/*.m4a
    python3 tools/music/make_organ_tracks.py --only salve_regina --wav out_dir --plan

필요: numpy, scipy, ffmpeg(AAC 인코딩). 난수 씨앗이 고정이라 결과가 재현된다.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SCORES = HERE / 'scores'
OUT = ROOT / 'assets' / 'music'

# ---------------------------------------------------------------- GABC ----

# 보표 자리 a..m 의 온음계 단계(a=0). 도(C) 자리: c4 → j, c3 → h, c2 → f, c1 → d.
_CLEF_DO = {'c4': 9, 'c3': 7, 'c2': 5, 'c1': 3, 'f3': 4, 'f4': 6}  # f 음자리표는 '파' 자리
_SCALE = [0, 2, 4, 5, 7, 9, 11]  # 도 레 미 파 솔 라 시


@dataclass
class Note:
    midi: int          # 조옮김 전(도 = 60)
    dur: float         # 박(푼크툼 = 1)
    syl: int           # 음절 번호(같은 음절 안에서는 레가토)
    rest_after: float = 0.0   # 뒤따르는 쉼(박)
    bar: str = ''      # 뒤의 구분선 ',', ';', ':', '::'


def parse_gabc(text: str) -> list[list[Note]]:
    """GABC 본문을 '(::)' 단위 구절들의 음표 목록으로 읽는다."""
    body = text.split('%%', 1)[1]
    do_pos, flat_all = 9, False
    sections: list[list[Note]] = [[]]
    flats: set[int] = set()
    syl = 0
    for group in re.findall(r'\(([^)]*)\)', body):
        g = re.sub(r'\[[^\]]*\]', '', group).strip()
        if not g or g in ('Z', 'z'):
            continue
        m = re.fullmatch(r'(c|f)(b?)([1-4])', g)
        if m:
            key = m.group(1) + m.group(3)
            do_pos = _CLEF_DO[key] - (3 if m.group(1) == 'f' else 0)
            flat_all = bool(m.group(2))
            continue
        if re.fullmatch(r'[,;:`\s]+', g):
            bar = g.replace('`', ',').strip()
            cur = sections[-1]
            if cur:
                cur[-1].bar = bar
            flats.clear()
            if bar == '::':
                sections.append([])
            continue
        syl += 1
        i = 0
        while i < len(g):
            ch = g[i]
            low = ch.lower()
            if 'a' <= low <= 'm':
                pos = ord(low) - ord('a')
                nxt = g[i + 1] if i + 1 < len(g) else ''
                if nxt == 'x':
                    flats.add(pos)
                    i += 2
                    continue
                if nxt == 'y':
                    flats.discard(pos)
                    i += 2
                    continue
                step = pos - do_pos
                octv, deg = divmod(step, 7)
                midi = 60 + 12 * octv + _SCALE[deg]
                if deg == 6 and (flat_all or pos in flats):
                    midi -= 1
                cur = sections[-1]
                if cur and cur[-1].syl == syl and cur[-1].midi == midi:
                    cur[-1].dur += 1.0      # 같은 음절 안의 같은 음(디스트로파) → 이어 긴 음으로
                else:
                    cur.append(Note(midi, 1.0, syl))
            i += 1
    sections = [s for s in sections if s]
    # 쉼표 앞 음을 늘이고(모라 보치스) 쉼을 둔다.
    for sec in sections:
        for n in sec:
            if n.bar == ',':
                n.dur = max(n.dur, 1.6); n.rest_after = 0.4
            elif n.bar == ';':
                n.dur = max(n.dur, 2.0); n.rest_after = 0.9
            elif n.bar == ':':
                n.dur = max(n.dur, 2.0); n.rest_after = 1.4
            elif n.bar == '::':
                n.dur = max(n.dur, 2.4); n.rest_after = 2.2
    return sections


# --------------------------------------------------------------- 화성 ----

_CHORDS = {  # 이름: (근음 pc, 3음, 5음)
    'C': (0, 4, 7), 'F': (5, 9, 0), 'G': (7, 11, 2), 'Bb': (10, 2, 5),
    'Dm': (2, 5, 9), 'Am': (9, 0, 4), 'Em': (4, 7, 11), 'Gm': (7, 10, 2),
}


@dataclass
class Segment:
    notes: list[Note]
    chord: str = ''
    final: bool = False   # '(::)' 로 끝나는 마디


def _segments(sec: list[Note], min_beats: float) -> list[Segment]:
    """구절을 음절 경계에서 min_beats 이상 길이의 화음 마디로 나눈다(구분선에서는 반드시 끊는다)."""
    segs: list[Segment] = []
    cur: list[Note] = []
    beats = 0.0
    for k, n in enumerate(sec):
        cur.append(n)
        beats += n.dur
        last = k == len(sec) - 1
        syl_end = last or sec[k + 1].syl != n.syl
        if n.bar or (syl_end and beats >= min_beats):
            segs.append(Segment(cur))
            cur, beats = [], 0.0
    if cur:
        if segs:
            segs[-1].notes.extend(cur)
        else:
            segs.append(Segment(cur))
    # 구분선 바로 앞의 너무 짧은 마디는 앞 마디에 붙인다.
    merged: list[Segment] = []
    for s in segs:
        if merged and sum(n.dur for n in s.notes) < min_beats * 0.6 and not merged[-1].notes[-1].bar:
            merged[-1].notes.extend(s.notes)
        else:
            merged.append(s)
    merged[-1].final = True
    return merged


def _fit(seg: Segment, chord: str) -> float:
    tones = _CHORDS[chord]
    score = 0.0
    for k, n in enumerate(seg.notes):
        pc = n.midi % 12
        w = n.dur * (1.6 if k == len(seg.notes) - 1 else 1.0)
        if pc in tones:
            score += w
        elif any((pc - t) % 12 in (1, 11) for t in tones):
            score -= 1.3 * w      # 화음 음과 반음 충돌
        else:
            score -= 0.35 * w     # 지나가는 음
    return score


def harmonise(sections: list[list[Note]], tonic: str, min_beats: float) -> list[list[Segment]]:
    out = [_segments(sec, min_beats) for sec in sections]
    flat = [s for secs in out for s in secs]
    # 곡이 시♭만 쓰면 시♮이 든 화음(G·Em)을, 시♮만 쓰면 시♭이 든 화음(Bb·Gm)을 뺀다.
    pcs = {n.midi % 12 for sec in sections for n in sec}
    names = [c for c in _CHORDS
             if not (10 in pcs and 11 not in pcs and 11 in _CHORDS[c])
             and not (11 in pcs and 10 not in pcs and 10 in _CHORDS[c])]
    best = [{c: -1e9 for c in names} for _ in flat]
    back: list[dict[str, str]] = [{} for _ in flat]
    for i, seg in enumerate(flat):
        last_pc = seg.notes[-1].midi % 12
        for c in names:
            s = _fit(seg, c)
            root, third, fifth = _CHORDS[c]
            if seg.notes[-1].bar:      # 쉼 앞의 음은 근음·5음이면 더 안정적
                s += {root: 0.9, fifth: 0.5, third: 0.1}.get(last_pc, -0.6)
            if c == tonic:
                s += 0.25
            if i == len(flat) - 1 and c != tonic:
                s -= 100
            if i == 0:
                best[i][c] = s + (1.5 if c == tonic else 0.0)   # 으뜸화음으로 시작
                continue
            for p in names:
                t = best[i - 1][p] + s - (0.0 if p == c else 0.9)
                if t > best[i][c]:
                    best[i][c] = t
                    back[i][c] = p
    c = max(best[-1], key=best[-1].get)
    for i in range(len(flat) - 1, -1, -1):
        flat[i].chord = c
        c = back[i].get(c, c)
    return out


# --------------------------------------------------------------- 합성 ----

# 스톱별 배음 세기(1배음부터). 부드러운 플루트/게닥트 계열만 쓴다.
STOPS = {
    'flute8': [1.0, 0.10, 0.16, 0.02, 0.05, 0.008, 0.015],
    'flute4': [1.0, 0.06, 0.08, 0.01, 0.02],
    'gedackt8': [1.0, 0.02, 0.13, 0.0, 0.04, 0.0, 0.012],
    'dulciana8': [1.0, 0.22, 0.12, 0.06, 0.03, 0.015],
    'subbass16': [1.0, 0.04, 0.10, 0.0, 0.03],
}


def _hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _tone(buf: np.ndarray, start: float, dur: float, midi: float, stop: str, amp: float,
          rng: np.random.Generator, attack=0.07, release=0.16, octave=0) -> None:
    """파이프 한 음을 buf(모노)에 더한다. 느린 어택·릴리스, 약한 바람 흔들림."""
    n0 = int(start * SR)
    n = int((dur + release) * SR)
    if n0 >= len(buf) or n <= 0:
        return
    n = min(n, len(buf) - n0)
    t = np.arange(n) / SR
    f0 = _hz(midi + 12 * octave) * 2 ** (rng.normal(0, 1.2) / 1200)
    wob = 1 + 0.0009 * np.sin(2 * np.pi * (4.3 + rng.uniform(-0.6, 0.6)) * t + rng.uniform(0, 6.28))
    phase = 2 * np.pi * f0 * np.cumsum(wob) / SR
    sig = np.zeros(n)
    ph0 = rng.uniform(0, 2 * np.pi)
    for h, a in enumerate(STOPS[stop], start=1):
        if a <= 0 or f0 * h > 9000:
            continue
        # 높은 배음일수록 조금 늦게 선다(파이프가 '말하기' 시작하는 느낌).
        rise = np.clip(t / (attack * (1 + 0.25 * (h - 1))), 0, 1)
        sig += a * (0.5 - 0.5 * np.cos(np.pi * rise)) * np.sin(h * phase + ph0 * h)
    env = np.ones(n)
    rel = int(release * SR)
    hold = n - rel
    if hold < 0:
        hold, rel = 0, n
    env[hold:] = 0.5 + 0.5 * np.cos(np.pi * np.arange(n - hold) / max(1, n - hold))
    buf[n0:n0 + n] += amp * sig * env


def _reverb_ir(rng: np.random.Generator) -> np.ndarray:
    """성당 같은 긴 잔향(약 3초)의 합성 임펄스 응답(2채널)."""
    n = int(4.2 * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    lo = butter(2, 1800, 'low', fs=SR, output='sos')
    mid = butter(2, [300, 5200], 'band', fs=SR, output='sos')
    for ch in range(2):
        a = sosfilt(lo, rng.normal(size=n)) * 10 ** (-3 * t / 3.1)
        b = sosfilt(mid, rng.normal(size=n)) * 10 ** (-3 * t / 2.0)
        x = a + 0.8 * b
        x *= np.clip(t / 0.045, 0, 1) ** 2      # 초기 잔향이 서서히 차오른다
        ir[:, ch] = x
    pre = int(0.022 * SR)
    ir = np.vstack([np.zeros((pre, 2)), ir])
    ir /= np.sqrt((ir ** 2).sum(axis=0)).mean()
    return ir


@dataclass
class Pass:
    """선율을 한 번 연주하는 방식."""
    sections: list[int] | None = None       # 연주할 구절 번호(None = 전부)
    melody: tuple[tuple[str, int, float], ...] = (('flute8', 0, 1.0),)   # (스톱, 옥타브, 세기)
    chords: bool = True
    pedal: bool = True


@dataclass
class Track:
    id: str
    score: str
    tonic: str                 # 마지막 화음(조옮김 전)
    transpose: int             # 반음
    beat: float                # 푼크툼 한 박의 길이(초)
    passes: list[Pass] = field(default_factory=list)
    min_beats: float = 3.5


def _voicing(chord: str, prev: list[int] | None, ceiling: int, tr: int) -> list[int]:
    """화음 3음을 ceiling 아래 가까운 자리에, 앞 화음과 가장 덜 움직이게 놓는다."""
    pcs = [(p + tr) % 12 for p in _CHORDS[chord]]
    best, best_cost = None, 1e9
    for top in range(ceiling, ceiling - 12, -1):
        if top % 12 not in pcs:
            continue
        v = [top]
        m = top - 1
        while len(v) < 3:
            if m % 12 in pcs and m % 12 not in [x % 12 for x in v]:
                v.append(m)
            m -= 1
        v.sort()
        cost = abs(top - (ceiling - 3)) * 0.3 if prev is None else sum(abs(a - b) for a, b in zip(v, prev))
        if cost < best_cost:
            best, best_cost = v, cost
    return best


def render(track: Track, verbose: bool = False) -> np.ndarray:
    rng = np.random.default_rng(abs(hash_id(track.id)))
    sections = parse_gabc((SCORES / track.score).read_text(encoding='utf-8'))
    harm = harmonise(sections, track.tonic, track.min_beats)

    # 1) 시간표 만들기
    events = []   # (pass, start, dur, note, next_same_syl)
    chords = []   # (pass, start, dur, chord, low_melody)
    t = 1.2
    for ps in track.passes:
        idx = ps.sections if ps.sections is not None else range(len(harm))
        for si in idx:
            for seg in harm[si]:
                seg_start = t
                for k, n in enumerate(seg.notes):
                    d = n.dur * track.beat
                    events.append((ps, t, d, n))
                    t += d + n.rest_after * track.beat
                last = seg.notes[-1]
                sounding = t - seg_start - last.rest_after * track.beat * (0.55 if last.bar != '::' else 1.0)
                chords.append((ps, seg_start, sounding, seg.chord,
                               min(n.midi for n in seg.notes) + track.transpose))
                if verbose:
                    mel = ' '.join(_name(n.midi + track.transpose) for n in seg.notes)
                    print(f'  {seg_start:6.1f}s {seg.chord:3s} | {mel} {last.bar}')
        t += 2.0 * track.beat
    total = t + 5.5
    dry = np.zeros(int(total * SR))

    # 2) 선율: 같은 음절 안은 레가토, 음절이 바뀌며 같은 음이면 살짝 끊는다.
    for k, (ps, start, d, n) in enumerate(events):
        nxt = events[k + 1][3] if k + 1 < len(events) else None
        gap = 0.0
        if nxt is not None and not n.rest_after and nxt.midi == n.midi:
            gap = 0.09
        for stop, octv, amp in ps.melody:
            _tone(dry, start, max(0.08, d - gap), n.midi + track.transpose, stop, 0.30 * amp, rng,
                  octave=octv, release=0.11 if gap else 0.16)

    # 3) 반주: 안쪽 3성(게닥트)과 페달. 같은 화음이 이어지면 음을 잇는다.
    prev_v = None
    k = 0
    while k < len(chords):
        ps, start, d, ch, low = chords[k]
        end = start + d
        j = k + 1
        while j < len(chords) and chords[j][3] == ch and chords[j][0] is ps and chords[j][1] - end < 0.5 * track.beat:
            end = chords[j][1] + chords[j][2]
            low = min(low, chords[j][4])
            j += 1
        ceiling = min(low - 2, 60 + 5)       # 선율 아래, F4 이하
        v = _voicing(ch, prev_v, ceiling, track.transpose)
        prev_v = v
        if ps.chords:
            for m in v:
                _tone(dry, start, end - start, m, 'gedackt8', 0.055, rng, attack=0.16, release=0.30)
                _tone(dry, start, end - start, m, 'dulciana8', 0.018, rng, attack=0.20, release=0.30)
        if ps.pedal:
            root = (_CHORDS[ch][0] + track.transpose) % 12
            bass = 36 + root                 # C2..B2
            if bass > 45:
                bass -= 12
            _tone(dry, start, end - start, bass, 'subbass16', 0.07, rng, attack=0.20, release=0.35)
            _tone(dry, start, end - start, bass + 12, 'gedackt8', 0.032, rng, attack=0.20, release=0.35)
        k = j

    # 4) 잔향·스테레오·페이드
    ir = _reverb_ir(rng)
    wet = np.stack([fftconvolve(dry, ir[:, c])[:len(dry)] for c in range(2)], axis=1)
    out = 0.68 * dry[:, None] + 0.40 * wet
    hp = butter(2, 38, 'high', fs=SR, output='sos')
    out = sosfilt(hp, out, axis=0)
    fin = int(1.5 * SR)
    out[:fin] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(fin) / fin))[:, None]
    fout = int(3.0 * SR)
    out[-fout:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(fout) / fout))[:, None]
    return out


def hash_id(s: str) -> int:
    h = 2166136261
    for ch in s.encode():
        h = (h ^ ch) * 16777619 & 0xFFFFFFFF
    return h


def _name(m: int) -> str:
    return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + str(m // 12 - 1)


def normalise(x: np.ndarray, rms_db: float = -24.0, peak_db: float = -6.0) -> np.ndarray:
    """조용한 수준으로 맞춘다: 소리 나는 구간의 RMS 를 rms_db 로, 피크는 peak_db 이하."""
    mono = x.mean(axis=1)
    win = SR // 2
    frames = mono[:len(mono) // win * win].reshape(-1, win)
    r = np.sqrt((frames ** 2).mean(axis=1))
    loud = r[r > r.max() * 0.1]
    g = 10 ** (rms_db / 20) / np.sqrt((loud ** 2).mean())
    g = min(g, 10 ** (peak_db / 20) / np.abs(x).max())
    return x * g


def write_wav(path: Path, x: np.ndarray) -> None:
    rng = np.random.default_rng(7)
    d = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0     # TPDF 디더
    pcm = np.clip(np.round((x + d) * 32767), -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


F8 = (('flute8', 0, 1.0),)
F84 = (('flute8', 0, 0.9), ('flute4', 1, 0.22))
FD = (('flute8', 0, 0.85), ('dulciana8', 0, 0.30))

TRACKS = [
    # 살베 레지나(단순 선율, 제5선법). 두 번: 플루트 8' → 8'+4'.
    Track('salve_regina', 'salve_regina_simplex.gabc', 'C', 14, 0.47,
          [Pass(melody=F8), Pass(melody=F84)]),
    # 아베 마리아(제1선법). 세 번: 8' → 8'+둘치아나 → 8'+4'.
    Track('ave_maria', 'ave_maria.gabc', 'Dm', 12, 0.46,
          [Pass(melody=F8), Pass(melody=FD), Pass(melody=F84)]),
    # 아도로 테 데보테(제5선법). 5절 + 아멘.
    Track('adoro_te', 'adoro_te_devote.gabc', 'F', 10, 0.56,
          [Pass(sections=[0], melody=F8), Pass(sections=[0], melody=F84),
           Pass(sections=[0], melody=FD), Pass(sections=[0], melody=F8),
           Pass(sections=[0, 7], melody=F84)], min_beats=3.0),
    # 우비 카리타스(제6선법). 후렴과 세 절.
    Track('ubi_caritas', 'ubi_caritas.gabc', 'F', 14, 0.50,
          [Pass(sections=[0, 1, 2, 3, 4], melody=F8),
           Pass(sections=[5, 6, 7, 8, 9], melody=FD),
           Pass(sections=[10, 11, 12, 13, 14, 15], melody=F84)]),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--wav', help='WAV 도 이 폴더에 남긴다')
    ap.add_argument('--plan', action='store_true', help='화음 배치를 출력한다')
    ap.add_argument('--bitrate', default='80k')
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    for tr in TRACKS:
        if args.only and tr.id != args.only:
            continue
        x = normalise(render(tr, verbose=args.plan))
        dur = len(x) / SR
        with tempfile.TemporaryDirectory() as td:
            wav = Path(args.wav or td) / f'organ_{tr.id}.wav'
            wav.parent.mkdir(parents=True, exist_ok=True)
            write_wav(wav, x)
            dst = OUT / f'organ_{tr.id}.m4a'
            subprocess.run(
                ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                 '-map_metadata', '-1', '-c:a', 'aac', '-b:a', args.bitrate, '-ar', str(SR),
                 '-movflags', '+faststart', '-fflags', '+bitexact', '-flags:a', '+bitexact',
                 str(dst)], check=True)
        print(f'{dst.relative_to(ROOT)}  {dur:6.1f}s  {dst.stat().st_size / 1024:7.1f} kB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
