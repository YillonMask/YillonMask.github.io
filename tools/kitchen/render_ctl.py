import asyncio, base64, json, os, sys, time
from playwright.async_api import async_playwright
ARGS=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
dish, W, H, N, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
PROJ = open('/workspace/dt-render/proj.js').read()
SETUP = """()=>{
  __act('all'); __advance(1/30, 240);
  const A={dist:__cam.dist,pol:__cam.pol,ty:__cam.target.y,az:__cam.az};
  __act('explode'); __advance(1/30, 400);
  const B={dist:__cam.dist,pol:__cam.pol,ty:__cam.target.y};
  window.__A=A; window.__B=B;
  return [A,B];
}"""
SET = """(u)=>{
  const A=__A,B=__B, n=__parts.length;
  const cl=x=>Math.min(1,Math.max(0,x)), io=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  // parts lift bottom-up in explode order, each with its own ease; the camera pulls back alongside
  const order=[...__parts].sort((a,b)=>a.def.explodeY-b.def.explodeY);
  let maxOff=0;
  order.forEach((P,k)=>{const e=io(cl((u-0.3*k/(n-1))/0.62)); const y=P.def.explodeY*e; P.off.set(0,y,0); P.tOff.set(0,y,0); maxOff=Math.max(maxOff,y);});
  const sm=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};
  window.__asmSet=1-sm(0.03,0.6,maxOff);
  const c=io(cl((u-0.06)/0.86));
  __cam.dist=A.dist+(B.dist-A.dist)*c; __cam.tDist=__cam.dist;
  __cam.pol=A.pol+(B.pol-A.pol)*c; __cam.tPol=__cam.pol;
  __cam.target.y=A.ty+(B.ty-A.ty)*c; __cam.tTarget.y=__cam.target.y;
  __cam.az=A.az+0.4*u;
  __advance(1e-6, 1);
}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    pg=await b.new_page(viewport={'width':W,'height':H},device_scale_factor=1)
    await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#ui{visibility:hidden!important}';document.head.appendChild(s)})")
    await pg.goto(f'file:///workspace/dt-render/out/{dish}.html?record=1&noinsets=1', timeout=300000)
    await pg.wait_for_function('window.__ready',timeout=300000)
    print(await pg.evaluate(SETUP), flush=True)
    meta=[]; t0=time.time()
    for i in range(N):
      u=i/(N-1)
      await pg.evaluate(SET, u)
      d=await pg.evaluate("document.getElementById('c').toDataURL('image/jpeg',0.93)")
      open(f'{out}/{i:04d}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
      meta.append(await pg.evaluate(PROJ))
      if i%8==0: print(dish,W,i,round(time.time()-t0,1),flush=True)
    json.dump(meta[0],open(f'{out}/asm.json','w')); json.dump(meta,open(f'{out}/anchors.json','w'))
    await b.close()
asyncio.run(main())
