import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import HeroField from '../gl/HeroField'
import Magnetic from './Magnetic'
import { visitorGeo, type Geo } from '../lib/geo'

const Visitor = lazy(() => import('./Visitor'))

const ease = [0.16, 1, 0.3, 1] as const
const NAV = [['About', '#about'], ['Field', '#field'], ['Work', '#work'], ['Kitchen', '#kitchen'], ['Contact', '#contact']] as const

function Line({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className={`mask ${className ?? ''}`}>
      <motion.span
        className="mask-inner"
        initial={{ y: '110%', rotate: 4 }}
        animate={{ y: '0%', rotate: 0 }}
        transition={{ duration: 1.3, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

export default function Hero({ ready, reduced, onNav }: { ready: boolean; reduced: boolean; onNav: (id: string) => void }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 900], [0, -220])
  const op = useTransform(scrollY, [0, 650], [1, 0])
  const d = ready ? 0 : 99
  const [open, setOpen] = useState(false)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 760px)').matches)

  // visitor badge: look up location only once the intro has painted, when the browser is idle
  useEffect(() => {
    if (!ready) return
    let live = true
    const go = () => visitorGeo().then((g) => { if (live && g) setGeo(g) })
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const id = ric ? ric(go, { timeout: 2500 }) : window.setTimeout(go, 1200)
    const mq = window.matchMedia('(max-width: 760px)')
    const onMq = () => setSmall(mq.matches)
    mq.addEventListener('change', onMq)
    return () => { live = false; if (!ric) window.clearTimeout(id); mq.removeEventListener('change', onMq) }
  }, [ready])

  return (
    <section className="hero" id="top">
      <HeroField reduced={reduced} />
      <header className="nav mono">
        <a href="#top" className="brand" onClick={(e) => { e.preventDefault(); onNav('#top') }}>Xinrui Yi<i className="brand-mark" aria-hidden /></a>
        <nav className="nav-links" aria-label="Sections">
          {NAV.map(([l, h], i) => (
            <Magnetic key={h} strength={0.4}>
              <a href={h} onClick={(e) => { e.preventDefault(); onNav(h) }}><span className="dim">0{i + 1}</span> {l}</a>
            </Magnetic>
          ))}
        </nav>
        <button className="nav-toggle mono" aria-expanded={open} aria-controls="nav-sheet" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Menu'}<i aria-hidden className={open ? 'on' : ''} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.nav
              id="nav-sheet"
              className="nav-sheet"
              aria-label="Sections"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
            >
              {NAV.map(([l, h], i) => (
                <a key={h} href={h} onClick={(e) => { e.preventDefault(); setOpen(false); onNav(h) }}>
                  <span className="dim mono">0{i + 1}</span><span className="sheet-l">{l}</span>
                </a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {geo && (
        <motion.div className="visitor-wrap" style={reduced ? undefined : { opacity: op }}>
          <Suspense fallback={null}><Visitor geo={geo} reduced={reduced} size={small ? 44 : 60} /></Suspense>
        </motion.div>
      )}

      <motion.div className="hero-title" style={reduced ? undefined : { y, opacity: op }}>
        {ready && (
          <h1>
            <Line delay={d + 0.05}><span className="g">Signal</span><span className="note mono">(n.)&nbsp;the part<br />worth keeping</span></Line>
            <Line delay={d + 0.15} className="indent"><em className="serif">below the</em></Line>
            <Line delay={d + 0.25}><span className="g">Noise<b className="dot">.</b></span></Line>
          </h1>
        )}
      </motion.div>

      <motion.div
        className="hero-foot mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 1, delay: 0.7 }}
      >
        <p className="intro">AI/ML engineer in Palo Alto. Formerly designed railway bridges —<br />now building AI systems to the same tolerance.</p>
        <p className="center"><span className="dim">Palo Alto, CA</span><br />37.4419° N&nbsp;&nbsp;122.1430° W</p>
        <p className="right">Scroll to tune <span className="scroll-line"><i /></span></p>
      </motion.div>
    </section>
  )
}
