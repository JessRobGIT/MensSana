import "@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role:    'user' | 'assistant'
  content: string
}

Deno.serve(async (req) => {
  // CORS preflight
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
Wenn du nach Terminen, Medikamenten oder der Uhrzeit gefragt wirst, erkläre freundlich, dass du dafür noch mehr Informationen brauchst.`,
        messages: messages,
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
    const content = result.content?.[0]?.text ?? ''

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
