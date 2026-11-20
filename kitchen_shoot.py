import asyncio, os, shutil, sys
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'; F='/tmp/kframes'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
VIDEO='video' in sys.argv
async def go(pg,y,w=1200):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})"); await pg.wait_for_timeout(w)
async def sec(pg,H):
  return await pg.evaluate("()=>{const e=document.getElementById('kitchen');return [e.getBoundingClientRect().top+scrollY,e.offsetHeight]}")
async def at(pg,K,H,p,w=1500): await go(pg,K[0]+(K[1]-H)*p,w)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type=='error' else None)
    pg.on('response',lambda r: errs.append(('http',r.status,r.url)) if r.status>=400 else None)
    await pg.goto(U); await pg.wait_for_timeout(3500)
    K=await sec(pg,900)
    await go(pg,K[0]-900,1500); await go(pg,K[0]-300,2500)
    if not VIDEO:
      await pg.screenshot(path=S+'23-kitchen-enter.png')
      for name,pp in [('assembled',0.03),('mid',0.33),('late',0.55),('exploded',0.92)]:
        await at(pg,K,900,pp,2500); await pg.mouse.move(1400,880); await pg.screenshot(path=S+f'24-kitchen-kp-{name}.png')
      await pg.click('.kitchen-switch button:nth-child(2)'); await pg.wait_for_timeout(3500)
      await pg.screenshot(path=S+'25-kitchen-noodles-exploded.png')
      await at(pg,K,900,0.38,2500); await pg.screenshot(path=S+'25-kitchen-noodles-mid.png')
      await at(pg,K,900,0.03,2500); await pg.screenshot(path=S+'25-kitchen-noodles-assembled.png')
      if 'nomobile' in sys.argv: print('ERRORS',errs); await b.close(); return
      m=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
      m.on('pageerror',lambda e: errs.append(('m-pageerror',str(e))))
      m.on('response',lambda r: errs.append(('m-http',r.status,r.url)) if r.status>=400 else None)
      await m.goto(U); await m.wait_for_timeout(3500)
      MK=await sec(m,844)
      await go(m,MK[0]-600,1500)
      for name,pp in [('assembled',0.03),('mid',0.4),('exploded',0.92)]:
        await at(m,MK,844,pp,3000); await m.screenshot(path=S+f'26-kitchen-mobile-{name}.png')
      await m.tap('.kitchen-switch button:nth-child(2)'); await m.wait_for_timeout(3500)
      await m.screenshot(path=S+'26-kitchen-mobile-noodles.png')
    else:
      shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
      a=K[0]-500; c=K[0]+K[1]-900; i=0
      async def shoot():
        nonlocal i; await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=88); i+=1
      await go(pg,a,1500)
      N=170
      for k in range(N):
        t=k/(N-1); e=t*t*(3-2*t); await go(pg,a+(c-a)*e,45); await shoot()
      for k in range(15): await pg.wait_for_timeout(40); await shoot()
      await pg.mouse.move(*(await pg.evaluate("()=>{const r=document.querySelector('.kitchen-switch button:nth-child(2)').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}")))
      await pg.mouse.down(); await pg.mouse.up()
      for k in range(40): await pg.wait_for_timeout(60); await shoot()
      b0=K[0]+(K[1]-900)*0.92; b1=K[0]+(K[1]-900)*0.02
      N=110
      for k in range(N):
        t=k/(N-1); e=t*t*(3-2*t); await go(pg,b0+(b1-b0)*e,45); await shoot()
      for k in range(20): await pg.wait_for_timeout(40); await shoot()
    print('ERRORS',errs); await b.close()
asyncio.run(main())
