// MensSana — SPA
// Supabase Auth + chat persistence + Claude via Edge Function

const SUPABASE_URL      = 'https://sycfzysiwshdijeintyt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2Z6eXNpd3NoZGlqZWludHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk2MzUsImV4cCI6MjA5MDIyNTYzNX0.jaZwlY7dmWIHUm57L6j_gWkK9IIGn27-k2mV_n1PoDc'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── State ────────────────────────────────────────────────
let currentUser         = null
let currentConversation = null
let isSending           = false
let appInitialized      = false

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

function isNetworkError (err) {
  return err?.message?.toLowerCase().includes('fetch') ||
         err?.message?.toLowerCase().includes('network')
}

function showOffline () {
  showBanner('Kein Internet — Gespräche können gerade nicht gesendet werden.', true)
  sendBtn.disabled = true
}

function showOnline () {
  showBanner('')
  sendBtn.disabled = false
}

async function initApp (user) {
  if (appInitialized) return
  appInitialized = true
  currentUser = user
  headerUser.textContent = user.email
  showApp()
  await loadOrCreateConversation()
  await loadMessages()
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && !appInitialized)) {
    if (session?.user) setTimeout(() => initApp(session.user), 0)
  } else if (event === 'SIGNED_OUT') {
    appInitialized      = false
    currentUser         = null
    currentConversation = null
    showLogin()
  }
})

// ── Session helpers ───────────────────────────────────────
function isAuthError (err) {
  const msg = (err?.message ?? err?.code ?? '').toLowerCase()
  return msg.includes('jwt') || msg.includes('session') ||
         msg.includes('auth') || msg.includes('401')
}

function handleSessionExpired () {
  appInitialized      = false
  currentUser         = null
  currentConversation = null
  showLogin()
  setLoginStatus('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', true)
}

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

// ── Confirm dialog ────────────────────────────────────────
const confirmOverlay = document.getElementById('confirm-overlay')
const confirmText    = document.getElementById('confirm-text')
const confirmYes     = document.getElementById('confirm-yes')
const confirmNo      = document.getElementById('confirm-no')

function showConfirm (message, yesLabel, onConfirm) {
  confirmText.textContent  = message
  confirmYes.textContent   = yesLabel
  confirmOverlay.classList.remove('hidden')
  confirmYes.focus()

  const cleanup = () => confirmOverlay.classList.add('hidden')

  confirmYes.onclick = () => { cleanup(); onConfirm() }
  confirmNo.onclick  = cleanup
}

// ── Logout ───────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  showConfirm(
    'Möchten Sie sich wirklich abmelden?',
    'Ja, abmelden',
    async () => {
      logoutBtn.disabled = true
      const { error } = await sb.auth.signOut()
      if (error) {
        showBanner('Abmelden fehlgeschlagen: ' + error.message, true)
        logoutBtn.disabled = false
      }
    }
  )
})

// ── Status banner ─────────────────────────────────────────
function showBanner (msg, isError = false) {
  let banner = document.getElementById('app-banner')
  if (!banner) {
    banner = document.createElement('div')
    banner.id = 'app-banner'
    banner.style.cssText = 'padding:10px 24px;font-size:.9rem;text-align:center'
    messagesEl.before(banner)
  }
  banner.textContent  = msg
  banner.style.background = isError ? '#fdecea' : '#eaf4ee'
  banner.style.color      = isError ? '#c0392b'  : '#2d6a4f'
  if (!msg) banner.remove()
}

// ── Conversations ─────────────────────────────────────────
async function loadOrCreateConversation () {
  const { data, error } = await sb
    .from('conversations')
    .select('id, title')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isNetworkError(error)) showOffline()
    else if (isAuthError(error)) handleSessionExpired()
    else showBanner('Verbindungsfehler: ' + error.message, true)
    return
  }

  if (data) {
    currentConversation = data
  } else {
    await createNewConversation()
  }
}

async function createNewConversation () {
  const { data, error } = await sb
    .from('conversations')
    .insert({ user_id: currentUser.id, title: 'Gespräch' })
    .select()
    .single()

  if (error) {
    showBanner('Gespräch konnte nicht angelegt werden: ' + error.message, true)
    return
  }
  currentConversation = data
}

newConvBtn.addEventListener('click', () => {
  showConfirm(
    'Möchten Sie ein neues Gespräch beginnen? Das aktuelle Gespräch bleibt gespeichert.',
    'Ja, neu starten',
    async () => {
      await createNewConversation()
      messagesEl.innerHTML = ''
      appendWelcome()
    }
  )
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
  sendBtn.textContent  = 'Wird gesendet…'
  messageInput.value   = ''
  autoResize()

  let typingEl = null

  try {
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
    typingEl             = document.createElement('div')
    typingEl.className   = 'message assistant typing'
    typingEl.textContent = 'Ich überlege kurz…'
    messagesEl.appendChild(typingEl)
    messagesEl.scrollTop = messagesEl.scrollHeight

    const session = (await sb.auth.getSession()).data.session
    const fnRes = await fetch(
      'https://sycfzysiwshdijeintyt.supabase.co/functions/v1/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
          'apikey':        SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: history ?? [] }),
      }
    )

    typingEl.remove()
    typingEl = null

    let fnJson = null
    const rawBody = await fnRes.text()
    if (fnRes.ok) {
      try { fnJson = JSON.parse(rawBody) } catch (_) {}
      if (!fnJson?.content?.trim()) {
        showBanner(`DEBUG HTTP ${fnRes.status}: ${rawBody.slice(0, 200)}`, true)
      }
    } else {
      showBanner(`Fehler ${fnRes.status}: ${rawBody}`, true)
    }
    const reply = fnJson?.content?.trim() ||
      'Entschuldigung, ich konnte gerade nicht antworten. Bitte versuchen Sie es noch einmal.'

    appendMessage('assistant', reply)

    // Persist assistant message
    if (fnJson?.content?.trim()) {
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

  } catch (err) {
    if (typingEl) typingEl.remove()
    if (isNetworkError(err)) {
      showOffline()
      appendMessage('assistant', 'Kein Internet — bitte versuchen Sie es erneut wenn Sie wieder online sind.')
    } else if (isAuthError(err)) {
      handleSessionExpired()
    } else {
      appendMessage('assistant', 'Entschuldigung, es ist ein Fehler aufgetreten.')
    }
  } finally {
    isSending           = false
    sendBtn.disabled    = messageInput.value.trim() === ''
    sendBtn.textContent = 'Senden'
    messageInput.focus()
  }
}

// ── Offline detection ─────────────────────────────────────
window.addEventListener('offline', showOffline)
window.addEventListener('online', () => {
  showOnline()
  if (currentUser && !currentConversation) {
    loadOrCreateConversation().then(() => loadMessages())
  }
})

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
messageInput.addEventListener('input', () => {
  autoResize()
  sendBtn.disabled = messageInput.value.trim() === '' || isSending
})
