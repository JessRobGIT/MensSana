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

interface TodoItem {
  title:     string
  list_name: string
  due_at?:   string
}

interface TodoAction {
  type:      'add'
  list_name: string
  title:     string
}

interface ParsedResponse {
  reply:        string
  mood:         string
  todo_action?: TodoAction
}

const VALID_MOODS = new Set(['positive', 'neutral', 'subdued', 'concerned'])

function extractParsed(text: string): ParsedResponse | null {
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

function buildSystemPrompt(todos?: TodoItem[]): string {
  const todoContext = todos?.length
    ? `\nAktuelle offene Aufgaben des Nutzers:\n${todos.map(t =>
        `- ${t.title}${t.due_at ? ` (fällig: ${t.due_at})` : ''} [${t.list_name}]`
      ).join('\n')}\nErwähne diese Aufgaben nur wenn der Nutzer danach fragt oder sie klar relevant sind.\n`
    : ''

  return `Du bist MensSana, ein einfühlsamer KI-Begleiter für ältere Menschen.
Du hilfst bei Gesprächen, Orientierung im Alltag und emotionaler Unterstützung.
Antworte immer auf Deutsch, in kurzen, klaren Sätzen.
Sei warm, geduldig und verständnisvoll. Vermeide technische Fachbegriffe.
${todoContext}
Antworte IMMER ausschließlich als JSON-Objekt (kein Markdown, kein weiterer Text).

Standardformat:
{"reply":"<deine deutsche Antwort>","mood":"<eine von: positive, neutral, subdued, concerned>"}

Wenn der Nutzer explizit bittet, eine Aufgabe oder einen Eintrag auf eine Liste zu schreiben (z.B. "schreib auf", "erinnere mich", "füg hinzu", "trag ein"), dann ergänze ein todo_action-Feld:
{"reply":"<antwort>","mood":"<stimmung>","todo_action":{"type":"add","list_name":"<listenname>","title":"<aufgabentitel>"}}

Regeln für todo_action:
- list_name: genutzten Listennamen übernehmen (z.B. "Einkaufen", "Aufgaben"). Standard wenn unklar: "Aufgaben"
- title: den Aufgabentitel kurz und präzise formulieren
- Nur bei eindeutigem Auftrag zum Anlegen — sonst KEIN todo_action-Feld

Wähle die Stimmung anhand der letzten User-Nachricht:
- positive: fröhlich, dankbar, energetisch, optimistisch
- neutral: ruhig, sachlich, informierend, alltäglich
- subdued: müde, zurückgezogen, wenig Energie, still
- concerned: besorgt, traurig, ängstlich, verwirrt, klagend`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { messages, context }: { messages: Message[]; context?: { todos?: TodoItem[] } } = await req.json()

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
        system: buildSystemPrompt(context?.todos),
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

    const parsed     = extractParsed(raw)
    const content    = parsed?.reply || raw
    const mood       = (parsed?.mood && VALID_MOODS.has(parsed.mood)) ? parsed.mood : 'neutral'
    const todoAction = parsed?.todo_action?.type === 'add' ? parsed.todo_action : undefined

    return new Response(
      JSON.stringify({ content, mood, todo_action: todoAction }),
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
