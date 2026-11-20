import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { DISHES, type Dish } from '../data/kitchen'

// Scroll-scrubbed dish teardown. Frames are rendered offline with Xinrui's own three.js teardown engine
// (dish-teardown); anchors.json holds each ingredient's projected centre + screen bbox for every frame,
// so the mono labels and leader lines track the real geometry as the dish comes apart.

type Seq = { n: number; w: number; h: number; ids: string[]; a: number[][][]; imgs: (HTMLImageElement | null)[] }
const base = import.meta.env.BASE_URL
const cache = new Map<string, Promise<Seq>>()

function loadSeq(dir: string): Promise<Seq> {
  if (cache.has(dir)) return cache.get(dir)!
  const p = fetch(`${base}kitchen/${dir}/anchors.json`).then((r) => { if (!r.ok) throw new Error(dir); return r.json() }).then((meta) => {
    const seq: Seq = { ...meta, imgs: new Array(meta.n).fill(null) }
    // first + last first, then fill in by halving so any scroll position soon has a near frame
    const order: number[] = [0, meta.n - 1]
    for (let step = meta.n >> 1; step >= 1; step >>= 1) for (let i = step; i < meta.n; i += step) if (!order.includes(i)) order.push(i)
    let k = 0
    const next = () => {
      if (k >= order.length) return
      const i = order[k++]
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => { seq.imgs[i] = img; next() }
      img.onerror = () => next()
      img.src = `${base}kitchen/${dir}/${String(i).padStart(3, '0')}.webp`
    }
    for (let c = 0; c < 4; c++) next()
    return seq
  }).catch((e) => { cache.delete(dir); if (dir.endsWith('_m')) return loadSeq(dir.slice(0, -2)); throw e })
  cache.set(dir, p)
  return p
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }

export default function Kitchen() {
  const reduced = !!useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const labelEls = useRef<(HTMLDivElement | null)[]>([])
  const bar = useRef<HTMLElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const [di, setDi] = useState(0)
  const [near, setNear] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const dish: Dish = DISHES[di]
  const seqRef = useRef<Seq | null>(null)
  const target = useRef(0)
  const cur = useRef(0)
  const colX = useRef(0)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '150% 0px' })
    io.observe(section.current!)
    return () => io.disconnect()
  }, [])

  const draw = useCallback(() => {
    const seq = seqRef.current, cv = canvas.current, st = stage.current
    if (!seq || !cv || !st) return
    const W = st.clientWidth, H = st.clientHeight
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
    const ctx = cv.getContext('2d')!
    // frame placement: cover-fit, scaled so the dish sits right of the copy on desktop, low and centred on phones
    const fa = seq.w / seq.h
    let dw: number, dh: number, x0: number, y0: number
    if (mobile) { dw = W * 1.3; dh = dw / fa; x0 = W * (0.5 - 0.15 * smooth(0.05, 0.5, cur.current)) - dw / 2; y0 = (H - dh) / 2 + H * 0.07 }
    else { dh = Math.max(H, (W * 1.16) / fa); dw = dh * fa; x0 = W * 0.58 - dw / 2; y0 = (H - dh) / 2 }
    const f = cur.current * (seq.n - 1)
    const i0 = Math.floor(f), i1 = Math.min(seq.n - 1, i0 + 1), t = f - i0
    const pick = (i: number) => { for (let d = 0; d < seq.n; d++) { const a = seq.imgs[i - d], b = seq.imgs[i + d]; if (a) return a; if (b) return b } return null }
    const A = pick(i0), B = pick(i1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#060605'
    ctx.fillRect(0, 0, W, H)
    if (A) { ctx.globalAlpha = 1; ctx.drawImage(A, x0, y0, dw, dh) }
    if (B && B !== A && t > 0.01) { ctx.globalAlpha = t; ctx.drawImage(B, x0, y0, dw, dh) }
    ctx.globalAlpha = 1

    // anchors, interpolated between the two frames
    const a0 = seq.a[i0], a1 = seq.a[i1]
    const n = dish.parts.length
    type L = { i: number; ax: number; ay: number; rx: number; y: number; o: number }
    const ls: L[] = []
    for (let k = 0; k < n; k++) {
      const j = seq.ids.indexOf(dish.parts[k].id)
      if (j < 0) continue
      const v = a0[j].map((x, m) => x + (a1[j][m] - x) * t)
      const cx = x0 + v[0] * dw, cy = y0 + v[1] * dh, r = x0 + v[4] * dw
      // a layer is labelled once it has lifted off the dish; the vessel (which never moves) last
      const uk = (0.3 * k) / Math.max(1, n - 1) // matches the per-layer lift stagger used when rendering
      const staged = smooth(uk + 0.1, uk + 0.24, cur.current)
      const o = k === 0 ? smooth(0.82, 0.97, cur.current) : staged
      ls.push({ i: k, ax: cx + (r - cx) * (mobile ? 0.55 : 0.7), ay: cy, rx: r, y: cy, o })
    }
    // label column just right of the widest layer
    const lw = Math.min(mobile ? 150 : 340, Math.max(mobile ? 100 : 220, ...labelEls.current.slice(0, n).map((e) => e?.offsetWidth ?? 0)))
    const body = ls.filter((l) => l.i > 0) // the vessel's label sits under the stack; it doesn't set the column
    let want = (body.length ? Math.max(...body.map((l) => l.rx)) : W * 0.7) + (mobile ? 14 : 44)
    const maxX = W - lw - (mobile ? 6 : 20)
    // while the whole dish is still too wide for a label column beside it, keep the labels back
    const room = Math.max(1 - smooth(0, mobile ? 30 : 60, want - maxX), smooth(0.7, 0.85, cur.current))
    want = Math.min(want, maxX)
    colX.current = colX.current ? colX.current + (want - colX.current) * 0.25 : want
    const X = colX.current
    // de-overlap vertically
    const gap = mobile ? 30 : 44, top = mobile ? H * 0.3 : 70, bottom = H - (mobile ? 70 : 80)
    const sorted = [...ls].sort((p, q) => p.y - q.y)
    for (let k = 1; k < sorted.length; k++) sorted[k].y = Math.max(sorted[k].y, sorted[k - 1].y + gap)
    if (sorted.length && sorted[sorted.length - 1].y > bottom) {
      sorted[sorted.length - 1].y = bottom
      for (let k = sorted.length - 2; k >= 0; k--) sorted[k].y = Math.min(sorted[k].y, sorted[k + 1].y - gap)
    }
    for (const l of sorted) l.y = Math.max(l.y, top)
    let paths = ''
    let shown = 0
    for (const l of ls) {
      const el = labelEls.current[l.i]
      if (!el) continue
      l.o *= room
      el.style.opacity = l.o.toFixed(3)
      el.style.transform = `translate(${X.toFixed(1)}px, ${(l.y - 9).toFixed(1)}px)`
      if (l.o > 0.5) shown++
      if (l.o > 0.02) {
        const ex = X - 8
        paths += `<g opacity="${l.o.toFixed(3)}"><path d="M${l.ax.toFixed(1)},${l.ay.toFixed(1)} L${(ex - 18).toFixed(1)},${l.y.toFixed(1)} L${ex.toFixed(1)},${l.y.toFixed(1)}"/><circle cx="${l.ax.toFixed(1)}" cy="${l.ay.toFixed(1)}" r="3"/></g>`
      }
    }
    if (svg.current) svg.current.innerHTML = paths
    if (bar.current) bar.current.style.transform = `scaleX(${cur.current.toFixed(4)})`
    if (count.current) count.current.textContent = `${String(shown).padStart(2, '0')} / ${String(n).padStart(2, '0')}`
  }, [dish, mobile])

  // load the active sequence (phones get the portrait render)
  useEffect(() => {
    if (!near) return
    let live = true
    const dir = dish.dir + (mobile ? '_m' : '')
    loadSeq(dir).then((s) => {
      if (!live) return
      seqRef.current = s
      const wait = () => { if (!live) return; if (s.imgs[0]) { draw(); canvas.current?.classList.remove('is-swapping') } else requestAnimationFrame(wait) }
      wait()
    })
    return () => { live = false }
  }, [near, dish, mobile, draw])

  const mapScroll = (p: number) => smooth(0.04, 0.82, p)
  useMotionValueEvent(scrollYProgress, 'change', (p) => { target.current = mapScroll(p) })

  useEffect(() => {
    if (!near) return
    let raf = 0
    target.current = mapScroll(scrollYProgress.get())
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const d = target.current - cur.current
      if (Math.abs(d) < 0.0005 && seqRef.current?.imgs.every(Boolean)) { if (d !== 0) { cur.current = target.current; draw() } return }
      cur.current += reduced ? d : d * 0.16
      draw()
    }
    raf = requestAnimationFrame(loop)
    const onR = () => draw()
    window.addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR) }
  }, [near, draw, reduced, scrollYProgress])

  const choose = (k: number) => {
    if (k === di) return
    canvas.current?.classList.add('is-swapping')
    colX.current = 0
    window.setTimeout(() => setDi(k), 220)
  }

  return (
    <section className="kitchen" id="kitchen" ref={section}>
      <div className="kitchen-sticky" ref={stage}>
        <canvas ref={canvas} className="kitchen-canvas" aria-hidden />
        <svg ref={svg} className="kitchen-leaders" aria-hidden />
        <div className="kitchen-labels">
          {dish.parts.map((p, k) => (
            <div key={dish.id + p.id} className={`k-label ${k === 0 ? 'is-vessel' : ''}`} ref={(el) => { labelEls.current[k] = el }}>
              <span className="mono k-n">{String(k + 1).padStart(2, '0')}</span>
              <span className="k-body">
                <span className="k-name"><b>{p.en}</b><i className="zh">{p.zh}</i>{p.tag && <em className="zh k-tag">{p.tag}</em>}</span>
                <span className="mono k-meta"><i style={{ background: p.swatch }} />{p.amount}<span className="k-role"> · {p.role}</span></span>
              </span>
            </div>
          ))}
        </div>

        <div className="label mono light kitchen-label"><span>(05)</span><span>Kitchen — taken apart, scroll</span></div>
        <div className="kitchen-copy">
          <h2><span className="g">Kitchen</span><br /><em className="serif">taken apart</em></h2>
          <p className="kitchen-intro">From my kitchen: dishes built procedurally in three.js — no scans, no textures — then exploded layer by layer into what goes in, what it does, and roughly how much.</p>
          <div className="kitchen-dish" key={dish.id}>
            <div className="zh kitchen-zh">{dish.zh}</div>
            <div className="serif kitchen-en">{dish.en}</div>
            {dish.rule && <div className="zh kitchen-rule">{dish.rule}</div>}
            <p className="kitchen-blurb">{dish.blurb}</p>
          </div>
          <div className="kitchen-switch mono" role="tablist">
            {DISHES.map((d, k) => (
              <button key={d.id} role="tab" aria-selected={k === di} className={k === di ? 'on' : ''} onClick={() => choose(k)} data-cursor="Swap">
                <span>0{k + 1}</span>{d.en}
              </button>
            ))}
          </div>
        </div>

        <div className="kitchen-foot mono">
          <span className="k-state">Assembled</span>
          <span className="k-bar"><i ref={bar} /></span>
          <span className="k-state">Exploded</span>
          <span className="k-count" ref={count}>00 / 0{dish.parts.length}</span>
        </div>
        <div className="kitchen-note mono">
          <span>Amounts are rough home-style estimates, not a recipe.</span>
          <a href="https://github.com/YillonMask/dish-teardown" target="_blank" rel="noopener" data-cursor="Open">dish-teardown ↗</a>
        </div>
      </div>
    </section>
  )
}
