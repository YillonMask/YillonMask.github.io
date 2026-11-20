import asyncio, math, os, shutil, sys
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'; F='/tmp/fframes'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
VIDEO='video' in sys.argv
async def go(pg,y,w=1800):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})"); await pg.wait_for_timeout(w)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    await pg.goto(U); await pg.wait_for_timeout(3500)
    f,fh=await pg.evaluate("()=>{const e=document.getElementById('field');return [e.getBoundingClientRect().top+scrollY,e.offsetHeight]}")
    Y=lambda fr: int(f+(fh-900)*fr)
    if not VIDEO:
      await pg.mouse.move(900,450)
      for fr,name in [(0.02,'01-structure'),(0.35,'02-tolerance'),(0.64,'03-retrieval'),(0.98,'04-agency')]:
        await go(pg,Y(fr),3200); await pg.screenshot(path=S+f'18-field-{name}.png')
      m=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
      await m.goto(U); await m.wait_for_timeout(3500)
      mf,mh=await m.evaluate("()=>{const e=document.getElementById('field');return [e.getBoundingClientRect().top+scrollY,e.offsetHeight]}")
      await m.evaluate(f"window.scrollTo(0,{int(mf+(mh-844)*0.64)})"); await m.wait_for_timeout(3500)
      await m.screenshot(path=S+'18-field-03-retrieval-mobile.png')
    else:
      shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
      ease=lambda t: t*t*(3-2*t)
      ys=[]
      a=Y(0)-500
      keys=[Y(0.02),Y(0.35),Y(0.64),Y(0.98)]
      ys+= [a+(keys[0]-a)*ease(i/44) for i in range(45)]
      for j,k in enumerate(keys):
        ys+=[k]*32
        if j<3: ys+=[k+(keys[j+1]-k)*ease(i/59) for i in range(60)]
      await go(pg,a,1500)
      for i,yv in enumerate(ys):
        await go(pg,yv,30)
        await pg.mouse.move(820+240*math.sin(i/30),480+90*math.cos(i/41))
        await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=88)
    print('ERRORS',errs); await b.close()
asyncio.run(main())
