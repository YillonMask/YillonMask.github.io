// Content pulled from the old portfolio (YillonMask/YillonMask.github.io, index.html, "Selected work").
export type Step = { t: string; s?: string }
export type Project = {
  id: string
  name: string
  role: string
  year: string
  desc: string
  tags: string[]
  metric?: string
  motif: number // 0 retrieval paths, 1 message flow, 2 agent hierarchy, 3 voice rings, 4 data curves
  flow: (Step | Step[])[] // architecture, from the old site's diagrams
  flowCaption: string
  links: { label: string; href: string }[]
  video?: { src: string; poster: string; source: string }
}

const base = import.meta.env.BASE_URL

export const PROJECTS: Project[] = [
  {
    id: 'astreas',
    name: 'Astreas RAG',
    role: 'ML Engineer Intern · Astreas Performance',
    year: '2025',
    desc: 'Production RAG for a health optimization platform — 5,000+ beta users, 8,000+ daily queries.',
    tags: ['Weaviate hybrid', 'PathRAG', 'FastAPI'],
    metric: 'Latency 2.3s → 1.4s · NDCG@10 0.73 → 0.89',
    motif: 0,
    flow: [
      { t: 'Query', s: 'user question' },
      { t: 'Hybrid search', s: 'Weaviate, RRF' },
      { t: 'Rerank', s: 'cross-encoder' },
      { t: 'PathRAG', s: 'multi-hop graph' },
      { t: 'Answer', s: 'LLM, grounded' },
    ],
    flowCaption: 'The retrieval path after the rebuild.',
    links: [],
  },
  {
    id: 'vocai',
    name: 'Voc.ai Agents',
    role: 'AI Agent Engineer Intern · Voc.ai',
    year: '2025',
    desc: 'AI customer-service agents for enterprise clients — tools, knowledge bases, load-tested.',
    tags: ['LangChain', 'Kafka', 'Redis'],
    metric: 'Cached query 280ms → 95ms · 850 → 1,200 users',
    motif: 1,
    flow: [
      { t: 'Shopper', s: 'order question' },
      { t: 'Kafka', s: 'inquiry events' },
      { t: 'Agents', s: 'LangChain' },
      [{ t: 'Redis', s: 'hot data' }, { t: 'Order DB' }, { t: 'Knowledge base', s: "client's catalog" }],
    ],
    flowCaption: 'How a shopper question gets answered.',
    links: [],
  },
  {
    id: 'agent-teams',
    name: 'Agent Teams',
    role: 'Hackathon · team of 2',
    year: '2026',
    desc: 'A Slack where every channel is a team of agents — a CEO agent staffs it, a PM agent hands out work.',
    tags: ['LangGraph', 'Deep Agents', 'Next.js'],
    metric: 'Live demo on Vercel',
    motif: 2,
    flow: [
      { t: 'You', s: 'set a goal' },
      { t: 'CEO agent', s: 'staffs a team' },
      { t: 'PM agent', s: 'assigns tasks' },
      [{ t: 'Specialist' }, { t: 'Specialist' }, { t: 'Specialist' }],
      { t: 'Tools', s: 'web search, page fetch' },
    ],
    flowCaption: 'Who talks to whom inside a team.',
    links: [
      { label: 'Live demo', href: 'https://agent-teams-mu.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/blueif16/agent-teams' },
    ],
  },
  {
    id: 'fish-recovery',
    name: 'Fish Recovery',
    role: 'Personal project · Voice agent',
    year: '2026',
    desc: 'A real-time, compliant voice agent — LiveKit audio, LangGraph dialogue state, FDCPA gates.',
    tags: ['LiveKit', 'LangGraph', 'Fish Audio TTS'],
    metric: 'Demo video · 4 min walkthrough',
    motif: 3,
    flow: [
      { t: 'Caller', s: 'browser' },
      { t: 'LiveKit', s: 'WebRTC audio' },
      { t: 'Deepgram', s: 'speech to text' },
      { t: 'LangGraph', s: 'state + Gemini' },
      { t: 'Compliance gate', s: 'FDCPA checks' },
      { t: 'Fish Audio', s: 'text to speech' },
    ],
    flowCaption: 'One turn of a call, end to end.',
    links: [
      { label: 'Demo video', href: 'https://www.loom.com/share/359a96a1f95e43c29f5975acba92dadf' },
      { label: 'GitHub', href: 'https://github.com/YillonMask/voice-agent-test-fishaudio' },
    ],
    video: {
      src: `${base}video/fish-recovery-preview.mp4`,
      poster: `${base}video/fish-recovery-poster.jpg`,
      source: 'Loom 359a96a1… (12s muted excerpt)',
    },
  },
  {
    id: 'bitewise',
    name: 'BiteWise',
    role: 'Founder, hackathon · Top 30 / TED AI',
    year: '2024',
    desc: "AI meal planning that doesn't hallucinate — grounded chain-of-thought over tracked meals.",
    tags: ['Flutter', 'LangChain', 'Gemini'],
    metric: 'Top 30 finalist, TED AI hackathon',
    motif: 4,
    flow: [
      { t: 'You', s: 'diet + goals' },
      { t: 'Flutter app' },
      { t: 'LangChain', s: 'chain of thought' },
      { t: 'Gemini', s: 'recipe' },
      { t: 'DALL·E 3', s: 'recipe photo' },
      { t: 'Firebase', s: 'tracked meals' },
    ],
    flowCaption: 'From what you ate to a recipe.',
    links: [{ label: 'GitHub', href: 'https://github.com/YillonMask/BiteWise' }],
  },
]
