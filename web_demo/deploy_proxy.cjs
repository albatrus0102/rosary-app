// web_demo/deploy_proxy.cjs — 세션 프록시가 api.cloudflare.com 요청의 Authorization 을 저장된 토큰으로 덮어쓰는 환경용 배포 준비.
// wrangler 의 파일 올리기 단계(일회용 JWT)는 그 덮어쓰기 때문에 실패한다. 그래서 정적 파일은 이미 올라간 것을 같은 해시(wrangler 와 같은 blake3)로
// manifest 에서 가리키기만 하고, 확인용 목록 쪽은 _worker.js 가 바로 내준다. 정적 파일 내용이 바뀌었으면 이 길로는 안 된다(새 파일은 wrangler 로).
// 쓰임: node web_demo/deploy_proxy.cjs build/web_demo <owner 토큰> <출력 폴더>  → <출력 폴더>/manifest.json, worker.bundle
//  이어서 curl -H 'Authorization: Bearer proxy-injected' -F manifest=<…/manifest.json -F branch=main -F _headers=@build/web_demo/_headers \
//        -F _worker.bundle=@…/worker.bundle https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/rosarium-demo/deployments
//  (Node fetch 는 프록시를 거치지 않으므로 보내기는 curl 로.) 확인 후 깨졌으면 직전 배포로 rollback.
const fs=require('fs'),path=require('path');
const blake=require(path.join(__dirname,'..','server/church/node_modules/blake3-wasm'));
const [dir,ownerTok,outDir]=process.argv.slice(2);
const man={};
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);
  if(st.isDirectory()){if(p===path.join(dir,'v',ownerTok))continue;walk(p);continue}
  const rel='/'+path.relative(dir,p).split(path.sep).join('/');
  if(rel==='/_headers'||rel==='/_worker.js')continue;
  const b64=fs.readFileSync(p).toString('base64');const ext=path.extname(p).substring(1);
  man[rel]=Buffer.from(blake.hash(Buffer.from(b64+ext))).toString('hex').slice(0,32);}})(dir);
const ownerHtml=fs.readFileSync(path.join(dir,'v',ownerTok,'index.html'),'utf8');
const worker=`const OWNER=${JSON.stringify('/v/'+ownerTok+'/')};const HTML=${JSON.stringify(ownerHtml)};
function hdr(res,p){const r=new Response(res.body,res);r.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('X-Content-Type-Options','nosniff');
if(p.startsWith('/v/'))r.headers.set('Cache-Control','no-store');else if(p.startsWith('/assets/'))r.headers.set('Cache-Control','public, max-age=600');return r}
export default{async fetch(req,env){const u=new URL(req.url);let p=u.pathname;
if(p===OWNER||p===OWNER.slice(0,-1)||p===OWNER+'index.html')return hdr(new Response(HTML,{headers:{'content-type':'text/html; charset=utf-8'}}),'/v/');
return hdr(await env.ASSETS.fetch(req),p)}}`;
(async()=>{
  const bundle=new FormData();
  bundle.set('metadata',JSON.stringify({main_module:'_worker.js'}));
  bundle.set('_worker.js',new File([worker],'_worker.js',{type:'application/javascript+module'}));
  const bundleBlob=await new Response(bundle).blob();
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(man));
  fs.writeFileSync(path.join(outDir,'worker.bundle'),Buffer.from(await bundleBlob.arrayBuffer()));
  console.log('ready',Object.keys(man).length);
})();
