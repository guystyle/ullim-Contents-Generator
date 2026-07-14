import { NextResponse } from 'next/server'
import { fetchRealExamples, getInstaStatus } from '@/lib/insta-examples'

// Diagnostic endpoint: shows whether the live Instagram few-shot pipeline works.
// Protected by the site login (middleware), same as the rest of the app.
// Must not be statically prerendered — it reports live runtime state.
export const dynamic = 'force-dynamic'

export async function GET() {
  const examples = await fetchRealExamples()
  return NextResponse.json({
    ...getInstaStatus(),
    exampleCounts: {
      ullim: {
        artistCaptions: examples.ullim.artistCaptions.length,
        posterCaptions: examples.ullim.posterCaptions.length,
      },
      dfz: {
        artistCaptions: examples.dfz.artistCaptions.length,
        posterCaptions: examples.dfz.posterCaptions.length,
      },
    },
  })
}
