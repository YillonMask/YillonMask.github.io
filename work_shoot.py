import asyncio, math, os, shutil, sys
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'; F='/tmp/wframes'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
VIDEO='video' in sys.argv
async def go(pg,y,w=1500):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})"); await pg.wait_for_timeout(w)
async def card_center(pg, idx):
  return await pg.evaluate(f"()=>{{const r=document.querySelectorAll('.work .cover')[{idx}].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height*0.35,r.left,r.right]}}")
async def scroll_card_into(pg, W, idx, target_x=720):
  # find scroll so that card idx center sits at target_x
  w,wh=W
  lo,hi=w,w+wh-900
  for _ in range(18):
    mid=(lo+hi)/2; await go(pg,mid,120)
    c=await card_center(pg,idx)
    if c[0]>target_x: lo=mid
    else: hi=mid
  await go(pg,(lo+hi)/2,900)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.on('requestfailed',lambda r: errs.append(('reqfail',r.url)))
    await pg.goto(U); await pg.wait_for_timeout(3500)
    W=await pg.evaluate("()=>{const e=document.getElementById('work');return [e.getBoundingClientRect().top+scrollY,e.offsetHeight]}")
    if not VIDEO:
      await go(pg,W[0]+40,2000); await pg.mouse.move(200,850); await pg.screenshot(path=S+'19-work-entry.png')
      for idx,name in [(0,'astreas'),(2,'agent-teams'),(3,'fish-recovery')]:
        await scroll_card_into(pg,W,idx,820 if idx else 900)
        c=await card_center(pg,idx)
        await pg.mouse.move(c[0]-60,c[1]); await pg.wait_for_timeout(100)
        for k in range(12): await pg.mouse.move(c[0]-60+k*8,c[1]+k*3); await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(1800)
        await pg.screenshot(path=S+f'20-work-hover-{name}.png')
        await pg.mouse.move(100,860); await pg.wait_for_timeout(600)
      await go(pg,W[0]+W[1]-900,2000); await pg.screenshot(path=S+'21-work-end.png')
      vid=await pg.evaluate("()=>{const v=document.querySelector('.work video');return v?{ready:v.readyState,err:v.error&&v.error.code,src:v.currentSrc}:null}")
      print('video',vid)
      m=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
      m.on('pageerror',lambda e: errs.append(('m-pageerror',str(e))))
      await m.goto(U); await m.wait_for_timeout(3500)
      MW=await m.evaluate("()=>{const e=document.getElementById('work');return [e.getBoundingClientRect().top+scrollY,e.offsetHeight]}")
      await go(m,int(MW[0]+(MW[1]-844)*0.5),2500); await m.wait_for_timeout(2500)
      await m.screenshot(path=S+'22-work-mobile.png')
      if 1:
        pass
      c=await m.evaluate("()=>{const r=[...document.querySelectorAll('.work .cover')].map(e=>e.getBoundingClientRect()).sort((a,b)=>Math.abs(a.left+a.width/2-195)-Math.abs(b.left+b.width/2-195))[0];return r?[r.left+r.width/2,r.top+r.height/2]:null}")
      if c: await m.touchscreen.tap(c[0],c[1]); await m.wait_for_timeout(1200); await m.screenshot(path=S+'22-work-mobile-tap.png')
    else:
      shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
      a=W[0]-300; c=W[0]+W[1]-900; N=330
      await go(pg,a,1500); i=0
      hover_at={70:0,165:2,235:3}
      for i in range(N):
        t=i/(N-1); e=t*t*(3-2*t)
        await go(pg,a+(c-a)*e,25)
        cc=None
        for k,idx in hover_at.items():
          if k<=i<k+38:
            cc=await card_center(pg,idx)
        if cc: await pg.mouse.move(cc[0]-30+ (i%38)*2, cc[1])
        else: await pg.mouse.move(150,860)
        await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=88)
    print('ERRORS',errs); await b.close()
asyncio.run(main())
