import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'
import Lenis from 'lenis'
import Preloader from './components/Preloader'
import Cursor from './components/Cursor'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'
import Marquee from './components/Marquee'
import FieldSection from './components/FieldSection'
import Work from './components/Work'
import Kitchen from './components/Kitchen'
import Footer from './components/Footer'

export default function App() {
  const reduced = !!useReducedMotion()
  const [loading, setLoading] = useState(!reduced)
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    if (reduced) return
    const l = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 })
    lenis.current = l
    ;(window as unknown as { __lenis: Lenis }).__lenis = l
    let raf = 0
    const loop = (t: number) => { l.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); l.destroy(); lenis.current = null }
  }, [reduced])

  useEffect(() => {
    if (loading) lenis.current?.stop()
    else lenis.current?.start()
    document.documentElement.classList.toggle('is-loading', loading)
  }, [loading])

  const go = useCallback((target: string) => {
    if (lenis.current) lenis.current.scrollTo(target === '#top' ? 0 : target, { duration: 1.6 })
    else document.querySelector(target)?.scrollIntoView()
  }, [])

  const done = useCallback(() => setLoading(false), [])

  return (
    <>
      <AnimatePresence>{loading && <Preloader key="pre" onDone={done} />}</AnimatePresence>
      <Cursor />
      <main>
        <Hero ready={!loading} reduced={reduced} onNav={go} />
        <Manifesto />
        <Marquee reduced={reduced} items={[{ t: 'AI Systems' }, { t: 'RAG', serif: true }, { t: 'Agents' }, { t: 'Machine Learning' }, { t: 'Built to tolerance', serif: true }]} />
        <FieldSection reduced={reduced} />
        <Work />
        <Kitchen />
      </main>
      <Footer onTop={() => go('#top')} />
    </>
  )
}
