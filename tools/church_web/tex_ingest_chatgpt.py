# ChatGPT 질감 원본(PNG ~1254²) -> 심리스 보정·1024 리사이즈·노말/러프니스 유도 -> art/church_tex_src/tex_*.jpg
# 사용: python3 tools/church_web/tex_ingest_chatgpt.py <출력 폴더> <원본 PNG 폴더>   (그다음 art/church_tex_src 로 복사하고 node tools/church_web/build_texpack.mjs)
# 원본 PNG 는 저장소에 넣지 않는다(art/church_tex_src 에는 처리된 JPEG 만).
import numpy as np, sys, os
from PIL import Image
from scipy.ndimage import gaussian_filter
S=sys.argv[2].rstrip('/')+'/'   # 원본 PNG 폴더(t01.png t02.png t06.png t07.png t10.png t13.png t17.png t23.png)
OUT=sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def load(n): return np.array(Image.open(S+n).convert('RGB')).astype(np.float32)
def smooth(t): return t*t*(3-2*t)

def xfade_axis(a, b, axis):
    """seamless along axis by cross-fading the last b px with the first b px; returns size-b along axis"""
    if axis==1: return xfade_axis(a.transpose(1,0,2), b, 0).transpose(1,0,2)
    W=a.shape[0]; Wp=W-b
    out=a[:Wp].copy()
    t=smooth(np.arange(b, dtype=np.float32)/b)[:,None,None]
    # T[x] = t*img[x] + (1-t)*img[x+Wp] for x<b  -> T[0]=img[Wp] (adjacent to T[Wp-1]=img[Wp-1])
    out[:b]=t*a[:b]+(1-t)*a[Wp:Wp+b]
    return out

def resize(a, w, h=None):
    h=h or w
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8))
    return np.array(im.resize((w,h), Image.LANCZOS)).astype(np.float32)

def luma(a): return (a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114)

def normal_from_height(h, strength, blur=0.8):
    h=gaussian_filter(h, blur, mode='wrap')
    gx=(np.roll(h,-1,1)-np.roll(h,1,1))*0.5
    gy=(np.roll(h,-1,0)-np.roll(h,1,0))*0.5   # d/drow
    nx=-gx*strength; ny=gy*strength; nz=np.ones_like(h)
    l=np.sqrt(nx*nx+ny*ny+nz*nz)
    n=np.stack([nx/l,ny/l,nz/l],-1)
    return ((n*0.5+0.5)*255).astype(np.uint8)

def save_rgb(a, name, q=82):
    Image.fromarray(np.clip(a,0,255).astype(np.uint8)).save(OUT+'/'+name, 'JPEG', quality=q, optimize=True, progressive=False, subsampling=0 if q>=90 else 2)
def save_l(a, name, q=80):
    Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert('L').save(OUT+'/'+name, 'JPEG', quality=q, optimize=True)
def save_n(n, name): Image.fromarray(n).save(OUT+'/'+name, 'JPEG', quality=68, optimize=True)

def half(a): return resize(a, 512)
def norm01(x): return (x-x.min())/(x.max()-x.min()+1e-6)

# ---------- T-01 Carrara -> marble_white
a=load('t01.png')
a=xfade_axis(xfade_axis(a,300,0),300,1)
a1=resize(a,1024)
save_rgb(a1,'tex_marble_white.jpg',84)
L=luma(resize(a1,512))
# polished: low roughness, veins slightly rougher
r=0.16+0.22*np.clip((235-L)/120,0,1)
save_l(gaussian_filter(r,1.0,mode='wrap')*255,'tex_marble_white_r.jpg')
save_n(normal_from_height(L,0.5,5.0),'tex_marble_white_n.jpg')

# ---------- T-02 checker -> marble_checker : rebuilt so grout is equal everywhere
a=load('t02.png')
G=8; C=512; I=C-G
cell=a.shape[0]/2.0   # 627
groutcol=np.median(a[300:340, 623:631].reshape(-1,3),axis=0)
print('t02 grout colour',groutcol)
canvas=np.zeros((1024,1024,3),np.float32); canvas[:]=groutcol
for j in range(2):
    for i in range(2):
        x0=int(i*cell+14); x1=int((i+1)*cell-14); y0=int(j*cell+14); y1=int((j+1)*cell-14)
        t=resize(a[y0:y1,x0:x1], I)
        # placed so grout is centred on cell borders: tile occupies [i*C+G/2, (i+1)*C-G/2)
        canvas[j*C+G//2:(j+1)*C-G//2, i*C+G//2:(i+1)*C-G//2]=t
# grout: tiny noise + soften edges
rng=np.random.default_rng(2)
canvas=gaussian_filter(canvas,(0.6,0.6,0))
save_rgb(canvas,'tex_marble_checker.jpg',86)
L=luma(canvas)
mask=np.ones((1024,1024),np.float32)
for k in range(2):
    mask[k*C-G//2:k*C+G//2,:]=0; mask[:,k*C-G//2:k*C+G//2]=0
mask[:G//2,:]=0; mask[-G//2:,:]=0; mask[:,:G//2]=0; mask[:,-G//2:]=0
m5=resize(np.stack([mask*255]*3,-1),512)[...,0]/255
h=m5
save_n(normal_from_height(h,2.2,0.9),'tex_marble_checker_n.jpg')
Lh=luma(resize(canvas,512))
r=np.where(m5>0.5, 0.10+0.15*(Lh/255), 0.8)
save_l(gaussian_filter(r,0.8,mode='wrap')*255,'tex_marble_checker_r.jpg')

# ---------- T-06 travertine ashlar -> travertine (rebuilt as running bond, joints align with tile)
a=load('t06.png')
blocks=[(10,616,28,616),(638,1244,28,616),(10,566,631,1216),(638,1244,631,1216)]
slabs=[]
for (x0,x1,y0,y1) in blocks:
    mid=(y0+y1)//2
    for (ya,yb) in ((y0+2,mid-2),(mid+2,y1-2)):
        slabs.append(a[ya:yb,x0+2:x1-2])
jr=a[618:629, 40:600].reshape(-1,3); jcol=np.percentile(jr,12,axis=0)
print('t06 joint colour',jcol)
JC=jcol*0.95
rowsH=256; cw=512; jw=6
def make_strip(sl, cols):
    strip=np.zeros((rowsH,1024,3),np.float32); strip[:]=JC
    for k,s in enumerate(sl):
        t=resize(s, cw-jw, rowsH-jw)
        strip[jw//2:rowsH-jw//2, k*cw+jw//2:(k+1)*cw-jw//2]=t
    return strip
order=[[0,5],[2,7],[4,1],[6,3]]
rows=[]
for r_,o in enumerate(order):
    st=make_strip([slabs[i] for i in o],2)
    if r_%2==1: st=np.roll(st,256,axis=1)
    rows.append(st)
tr=np.concatenate(rows,0)
tr=gaussian_filter(tr,(0.5,0.5,0))
Lt=luma(tr)[...,None]
tr=Lt+(tr-Lt)*0.55
tr=tr*1.08
save_rgb(tr,'tex_travertine.jpg',84)
L=luma(resize(tr,512))
jm=np.ones((1024,1024),np.float32)
for r_ in range(4):
    jm[r_*256-3:r_*256+3,:]=0; jm[r_*256:(r_+1)*256-0,:]*=1
jm[-3:,:]=0
for r_ in range(4):
    sh=0 if r_%2==0 else 256
    for k in range(2):
        x=(k*512+sh)%1024
        for dx in range(-3,3): jm[r_*256:(r_+1)*256,(x+dx)%1024]=0
jm5=resize(np.stack([jm*255]*3,-1),512)[...,0]/255
hgt=0.65*jm5*255+0.35*L
save_n(normal_from_height(hgt,0.5,1.4),'tex_travertine_n.jpg')
r=np.where(jm5>0.5,0.55+0.25*(1-L/255),0.9)
save_l(gaussian_filter(r,0.8,mode='wrap')*255,'tex_travertine_r.jpg')

# ---------- T-07 granite ashlar -> granite
a=load('t07.png')
a=a[1:1248]            # joint centre to joint centre (periodic vertically)
a=xfade_axis(a,64,1)   # horizontal crossfade (joints are outside the band)
a1=resize(a,1024)
a1=255.0*np.power(np.clip(a1,0,255)/255.0,0.8)   # 밝게(고딕 석조가 너무 어둡지 않게)
save_rgb(a1,'tex_granite.jpg',78)
L=luma(resize(a1,512))
h=L
save_n(normal_from_height(h,0.9,2.4),'tex_granite_n.jpg')
r=0.62+0.3*np.clip((200-L)/120,0,1)
save_l(gaussian_filter(r,1.0,mode='wrap')*255,'tex_granite_r.jpg')

# ---------- T-10 walnut -> wood_dark
a=load('t10.png')
a=xfade_axis(a,300,1)
a1=resize(a,1024)
save_rgb(a1,'tex_wood_dark.jpg',82)
L=luma(resize(a1,512))
save_n(normal_from_height(L,0.9,1.5),'tex_wood_dark_n.jpg')
r=0.42+0.35*np.clip((120-L)/90,0,1)*0.6+0.12*np.clip((L-90)/100,0,1)
save_l(gaussian_filter(r,0.8,mode='wrap')*255,'tex_wood_dark_r.jpg')

# ---------- T-13 velvet (512, albedo only)
a=load('t13.png')
a=xfade_axis(xfade_axis(a,250,0),250,1)
v=luma(resize(a,512))
v=gaussian_filter(v,0.6,mode='wrap')
v=(v-v.mean())/v.std()*0.16*255*0.5+0.88*255
save_l(np.clip(v,0,255),'tex_velvet.jpg',80)

# ---------- T-17 gold leaf (512)
a=load('t17.png')
a=xfade_axis(xfade_axis(a,250,0),250,1)
g=resize(a,512)
Lg=luma(g)
gt=(Lg-Lg.mean())/Lg.std()*0.11*255+0.9*255
save_l(np.clip(gt,0,255),'tex_gold_leaf.jpg',82)
L=luma(g)
hp=L-gaussian_filter(L,6,mode='wrap')
save_n(normal_from_height(hp*2.0,1.6,1.2),'tex_gold_leaf_n.jpg')
r=0.30+0.22*np.clip(1-(L-hp*0)/255,0,1)+0.0*hp
r=0.40+0.22*norm01(-hp)
save_l(gaussian_filter(r,0.8,mode='wrap')*255,'tex_gold_leaf_r.jpg')

# ---------- T-23 mortar-joint decal (grey, 512)
a=load('t23.png')
a=a[5:1249]
a=xfade_axis(a,64,1)
g=luma(resize(a,512))
save_l(g,'tex_mortar_decal.jpg',82)
print('done')
# 용량 줄이기: 일부는 JPEG 품질을 낮춰 다시 저장(눈에 띄는 손실 없음)
for n, q in [('tex_granite.jpg', 70), ('tex_velvet.jpg', 58), ('tex_gold_leaf_n.jpg', 50), ('tex_gold_leaf.jpg', 70), ('tex_granite_n.jpg', 55), ('tex_travertine.jpg', 80)]:
    Image.open(OUT + '/' + n).save(OUT + '/' + n, 'JPEG', quality=q, optimize=True)
