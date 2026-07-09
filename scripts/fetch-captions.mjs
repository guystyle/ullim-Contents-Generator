#!/usr/bin/env node
/**
 * Fetch all captions from the ullim Instagram account and build
 * few-shot example data for the generator prompts.
 *
 * Usage:
 *   INSTAGRAM_ACCESS_TOKEN=IGAA... node scripts/fetch-captions.mjs
 *   node --env-file=.env.local scripts/fetch-captions.mjs
 *   node scripts/fetch-captions.mjs --refresh   # refresh the 60-day token, prints the new one
 */

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const API = 'https://graph.instagram.com/v25.0'
const OUT = new URL('../src/data/insta-examples.json', import.meta.url)
const MAX_PER_BUCKET = 4

if (!TOKEN) {
  console.error('INSTAGRAM_ACCESS_TOKEN is not set. Put it in .env.local and run: node --env-file=.env.local scripts/fetch-captions.mjs')
  process.exit(1)
}

if (process.argv.includes('--refresh')) {
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`)
  const j = await r.json()
  if (!r.ok) {
    console.error('Refresh failed:', JSON.stringify(j))
    process.exit(1)
  }
  console.log('New token (valid ~60 days from now) — update .env.local and Vercel:')
  console.log(j.access_token)
  process.exit(0)
}

// ── fetch all media, following pagination ──
const media = []
let url = `${API}/me/media?fields=id,caption,media_type,timestamp,permalink&limit=100&access_token=${TOKEN}`
while (url) {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) {
    console.error('API error:', JSON.stringify(json))
    process.exit(1)
  }
  media.push(...(json.data ?? []))
  url = json.paging?.next ?? null
}
console.log(`Fetched ${media.length} media items.`)

// ── classify ──
const isDfz = (t) => /dfz|duty\s*free\s*zone/i.test(t)
const isArtistCaption = (t) => /(을|를)\s*소개합니다/.test(t)
const isPosterCaption = (t) => /english below/i.test(t) || /presents\s*:/i.test(t)

const buckets = {
  ullim: { artistCaptions: [], posterCaptions: [] },
  dfz: { artistCaptions: [], posterCaptions: [] },
}

for (const m of media) {
  const caption = m.caption?.trim()
  if (!caption) continue
  const brand = isDfz(caption) ? 'dfz' : 'ullim'
  if (isArtistCaption(caption)) buckets[brand].artistCaptions.push({ caption, timestamp: m.timestamp, permalink: m.permalink })
  else if (isPosterCaption(caption)) buckets[brand].posterCaptions.push({ caption, timestamp: m.timestamp, permalink: m.permalink })
}

// newest first, cap each bucket, keep caption text only in the committed file
const byNewest = (a, b) => (a.timestamp < b.timestamp ? 1 : -1)
const trim = (arr) => arr.sort(byNewest).slice(0, MAX_PER_BUCKET).map((x) => x.caption)

const out = {
  fetchedAt: new Date().toISOString(),
  ullim: {
    artistCaptions: trim(buckets.ullim.artistCaptions),
    posterCaptions: trim(buckets.ullim.posterCaptions),
  },
  dfz: {
    artistCaptions: trim(buckets.dfz.artistCaptions),
    posterCaptions: trim(buckets.dfz.posterCaptions),
  },
}

const { writeFileSync, mkdirSync } = await import('node:fs')
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

for (const brand of ['ullim', 'dfz']) {
  console.log(`${brand}: ${out[brand].artistCaptions.length} artist captions, ${out[brand].posterCaptions.length} poster captions`)
}
console.log(`Wrote ${OUT.pathname}`)
console.log('Review the file, then commit it — the prompts pick it up automatically.')
