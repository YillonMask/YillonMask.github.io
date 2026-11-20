import asyncio, math
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    ctx=await b.new_context(viewport={'width':1440,'height':900},record_video_dir='/tmp/qvid',record_video_size={'width':1440,'height':900})
    pg=await ctx.new_page(); errs=[]
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    await pg.goto(U); await pg.wait_for_timeout(3200)
    M=await pg.evaluate("()=>{const r=document.querySelector('.marquee').getBoundingClientRect();return [r.top+scrollY,r.height]}")
    y=int(M[0]+M[1]/2-450)
    await pg.evaluate(f"window.__lenis.scrollTo({y-260},{{immediate:true}})"); await pg.wait_for_timeout(1500)
    await pg.evaluate("window.__rec0=performance.now()")
    for k in range(26):
      await pg.mouse.move(600+300*math.sin(k/6),300); await pg.mouse.wheel(0,10); await pg.wait_for_timeout(60)
    await pg.wait_for_timeout(1500)
    await pg.screenshot(path=S+'15-marquee.png')
    for k in range(20):
      await pg.mouse.wheel(0,-12); await pg.wait_for_timeout(60)
    await pg.wait_for_timeout(2000)
    await ctx.close(); await b.close(); print('ERRORS',errs)
asyncio.run(main())
