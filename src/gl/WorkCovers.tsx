import { useEffect, useRef, type RefObject } from 'react'
import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl'
import { snoise } from './noise'

// One shared WebGL context for every project cover. Each frame, the canvas (which covers the
// sticky viewport) draws one full-screen triangle per visible cover, clipped with viewport+scissor.

const vertex = /* glsl */ `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`

const fragment = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform float uMotif;
uniform float uSeed;
in vec2 vUv;
out vec4 fragColor;
${snoise}

const vec3 INK  = vec3(0.051, 0.051, 0.043);
const vec3 BONE = vec3(0.914, 0.894, 0.847);
const vec3 SIG  = vec3(1.0, 0.302, 0.122);

float px;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec2 hash2(vec2 p){ return vec2(hash(p), hash(p + 17.3)); }
float sdSeg(vec2 p, vec2 a, vec2 b, out float h){ vec2 pa = p-a, ba = b-a; h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0); return length(pa - ba*h); }
float stroke(float d, float w){ return 1.0 - smoothstep(w, w + px*1.5, d); }
float disc(vec2 p, vec2 c, float r){ return stroke(length(p - c), r); }
float ring(vec2 p, vec2 c, float r, float w){ return stroke(abs(length(p - c) - r), w); }

// ---------- 0: retrieval paths (RAG) ----------
void motifRag(vec2 p, float t, inout vec3 col){
  // corpus: a jittered field of documents
  vec2 cell = floor(p / 0.064);
  vec2 dp = (cell + 0.2 + 0.6*hash2(cell + uSeed)) * 0.064;
  float present = step(0.42, hash(cell + 3.1 + uSeed));
  col = mix(col, BONE*0.55, disc(p, dp, 0.0042) * present);

  vec2 Q = vec2(-0.27, -0.04), A = vec2(-0.07, 0.13), B = vec2(0.17, 0.21), C = vec2(0.05, 0.39), D = vec2(0.27, 0.03);
  // search radius sweeping out from the query
  float sweep = fract(t*0.22);
  col = mix(col, SIG*0.6, ring(p, Q, sweep*0.75, 0.0012) * (1.0 - sweep) * 0.8);
  float h;
  float pp = fract(t*0.28) * 3.2;
  float glow = 0.0, ln = 0.0;
  float d = sdSeg(p, Q, A, h); ln = max(ln, stroke(d, 0.0016)); glow = max(glow, stroke(d, 0.004) * exp(-abs(h - pp)*9.0));
  d = sdSeg(p, A, B, h); ln = max(ln, stroke(d, 0.0016)); glow = max(glow, stroke(d, 0.004) * exp(-abs(1.0 + h - pp)*9.0));
  d = sdSeg(p, B, C, h); ln = max(ln, stroke(d, 0.0016)); glow = max(glow, stroke(d, 0.004) * exp(-abs(2.0 + h - pp)*9.0));
  d = sdSeg(p, A, D, h); ln = max(ln, stroke(d, 0.0016)); glow = max(glow, stroke(d, 0.004) * exp(-abs(1.0 + h - pp)*9.0));
  col = mix(col, SIG*0.85, ln);
  col = mix(col, mix(SIG, BONE, 0.35), glow * (0.6 + 0.4*uHover));
  // retrieved nodes
  col = mix(col, SIG, ring(p, A, 0.018, 0.0018));
  col = mix(col, SIG, ring(p, B, 0.016, 0.0018));
  col = mix(col, SIG, ring(p, C, 0.014, 0.0018));
  col = mix(col, SIG, ring(p, D, 0.014, 0.0018));
  col = mix(col, BONE, disc(p, A, 0.006) + disc(p, B, 0.005) + disc(p, C, 0.005) + disc(p, D, 0.005));
  // query
  col = mix(col, SIG, disc(p, Q, 0.014));
  col = mix(col, SIG*0.7, ring(p, Q, 0.03 + 0.006*sin(t*3.0), 0.0012));
}

// ---------- 1: message flow (queues -> agents) ----------
void motifFlow(vec2 p, float t, inout vec3 col){
  float speed = 1.0 + uHover*1.6;
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    float y = 0.0 + fi*0.068;
    float x0 = -0.37, x1 = 0.17;
    float inLane = step(x0, p.x) * step(p.x, x1);
    float dy = abs(p.y - y);
    col = mix(col, BONE*0.22, stroke(dy, 0.0008) * inLane);
    // packets
    float sp = 0.07 + hash(vec2(fi, 4.0))*0.07;
    float u = fract((p.x - x0)*5.5 - t*sp*speed*5.5 + hash(vec2(fi, 9.0)));
    float pk = step(u, 0.16) * stroke(dy, 0.0055) * inLane;
    vec3 c = (i == 2) ? SIG : BONE*0.85;
    col = mix(col, c, pk);
  }
  // broker bar and consumer agents
  col = mix(col, BONE*0.7, stroke(abs(p.x - 0.19), 0.002) * step(-0.02, p.y) * step(p.y, 0.36));
  for (int k = 0; k < 3; k++){
    vec2 c = vec2(0.3, 0.05 + float(k)*0.12);
    float h;
    col = mix(col, BONE*0.35, stroke(sdSeg(p, vec2(0.19, c.y), c, h), 0.0008));
    float busy = 0.5 + 0.5*sin(t*(2.0 + float(k)) + float(k)*2.0);
    col = mix(col, k == 1 ? SIG : BONE, ring(p, c, 0.026, 0.0017));
    col = mix(col, (k == 1 ? SIG : BONE) * (0.4 + 0.6*busy), disc(p, c, 0.011));
  }
}

// ---------- 2: agent hierarchy with messages ----------
vec3 agentNode(int i){
  if (i == 0) return vec3(0.0, 0.40, 0.03);   // CEO
  if (i == 1) return vec3(0.0, 0.25, 0.024);  // PM
  if (i == 2) return vec3(-0.22, 0.10, 0.02);
  if (i == 3) return vec3(0.0, 0.10, 0.02);
  if (i == 4) return vec3(0.22, 0.10, 0.02);
  return vec3(0.0, -0.04, 0.016);              // tools
}
void motifAgents(vec2 p, float t, inout vec3 col){
  ivec2 E[7] = ivec2[7](ivec2(0,1), ivec2(1,2), ivec2(1,3), ivec2(1,4), ivec2(2,5), ivec2(3,5), ivec2(4,5));
  float rate = 0.35 + uHover*0.5;
  for (int e = 0; e < 7; e++){
    vec3 a = agentNode(E[e].x), b = agentNode(E[e].y);
    float h;
    float d = sdSeg(p, a.xy, b.xy, h);
    col = mix(col, BONE*0.35, stroke(d, 0.0009));
    // task going down, report coming back up
    float down = fract(t*rate + float(e)*0.37);
    float up = fract(t*rate*0.8 + float(e)*0.61 + 0.5);
    col = mix(col, BONE, disc(p, mix(a.xy, b.xy, down), 0.0055));
    if (e >= 1 && e <= 3) col = mix(col, SIG, disc(p, mix(b.xy, a.xy, up), 0.006));
  }
  for (int i = 0; i < 6; i++){
    vec3 n = agentNode(i);
    col = mix(col, INK, disc(p, n.xy, n.z));
    col = mix(col, i == 0 ? SIG : BONE, ring(p, n.xy, n.z, 0.0018));
    if (i == 0) col = mix(col, SIG, disc(p, n.xy, n.z*0.45));
    if (i == 5) col = mix(col, BONE*0.6, ring(p, n.xy, n.z*1.8, 0.0009));
  }
}

// ---------- 3: voice rings ----------
void motifVoice(vec2 p, float t, inout vec3 col){
  vec2 c = vec2(0.0, 0.17);
  vec2 q = p - c;
  float a = atan(q.y, q.x);
  float amp = 0.6 + uHover*0.8 + 0.4*sin(t*1.3);
  float wob = (0.010*sin(7.0*a + t*1.6) + 0.012*snoise(vec3(cos(a)*1.3, sin(a)*1.3, t*0.45))) * amp;
  float r = length(q);
  float R = r - wob*(1.0 + r*3.0);
  float v = R / 0.024;
  float fw = fwidth(v);
  float lines = (1.0 - smoothstep(0.0, 1.2*fw, 0.5 - abs(fract(v) - 0.5))) * smoothstep(0.42, 0.14, r) * step(0.12, R);
  col = mix(col, BONE*0.55, lines*0.8);
  col = mix(col, SIG, stroke(abs(R - 0.12), 0.0022));
  col = mix(col, BONE*0.12 + SIG*0.06, smoothstep(0.12, 0.0, R) * 0.9);
  // spectrum ticks along the bottom of the motif
  float bx = floor((p.x + 0.36) / 0.018);
  float inside = step(-0.36, p.x) * step(p.x, 0.36);
  float hgt = 0.01 + 0.035 * abs(snoise(vec3(bx*0.23, t*1.2, 1.0))) * amp;
  float bar = step(abs(fract((p.x + 0.36)/0.018) - 0.5), 0.18) * step(abs(p.y + 0.06), hgt) * inside;
  col = mix(col, BONE*0.75, bar);
}

// ---------- 4: data curves ----------
float curveY(float x, float k, float ph, float t){
  return 0.17 + 0.08*sin(x*k + ph + t*0.25) + 0.04*sin(x*k*2.3 + ph*1.7 - t*0.18);
}
void motifCurves(vec2 p, float t, inout vec3 col){
  float inside = step(-0.35, p.x) * step(p.x, 0.35) * step(-0.03, p.y) * step(p.y, 0.40);
  vec2 g = abs(fract((p - vec2(-0.35, -0.03)) / 0.0875 + 0.5) - 0.5) * 0.0875;
  col = mix(col, BONE*0.16, (stroke(g.x, 0.0006) + stroke(g.y, 0.0006)) * inside);
  float tt = t * (1.0 + uHover*2.0);
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float k = 7.0 + fi*3.0, ph = fi*2.1;
    float y = curveY(p.x, k, ph, tt) + (fi - 1.0)*0.07;
    float e = 0.002;
    float dydx = (curveY(p.x + e, k, ph, tt) - curveY(p.x - e, k, ph, tt)) / (2.0*e);
    float d = abs(p.y - y) / sqrt(1.0 + dydx*dydx);
    vec3 c = i == 1 ? SIG : BONE*(0.85 - fi*0.2);
    col = mix(col, c, stroke(d, 0.0016) * inside);
    // samples
    float sx = (floor((p.x + 0.35)/0.0875 + 0.5))*0.0875 - 0.35;
    vec2 sp = vec2(sx, curveY(sx, k, ph, tt) + (fi - 1.0)*0.07);
    col = mix(col, c, disc(p, sp, 0.0055) * inside);
  }
}

void main(){
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * asp;
  px = 1.0 / uRes.y;
  float t = uTime;

  // shared ground: faint drifting contours, like the hero
  float n = snoise(vec3(p*2.2 + uSeed, t*0.03))*0.6 + snoise(vec3(p*4.6 + uSeed*1.7, t*0.04))*0.3;
  float v = n * 9.0;
  float fw = fwidth(v);
  float cl = 1.0 - smoothstep(0.0, 1.2*fw, 0.5 - abs(fract(v) - 0.5));
  vec3 col = INK + BONE*0.02;
  vec2 m = (uMouse - 0.5) * asp;
  float near = smoothstep(0.22, 0.0, length(p - m)) * uHover;
  col = mix(col, mix(BONE*0.14, SIG*0.8, near), cl * (0.55 + near));

  int motif = int(uMotif + 0.5);
  if (motif == 0) motifRag(p, t, col);
  else if (motif == 1) motifFlow(p, t, col);
  else if (motif == 2) motifAgents(p, t, col);
  else if (motif == 3) motifVoice(p, t, col);
  else motifCurves(p, t, col);

  // darken the lower band for the overlaid title
  col *= mix(0.42, 1.0, smoothstep(-0.5, -0.08, p.y));
  col *= 1.0 - 0.45*pow(length(vUv - 0.5)*1.3, 2.4);
  col += (hash(gl_FragCoord.xy + fract(t)*91.0) - 0.5) * 0.04;
  fragColor = vec4(col, 1.0);
}
`

export type CoverState = { el: HTMLElement | null; motif: number; seed: number; hover: number; target: number; mouse: [number, number] }

export default function WorkCovers({ covers, active, reduced }: { covers: RefObject<CoverState[]>; active: boolean; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const el = host.current!
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    const renderer = new Renderer({ dpr, webgl: 2, alpha: true, antialias: false, premultipliedAlpha: false })
    const gl = renderer.gl
    el.appendChild(gl.canvas)
    gl.canvas.setAttribute('aria-hidden', 'true')
    const uniforms = {
      uRes: { value: new Vec2(1, 1) },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouse: { value: new Vec2(0.5, 0.5) },
      uMotif: { value: 0 },
      uSeed: { value: 0 },
    }
    const program = new Program(gl, { vertex, fragment, uniforms, depthTest: false, depthWrite: false })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      const r = el.getBoundingClientRect()
      renderer.setSize(r.width, r.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let raf = 0, last = performance.now()
    const t0 = last
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!activeRef.current) return
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      const host = el.getBoundingClientRect()
      gl.disable(gl.SCISSOR_TEST)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.SCISSOR_TEST)
      uniforms.uTime.value = reduced ? 8 : (now - t0) / 1000
      for (const c of covers.current ?? []) {
        c.hover += (c.target - c.hover) * (1 - Math.exp(-dt * 6))
        if (!c.el) continue
        const r = c.el.getBoundingClientRect()
        if (r.right < host.left || r.left > host.right || r.width < 2) continue
        const x = Math.round((r.left - host.left) * dpr)
        const y = Math.round((host.bottom - r.bottom) * dpr)
        const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr)
        gl.viewport(x, y, w, h)
        gl.scissor(x, y, w, h)
        uniforms.uRes.value.set(w, h)
        uniforms.uHover.value = c.hover
        uniforms.uMotif.value = c.motif
        uniforms.uSeed.value = c.seed
        uniforms.uMouse.value.set(c.mouse[0], c.mouse[1])
        mesh.draw()
      }
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
    }
  }, [covers, reduced])

  return <div ref={host} className="work-gl" />
}
