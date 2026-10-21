import instaExamples from '@/data/insta-examples.json'

/* ────────────────────────────────────────────────────────────
   Real published captions — fetched live from the Instagram API
   (INSTAGRAM_ACCESS_TOKEN), cached in memory, with the committed
   src/data/insta-examples.json as fallback.
   ──────────────────────────────────────────────────────────── */

type Brand = 'ullim' | 'dfz'

export interface ExampleBuckets {
  artistCaptions: string[]
  posterCaptions: string[]
  closingVerbs: string[] // imperative endings learned from ALL published artist captions
}
export type RealExamples = Record<Brand, ExampleBuckets>

const FALLBACK_EXAMPLES: RealExamples = {
  ullim: { ...instaExamples.ullim, closingVerbs: [] },
  dfz: { ...instaExamples.dfz, closingVerbs: [] },
}

const MAX_PER_BUCKET = 4
const IG_CACHE_TTL = 1000 * 60 * 60 * 12 // 12h
let igCache: { data: RealExamples; at: number } | null = null

// Diagnostics for /api/insta-status
let lastSource: 'live' | 'cache' | 'fallback' | 'none' = 'none'
let lastError: string | null = null
let lastFetchAt: string | null = null

const isDfzCaption = (t: string) => /dfz|duty\s*free\s*zone/i.test(t)
const isArtistCaption = (t: string) => /(을|를)\s*소개합니다/.test(t)
const isPosterCaption = (t: string) => /english below/i.test(t) || /presents\s*:/i.test(t)

// Closing sentence = the paragraph right before the "ullim presents" info block.
export function closingSentence(caption: string): string {
  const paras = caption.split(/\n\s*\n/).map((p) => p.trim())
  const i = paras.findIndex((p) => /^ullim presents/i.test(p))
  return i > 0 ? paras[i - 1] : ''
}

// Final imperative verb of a closing sentence, e.g. "…흐름에 몸을 맡기세요." → "맡기세요".
// Softer "~해 보세요" endings are skipped (house style is the firm "~하세요").
export function closingVerb(sentence: string): string {
  const m = sentence.match(/([가-힣]+세요)[.!]?\s*$/)
  if (!m || /보세요$/.test(m[1])) return ''
  return m[1]
}

export async function fetchRealExamples(): Promise<RealExamples> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    lastSource = 'fallback'
    lastError = 'INSTAGRAM_ACCESS_TOKEN not set'
    return FALLBACK_EXAMPLES
  }
  if (igCache && Date.now() - igCache.at < IG_CACHE_TTL) {
    lastSource = 'cache'
    return igCache.data
  }

  try {
    const media: { caption?: string; timestamp: string }[] = []
    let url: string | null =
      `https://graph.instagram.com/v25.0/me/media?fields=caption,timestamp&limit=100&access_token=${token}`
    while (url) {
      const res: Response = await fetch(url)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Instagram API ${res.status}: ${body.slice(0, 200)}`)
      }
      const json: { data?: { caption?: string; timestamp: string }[]; paging?: { next?: string } } =
        await res.json()
      media.push(...(json.data ?? []))
      url = json.paging?.next ?? null
    }

    const buckets: Record<Brand, { artistCaptions: { c: string; t: string }[]; posterCaptions: { c: string; t: string }[] }> = {
      ullim: { artistCaptions: [], posterCaptions: [] },
      dfz: { artistCaptions: [], posterCaptions: [] },
    }
    for (const m of media) {
      const caption = m.caption?.trim()
      if (!caption) continue
      const brand: Brand = isDfzCaption(caption) ? 'dfz' : 'ullim'
      if (isArtistCaption(caption)) buckets[brand].artistCaptions.push({ c: caption, t: m.timestamp })
      else if (isPosterCaption(caption)) buckets[brand].posterCaptions.push({ c: caption, t: m.timestamp })
    }
    const trim = (arr: { c: string; t: string }[]) =>
      arr.sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, MAX_PER_BUCKET).map((x) => x.c)

    // Learn closing verbs from every published artist caption (accumulates as posts grow).
    const verbs = (arr: { c: string }[]) =>
      Array.from(new Set(arr.map((x) => closingVerb(closingSentence(x.c))).filter(Boolean)))

    const data: RealExamples = {
      ullim: {
        closingVerbs: verbs(buckets.ullim.artistCaptions),
        artistCaptions: trim(buckets.ullim.artistCaptions),
        posterCaptions: trim(buckets.ullim.posterCaptions),
      },
      dfz: {
        closingVerbs: verbs(buckets.dfz.artistCaptions),
        artistCaptions: trim(buckets.dfz.artistCaptions),
        posterCaptions: trim(buckets.dfz.posterCaptions),
      },
    }
    igCache = { data, at: Date.now() }
    lastSource = 'live'
    lastError = null
    lastFetchAt = new Date().toISOString()
    return data
  } catch (e) {
    // Keep serving the last good fetch (or the committed fallback) on any failure.
    lastError = e instanceof Error ? e.message : String(e)
    lastSource = igCache ? 'cache' : 'fallback'
    return igCache?.data ?? FALLBACK_EXAMPLES
  }
}

export function getInstaStatus() {
  return {
    tokenConfigured: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    lastSource,
    lastError,
    lastSuccessfulFetchAt: lastFetchAt,
  }
}

export function realExamples(examples: RealExamples, brand: Brand, kind: 'artistCaptions' | 'posterCaptions'): string {
  const list = examples[brand]?.[kind] ?? []
  if (!list.length) return ''
  return [
    ``,
    `# Real published captions (these are ACTUAL posts — match their tone, rhythm and vocabulary exactly)`,
    list.map((c: string, i: number) => `--- example ${i + 1} ---\n${c}`).join('\n\n'),
  ].join('\n')
}
