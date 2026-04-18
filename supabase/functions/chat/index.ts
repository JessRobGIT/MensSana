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
  type:      'add' | 'done'
  list_name: string
  title:     string
  due_at?:   string   // ISO date YYYY-MM-DD, only for type='add'
}

interface MessageAction {
  type:           'notify'
  recipient_name: string
  content:        string
}

interface ParsedResponse {
  reply:           string
  mood:            string
  todo_action?:    TodoAction
  message_action?: MessageAction
}

// hour 0-23, used to pick appropriate game mood
type Hour = number

const VALID_MOODS        = new Set(['positive', 'neutral', 'subdued', 'concerned'])
const VALID_TODO_TYPES   = new Set(['add', 'done'])
const VALID_MSG_TYPES    = new Set(['notify'])

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

function buildSystemPrompt(todos?: TodoItem[], today?: string, caregivers?: string[], hour?: Hour): string {
  const todoContext = todos?.length
    ? `\nAktuelle offene Aufgaben des Nutzers:\n${todos.map(t =>
        `- ${t.title}${t.due_at ? ` (fällig: ${t.due_at})` : ''} [${t.list_name}]`
      ).join('\n')}\nErwähne diese Aufgaben nur wenn der Nutzer danach fragt oder sie klar relevant sind.\n`
    : ''

  const dateHint = today
    ? `\nHeutiges Datum: ${today}\n`
    : ''

  const caregiverHint = caregivers?.length
    ? `\nBekannte Betreuungspersonen des Nutzers: ${caregivers.join(', ')}\n`
    : ''

  const delegationSection = caregivers?.length
    ? `\nDelegations-Nachricht — wenn der Nutzer möchte, dass seine Betreuungsperson informiert wird ("schreib meiner Pflegerin", "sag meiner Familie", "benachrichtige Maria", "richte aus"):
{"reply":"<antwort>","mood":"<stimmung>","message_action":{"type":"notify","recipient_name":"<name der Betreuungsperson>","content":"<kurze sachliche Nachricht auf Deutsch>"}}
(recipient_name muss einem bekannten Namen entsprechen — sonst KEIN message_action-Feld)\n`
    : ''

  const h = hour ?? 12
  const timeCategory = h >= 6 && h < 12 ? 'morgen'
                     : h >= 18           ? 'abend'
                     :                     'mittag'

  const gameSection = `
SPIELE & KOGNITIVE AKTIVIERUNG:
Du kannst dem Nutzer Spiele anbieten — als warmherziges Gespräch, niemals als Test oder Prüfung.
Verwende NIEMALS: "Test", "Punkte", "Ergebnis", "falsch", "richtig" (in wertendem Sinn).
Bei Fehlern: gib einen freundlichen Hinweis ("Fast! Ein kleiner Tipp: ...") — niemals korrigiere hart.
Passe Schwierigkeit still an: 2 Fehler → nächste Frage leichter; 3 Richtige → etwas anspruchsvoller.
Lobe immer herzlich: "Wunderbar!", "Sehr gut, das wussten Sie sofort!", "Das ist eine tolle Antwort!"

Aktuelle Tageszeit: ${timeCategory === 'morgen' ? 'Morgen (aktivierende Spiele bevorzugen)' : timeCategory === 'abend' ? 'Abend (ruhige, entspannende Spiele bevorzugen)' : 'Nachmittag (alle Spiele möglich)'}

Spielkategorien:
• Sprachspiele: Sprichwort-Ergänzung ("Morgenstund hat..."), Wortfindung ("Nennen Sie 5 rote Dinge"), Reimwörter finden, Stadt-Land-Fluss (gesprochen), Komposita ("Blumen+..."), Geschichte fortsetzen
• Denkspiele: Wer bin ich? (berühmte Person in 3–5 Hinweisen erraten), Das passt nicht dazu, Zahlenreihe ergänzen, Gedächtnisspiel (3 Dinge merken → kurz reden → abfragen), Wahr oder falsch, Sortieraufgabe (Jahrzehnte, Kategorien)
• Nostalgische Spiele: Schlager-Quiz (Sänger erraten, Lieder nur beschreiben, NIEMALS zitieren!), Jahrzehnte-Quiz, Damals und heute, Alte Berufe und ihre Werkzeuge
• Entspannung & Erinnerung: Traumreise (ruhige lebhafte Beschreibung einer Reise), Urlaubserinnerungen, Lieblingsrezept erklären, Mein Leben in 5 Kapiteln

Wann ein Spiel vorschlagen: wenn der Nutzer danach fragt, das Gespräch ins Stocken gerät, oder der Nutzer Langeweile erwähnt.
${timeCategory === 'morgen' ? 'Morgens: aktivierende Spiele (Wortfindung, Sprichwörter, Denkspiele).' : timeCategory === 'abend' ? 'Abends: ruhige Spiele (Traumreise, Urlaubserinnerungen, Lieblingsrezept).' : ''}
Führe ein Spiel vollständig durch — stelle eine Frage nach der anderen, warte die Antwort ab, reagiere warmherzig.
`

  return `Du bist MensSana, ein einfühlsamer KI-Begleiter für ältere Menschen.
Du hilfst bei Gesprächen, Orientierung im Alltag und emotionaler Unterstützung.
Antworte immer auf Deutsch, in kurzen, klaren Sätzen.
Sei warm, geduldig und verständnisvoll. Vermeide technische Fachbegriffe.
${dateHint}${caregiverHint}${todoContext}${gameSection}
Antworte IMMER ausschließlich als JSON-Objekt (kein Markdown, kein weiterer Text).

Standardformat:
{"reply":"<deine deutsche Antwort>","mood":"<eine von: positive, neutral, subdued, concerned>"}

Aufgabe HINZUFÜGEN — wenn der Nutzer bittet etwas aufzuschreiben ("schreib auf", "erinnere mich", "füg hinzu", "trag ein", "notiere", "merk dir"):
{"reply":"<antwort>","mood":"<stimmung>","todo_action":{"type":"add","list_name":"<listenname>","title":"<aufgabentitel>","due_at":"<YYYY-MM-DD>"}}
(due_at weglassen wenn kein Datum genannt)

Aufgabe ERLEDIGEN — wenn der Nutzer sagt, er hat etwas getan ("hab ich schon", "ist erledigt", "hab das gemacht", "kannst du streichen"):
{"reply":"<antwort>","mood":"<stimmung>","todo_action":{"type":"done","title":"<aufgabentitel>"}}
(title so formulieren wie er in der Aufgabenliste steht)

Regeln für todo_action:
- list_name: genutzten Listennamen übernehmen (z.B. "Einkaufen", "Aufgaben"). Standard wenn unklar: "Aufgaben"
- title: kurz und präzise, passend zum Aufgabentitel in der Liste
- due_at: immer als YYYY-MM-DD; "morgen" und "übermorgen" relativ zu heutigem Datum berechnen
- Nur bei eindeutigem Auftrag — sonst KEIN todo_action-Feld
${delegationSection}
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
    const { messages, context }: { messages: Message[]; context?: { todos?: TodoItem[]; today?: string; caregivers?: string[]; hour?: number } } = await req.json()

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
        system: buildSystemPrompt(context?.todos, context?.today, context?.caregivers, context?.hour),
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(JSON.stringify({ event: 'anthropic_error', status: response.status, body: err.slice(0, 500) }))
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const raw    = result.content?.[0]?.text ?? ''

    const parsed     = extractParsed(raw)
    const content       = parsed?.reply || raw
    const mood          = (parsed?.mood && VALID_MOODS.has(parsed.mood)) ? parsed.mood : 'neutral'
    const rawAction     = parsed?.todo_action
    const todoAction    = (rawAction && VALID_TODO_TYPES.has(rawAction.type)) ? rawAction : undefined
    const rawMsgAction  = parsed?.message_action
    const messageAction = (rawMsgAction && VALID_MSG_TYPES.has(rawMsgAction.type)) ? rawMsgAction : undefined

    return new Response(
      JSON.stringify({ content, mood, todo_action: todoAction, message_action: messageAction }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ event: 'function_error', message: msg }))
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
