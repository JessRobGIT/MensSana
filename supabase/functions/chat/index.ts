import "@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Message {
  role:    'user' | 'assistant'
  content: string
}

const VALID_MOODS = new Set(['positive', 'neutral', 'subdued', 'concerned'])

function extractParsed(text: string): { reply: string; mood: string } | null {
  // Strip optional markdown code fences
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    const obj = JSON.parse(cleaned)
    if (typeof obj.reply === 'string') return obj
  } catch { /* fall through */ }
  // Try to find a JSON object anywhere in the text
  const match = text.match(/\{[\s\S]*?"reply"\s*:[\s\S]*?\}/)
  if (match) {
    try {
      const obj = JSON.parse(match[0])
      if (typeof obj.reply === 'string') return obj
    } catch { /* fall through */ }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { messages }: { messages: Message[] } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `Du bist MensSana, ein einfühlsamer KI-Begleiter für ältere Menschen.
Du hilfst bei Gesprächen, Orientierung im Alltag und emotionaler Unterstützung.
Antworte immer auf Deutsch, in kurzen, klaren Sätzen.
Sei warm, geduldig und verständnisvoll. Vermeide technische Fachbegriffe.
Wenn du nach Terminen, Medikamenten oder der Uhrzeit gefragt wirst, erkläre freundlich, dass du dafür noch mehr Informationen brauchst.

Antworte IMMER ausschließlich als JSON-Objekt in diesem exakten Format (kein Markdown, kein weiterer Text):
{"reply":"<deine deutsche Antwort>","mood":"<eine von: positive, neutral, subdued, concerned>"}

Wähle die Stimmung anhand der letzten User-Nachricht:
- positive: fröhlich, dankbar, energetisch, optimistisch
- neutral: ruhig, sachlich, informierend, alltäglich
- subdued: müde, zurückgezogen, wenig Energie, still
- concerned: besorgt, traurig, ängstlich, verwirrt, klagend`,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const raw    = result.content?.[0]?.text ?? ''

    const parsed = extractParsed(raw)
    const content = parsed?.reply || raw
    const mood    = (parsed?.mood && VALID_MOODS.has(parsed.mood)) ? parsed.mood : 'neutral'

    return new Response(
      JSON.stringify({ content, mood }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Function error:', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
