import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
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

function Card({ p, i, state, hoverable }: { p: Project; i: number; state: CoverState; hoverable: boolean }) {
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
      className={`card ${i % 2 ? 'short' : 'tall'} ${on ? 'is-on' : ''} ${primary ? 'is-link' : ''}`}
      data-cursor={primary ? (p.video ? 'Watch' : 'Open') : undefined}
      onPointerEnter={() => hoverable && set(true)}
      onPointerLeave={() => hoverable && set(false)}
      onPointerMove={(e) => {
        const r = cover.current!.getBoundingClientRect()
        state.mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]
      }}
      onClick={() => {
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
            <a key={l.href} href={l.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{l.label} ↗</a>
          ))}
        </span>
      </div>
    </article>
  )
}

export default function Work() {
  const reduced = !!useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [dist, setDist] = useState(0)
  const [active, setActive] = useState(false)
  const [hoverable] = useState(() => window.matchMedia('(hover: hover)').matches)
  const covers = useRef<CoverState[]>(PROJECTS.map((p, i) => ({ el: null, motif: p.motif, seed: i * 3.7, hover: 0, target: 0, mouse: [0.5, 0.5] })))
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })

  useLayoutEffect(() => {
    const measure = () => track.current && setDist(Math.max(0, track.current.scrollWidth - window.innerWidth))
    measure()
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(track.current!)
    return () => { window.removeEventListener('resize', measure); ro.disconnect() }
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px 0px' })
    io.observe(section.current!)
    return () => io.disconnect()
  }, [])

  const x = useTransform(scrollYProgress, [0, 1], [0, -dist])
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const titleX = useTransform(scrollYProgress, [0, 1], ['0%', '-25%'])

  return (
    <section className="work" id="work" ref={section} style={{ height: `calc(100vh + ${dist}px)` }}>
      <div className="work-sticky">
        <div className="label mono"><span>(04)</span><span>Selected work — 2024/26</span></div>
        <motion.div className="work-bg-title" style={{ x: titleX }} aria-hidden>Selected&nbsp;work&nbsp;Selected&nbsp;work</motion.div>
        <WorkCovers covers={covers} active={active} reduced={reduced} />
        <motion.div className="work-track" ref={track} style={{ x }}>
          <div className="work-intro">
            <h2><span className="g">Selected</span><br /><em className="serif">work</em><sup className="mono">(0{PROJECTS.length})</sup></h2>
            <p>Most of this lives in code, not screenshots — so each cover is drawn from what the system does. Hover for the architecture; click through to the code or demo.</p>
          </div>
          {PROJECTS.map((p, i) => (
            <Card key={p.id} p={p} i={i} state={covers.current[i]} hoverable={hoverable} />
          ))}
          <div className="work-end">
            <span className="mono">More on GitHub</span>
            <a className="serif" href="https://github.com/YillonMask" target="_blank" rel="noopener">@YillonMask&nbsp;→</a>
          </div>
        </motion.div>
        <div className="work-progress"><motion.i style={{ width: bar }} /></div>
      </div>
    </section>
  )
}
