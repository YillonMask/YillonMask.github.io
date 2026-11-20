import asyncio, math, os, shutil
from playwright.async_api import async_playwright
U='http://localhost:4173/'; F='/tmp/mframes'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    pg=await b.new_page(viewport={'width':1440,'height':900})
    await pg.goto(U); await pg.wait_for_timeout(3500)
    T,H=await pg.evaluate("()=>{const r=document.querySelector('.manifesto-text').getBoundingClientRect();return [r.top+scrollY,r.height]}")
    y0=int(T-900*0.95); y1=int(T-0.85*900+1.12*(H+0.15*900))
    N=200
    for i in range(N):
      t=i/(N-1)
      if t<0.85: e=t/0.85; e=e*e*(3-2*e)
      else: e=1
      y=y0+(y1-y0)*e
      await pg.evaluate(f"window.__lenis.scrollTo({y},{{immediate:true}})")
      await pg.mouse.move(760+260*math.sin(i/22),520+90*math.cos(i/31))
      await pg.wait_for_timeout(40)
      await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=90)
    await b.close()
asyncio.run(main())
