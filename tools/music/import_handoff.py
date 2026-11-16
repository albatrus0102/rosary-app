#!/usr/bin/env python3
"""PC 에서 받아 온 성가 녹음(art/music_handoff/received/)을 앱에 넣는다.

    python3 tools/music/import_handoff.py            # received/ 의 report.json + 음원 → 앱
    python3 tools/music/import_handoff.py --dry-run  # 무엇을 할지만 출력

하는 일:
  1) report.json 에서 status 가 ok 이고 라이선스가 CC0 / Public domain 인 것만 고른다(다시 확인).
  2) ffmpeg 로 모노 AAC 64 kbps, 최대 6분, 앞 1.5초·뒤 3초 페이드, 조용한 음량(-19 LUFS)으로 줄여
     assets/music/<id>.m4a 로 쓴다.
  3) lib/domain/prayer_music_extra.dart 를 다시 써서 곡 목록·출처 화면에 더한다.
그 뒤 licenses/MUSIC.md 에 곡마다 한 줄(연주자·파일 페이지·라이선스)을 손으로 보태고,
`flutter test test/prayer_music_test.dart` 로 파일·크기(합계 10MB 미만)를 확인한다.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
HANDOFF = ROOT / 'art' / 'music_handoff'
OUT = ROOT / 'assets' / 'music'
DART = ROOT / 'lib' / 'domain' / 'prayer_music_extra.dart'
MAX_SECONDS = 360
LICENSES = {
    'cc0': 'CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/',
    'pd': 'Public domain',
}


def duration(path: Path) -> float:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        check=True, capture_output=True, text=True).stdout
    return float(out.strip())


def dart_str(s: str) -> str:
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('$', '\\$') + "'"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--received', default=str(HANDOFF / 'received'))
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    received = Path(args.received)
    report = json.loads((received / 'report.json').read_text(encoding='utf-8-sig'))
    manifest = {t['id']: t for t in
                json.loads((HANDOFF / 'manifest.json').read_text(encoding='utf-8'))['tracks']}
    entries = []
    for row in report:
        meta = manifest.get(row['id'])
        lic = (row.get('license') or '').lower()
        kind = 'cc0' if lic.startswith('cc0') else 'pd' if lic.startswith('pd') else None
        src = received / (row.get('file') or '')
        if meta is None or row.get('status') != 'ok' or kind is None or not src.is_file():
            print(f"건너뜀: {row['id']} ({row.get('status')}, {row.get('license_name')})")
            continue
        if not row.get('artist'):
            print(f"건너뜀: {row['id']} (연주자 표기가 없다 — 파일 페이지를 직접 확인할 것)")
            continue
        total = duration(src)
        length = min(total, MAX_SECONDS)
        dst = OUT / f"{row['id']}.m4a"
        print(f"{row['id']}: {total:.0f}s → {length:.0f}s  {row['artist']}  [{row['license_name']}]")
        if not args.dry_run:
            OUT.mkdir(parents=True, exist_ok=True)
            fade = f'afade=t=in:d=1.5,afade=t=out:st={length - 3:.2f}:d=3'
            subprocess.run(
                ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src), '-t', f'{length:.2f}',
                 '-af', f'loudnorm=I=-19:TP=-3:LRA=11,{fade}', '-map_metadata', '-1', '-ac', '1',
                 '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(dst)],
                check=True)
        cut = '' if total <= MAX_SECONDS else ' 앞 6분만 씀.'
        entries.append(
            '  MusicTrack(\n'
            f"    id: {dart_str(row['id'])},\n"
            f"    title: {dart_str(meta['title_ko'])},\n"
            f"    subtitle: {dart_str(meta['subtitle_ko'])},\n"
            f"    asset: {dart_str('assets/music/' + dst.name)},\n"
            f"    credit: {dart_str('노래: ' + row['artist'] + '. Wikimedia Commons. 변경: 음량을 맞추고 앞뒤를 서서히 줄임.' + cut)},\n"
            f"    license: {dart_str(LICENSES[kind])},\n"
            f"    source: {dart_str(row['file_page'])},\n"
            '  ),\n')
    body = (
        '// 받아 온 성가 녹음 목록. tools/music/import_handoff.py 가 이 파일을 다시 쓴다(손으로 고치지 않는다).\n'
        '// 원자료: art/music_handoff/received/report.json (위키미디어 커먼즈 API 의 라이선스·연주자).\n\n'
        "import 'prayer_music_tracks.dart';\n\n"
        'const List<MusicTrack> extraMusicTracks = [' + ('\n' + ''.join(entries) if entries else '') + '];\n')
    if args.dry_run:
        print(body)
    else:
        DART.write_text(body, encoding='utf-8')
        size = sum(p.stat().st_size for p in OUT.glob('*.m4a'))
        print(f'{len(entries)}곡 추가. assets/music 합계 {size / 1e6:.1f} MB (10 MB 미만이어야 한다)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
