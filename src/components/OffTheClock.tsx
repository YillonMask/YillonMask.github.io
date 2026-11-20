import { useRef } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'

// Interlude between work (above) and Kitchen (below). As it scrolls past, the bone work palette
// dims to the Kitchen's warm near-black, the day's clock runs out to 18:30, and the vocabulary
// of the projects drifts up and away while the kitchen's ingredients (from dish-teardown) rise in.
const WORK = ['PathRAG', 'Weaviate', 'cross-encoder', 'LangGraph', 'Kafka', 'Redis', 'FastAPI', 'NDCG@10', 'LiveKit', 'Gemini']
const KITCHEN = ['花椒', 'Sichuan pepper', '干辣椒段', 'scallion', '清汤', 'hand-pulled noodles', '姜 · 蒜', 'chili oil', '花生米', 'beef shank']

// Fixed slots (no random scatter) so words can never collide. Each set (work / kitchen) moves as one
// rigid layer, so their relative spacing never changes; the two sets are only visible in disjoint
// scroll windows (work fades out by p≈0.42, kitchen starts at p≈0.46). Bands sit above and below the
// title; travel (±60px) is smaller than the gap to the title. Desktop: 5 columns × 2 rows.
// Mobile (≤760px): 2 columns × 5 rows. Values in % of the stage.
const COLS_D = [6, 25, 44, 63, 82]
const ROWS_D = [12, 76]
const COLS_M = [6, 54]
const ROWS_M = [7, 16, 25, 71, 79]
const slot = (i: number) => ({
  x: COLS_D[i % 5], y: ROWS_D[Math.floor(i / 5)],
  mx: COLS_M[i % 2], my: ROWS_M[Math.floor(i / 2)],
})
const stagger = (i: number) => ((i * 7) % 10) / 10 // 0..0.9, spread order across the grid

function Word({ w, i, p, y, kind }: { w: string; i: number; p: MotionValue<number>; y: MotionValue<number>; kind: 'work' | 'kitchen' }) {
  const s = slot(i)
  const t = stagger(i)
  const o = useTransform(
    p,
    kind === 'work' ? [0.2 + t * 0.14, 0.28 + t * 0.14] : [0.46 + t * 0.14, 0.54 + t * 0.14],
    kind === 'work' ? [1, 0] : [0, 1],
  )
  const zh = /[\u4e00-\u9fff]/.test(w)
  return (
    <motion.span
      className={`otc-word otc-${kind} ${zh ? 'zh' : 'mono'}`}
      style={{ ['--x' as string]: `${s.x}%`, ['--y' as string]: `${s.y}%`, ['--mx' as string]: `${s.mx}%`, ['--my' as string]: `${s.my}%`, y, opacity: o }}
    >
      {w}
    </motion.span>
  )
}

export default function OffTheClock() {
  const reduced = !!useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // palette: bone (work) -> warm near-black (kitchen)
  const dark = useTransform(p, [0.18, 0.62], [0, 1])
  const workY = useTransform(p, [0, 0.42], [0, -60])
  const kitchenY = useTransform(p, [0.44, 1], [60, -10])
  const fg = useTransform(p, [0.3, 0.55], ['#0d0d0b', '#e9e4d8'])
  const line = useTransform(p, [0.3, 0.55], ['rgba(13,13,11,.25)', 'rgba(233,228,216,.22)'])
  const dot = useTransform(p, [0.2, 0.62], ['0%', '100%'])
  const titleY = useTransform(p, [0.1, 0.9], ['18%', '-18%'])
  const sub = useTransform(p, [0.42, 0.58], [0, 1])

  // 17:20 -> 18:30 across the interlude
  const minutes = (v: number) => 17 * 60 + 20 + Math.round(Math.min(1, Math.max(0, (v - 0.15) / 0.5)) * 70)
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  useMotionValueEvent(p, 'change', (v) => { if (clock.current) clock.current.textContent = fmt(reduced ? 18 * 60 + 30 : minutes(v)) })

  if (reduced) {
    return (
      <section className="otc otc-static" id="off-the-clock" aria-label="Off the clock">
        <div className="otc-stage">
          <p className="mono otc-time"><span>18:30</span> · logging off</p>
          <h2 className="otc-title"><span className="g">Off the</span> <em className="serif">clock</em><span className="zh otc-zh">收工</span></h2>
          <p className="otc-sub">Work and study above. What I cook below.</p>
        </div>
      </section>
    )
  }

  return (
    <motion.section className="otc" id="off-the-clock" ref={ref} style={{ color: fg }} aria-label="Off the clock">
      <motion.div className="otc-dark" style={{ opacity: dark }} aria-hidden />
      <div className="otc-stage">
        <div className="otc-words" aria-hidden>
          {WORK.map((w, i) => <Word key={w} w={w} i={i} p={p} y={workY} kind="work" />)}
          {KITCHEN.map((w, i) => <Word key={w} w={w} i={i} p={p} y={kitchenY} kind="kitchen" />)}
        </div>
        <motion.div className="otc-center" style={{ y: titleY }}>
          <p className="mono otc-time"><span ref={clock}>17:20</span> · logging off</p>
          <h2 className="otc-title"><span className="g">Off the</span> <em className="serif">clock</em><span className="zh otc-zh">收工</span></h2>
          <motion.p className="otc-sub" style={{ opacity: sub }}>Work and study above. What I cook below.</motion.p>
        </motion.div>
        <div className="otc-day mono" aria-hidden>
          <span>09:00</span>
          <motion.span className="otc-track" style={{ backgroundColor: line }}><motion.i style={{ left: dot }} /></motion.span>
          <span>18:30</span>
        </div>
      </div>
    </motion.section>
  )
}
