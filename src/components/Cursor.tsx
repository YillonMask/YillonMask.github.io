import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 })
  const [label, setLabel] = useState<string | null>(null)
  const [hot, setHot] = useState(false)
  const [enabled] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const move = (e: PointerEvent) => {
      x.set(e.clientX); y.set(e.clientY)
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor], a, button')
      setLabel(t?.dataset.cursor ?? null)
      setHot(!!t)
    }
    window.addEventListener('pointermove', move)
    return () => { window.removeEventListener('pointermove', move); document.documentElement.classList.remove('has-cursor') }
  }, [enabled, x, y])

  if (!enabled) return null
  return (
    <>
      <motion.div className="cursor-dot" style={{ x, y }} />
      <motion.div
        className="cursor-ring"
        style={{ x: sx, y: sy }}
        animate={{ width: label ? 92 : hot ? 56 : 30, height: label ? 92 : hot ? 56 : 30, backgroundColor: label ? 'rgba(255,77,31,1)' : 'rgba(255,77,31,0)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <motion.span animate={{ opacity: label ? 1 : 0, scale: label ? 1 : 0.6 }}>{label}</motion.span>
      </motion.div>
    </>
  )
}
