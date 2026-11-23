// web_demo/deploy_proxy.cjs — 세션 프록시가 api.cloudflare.com 요청의 Authorization 을 저장된 토큰으로 덮어쓰는 환경용 배포 준비.
// wrangler 의 파일 올리기 단계(일회용 JWT)는 그 덮어쓰기 때문에 실패한다. 그래서
//   ① 이미 Cloudflare 에 올라가 있는 파일(같은 해시 — wrangler 와 같은 blake3(base64+확장자))은 manifest 로 가리키기만 하고,
//   ② 새로 생기거나 바뀐 파일은 _worker.js 안에 넣어 Worker 가 바로 내준다(합계 900KB 까지; 넘으면 멈춘다 → wrangler 로 올려야 한다).
// 쓰임: node web_demo/deploy_proxy.cjs <정적 폴더> <출력 폴더> <이미 올라간 해시 목록 json(manifest 형식, 여러 개면 쉼표)>
//   → <출력 폴더>/manifest.json, worker.bundle, uploaded.json(이번 배포로 쓸 수 있게 된 해시 — 다음 번 목록에 더한다)
// 보내기(Node fetch 는 프록시를 거치지 않으므로 curl):
//   curl -H 'Authorization: Bearer proxy-injected' -F manifest=<…/manifest.json -F branch=main -F _headers=@<정적 폴더>/_headers \
//        -F _worker.bundle=@…/worker.bundle https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/rosarium-demo/deployments
// 확인 후 깨졌으면 직전 배포로 rollback.
const fs = require('fs'), path = require('path');
const blake = require(path.join(__dirname, '..', 'server/church/node_modules/blake3-wasm'));
const [dir, outDir, knownArg] = process.argv.slice(2);
if (!dir || !outDir || !knownArg) { console.error('쓰임: node deploy_proxy.cjs <정적 폴더> <출력 폴더> <이미 올라간 manifest.json[,…]>'); process.exit(2); }
const known = new Set();
for (const f of knownArg.split(',')) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); for (const h of Array.isArray(j) ? j : Object.values(j)) known.add(h); }
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', txt: 'text/plain; charset=utf-8', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2', pdf: 'application/pdf' };
const man = {}, inline = {};
let inlineBytes = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    const rel = '/' + path.relative(dir, p).split(path.sep).join('/');
    if (rel === '/_headers' || rel === '/_worker.js') continue;
    const buf = fs.readFileSync(p), ext = path.extname(p).substring(1);
    const h = Buffer.from(blake.hash(Buffer.from(buf.toString('base64') + ext))).toString('hex').slice(0, 32);
    if (known.has(h)) { man[rel] = h; continue; }
    inline[rel] = { b64: buf.toString('base64'), type: TYPES[ext] || 'application/octet-stream' };
    inlineBytes += buf.length;
  }
})(dir);
if (inlineBytes > 900 * 1024) { console.error('바뀐 파일이 너무 큽니다(' + inlineBytes + ' bytes) — wrangler 로 올리세요: ' + Object.keys(inline).join(', ')); process.exit(3); }
const worker = `const FILES=${JSON.stringify(inline)};
function hdr(res,p){const r=new Response(res.body,res);r.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('X-Content-Type-Options','nosniff');
if(p.startsWith('/v/'))r.headers.set('Cache-Control','no-store');else if(p.startsWith('/assets/'))r.headers.set('Cache-Control','public, max-age=600');return r}
function b64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
export default{async fetch(req,env){const u=new URL(req.url);const p=u.pathname;
let k=p.endsWith('/')?p+'index.html':p;let f=FILES[k];
if(!f&&!p.endsWith('/')&&FILES[p+'/index.html']){return Response.redirect(u.origin+p+'/'+u.search,301)}
if(f)return hdr(new Response(b64(f.b64),{headers:{'content-type':f.type}}),p);
return hdr(await env.ASSETS.fetch(req),p)}}`;
(async () => {
  const bundle = new FormData();
  bundle.set('metadata', JSON.stringify({ main_module: '_worker.js' }));
  bundle.set('_worker.js', new File([worker], '_worker.js', { type: 'application/javascript+module' }));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(man));
  fs.writeFileSync(path.join(outDir, 'worker.bundle'), Buffer.from(await (await new Response(bundle).blob()).arrayBuffer()));
  fs.writeFileSync(path.join(outDir, 'uploaded.json'), JSON.stringify([...known]));
  console.log('정적(기존) ' + Object.keys(man).length + '개 · Worker 안 ' + Object.keys(inline).length + '개(' + inlineBytes + ' bytes): ' + Object.keys(inline).map((k) => k.replace(/\/v\/[a-z2-7]{20,}\//, '/v/…/')).join(', '));
})();
