import { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'
import type { Geo } from '../lib/geo'

// Tiny cobe globe + "Visiting from" line. Loaded as its own chunk only after a location resolves.
const toAngles = (lat: number, lng: number) => [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180] as const

export default function Visitor({ geo, reduced, size }: { geo: Geo; reduced: boolean; size: number }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const canvas = cv.current
    if (!canvas) return
    const [phiT, thetaT] = toAngles(geo.lat, geo.lng)
    const theta = Math.max(-0.6, Math.min(0.6, thetaT * 0.8))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let globe: ReturnType<typeof createGlobe>
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr, width: size * dpr, height: size * dpr,
        phi: reduced ? phiT : phiT - 2.4, theta, dark: 1, diffuse: 1.15,
        mapSamples: 14000, mapBrightness: 10,
        baseColor: [0.4, 0.39, 0.36], markerColor: [1, 0.3, 0.1], glowColor: [0.2, 0.19, 0.17],
        markers: [{ location: [geo.lat, geo.lng], size: 0.1 }],
      })
    } catch { return }
    setOn(true)
    if (reduced) {
      // static: redraw for a moment so the async land-dot texture lands, then stop
      let raf = 0, k = 0
      const once = () => { globe.update({}); raf = ++k < 45 ? requestAnimationFrame(once) : 0 }
      raf = requestAnimationFrame(once)
      return () => { cancelAnimationFrame(raf); globe.destroy() }
    }

    // spin in to centre the marker, then drift gently around it; paused whenever offscreen/hidden
    let raf = 0, visible = true, t = 0, last = performance.now()
    const tick = (now: number) => {
      raf = 0
      t += Math.min(64, now - last) / 1000; last = now
      const intro = Math.min(1, t / 2.6), e = 1 - Math.pow(1 - intro, 3)
      globe.update({ phi: phiT - 2.4 * (1 - e) + Math.sin(Math.max(0, t - 2.6) * 0.5) * 0.35 * Math.min(1, Math.max(0, t - 2.6)) })
      if (visible && !document.hidden) raf = requestAnimationFrame(tick)
    }
    const resume = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick) } }
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; resume() })
    io.observe(canvas)
    document.addEventListener('visibilitychange', resume)
    resume()
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', resume); globe.destroy() }
  }, [geo, reduced, size])

  const place = geo.city ? `${geo.city}, ${geo.country}` : geo.country
  return (
    <div className={`visitor mono ${on ? 'on' : ''}`} aria-label={`Visiting from ${place}`}>
      <p className="visitor-text">
        <span className="visitor-k"><i className="visitor-dot" aria-hidden />Visiting from <span className="dim">·</span> <span className="zh">来自</span></span>
        <span className="visitor-v">{place}</span>
      </p>
      <canvas ref={cv} className="visitor-globe" style={{ width: size, height: size }} aria-hidden />
    </div>
  )
}
