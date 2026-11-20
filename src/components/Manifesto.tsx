import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'

// Lead-in sentences render solid; only the final sentence reveals on scroll.
const LEAD = 'Models are trained on the average. The average is the *floor,* not the *ceiling.*'
const REVEAL = 'Our job is to know the rule cold, and then break it *on* *purpose,* in public, with a reason.'

const cls = (w: string) => (w.startsWith('*') ? 'serif w hot' : 'w')
const clean = (w: string) => w.replace(/\*/g, '')

function Word({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const start = i / n
  const end = start + 1 / n
  const o = useTransform(p, [start, end], [0.12, 1])
  const y = useTransform(p, [start, end], [18, 0])
  return (
    <motion.span className={cls(w)} style={{ opacity: o, y }}>
      {clean(w)}&nbsp;
    </motion.span>
  )
}

export default function Manifesto() {
  const reduced = !!useReducedMotion()
  const textRef = useRef<HTMLParagraphElement>(null)
  // starts once the paragraph is well inside the viewport, finishes while the whole quote is still on screen
  const { scrollYProgress } = useScroll({ target: textRef, offset: ['start 75%', 'end 60%'] })
  const lead = LEAD.split(' ')
  const words = REVEAL.split(' ')
  const lineX = useTransform(scrollYProgress, [0, 1], ['-30%', '0%'])
  return (
    <section className="manifesto" id="about">
      <div className="label mono"><span>(02)</span><span>Position</span></div>
      <p className="manifesto-text" ref={textRef}>
        {lead.map((w, i) => <span key={`l${i}`} className={cls(w)}>{clean(w)}&nbsp;</span>)}
        {words.map((w, i) =>
          reduced
            ? <span key={i} className={cls(w)}>{clean(w)}&nbsp;</span>
            : <Word key={i} w={w} i={i} n={words.length} p={scrollYProgress} />,
        )}
      </p>
      <motion.div className="rule" style={reduced ? undefined : { x: lineX }} />
      <div className="manifesto-meta mono">
        <span>AI / ML engineering</span><span>M.S. CS — Northeastern</span><span>Formerly bridge design — China Railway</span><span>Palo Alto, CA</span>
      </div>
    </section>
  )
}
