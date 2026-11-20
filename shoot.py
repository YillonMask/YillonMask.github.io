import asyncio, sys
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def scroll_to(pg, y, wait=1500):
  await pg.evaluate(f"window.__lenis ? window.__lenis.scrollTo({y},{{immediate:true}}) : window.scrollTo(0,{y})")
  await pg.wait_for_timeout(wait)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append(('console',m.type,m.text)) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.on('requestfailed',lambda r: errs.append(('reqfail',r.url)))
    await pg.goto(U); await pg.wait_for_timeout(1000)
    await pg.screenshot(path=S+'00-preloader.png')
    await pg.wait_for_timeout(3200)
    for i in range(30):
      await pg.mouse.move(700+i*12,300+i*6); await pg.wait_for_timeout(16)
    await pg.wait_for_timeout(400)
    await pg.screenshot(path=S+'01-hero.png')
    H=await pg.evaluate("()=>{const o={};for(const id of ['field','work','index','contact']){const e=document.getElementById(id);o[id]=[e.getBoundingClientRect().top+scrollY,e.offsetHeight]};o.manifesto=document.querySelector('.manifesto').offsetTop;o.total=document.documentElement.scrollHeight;return o}")
    print(H)
    await scroll_to(pg, H['manifesto']+250); await pg.screenshot(path=S+'02-manifesto.png')
    f,fh=H['field']
    for k,fr in enumerate([0.36,0.66,0.98]):
      await scroll_to(pg, f+int((fh-900)*fr), 2500); await pg.mouse.move(900,400); await pg.screenshot(path=S+f'03-field-{k}.png')
    w,wh=H['work']
    await scroll_to(pg, w+int((wh-900)*0.3), 1500)
    await pg.mouse.move(800,450); await pg.wait_for_timeout(200)
    box=await pg.evaluate("()=>{const r=[...document.querySelectorAll('.card-img')].map(e=>e.getBoundingClientRect()).find(r=>r.left>200&&r.right<1300);return r?[r.left+r.width/2,r.top+r.height/2]:null}")
    if box:
      await pg.mouse.move(box[0]-40,box[1]-40); await pg.wait_for_timeout(100)
      for i in range(20): await pg.mouse.move(box[0]-40+i*4,box[1]-40+i*4); await pg.wait_for_timeout(30)
      await pg.wait_for_timeout(700)
    await pg.screenshot(path=S+'04-work.png')
    i,ih=H['index']
    await scroll_to(pg, i+100, 1500)
    await pg.mouse.move(600,300); await pg.wait_for_timeout(100); await pg.mouse.move(700,480); await pg.wait_for_timeout(1000)
    await pg.screenshot(path=S+'05-index.png')
    await scroll_to(pg, H['total']-900, 2500)
    await pg.mouse.move(1200,400); await pg.wait_for_timeout(500)
    await pg.screenshot(path=S+'06-footer.png')
    print('ERRORS:',errs)
    await b.close()
asyncio.run(main())
