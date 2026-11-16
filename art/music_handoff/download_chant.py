#!/usr/bin/env python3
"""위키미디어 커먼즈의 CC0 성가 녹음 후보를 받는다(파이썬 3 표준 라이브러리만 쓴다).

1) 파일마다 커먼즈 API 로 라이선스·연주자·원본 주소를 읽는다.
2) 라이선스가 CC0 / Public domain 이 아니면 받지 않는다(report 에 rejected_license 로 적는다).
3) 원본을 originals/ 에 받고 SHA-1 을 API 값과 맞춰 본다.
요청은 파일당 2번, 사이에 5초씩 쉰다. 서버가 429 를 주면 알려 준 시간만큼 기다렸다가
두 번까지만 다시 해 보고 멈춘다(제한을 피하려 하지 않는다).
"""
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).resolve().parent
UA = 'RosariumChantFetch/1.0 (personal non-commercial prayer app; 3 CC0 audio files)'
API = 'https://commons.wikimedia.org/w/api.php'


def fetch(url, dest=None):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                if dest is None:
                    return r.read()
                with open(dest, 'wb') as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                return None
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 2:
                raise
            wait = min(300, int(e.headers.get('Retry-After') or 60 * (attempt + 1)))
            print(f'   서버가 바쁩니다. {wait}초 기다립니다…', flush=True)
            time.sleep(wait)


def text(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def main():
    manifest = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    out = BASE / 'originals'
    out.mkdir(exist_ok=True)
    report = []
    for t in manifest['tracks']:
        row = {'id': t['id'], 'commons_title': t['commons_title'], 'file_page': t['file_page']}
        print(t['commons_title'], flush=True)
        try:
            q = urllib.parse.urlencode({
                'action': 'query', 'format': 'json', 'titles': t['commons_title'],
                'prop': 'imageinfo', 'iiprop': 'url|size|mime|sha1|extmetadata'})
            page = next(iter(json.loads(fetch(f'{API}?{q}'))['query']['pages'].values()))
            ii = page['imageinfo'][0]
            em = {k: v.get('value', '') for k, v in ii.get('extmetadata', {}).items()}
            lic = (em.get('License') or '').lower()
            row.update(
                license=lic, license_name=em.get('LicenseShortName', ''),
                license_url=em.get('LicenseUrl', ''),
                artist=text(em.get('Artist')), credit=text(em.get('Credit')),
                description=text(em.get('ImageDescription')), date=text(em.get('DateTimeOriginal')),
                url=ii['url'], bytes=ii.get('size'), mime=ii.get('mime'), sha1=ii.get('sha1'))
            if not any(lic == a or lic.startswith(a + '-') for a in manifest['allowed_licenses']):
                row['status'] = 'rejected_license'
            else:
                time.sleep(5)
                name = t['id'] + Path(urllib.parse.urlparse(ii['url']).path).suffix
                dest = out / name
                if not dest.exists():
                    part = dest.with_name(dest.name + '.part')
                    fetch(ii['url'], part)
                    part.replace(dest)
                ok = hashlib.sha1(dest.read_bytes()).hexdigest() == ii.get('sha1')
                row.update(file=name, status='ok' if ok else 'sha1_mismatch')
        except Exception as e:  # noqa: BLE001
            row.update(status='error', error=str(e))
        print('   ->', row['status'], row.get('license_name', ''), '|', row.get('artist', ''), flush=True)
        report.append(row)
        (out / 'report.json').write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        time.sleep(5)
    return 0 if all(r['status'] == 'ok' for r in report) else 1


if __name__ == '__main__':
    sys.exit(main())
