import asyncio, math
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def go(pg,y,w=1500):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})"); await pg.wait_for_timeout(w)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    for vw,vh,tag in [(1440,900,''),(390,844,'-mobile')]:
      pg=await b.new_page(viewport={'width':vw,'height':vh})
      pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
      pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
      await pg.goto(U); await pg.wait_for_timeout(3500)
      T,H=await pg.evaluate("()=>{const r=document.querySelector('.manifesto-text').getBoundingClientRect();return [r.top+scrollY,r.height]}")
      y=lambda pr: int(T-0.85*vh+pr*(H+0.15*vh))
      await go(pg,y(0.5)); await pg.mouse.move(vw*0.7,vh*0.6); await pg.screenshot(path=S+f'09-manifesto-mid{tag}.png')
      await go(pg,y(1.08)); await pg.screenshot(path=S+f'10-manifesto-full{tag}.png')
      await pg.close()
    print('ERRORS',errs)
    # recording
    ctx=await b.new_context(viewport={'width':1440,'height':900},record_video_dir='/tmp/mvid',record_video_size={'width':1440,'height':900})
    pg=await ctx.new_page(); await pg.goto(U); await pg.wait_for_timeout(3000)
    await go(pg,500,600)
    for k in range(60):
      await pg.mouse.move(720+300*math.sin(k/8),500+120*math.cos(k/11))
      await pg.mouse.wheel(0,19); await pg.wait_for_timeout(60)
    await pg.wait_for_timeout(1200)
    await ctx.close(); await b.close()
asyncio.run(main())
