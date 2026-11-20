import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { snoise } from './noise'

const COUNT = 18000

type V3 = [number, number, number]

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 01 Structure — cube lattice
function latticePoints(out: Float32Array) {
  const n = 9
  for (let i = 0; i < COUNT; i++) {
    const axis = i % 3
    const u = (Math.floor(Math.random() * n) / (n - 1)) * 2 - 1
    const v = (Math.floor(Math.random() * n) / (n - 1)) * 2 - 1
    const w = Math.random() * 2 - 1
    const c = [u, v, w]
    out[i * 3] = c[axis % 3] * 1.25
    out[i * 3 + 1] = c[(axis + 1) % 3] * 1.25
    out[i * 3 + 2] = c[(axis + 2) % 3] * 1.25
  }
}

// 02 Tolerance — helical compression spring with closed (flat) end coils
function springPoints(out: Float32Array) {
  const R = 0.8, wire = 0.085, turns = 7.5, Hh = 1.4, endT = 0.85
  const active = turns - 2 * endT
  const yAt = (tt: number) => {
    // tt in turns. closed ends: pitch ~ wire diameter; active coils spread the rest
    const closedPitch = wire * 2.1
    const endH = endT * closedPitch
    const activeH = 2 * Hh - 2 * endH
    if (tt < endT) return -Hh + tt * closedPitch
    if (tt > turns - endT) return Hh - (turns - tt) * closedPitch
    return -Hh + endH + ((tt - endT) / active) * activeH
  }
  for (let i = 0; i < COUNT; i++) {
    const tt = Math.random() * turns
    const th = tt * Math.PI * 2
    const cx = Math.cos(th) * R, cz = Math.sin(th) * R, cy = yAt(tt)
    // point on the wire's cross-section (mostly near the surface so the wire reads as a tube)
    const a = Math.random() * Math.PI * 2
    const r = wire * (0.55 + 0.45 * Math.sqrt(Math.random()))
    const nx = Math.cos(th), nz = Math.sin(th)
    out[i * 3] = cx + nx * Math.cos(a) * r
    out[i * 3 + 1] = cy + Math.sin(a) * r
    out[i * 3 + 2] = cz + nz * Math.cos(a) * r
  }
}

// 03 Retrieval — knowledge graph: hubs, leaves, edges, and one highlighted query path
function graphPoints(out: Float32Array, meta: Float32Array) {
  const rnd = mulberry(7)
  const nodes: { p: V3; r: number; hub: boolean }[] = []
  const HUBS = 4, TOTAL = 30
  const hubPos: V3[] = [[-1.05, 0.45, 0.2], [0.95, 0.65, -0.35], [0.25, -0.75, 0.55], [-0.35, -0.2, -0.85]]
  for (let i = 0; i < HUBS; i++) nodes.push({ p: hubPos[i], r: 0.16, hub: true })
  let guard = 0
  while (nodes.length < TOTAL && guard++ < 5000) {
    const h = hubPos[nodes.length % HUBS]
    const p: V3 = [h[0] + (rnd() - 0.5) * 1.9, h[1] + (rnd() - 0.5) * 1.5, h[2] + (rnd() - 0.5) * 1.5]
    if (Math.hypot(p[0] / 2.1, p[1] / 1.6, p[2] / 1.4) > 1) continue
    if (nodes.some((n) => Math.hypot(n.p[0] - p[0], n.p[1] - p[1], n.p[2] - p[2]) < 0.42)) continue
    nodes.push({ p, r: 0.04 + rnd() * 0.05, hub: false })
  }
  const dist = (a: number, b: number) => Math.hypot(nodes[a].p[0] - nodes[b].p[0], nodes[a].p[1] - nodes[b].p[1], nodes[a].p[2] - nodes[b].p[2])
  const edges = new Set<string>()
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const parent: number[] = []
  for (let i = HUBS; i < nodes.length; i++) {
    let best = 0
    for (let h = 1; h < HUBS; h++) if (dist(i, h) < dist(i, best)) best = h
    parent[i] = best
    edges.add(key(i, best))
    let nn = -1
    for (let j = HUBS; j < nodes.length; j++) if (j !== i && (nn < 0 || dist(i, j) < dist(i, nn))) nn = j
    if (nn >= 0 && rnd() < 0.6) edges.add(key(i, nn))
  }
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]]) edges.add(key(a, b))

  // query path: a leaf of hub 0 -> hub 0 -> hub 1 -> a leaf of hub 1
  const leafOf = (h: number) => {
    let best = -1
    for (let i = HUBS; i < nodes.length; i++) if (parent[i] === h && (best < 0 || dist(i, h) > dist(best, h))) best = i
    return best
  }
  const q = leafOf(0), target = leafOf(1)
  const path = [q, 0, 1, target]
  const pathEdges = new Map<string, [number, number]>() // edge -> [t0, t1] along path
  const segL = path.slice(1).map((b, i) => dist(path[i], b))
  const tot = segL.reduce((a, b) => a + b, 0)
  let accT = 0
  path.slice(1).forEach((b, i) => {
    const a = path[i]
    edges.add(key(a, b))
    pathEdges.set(key(a, b), [accT / tot, (accT + segL[i]) / tot])
    accT += segL[i]
  })
  const nodeT = new Map<number, number>([[q, 0], [0, segL[0] / tot], [1, (segL[0] + segL[1]) / tot], [target, 1]])

  type Item = { kind: 'node'; i: number; w: number } | { kind: 'edge'; a: number; b: number; w: number }
  const items: Item[] = []
  nodes.forEach((n, i) => items.push({ kind: 'node', i, w: n.r * n.r * 190 + 0.35 }))
  for (const e of edges) { const [a, b] = e.split('-').map(Number); items.push({ kind: 'edge', a, b, w: dist(a, b) * 0.55 }) }
  const total = items.reduce((s2, it) => s2 + it.w, 0)
  let idx = 0
  items.forEach((it, n) => {
    const cnt = n === items.length - 1 ? COUNT - idx : Math.round((it.w / total) * COUNT)
    for (let c = 0; c < cnt && idx < COUNT; c++, idx++) {
      const k = idx * 3
      if (it.kind === 'node') {
        const nd = nodes[it.i]
        const u = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, s3 = Math.sqrt(1 - u * u)
        const r = nd.r * (0.7 + 0.3 * Math.cbrt(Math.random()))
        out[k] = nd.p[0] + Math.cos(ph) * s3 * r
        out[k + 1] = nd.p[1] + u * r
        out[k + 2] = nd.p[2] + Math.sin(ph) * s3 * r
        const t = nodeT.get(it.i)
        meta[idx * 2] = t === undefined ? 0 : 1
        meta[idx * 2 + 1] = t ?? 0
      } else {
        const A = nodes[it.a].p, B = nodes[it.b].p
        const t = Math.random(), j = 0.008
        out[k] = A[0] + (B[0] - A[0]) * t + (Math.random() - 0.5) * j
        out[k + 1] = A[1] + (B[1] - A[1]) * t + (Math.random() - 0.5) * j
        out[k + 2] = A[2] + (B[2] - A[2]) * t + (Math.random() - 0.5) * j
        const pe = pathEdges.get(key(it.a, it.b))
        if (pe) {
          // orient t along the path direction
          const fwd = path.indexOf(it.a) < path.indexOf(it.b) ? t : 1 - t
          meta[idx * 2] = 1
          meta[idx * 2 + 1] = pe[0] + (pe[1] - pe[0]) * fwd
        }
      }
    }
  })
  for (let i = 0; i < out.length; i++) out[i] *= 1.28
}

// 04 Agency — a coordinated swarm: agents (comet-like clusters) flow along curved routes to one goal.
// a3 = route start, aCtrl = curve control point, aMeta = (kind, phase): 0 trail, 1 agent, 2 goal
const GOAL: V3 = [1.55, 0.05, 0]
function agencyPoints(start: Float32Array, ctrl: Float32Array, meta: Float32Array) {
  const rnd = mulberry(21)
  const ROUTES = 9
  const routes = Array.from({ length: ROUTES }, (_, r) => {
    const a = (r / ROUTES) * Math.PI * 2 + rnd() * 0.3
    const s: V3 = [-1.9 + rnd() * 0.5, Math.cos(a) * 1.35, Math.sin(a) * 1.1]
    const c: V3 = [0.1 + rnd() * 0.5, Math.cos(a) * 1.9 + (rnd() - 0.5) * 0.4, Math.sin(a) * 1.6]
    return { s, c, phases: [rnd(), rnd(), rnd()] }
  })
  for (let i = 0; i < COUNT; i++) {
    const k = i * 3
    const u = Math.random()
    if (u < 0.12) {
      // goal: a ring + core
      const ring = Math.random() < 0.7
      const a = Math.random() * Math.PI * 2
      const r = ring ? 0.32 + (Math.random() - 0.5) * 0.03 : 0.07 * Math.cbrt(Math.random())
      const b = ring ? 0 : Math.random() * Math.PI * 2
      start[k] = GOAL[0] + (ring ? 0 : Math.cos(b) * r * 0.8)
      start[k + 1] = GOAL[1] + Math.sin(a) * r
      start[k + 2] = GOAL[2] + Math.cos(a) * r
      meta[i * 2] = 2; meta[i * 2 + 1] = 0
      continue
    }
    const rt = routes[Math.floor(Math.random() * ROUTES)]
    start.set(rt.s, k); ctrl.set(rt.c, k)
    if (u < 0.5) { meta[i * 2] = 0; meta[i * 2 + 1] = Math.random() } // trail: static t along route
    else { meta[i * 2] = 1; meta[i * 2 + 1] = rt.phases[Math.floor(Math.random() * 3)] }
  }
}

function shapes() {
  const a0 = new Float32Array(COUNT * 3)
  const a1 = new Float32Array(COUNT * 3)
  const a2 = new Float32Array(COUNT * 3)
  const a3 = new Float32Array(COUNT * 3)
  const ctrl = new Float32Array(COUNT * 3)
  const gMeta = new Float32Array(COUNT * 2)
  const aMeta = new Float32Array(COUNT * 2)
  const rnd = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) rnd[i] = Math.random()
  latticePoints(a0)
  springPoints(a1)
  graphPoints(a2, gMeta)
  agencyPoints(a3, ctrl, aMeta)
  return { a0, a1, a2, a3, ctrl, gMeta, aMeta, rnd }
}

const vertexShader = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uPixel;
attribute vec3 a1;
attribute vec3 a2;
attribute vec3 a3;
attribute vec3 aCtrl;
attribute vec2 aG;
attribute vec2 aM;
attribute float aRnd;
varying float vAlpha;
varying float vHot;
${snoise}
float stage(float p, float s, float r){
  float t = (p - s - 0.12)/0.62;
  return smoothstep(0.0, 1.0, clamp(t*1.4 - r*0.4, 0.0, 1.0));
}
const vec3 GOAL = vec3(${GOAL.join(',')});
vec3 bez(vec3 a, vec3 b, vec3 c, float t){ float m = 1.0 - t; return m*m*a + 2.0*m*t*b + t*t*c; }
void main(){
  float p = uProgress;
  float s1 = stage(p, 0.0, aRnd);
  float s2 = stage(p, 1.0, aRnd);
  float s3 = stage(p, 2.0, aRnd);

  // spring breathes: gentle compression / extension under load
  vec3 spring = a1;
  spring.y *= 1.0 + 0.09*sin(uTime*1.1);

  // agency: trails sit on the route, agents travel along it, goal pulses
  vec3 agent = a3;
  float agentFade = 1.0;
  float kind = aM.x;
  if (kind < 1.5) {
    float t;
    if (kind < 0.5) t = aM.y;
    else {
      float u = fract(aRnd*53.71);
      float head = fract(aM.y + uTime*0.07);
      t = clamp(head - u*u*0.09, 0.0, 1.0);
      agentFade = smoothstep(0.0, 0.08, head) * smoothstep(1.0, 0.93, head);
    }
    agent = bez(a3, aCtrl, GOAL, t);
    if (kind > 0.5) {
      vec3 off = vec3(fract(aRnd*137.1), fract(aRnd*241.7), fract(aRnd*389.3)) - 0.5;
      agent += off * 0.12 * (1.0 - fract(aRnd*53.71));
    } else {
      agent += (vec3(fract(aRnd*17.3), fract(aRnd*29.1), fract(aRnd*41.9)) - 0.5) * 0.012;
    }
  } else {
    agent = GOAL + (a3 - GOAL) * (1.0 + 0.08*sin(uTime*2.0));
  }

  vec3 pos = position;
  pos = mix(pos, spring, s1);
  pos = mix(pos, a2, s2);
  pos = mix(pos, agent, s3);

  float mid = sin(s1*3.14159) + sin(s2*3.14159) + sin(s3*3.14159);
  vec3 n = vec3(snoise(pos*0.9 + uTime*0.15), snoise(pos*0.9 + 13.1 + uTime*0.15), snoise(pos*0.9 + 27.7 + uTime*0.15));
  pos += n * (0.022 + mid*0.32);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixel * (1.0 + aRnd*1.6) * (9.0 / -mv.z);
  vAlpha = 0.35 + 0.65*smoothstep(9.8, 5.6, -mv.z);

  float wGraph = s2 * (1.0 - s3);
  float wAgency = s3;
  // retrieval pulse travelling from the query node along the highlighted path
  float pulse = smoothstep(0.12, 0.0, abs(fract(uTime*0.28) - aG.y));
  float hot = step(0.985, aRnd) * (1.0 - wGraph*0.8) + mid*0.15;
  hot += wGraph * aG.x * (0.6 + 0.4*pulse);
  hot += wAgency * step(1.5, kind);
  vHot = hot;
  vAlpha *= mix(1.0, (kind < 0.5 ? 0.42 : 1.0) * agentFade, wAgency);
  vAlpha *= 1.0 + wGraph * aG.x * pulse * 0.6;
}
`

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vHot;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.1, d);
  vec3 bone = vec3(0.914,0.894,0.847);
  vec3 sig  = vec3(1.0,0.302,0.122);
  vec3 col = mix(bone, sig, clamp(vHot, 0.0, 1.0));
  gl_FragColor = vec4(col, a*vAlpha);
}
`

function Particles({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const data = useMemo(shapes, [])
  const uniforms = useMemo(
    () => ({ uProgress: { value: 0 }, uTime: { value: 0 }, uPixel: { value: 1.6 } }),
    [],
  )
  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state, dt) => {
    if (!mat.current) return
    const u = mat.current.uniforms
    const target = progress.get() * 3
    u.uProgress.value += (target - u.uProgress.value) * (reduced ? 1 : 1 - Math.exp(-dt * 4))
    if (!reduced) u.uTime.value += dt
    u.uPixel.value = state.viewport.dpr * 1.25
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.05
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.05
    if (ref.current) {
      const t = u.uTime.value
      const pr = u.uProgress.value
      // three-quarter view that sways (shows the truss depth) and turns further as you scroll
      ref.current.rotation.y = -0.62 + (reduced ? 0 : Math.sin(t * 0.22) * 0.32) + pr * 0.22 + pointer.current.x * 0.25
      ref.current.rotation.x = -pointer.current.y * 0.3 + 0.3
      ref.current.rotation.z = pointer.current.x * 0.08
      // responsive framing: shrink and lift on portrait screens
      const vw = state.viewport.width, vh = state.viewport.height
      const sc = Math.min(0.92, vw / 6.6)
      ref.current.scale.setScalar(sc)
      const portrait = vw < vh
      ref.current.position.set(portrait ? 0 : 0.85, portrait ? vh * 0.16 : 0.15, 0)
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.a0, 3]} />
        <bufferAttribute attach="attributes-a1" args={[data.a1, 3]} />
        <bufferAttribute attach="attributes-a2" args={[data.a2, 3]} />
        <bufferAttribute attach="attributes-a3" args={[data.a3, 3]} />
        <bufferAttribute attach="attributes-aCtrl" args={[data.ctrl, 3]} />
        <bufferAttribute attach="attributes-aG" args={[data.gMeta, 2]} />
        <bufferAttribute attach="attributes-aM" args={[data.aMeta, 2]} />
        <bufferAttribute attach="attributes-aRnd" args={[data.rnd, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function MorphField({ progress, active, reduced }: { progress: MotionValue<number>; active: boolean; reduced: boolean }) {
  return (
    <Canvas
      className="morph-canvas"
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 7.6], fov: 40 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
    >
      <Particles progress={progress} reduced={reduced} />
    </Canvas>
  )
}
