// MensSana — SPA
// Supabase Auth + chat persistence + Claude via Edge Function

const SUPABASE_URL      = 'https://sycfzysiwshdijeintyt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2Z6eXNpd3NoZGlqZWludHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk2MzUsImV4cCI6MjA5MDIyNTYzNX0.jaZwlY7dmWIHUm57L6j_gWkK9IIGn27-k2mV_n1PoDc'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── State ────────────────────────────────────────────────
let currentUser         = null
let currentConversation = null
let isSending           = false

// ── DOM refs ─────────────────────────────────────────────
const loginView    = document.getElementById('login-view')
const appView      = document.getElementById('app-view')
const loginForm    = document.getElementById('login-form')
const signupBtn    = document.getElementById('signup-btn')
const loginStatus  = document.getElementById('login-status')
const emailInput   = document.getElementById('email')
const passwordInput= document.getElementById('password')
const messagesEl   = document.getElementById('messages')
const messageInput = document.getElementById('message-input')
const sendBtn      = document.getElementById('send-btn')
const logoutBtn    = document.getElementById('logout-btn')
const newConvBtn   = document.getElementById('new-conv-btn')
const headerUser   = document.getElementById('header-user')

// ── Auth state ───────────────────────────────────────────
sb.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    currentUser = session.user
    headerUser.textContent = currentUser.email
    showApp()
    await loadOrCreateConversation()
    await loadMessages()
  } else {
    currentUser         = null
    currentConversation = null
    showLogin()
  }
})

// ── View helpers ─────────────────────────────────────────
function showLogin () {
  loginView.style.display = 'flex'
  appView.style.display   = 'none'
}

function showApp () {
  loginView.style.display = 'none'
  appView.style.display   = 'flex'
}

function setLoginStatus (msg, isError = false) {
  loginStatus.textContent = msg
  loginStatus.className   = 'status-msg' + (isError ? ' error' : '')
}

// ── Login ────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email    = emailInput.value.trim()
  const password = passwordInput.value

  if (!email || !password) {
    setLoginStatus('Bitte E-Mail und Passwort eingeben.', true)
    return
  }

  setLoginStatus('Einen Moment …')
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) setLoginStatus(formatAuthError(error), true)
  else setLoginStatus('')
})

signupBtn.addEventListener('click', async () => {
  const email    = emailInput.value.trim()
  const password = passwordInput.value

  if (!email || !password) {
    setLoginStatus('Bitte E-Mail und Passwort eingeben.', true)
    return
  }
  if (password.length < 6) {
    setLoginStatus('Das Passwort muss mindestens 6 Zeichen haben.', true)
    return
  }

  setLoginStatus('Konto wird erstellt …')
  const { error } = await sb.auth.signUp({ email, password })
  if (error) setLoginStatus(formatAuthError(error), true)
  else setLoginStatus('Bitte bestätigen Sie Ihre E-Mail-Adresse.')
})

function formatAuthError (error) {
  const map = {
    'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
    'Email not confirmed':        'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.',
    'User already registered':    'Diese E-Mail-Adresse ist bereits registriert.',
  }
  return map[error.message] ?? error.message
}

// ── Logout ───────────────────────────────────────────────
logoutBtn.addEventListener('click', () => sb.auth.signOut())

// ── Conversations ─────────────────────────────────────────
async function loadOrCreateConversation () {
  const { data } = await sb
    .from('conversations')
    .select('id, title')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data) {
    currentConversation = data
  } else {
    await createNewConversation()
  }
}

async function createNewConversation () {
  const { data } = await sb
    .from('conversations')
    .insert({ user_id: currentUser.id, title: 'Gespräch' })
    .select()
    .single()
  currentConversation = data
}

newConvBtn.addEventListener('click', async () => {
  await createNewConversation()
  messagesEl.innerHTML = ''
  appendWelcome()
})

// ── Messages ──────────────────────────────────────────────
async function loadMessages () {
  if (!currentConversation) return
  messagesEl.innerHTML = ''

  const { data } = await sb
    .from('messages')
    .select('role, content')
    .eq('conversation_id', currentConversation.id)
    .order('created_at', { ascending: true })

  if (data?.length) {
    data.forEach(m => appendMessage(m.role, m.content))
  } else {
    appendWelcome()
  }
}

function appendWelcome () {
  appendMessage(
    'assistant',
    'Guten Tag! Ich bin MensSana, Ihr persönlicher Begleiter. ' +
    'Wie kann ich Ihnen heute helfen?'
  )
}

function appendMessage (role, content) {
  const div       = document.createElement('div')
  div.className   = `message ${role}`
  div.textContent = content
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return div
}

// ── Send ──────────────────────────────────────────────────
async function sendMessage () {
  const text = messageInput.value.trim()
  if (!text || isSending || !currentConversation) return

  isSending            = true
  sendBtn.disabled     = true
  messageInput.value   = ''
  autoResize()

  appendMessage('user', text)

  // Persist user message
  await sb.from('messages').insert({
    conversation_id: currentConversation.id,
    role:            'user',
    content:         text,
  })

  // Fetch recent history for context (last 20 messages)
  const { data: history } = await sb
    .from('messages')
    .select('role, content')
    .eq('conversation_id', currentConversation.id)
    .order('created_at', { ascending: true })
    .limit(20)

  // Typing indicator
  const typingEl     = document.createElement('div')
  typingEl.className = 'message assistant typing'
  typingEl.textContent = '…'
  messagesEl.appendChild(typingEl)
  messagesEl.scrollTop = messagesEl.scrollHeight

  try {
    const { data: fnData, error: fnError } = await sb.functions.invoke('chat', {
      body: { messages: history ?? [] },
    })

    typingEl.remove()

    const reply = fnError
      ? 'Entschuldigung, ich konnte gerade nicht antworten. Bitte versuchen Sie es noch einmal.'
      : (fnData?.content ?? 'Entschuldigung, es ist ein unbekannter Fehler aufgetreten.')

    appendMessage('assistant', reply)

    // Persist assistant message
    if (!fnError) {
      await sb.from('messages').insert({
        conversation_id: currentConversation.id,
        role:            'assistant',
        content:         reply,
      })
    }

    // Update conversation timestamp
    await sb
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversation.id)

  } catch (_err) {
    typingEl.remove()
    appendMessage('assistant', 'Entschuldigung, es ist ein Fehler aufgetreten.')
  }

  isSending        = false
  sendBtn.disabled = false
  messageInput.focus()
}

sendBtn.addEventListener('click', sendMessage)

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// Auto-resize textarea
function autoResize () {
  messageInput.style.height = 'auto'
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px'
}
messageInput.addEventListener('input', autoResize)
