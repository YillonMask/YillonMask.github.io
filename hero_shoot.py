import asyncio, math
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.on('requestfailed',lambda r: errs.append(('reqfail',r.url)))
    await pg.goto(U); await pg.wait_for_timeout(5000)
    await pg.screenshot(path=S+'07-hero-terrain.png')
    for i in range(40):
      await pg.mouse.move(1150-i*14, 260+i*7); await pg.wait_for_timeout(16)
    await pg.wait_for_timeout(250)
    await pg.screenshot(path=S+'08-hero-terrain-mouse.png')
    print('title', await pg.title()); print('ERRORS', errs)
    await b.close()
asyncio.run(main())
