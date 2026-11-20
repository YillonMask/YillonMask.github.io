import asyncio, math, os, shutil
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'; F='/tmp/m2frames'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def go(pg,y,w=1200):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})"); await pg.wait_for_timeout(w)
async def main():
  shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    await pg.goto(U); await pg.wait_for_timeout(3500)
    T,H=await pg.evaluate("()=>{const r=document.querySelector('.manifesto-text').getBoundingClientRect();return [r.top+scrollY,r.height]}")
    s0=T-0.75*900; s1=T+H-0.60*900
    print('reveal scroll range px', round(s1-s0), 'para', round(H))
    y=lambda pr: int(s0+pr*(s1-s0))
    for name,pr in [('11-manifesto-entry',0.02),('12-manifesto-mid',0.5),('13-manifesto-full',1.04)]:
      await go(pg,y(pr)); await pg.mouse.move(1000,700); await pg.wait_for_timeout(200); await pg.screenshot(path=S+name+'.png')
    # stepped frames
    a=int(s0-320); c=int(s1+80); N=210
    for i in range(N):
      t=i/(N-1); e=min(1,t/0.88); e=e*e*(3-2*e)
      await go(pg,a+(c-a)*e,40)
      await pg.mouse.move(820+240*math.sin(i/24),560+80*math.cos(i/33))
      await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=90)
    await pg.close()
    # reduced motion check
    ctx=await b.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
    rp=await ctx.new_page(); await rp.goto(U); await rp.wait_for_timeout(1500)
    await rp.evaluate(f"window.scrollTo(0,{y(0.02)})"); await rp.wait_for_timeout(800)
    await rp.screenshot(path=S+'14-manifesto-reduced-motion.png')
    print('ERRORS',errs); await b.close()
asyncio.run(main())
