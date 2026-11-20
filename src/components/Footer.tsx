import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import Magnetic from './Magnetic'

function useClock() {
  const fmt = () => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
  const [t, setT] = useState(fmt)
  useEffect(() => { const id = setInterval(() => setT(fmt()), 1000); return () => clearInterval(id) }, [])
  return t
}

export default function Footer({ onTop }: { onTop: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const word = useRef<HTMLDivElement>(null)
  const inView = useInView(word, { once: true, margin: '0px 0px -5% 0px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-35%', '0%'])
  const time = useClock()
  const letters = 'XINRUI YI'.split('')

  return (
    <footer className="footer" id="contact" ref={ref}>
      <motion.div className="footer-inner" style={{ y }}>
        <div className="footer-cta">
          <p className="mono">(06) Contact</p>
          <h2>Got a signal<br /><em className="serif">worth amplifying?</em></h2>
          <Magnetic strength={0.5}>
            <a className="cta-circle" href="mailto:yi.xin@northeastern.edu" data-cursor="Write">
              <span>Say hello</span>
            </a>
          </Magnetic>
        </div>

        <div className="footer-cols mono">
          <div><span className="dim">Email</span><p><a className="lc" href="mailto:yi.xin@northeastern.edu">yi.xin@northeastern.edu</a></p></div>
          <div><span className="dim">Elsewhere</span><p><a href="https://www.linkedin.com/in/xinrui-yi/" target="_blank" rel="noopener">LinkedIn — in/xinrui-yi</a><br /><a href="https://github.com/YillonMask" target="_blank" rel="noopener">GitHub — @YillonMask</a><br /><a href="./resume.pdf" target="_blank" rel="noopener">Resume (PDF)</a></p></div>
          <div><span className="dim">Open to</span><p>New-grad SWE &amp; AI/ML roles<br />Available May 2026<br />Bay Area, CA · no sponsorship needed</p></div>
          <div><span className="dim">Local time</span><p>{time} PT</p></div>
          <div><span className="dim">Colophon</span><p>React · Vite · Framer Motion<br />Three.js · OGL · Lenis · GLSL</p></div>
          <div className="right">
            <Magnetic><button className="to-top" onClick={onTop}>Back to top ↑</button></Magnetic>
          </div>
        </div>

        <div className="wordmark" ref={word} aria-label="Xinrui Yi">
          {letters.map((l, i) => (
            <span key={i} className="mask">
              <motion.span
                className="mask-inner"
                initial={{ y: '105%' }}
                animate={inView ? { y: '0%' } : {}}
                transition={{ duration: 1.1, delay: i * 0.045, ease: [0.16, 1, 0.3, 1] }}
              >
                {l === ' ' ? '\u00a0' : l}
              </motion.span>
            </span>
          ))}
        </div>
        <div className="footer-base mono"><span>© 2026 Xinrui Yi</span><span>Elevation: Mapzen Terrain Tiles / USGS 3DEP (AWS Open Data)</span></div>
      </motion.div>
    </footer>
  )
}
