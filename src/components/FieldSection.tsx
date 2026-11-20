import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
const MorphField = lazy(() => import('../gl/MorphField'))

const CHAPTERS = [
  { k: 'Structure', l: 'Bridges that carry trains.', d: 'Started as a bridge design engineer at China Railway — where structure and precision are non-negotiable.' },
  { k: 'Tolerance', l: 'Every load, every margin, computed.', d: 'The same rigor, carried into software: explicit constraints, checked assumptions, systems built to spec.' },
  { k: 'Retrieval', l: 'Systems that know where to look.', d: 'Building RAG and AI systems, like Astreas RAG, that ground answers in the right sources.' },
  { k: 'Agency', l: 'Models that act, not just answer.', d: 'Agent systems — Voc.ai agents and Agent Teams — built to take actions, not just generate text.' },
]

export default function FieldSection({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const progress = useTransform(scrollYProgress, [0.05, 0.92], [0, 1], { clamp: true })
  const [idx, setIdx] = useState(0)
  const [active, setActive] = useState(false)
  useMotionValueEvent(progress, 'change', (v) => setIdx(Math.min(3, Math.round(v * 3))))
  const bar = useTransform(progress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px 0px' })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])

  return (
    <section className="field" id="field" ref={ref}>
      <div className="field-sticky">
        <div className="field-canvas"><Suspense fallback={null}><MorphField progress={progress} active={active} reduced={reduced} /></Suspense></div>
        <div className="field-grid" aria-hidden />
        <div className="label mono light"><span>(03)</span><span>From structure to systems — scroll</span></div>

        <div className="field-copy">
          <div className="field-num mono">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={idx} initial={{ y: '100%' }} animate={{ y: '0%' }} exit={{ y: '-100%' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                0{idx + 1}
              </motion.span>
            </AnimatePresence>
            <span className="dim">&nbsp;/ 04</span>
          </div>
          <div className="field-title">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h2 key={idx} className="serif" initial={{ y: '105%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-105%', opacity: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                {CHAPTERS[idx].k}
              </motion.h2>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <p className="field-line">{CHAPTERS[idx].l}</p>
              <p className="field-desc">{CHAPTERS[idx].d}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <ul className="field-steps mono">
          {CHAPTERS.map((c, i) => (
            <li key={c.k} className={i === idx ? 'on' : ''}><span>0{i + 1}</span>{c.k}</li>
          ))}
          <li className="field-bar"><motion.i style={{ width: bar }} /></li>
        </ul>
      </div>
    </section>
  )
}
