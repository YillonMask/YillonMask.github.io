import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion'

const wrap = (min: number, max: number, v: number) => { const r = max - min; return ((((v - min) % r) + r) % r) + min }

export default function Marquee({ items, base = -3, reduced }: { items: { t: string; serif?: boolean }[]; base?: number; reduced: boolean }) {
  const x = useMotionValue(0)
  const { scrollY } = useScroll()
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 })
  const factor = useTransform(vel, [-1500, 0, 1500], [-5, 0, 5], { clamp: false })
  const dir = useRef(1)
  useAnimationFrame((_, dt) => {
    if (reduced) return
    const f = factor.get()
    if (f < 0) dir.current = -1
    else if (f > 0) dir.current = 1
    x.set(wrap(-50, 0, x.get() + dir.current * base * (dt / 1000) * (1 + Math.abs(f))))
  })
  const tx = useTransform(x, (v) => `${v}%`)
  const row = [...items, ...items]
  return (
    <div className="marquee" aria-hidden>
      <motion.div className="marquee-track" style={{ x: tx }}>
        {row.map((t, i) => (
          <span key={i} className={t.serif ? 'serif-item' : undefined}>{t.t}<i className="star" /></span>
        ))}
      </motion.div>
    </div>
  )
}
