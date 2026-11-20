import asyncio, math, glob, os
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    ctx=await b.new_context(viewport={'width':1440,'height':900},record_video_dir='/tmp/vid',record_video_size={'width':1440,'height':900})
    pg=await ctx.new_page()
    errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(U)
    await pg.wait_for_timeout(2300)
    # hero: sweep mouse through the field
    for i in range(70):
      a=i/70*math.pi*2
      await pg.mouse.move(820+330*math.cos(a), 430+190*math.sin(a*1.5)); await pg.wait_for_timeout(28)
    t=0
    async def wheel(total, step=100, mx=None):
      nonlocal t
      n=int(total/step)
      for k in range(n):
        t+=1
        x = mx if mx else 720+380*math.sin(t/9); y=450+180*math.cos(t/13)
        await pg.mouse.move(x,y)
        await pg.mouse.wheel(0,step); await pg.wait_for_timeout(55)
    await wheel(1900)             # manifesto + marquee
    await wheel(3800, 90)         # field morph
    await wheel(1100)             # into work
    # hover a card mid-horizontal
    box=await pg.evaluate("()=>{const r=[...document.querySelectorAll('.card-img')].map(e=>e.getBoundingClientRect()).find(r=>r.left>300&&r.right<1300);return r?[r.left+r.width/2,r.top+r.height/2]:null}")
    if box:
      for i in range(30): await pg.mouse.move(box[0]-80+i*5,box[1]-60+i*4); await pg.wait_for_timeout(30)
    await wheel(2100, 100, mx=box[0] if box else None)
    await wheel(1000)             # index
    for i in range(30): await pg.mouse.move(500+i*8, 300+i*7); await pg.wait_for_timeout(35)
    await wheel(1300)
    for i in range(25): await pg.mouse.move(1100+i*4, 260+i*2); await pg.wait_for_timeout(35)
    await pg.wait_for_timeout(1500)
    await ctx.close(); await b.close()
    print('errors', errs)
asyncio.run(main())
