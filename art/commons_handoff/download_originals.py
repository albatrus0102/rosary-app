from pathlib import Path
import argparse, json, hashlib, time, urllib.request
from PIL import Image
base=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--primary-only',action='store_true')
args=parser.parse_args()
items=json.loads((base/'manifest.json').read_text(encoding='utf-8'))['assets']
out=base/'originals'; out.mkdir(exist_ok=True)
results=[]
for r in items:
    if args.primary_only and r['rank']!='A': continue
    dest=out/r['filename']; tmp=dest.with_suffix('.part')
    result={'id':r['id'],'filename':r['filename']}
    try:
        if not dest.exists():
            req=urllib.request.Request(r['original_url'],headers={'User-Agent':'RosariumOriginalImageDownloader/1.0 (individual educational project; Wikimedia Commons originals)'})
            with urllib.request.urlopen(req,timeout=120) as response, tmp.open('wb') as f:
                while True:
                    chunk=response.read(1024*1024)
                    if not chunk: break
                    f.write(chunk)
            with Image.open(tmp) as im:
                assert im.format=='JPEG' and im.size==(r['width'],r['height']), f'Unexpected format/dimensions: {im.format} {im.size}'
                im.verify()
            tmp.replace(dest)
        with Image.open(dest) as im:
            assert im.format=='JPEG' and im.size==(r['width'],r['height']), 'Unexpected format/dimensions'
            im.verify()
        result.update(status='ok',size_bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
    except Exception as e:
        tmp.unlink(missing_ok=True)
        result.update(status='error',error=str(e),file_page=r['file_page'])
    results.append(result); print(result,flush=True)
    (base/'download_report.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    time.sleep(2)
if any(x['status']!='ok' for x in results): raise SystemExit(1)
