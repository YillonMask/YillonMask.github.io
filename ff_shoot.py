import asyncio, os, shutil, sys
from playwright.async_api import async_playwright
U='http://localhost:4173/'; S='/workspace/cool-demo/shots/'; F='/tmp/fframes'
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    errs=[]
    pg=await b.new_page(viewport={'width':1440,'height':900})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('response',lambda r: errs.append((r.status,r.url)) if r.status>=400 else None)
    await pg.goto(U); await pg.wait_for_timeout(4500)
    await pg.mouse.move(1180,40); await pg.wait_for_timeout(600)
    await pg.screenshot(path=S+'27-hero-nav.png')
    await pg.screenshot(path=S+'27-hero-nav-crop.png',clip={'x':0,'y':0,'width':1440,'height':140})
    # click Kitchen -> lenis smooth scroll
    await pg.click('.nav-links a[href="#kitchen"]'); await pg.wait_for_timeout(2600)
    y=await pg.evaluate("[scrollY, document.getElementById('kitchen').getBoundingClientRect().top+scrollY]"); print('kitchen nav',y)
    await pg.evaluate("window.__lenis.scrollTo(0,{immediate:true})"); await pg.wait_for_timeout(500)
    await pg.click('.nav-links a[href="#contact"]'); await pg.wait_for_timeout(3000)
    H=await pg.evaluate("document.documentElement.scrollHeight")
    await pg.evaluate(f"window.__lenis.scrollTo({H},{{immediate:true}})"); await pg.wait_for_timeout(2500)
    await pg.screenshot(path=S+'28-footer.png')
    await pg.hover('.cta-circle'); await pg.wait_for_timeout(800); await pg.screenshot(path=S+'28-footer-hover.png')
    print('mailto', await pg.get_attribute('.cta-circle','href'))
    print('links', await pg.eval_on_selector_all('.footer a','els=>els.map(e=>e.getAttribute("href"))'))
    if 'video' in sys.argv:
      shutil.rmtree(F,ignore_errors=True); os.makedirs(F)
      ft=await pg.evaluate("document.getElementById('contact').getBoundingClientRect().top+scrollY")
      a=ft-900; c=H-900; N=150
      for i in range(N):
        t=i/(N-1); e=t*t*(3-2*t)
        await pg.evaluate(f"window.__lenis.scrollTo({a+(c-a)*e},{{immediate:true}})"); await pg.wait_for_timeout(30)
        await pg.screenshot(path=f'{F}/{i:04d}.jpg',type='jpeg',quality=88)
      cx,cy=await pg.evaluate("(()=>{const r=document.querySelector('.cta-circle').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
      for k in range(45):
        await pg.mouse.move(cx-140+k*3.2, cy-40+k*0.9); await pg.wait_for_timeout(30)
        await pg.screenshot(path=f'{F}/{N+k:04d}.jpg',type='jpeg',quality=88)
    m=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    await m.goto(U); await m.wait_for_timeout(4500)
    await m.screenshot(path=S+'29-mobile-hero.png')
    await m.tap('.nav-toggle'); await m.wait_for_timeout(800); await m.screenshot(path=S+'29-mobile-menu.png')
    await m.tap('.nav-sheet a[href="#contact"]'); await m.wait_for_timeout(3500)
    MH=await m.evaluate("document.documentElement.scrollHeight")
    ft=await m.evaluate("document.getElementById('contact').getBoundingClientRect().top+scrollY")
    await m.evaluate(f"window.scrollTo(0,{ft})"); await m.wait_for_timeout(1500); await m.screenshot(path=S+'29-mobile-footer-top.png')
    await m.evaluate(f"window.scrollTo(0,{MH})"); await m.wait_for_timeout(2000); await m.screenshot(path=S+'29-mobile-footer.png')
    print('ERR',errs); await b.close()
asyncio.run(main())
