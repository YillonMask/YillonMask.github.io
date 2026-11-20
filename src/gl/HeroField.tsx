import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle, Texture, Vec2 } from 'ogl'

const vertex = /* glsl */ `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`

const fragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D tHeight;
uniform vec2  uImg;
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;
uniform float uVel;
uniform float uScroll;
uniform float uIntro;
in vec2 vUv;
out vec4 fragColor;

// Real Palo Alto DEM, 16-bit packed into R (hi) + G (lo), normalised 0..1
float height(vec2 uv){
  vec2 rg = texture(tHeight, uv).rg;
  return (rg.r*65280.0 + rg.g*255.0) / 65535.0;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 asp = vec2(uRes.x/uRes.y, 1.0);
  // cover-fit the terrain to the viewport
  float rs = uRes.x/uRes.y, ri = uImg.x/uImg.y;
  vec2 fit = rs < ri ? vec2(rs/ri, 1.0) : vec2(1.0, ri/rs);
  vec2 uv = (vUv - 0.5)*fit;

  // slow cartographic drift + breathing zoom (stays inside the tile)
  float t = uTime;
  float zoom = 0.9 - 0.018*sin(t*0.09) - uScroll*0.18;
  uv = uv*zoom + 0.5 + vec2(sin(t*0.05)*0.018, cos(t*0.043)*0.012);
  uv.y += uScroll*0.04;

  // mouse lens: pushes the terrain outward, stronger with pointer speed
  vec2 m = (uMouse - 0.5)*asp;
  vec2 p = (vUv - 0.5)*asp;
  vec2 dm = p - m;
  float d = length(dm);
  float lens = exp(-d*d*9.0);
  uv -= (dm/asp) * lens * (0.12 + uVel*0.45) * zoom;

  float h = height(uv);

  // hillshade from the DEM gradient (light from the north-west)
  vec2 e = 1.5 / uImg;
  float hx = height(uv + vec2(e.x,0.0)) - height(uv - vec2(e.x,0.0));
  float hy = height(uv + vec2(0.0,e.y)) - height(uv - vec2(0.0,e.y));
  vec3 n = normalize(vec3(-hx*90.0, -hy*90.0, 1.0));
  float shade = clamp(dot(n, normalize(vec3(-0.6, 0.6, 0.7))), 0.0, 1.0);

  // contour value: a monotonic remap of elevation, so every line is a true isoline
  // but the flats near the Bay still get a few lines. Slow upward creep keeps it alive.
  float hv = pow(max(h, 0.0015), 0.62);
  float bands = 44.0;
  float v = hv*bands - t*0.05;
  float fw = max(fwidth(v), 1e-4);
  float dl = 0.5 - abs(fract(v) - 0.5);
  float line = 1.0 - smoothstep(0.0, 1.15*fw, dl);
  float dM = (0.5 - abs(fract(v/5.0) - 0.5))*5.0;
  float major = 1.0 - smoothstep(0.35*fw, 1.9*fw, dM);
  // fade lines where they bunch up into mush on steep ridges
  float crowd = smoothstep(0.55, 0.15, fw);
  line *= crowd; major *= mix(0.55, 1.0, crowd);

  vec3 ink  = vec3(0.051, 0.051, 0.043);
  vec3 bone = vec3(0.914, 0.894, 0.847);
  vec3 sig  = vec3(1.0, 0.302, 0.122);

  vec3 col = ink + bone*(0.012 + 0.07*shade*smoothstep(0.0, 0.2, h));
  // the Bay: below sea level gets fine cartographic hatching
  float water = smoothstep(0.0074, 0.0062, h);
  float hatch = smoothstep(0.35, 0.0, abs(fract((gl_FragCoord.x + gl_FragCoord.y)/7.0) - 0.5) - 0.15);
  col = mix(col, bone*0.14, water*hatch*0.6);

  float reveal = smoothstep(0.0, 1.0, uIntro*1.6 - length(p)*0.6);
  col = mix(col, bone*0.46, line*0.58*reveal);
  col = mix(col, bone*0.9, major*0.78*reveal);

  // the signal: isolines near the cursor glow vermilion
  float hot = smoothstep(0.3, 0.0, d) * (line + major);
  col = mix(col, sig, clamp(hot*1.1, 0.0, 1.0)*reveal);

  // one fixed elevation drawn in accent (~150 m contour)
  float hl = h*635.0 - 4.7;
  float fl = max(fwidth(hl), 1e-3);
  float acc = 1.0 - smoothstep(0.0, 1.6*fl, abs(hl - 150.0));
  col = mix(col, sig*0.92, acc*0.85*reveal*(1.0 - uScroll));

  // vignette + grain
  col *= 1.0 - 0.55*pow(length(vUv - 0.5)*1.25, 2.2);
  col += (hash(gl_FragCoord.xy + fract(uTime)*91.0) - 0.5) * 0.045;
  col *= 1.0 - uScroll*0.65;
  fragColor = vec4(col, 1.0);
}
`

export default function HeroField({ reduced }: { reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current!
    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), webgl: 2, antialias: false })
    const gl = renderer.gl
    el.appendChild(gl.canvas)
    gl.canvas.setAttribute('aria-hidden', 'true')

    const mouse = new Vec2(0.62, 0.42)
    const target = new Vec2(0.62, 0.42)
    const texture = new Texture(gl, { generateMipmaps: false })
    const uniforms = {
      tHeight: { value: texture },
      uImg: { value: new Vec2(1280, 800) },
      uTime: { value: 0 },
      uRes: { value: new Vec2(1, 1) },
      uMouse: { value: mouse },
      uVel: { value: 0 },
      uScroll: { value: 0 },
      uIntro: { value: reduced ? 1 : 0 },
    }
    const program = new Program(gl, { vertex, fragment, uniforms })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    let ready = false
    const img = new Image()
    img.onload = () => {
      texture.image = img
      uniforms.uImg.value.set(img.naturalWidth, img.naturalHeight)
      ready = true
      if (reduced) renderer.render({ scene: mesh })
    }
    img.src = `${import.meta.env.BASE_URL}terrain/palo-alto-height.png`

    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      renderer.setSize(width, height)
      uniforms.uRes.value.set(gl.drawingBufferWidth, gl.drawingBufferHeight)
      if (reduced && ready) renderer.render({ scene: mesh })
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height)
    }
    window.addEventListener('pointermove', onMove)

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)

    let raf = 0
    let last = performance.now()
    const start = last
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || !ready) return
      const px = mouse.x, py = mouse.y
      mouse.x += (target.x - mouse.x) * (1 - Math.exp(-dt * 6))
      mouse.y += (target.y - mouse.y) * (1 - Math.exp(-dt * 6))
      const speed = Math.hypot(mouse.x - px, mouse.y - py) / Math.max(dt, 1e-3)
      uniforms.uVel.value += (Math.min(speed, 1.2) - uniforms.uVel.value) * 0.08
      uniforms.uTime.value = (now - start) / 1000
      uniforms.uIntro.value = Math.min(1, uniforms.uIntro.value + dt * 0.45)
      uniforms.uScroll.value = Math.min(1, window.scrollY / window.innerHeight)
      renderer.render({ scene: mesh })
    }
    if (reduced) uniforms.uTime.value = 12
    else raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
    }
  }, [reduced])

  return <div ref={host} className="hero-field" />
}
