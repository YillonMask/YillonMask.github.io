import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const dur = 1400
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100))
      if (p < 1) raf = requestAnimationFrame(step)
      else setTimeout(onDone, 180)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [onDone])
  return (
    <motion.div
      className="preloader"
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="preloader-top mono">
        <span>Xinrui Yi</span>
        <span>Calibrating field</span>
      </div>
      <div className="preloader-count">
        {String(n).padStart(3, '0')}
      </div>
      <div className="preloader-bar"><span style={{ transform: `scaleX(${n / 100})` }} /></div>
    </motion.div>
  )
}
