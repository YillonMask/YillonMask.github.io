import asyncio, math
from playwright.async_api import async_playwright
U='http://localhost:4173/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    ctx=await b.new_context(viewport={'width':1440,'height':900},record_video_dir='/tmp/hvid',record_video_size={'width':1440,'height':900})
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(U); await pg.wait_for_timeout(2600)
    for i in range(140):
      a=i/140*math.pi*2.2
      await pg.mouse.move(860+380*math.cos(a), 450+230*math.sin(a*1.4)); await pg.wait_for_timeout(30)
    for i in range(20):
      await pg.mouse.wheel(0,40); await pg.wait_for_timeout(50)
    await pg.wait_for_timeout(900)
    for i in range(20):
      await pg.mouse.wheel(0,-40); await pg.wait_for_timeout(50)
    await pg.wait_for_timeout(1200)
    await ctx.close(); await b.close(); print('errors',errs)
asyncio.run(main())
