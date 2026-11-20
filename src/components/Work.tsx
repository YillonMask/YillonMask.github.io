import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'
import WorkCovers, { type CoverState } from '../gl/WorkCovers'
import { PROJECTS, type Project, type Step } from '../data/projects'

function Flow({ p }: { p: Project }) {
  const row = (s: Step, k: number) => (
    <span className="flow-node" key={k}><b>{s.t}</b>{s.s && <i>{s.s}</i>}</span>
  )
  return (
    <div className="flow mono">
      {p.flow.map((st, i) => (
        <div className="flow-step" key={i}>
          {i > 0 && <span className="flow-arrow" aria-hidden />}
          {Array.isArray(st) ? <div className="flow-fan">{st.map(row)}</div> : row(st, 0)}
        </div>
      ))}
      <p className="flow-cap">{p.flowCaption}</p>
    </div>
  )
}

function Card({ p, i, state, hoverable, dragged }: { p: Project; i: number; state: CoverState; hoverable: boolean; dragged: RefObject<boolean> }) {
  const cover = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [on, setOn] = useState(false)
  const primary = p.links[0]

  useEffect(() => { state.el = cover.current }, [state])
  const set = (v: boolean) => {
    setOn(v)
    state.target = v ? 1 : 0
    const vid = video.current
    if (vid) {
      if (v) { vid.play().catch(() => {}) } else { vid.pause() }
    }
  }
  const open = () => primary && window.open(primary.href, '_blank', 'noopener')

  return (
    <article
      className={`card ${on ? 'is-on' : ''} ${primary ? 'is-link' : ''}`}
      data-cursor={primary ? (p.video ? 'Watch' : 'Open') : undefined}
      onPointerEnter={() => hoverable && set(true)}
      onPointerLeave={() => hoverable && set(false)}
      onPointerMove={(e) => {
        const r = cover.current!.getBoundingClientRect()
        state.mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]
      }}
      onClick={() => {
        if (dragged.current) return
        if (!hoverable && !on) { set(true); return }
        open()
      }}
      role={primary ? 'link' : undefined}
      tabIndex={primary ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter') open() }}
      onFocus={() => hoverable && set(true)}
      onBlur={() => hoverable && set(false)}
    >
      <div className="card-meta mono"><span>0{i + 1}</span><span className="card-role">{p.role}</span><span>{p.year}</span></div>
      <div className="cover" ref={cover}>
        {p.video ? (
          <div className="cover-video">
            <video ref={video} src={p.video.src} poster={p.video.poster} muted loop playsInline preload="metadata" />
            <span className="mono video-tag"><i /> Demo · muted</span>
          </div>
        ) : (
          <div className="cover-reveal"><Flow p={p} /></div>
        )}
        <div className="cover-text">
          <h3>{p.name}</h3>
          <p>{p.desc}</p>
          <ul className="tags mono">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
      <div className="card-foot mono">
        <span className="metric">{p.metric}</span>
        <span className="links">
          {p.links.length === 0 && <span className="dim">Internship · no public repo</span>}
          {p.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener" draggable={false} onClick={(e) => { e.stopPropagation(); if (dragged.current) e.preventDefault() }}>{l.label} ↗</a>
          ))}
        </span>
      </div>
    </article>
  )
}

export default function Work() {
  const reduced = !!useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  const bgTitle = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)
  const [edges, setEdges] = useState<[boolean, boolean]>([true, false])
  const [hoverable] = useState(() => window.matchMedia('(hover: hover)').matches)
  const covers = useRef<CoverState[]>(PROJECTS.map((p, i) => ({ el: null, motif: p.motif, seed: i * 3.7, hover: 0, target: 0, mouse: [0.5, 0.5] })))

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px 0px' })
    io.observe(section.current!)
    return () => io.disconnect()
  }, [])

  const cards = () => Array.from(track.current?.querySelectorAll<HTMLElement>('.card') ?? [])
  const snapX = (el: HTMLElement) => el.offsetLeft - (track.current ? parseFloat(getComputedStyle(track.current).scrollPaddingLeft) || 0 : 0)

  // progress readout: active card = the one nearest the snap edge
  const onScroll = useCallback(() => {
    const t = track.current
    if (!t) return
    const max = Math.max(1, t.scrollWidth - t.clientWidth)
    const p = t.scrollLeft / max
    if (bar.current) bar.current.style.transform = `scaleX(${(0.08 + 0.92 * p).toFixed(4)})`
    if (bgTitle.current) bgTitle.current.style.transform = `translateX(${(-p * 22).toFixed(2)}%)`
    const cs = cards()
    let best = 0, bd = Infinity
    cs.forEach((c, k) => { const d = Math.abs(snapX(c) - t.scrollLeft); if (d < bd) { bd = d; best = k } })
    if (t.scrollLeft >= max - 4) best = cs.length - 1
    setIdx(best)
    setEdges([t.scrollLeft <= 4, t.scrollLeft >= max - 4])
  }, [])
  useEffect(() => { onScroll(); window.addEventListener('resize', onScroll); return () => window.removeEventListener('resize', onScroll) }, [onScroll])

  const go = useCallback((k: number) => {
    const t = track.current, cs = cards()
    if (!t || !cs.length) return
    const n = Math.max(0, Math.min(cs.length - 1, k))
    t.scrollTo({ left: snapX(cs[n]), behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  // mouse drag (touch and trackpad use native horizontal scrolling)
  useEffect(() => {
    const t = track.current!
    let down = false, x0 = 0, s0 = 0, lastX = 0, lastT = 0, v = 0, id = -1
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      down = true; dragged.current = false; x0 = lastX = e.clientX; s0 = t.scrollLeft; lastT = performance.now(); v = 0; id = e.pointerId
    }
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== id) return
      const dx = e.clientX - x0
      if (!dragged.current && Math.abs(dx) > 6) {
        dragged.current = true
        t.classList.add('is-dragging')
        t.setPointerCapture(id)
      }
      if (!dragged.current) return
      t.scrollLeft = s0 - dx
      const now = performance.now(), dt = Math.max(1, now - lastT)
      v = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * v
      lastX = e.clientX; lastT = now
    }
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== id) return
      down = false
      if (!dragged.current) return
      t.classList.remove('is-dragging')
      if (t.hasPointerCapture(id)) t.releasePointerCapture(id)
      // fling, then let scroll-snap settle on the nearest card
      t.scrollTo({ left: t.scrollLeft - v * 260, behavior: reduced ? 'auto' : 'smooth' })
      window.setTimeout(() => { dragged.current = false }, 60)
    }
    t.addEventListener('pointerdown', onDown)
    t.addEventListener('pointermove', onMove)
    t.addEventListener('pointerup', onUp)
    t.addEventListener('pointercancel', onUp)
    return () => {
      t.removeEventListener('pointerdown', onDown)
      t.removeEventListener('pointermove', onMove)
      t.removeEventListener('pointerup', onUp)
      t.removeEventListener('pointercancel', onUp)
    }
  }, [reduced])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(PROJECTS.length) }
  }
  const total = PROJECTS.length
  const shown = Math.min(idx, total - 1) + 1

  return (
    <section className="work" id="work" ref={section}>
      <div className="label mono"><span>(04)</span><span>Selected work — 2024/26</span></div>
      <div className="work-bg-title" ref={bgTitle} aria-hidden>Selected&nbsp;work&nbsp;Selected&nbsp;work</div>
      <div className="work-head">
        <div className="work-intro">
          <h2><span className="g">Selected</span> <em className="serif">work</em><sup className="mono">(0{total})</sup></h2>
          <p>Most of this lives in code, not screenshots — so each cover is drawn from what the system does. Hover for the architecture; click through to the code or demo.</p>
        </div>
        <div className="work-controls mono">
          <span className="work-count" aria-live="polite"><b>{String(shown).padStart(2, '0')}</b> / {String(total).padStart(2, '0')}</span>
          <span className="work-bar" aria-hidden><i ref={bar} /></span>
          <div className="work-arrows">
            <button aria-label="Previous project" onClick={() => go(idx - 1)} disabled={edges[0]} data-cursor="Prev">←</button>
            <button aria-label="Next project" onClick={() => go(idx + 1)} disabled={edges[1]} data-cursor="Next">→</button>
          </div>
          <span className="work-hint">Drag · swipe · ← →</span>
        </div>
      </div>
      <div className="work-rail" ref={rail}>
        <WorkCovers covers={covers} active={active} reduced={reduced} />
        <div
          className="work-track"
          ref={track}
          onScroll={onScroll}
          onKeyDown={onKey}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Selected work — use left and right arrow keys"
          data-lenis-prevent-horizontal
          data-lenis-prevent-touch
          data-cursor="Drag"
        >
          {PROJECTS.map((p, i) => (
            <Card key={p.id} p={p} i={i} state={covers.current[i]} hoverable={hoverable} dragged={dragged} />
          ))}
          <div className="work-end">
            <span className="mono">More on GitHub</span>
            <a className="serif" href="https://github.com/YillonMask" target="_blank" rel="noopener" draggable={false}>@YillonMask&nbsp;→</a>
          </div>
        </div>
      </div>
    </section>
  )
}
