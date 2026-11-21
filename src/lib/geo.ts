// Visitor location for the hero badge. Client-side only, free keyless endpoints, ~3s budget each.
// Only city / country / lat / lng are kept — the IP is never read into the UI or stored.
export type Geo = { city: string; country: string; lat: number; lng: number }

const KEY = 'nf-geo-v1'

async function get(url: string, ms = 3000): Promise<Record<string, unknown>> {
  const ac = new AbortController()
  const t = window.setTimeout(() => ac.abort(), ms)
  try {
    const r = await fetch(url, { signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally {
    window.clearTimeout(t)
  }
}

const pick = (j: Record<string, unknown>): Geo | null => {
  const lat = Number(j.latitude), lng = Number(j.longitude)
  const city = typeof j.city === 'string' ? j.city.trim() : ''
  const country = String(j.country_code ?? j.country ?? '').trim()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!city && !country) || j.error === true || j.success === false) return null
  return { city, country: country.length > 3 ? country : country.toUpperCase(), lat, lng }
}

const SOURCES = ['https://ipapi.co/json/', 'https://ipwho.is/', 'https://get.geojs.io/v1/ip/geo.json']

export async function visitorGeo(): Promise<Geo | null> {
  try {
    const c = sessionStorage.getItem(KEY)
    if (c) return c === 'none' ? null : (JSON.parse(c) as Geo)
  } catch { /* storage blocked */ }
  let g: Geo | null = null
  for (const u of SOURCES) {
    try { g = pick(await get(u)); if (g) break } catch { /* next source */ }
  }
  try { sessionStorage.setItem(KEY, g ? JSON.stringify(g) : 'none') } catch { /* ignore */ }
  return g
}
