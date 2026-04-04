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
let _medications        = []
let _editingMedId       = null

// ── DOM refs ─────────────────────────────────────────────
const loginView        = document.getElementById('login-view')
const appView          = document.getElementById('app-view')
const loginForm        = document.getElementById('login-form')
const signupBtn        = document.getElementById('signup-btn')
const backToLoginBtn   = document.getElementById('back-to-login-btn')
const loginStatus      = document.getElementById('login-status')
const emailInput       = document.getElementById('email')
const passwordInput    = document.getElementById('password')
const nameInput        = document.getElementById('name')
const nameGroup        = document.getElementById('name-group')
const messagesEl      = document.getElementById('messages')
const messageInput    = document.getElementById('message-input')
const sendBtn         = document.getElementById('send-btn')
const logoutBtn       = document.getElementById('logout-btn')
const newConvBtn      = document.getElementById('new-conv-btn')
const headerUser      = document.getElementById('header-user')
const historyPanel    = document.getElementById('history-panel')
const historyToggle   = document.getElementById('history-toggle-btn')
const convList        = document.getElementById('conversation-list')
const medsBtn        = document.getElementById('meds-btn')
const todoBtn        = document.getElementById('todo-btn')
const todoSection    = document.getElementById('todo-section')
const todoBack       = document.getElementById('todo-back')
const todoAddListBtn = document.getElementById('todo-add-list-btn')
const todoListsBar   = document.getElementById('todo-lists-bar')
const todoItemsList  = document.getElementById('todo-items-list')
const todoNewTitle   = document.getElementById('todo-new-title')
const todoAddItemBtn = document.getElementById('todo-add-item-btn')
const todoFormOverlay      = document.getElementById('todo-form-overlay')
const todoFormTitleEl      = document.getElementById('todo-form-title')
const todoFormTitleInput   = document.getElementById('todo-form-title-input')
const todoFormNotes        = document.getElementById('todo-form-notes')
const todoFormDue          = document.getElementById('todo-form-due')
const todoFormList         = document.getElementById('todo-form-list')
const todoFormSave         = document.getElementById('todo-form-save')
const todoFormCancel       = document.getElementById('todo-form-cancel')
const todoFormArchive      = document.getElementById('todo-form-archive')
const medsSection    = document.getElementById('meds-section')
const chatSection    = document.getElementById('chat-section')
const medsBack       = document.getElementById('meds-back')
const medsAddBtn     = document.getElementById('meds-add-btn')
const medsList       = document.getElementById('meds-list')
const calBtn         = document.getElementById('cal-btn')
const calSection     = document.getElementById('calendar-section')
const calBack        = document.getElementById('calendar-back')
const calAddBtn      = document.getElementById('calendar-add-btn')
const calCompact      = document.getElementById('cal-compact')
const calEntriesList  = document.getElementById('cal-entries-list')
const calPeriodTitle  = document.getElementById('cal-period-title')
const calPrevBtn      = document.getElementById('cal-prev')
const calNextBtn      = document.getElementById('cal-next')
const calFullOverlay  = document.getElementById('cal-full-overlay')
const calFullGrid     = document.getElementById('cal-full-grid')
const calFullTitle    = document.getElementById('cal-full-title')
const calFullPrevBtn  = document.getElementById('cal-full-prev')
const calFullNextBtn  = document.getElementById('cal-full-next')
const calFullCloseBtn = document.getElementById('cal-full-close')
const calFormOverlay    = document.getElementById('cal-form-overlay')
const calFormTitle      = document.getElementById('cal-form-title')
const calFormSave       = document.getElementById('cal-form-save')
const calFormCancel     = document.getElementById('cal-form-cancel')
const calFormDelete     = document.getElementById('cal-form-delete')
const calTitleInput     = document.getElementById('cal-title')
const calDateInput      = document.getElementById('cal-date')
const calAlldayInput    = document.getElementById('cal-allday')
const calTimeGroup      = document.getElementById('cal-time-group')
const calTimeInput      = document.getElementById('cal-time')
const calRecurringInput = document.getElementById('cal-recurring')
const calEndGroup       = document.getElementById('cal-end-group')
const calEndDateInput   = document.getElementById('cal-end-date')
const calNotesInput     = document.getElementById('cal-notes')
const medFormOverlay = document.getElementById('med-form-overlay')
const medFormTitle   = document.getElementById('med-form-title')
const medFormSave    = document.getElementById('med-form-save')
const medFormCancel  = document.getElementById('med-form-cancel')
const medNameInput   = document.getElementById('med-name')
const medDosageInput = document.getElementById('med-dosage')
const medTimeInput   = document.getElementById('med-time')
const medFreqInput   = document.getElementById('med-frequency')
const medNotesInput  = document.getElementById('med-notes')

// ── Auth state ───────────────────────────────────────────

let _signupMode = false

function enterSignupMode () {
  _signupMode = true
  nameGroup.classList.remove('hidden')
  nameInput.focus()
  signupBtn.textContent = 'Registrieren'
  backToLoginBtn.style.display = ''
  setLoginStatus('')
}

function exitSignupMode () {
  _signupMode = false
  nameGroup.classList.add('hidden')
  nameInput.value = ''
  signupBtn.textContent = 'Neues Konto erstellen'
  backToLoginBtn.style.display = 'none'
  setLoginStatus('')
}

function isNetworkError (err) {
  return err?.message?.toLowerCase().includes('fetch') ||
         err?.message?.toLowerCase().includes('network')
}

// ── Offline queue ─────────────────────────────────────────
// Each item: { convId, text, el }  (el = DOM node with .pending class)
let _offlineQueue = []
let _isFlushing   = false

function updateOfflineBanner () {
  const n = _offlineQueue.length
  if (!n) { showBanner(''); return }
  const noun = n === 1 ? 'Nachricht wird' : `${n} Nachrichten werden`
  showBanner(`Offline — ${noun} gesendet sobald Sie wieder online sind.`, true)
}

function enqueueMessage (convId, text) {
  const el = appendMessage('user', text)
  el.classList.add('pending')
  _offlineQueue.push({ convId, text, el })
  updateOfflineBanner()
}

async function flushQueue () {
  if (!_offlineQueue.length || _isFlushing) return
  _isFlushing = true

  while (_offlineQueue.length) {
    const item = _offlineQueue[0]
    try {
      await sb.from('messages').insert({
        conversation_id: item.convId,
        role:            'user',
        content:         item.text,
      })
      item.el?.classList.remove('pending')
      _offlineQueue.shift()
      await callChatAPI(item.convId)
    } catch (err) {
      if (isNetworkError(err)) break   // still offline — stop and wait
      _offlineQueue.shift()             // other error — skip this item
    }
  }

  _isFlushing = false
  updateOfflineBanner()
}

function showOffline () {
  // Keep send button active so users can queue messages while offline
  if (_offlineQueue.length) {
    updateOfflineBanner()
  } else {
    showBanner('Kein Internet — Nachrichten werden gespeichert und automatisch gesendet.', true)
  }
}

function showOnline () {
  if (!_offlineQueue.length) showBanner('')
  sendBtn.disabled = messageInput.value.trim() === '' || isSending
}

async function initApp (user) {
  if (appInitialized) return
  appInitialized = true
  currentUser = user
  exitSignupMode()

  const { displayName, role } = await ensureProfile(user)

  // Caregivers and family members belong in the dashboard, not here
  if (role === 'caregiver' || role === 'family') {
    window.location.href = '/MensSana/dashboard.html'
    return
  }

  showApp()
  headerUser.textContent = displayName || user.email
  await loadOrCreateConversation()
  await loadMessages()
  await loadConversations()
  loadTodayMood()         // non-blocking
  loadTodoReminder()      // non-blocking — shows overdue banner if needed
}

async function ensureProfile (user) {
  const metaName = user.user_metadata?.display_name?.trim() || null

  const { data: existing } = await sb
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    // No profile row yet — create one (new users always start as 'user')
    await sb.from('profiles').insert({
      id:           user.id,
      display_name: metaName,
      role:         'user',
    })
    return { displayName: metaName, role: 'user' }
  }

  if (!existing.display_name && metaName) {
    // Profile exists but name is blank — fill it in
    await sb.from('profiles').update({ display_name: metaName }).eq('id', user.id)
  }

  return {
    displayName: existing.display_name || metaName,
    role:        existing.role ?? 'user',
  }
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
  // First click: enter signup mode and show name field
  if (!_signupMode) {
    enterSignupMode()
    return
  }

  // Second click: perform registration
  const email    = emailInput.value.trim()
  const password = passwordInput.value
  const name     = nameInput.value.trim()

  if (!email || !password) {
    setLoginStatus('Bitte E-Mail und Passwort eingeben.', true)
    return
  }
  if (password.length < 6) {
    setLoginStatus('Das Passwort muss mindestens 6 Zeichen haben.', true)
    return
  }

  setLoginStatus('Konto wird erstellt …')
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { display_name: name || null } },
  })
  if (error) {
    setLoginStatus(formatAuthError(error), true)
  } else if (data.session) {
    setLoginStatus('')   // session ready — onAuthStateChange fires initApp
  } else {
    setLoginStatus('Bitte bestätigen Sie Ihre E-Mail-Adresse.')
  }
})

backToLoginBtn.addEventListener('click', exitSignupMode)

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

// ── History panel ─────────────────────────────────────────
historyToggle.addEventListener('click', () => {
  historyPanel.classList.toggle('hidden')
})

function formatConvDate (iso) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) {
    return 'Heute, ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
         ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

async function loadConversations () {
  const { data, error } = await sb
    .from('conversations')
    .select('id, title, updated_at, messages(role, content, created_at)')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    convList.innerHTML = `<p class="history-error">Gespräche konnten nicht geladen werden.</p>`
    return
  }

  if (!data?.length) {
    convList.innerHTML = `<p class="history-empty">Noch keine Gespräche.<br>Schreiben Sie einfach los!</p>`
    return
  }

  convList.innerHTML = ''
  data.forEach(conv => {
    const msgs = (conv.messages ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    // First meaningful assistant reply — best shows what the conversation was about
    const firstAssistant = msgs.find(m => m.role === 'assistant' && m.content?.trim())
    const previewRaw = firstAssistant?.content ?? msgs[0]?.content ?? ''
    const preview    = previewRaw.length > 70 ? previewRaw.slice(0, 70) + '…' : previewRaw || 'Kein Inhalt'

    const msgCount   = msgs.length
    const countLabel = msgCount === 1 ? '1 Nachricht' : `${msgCount} Nachrichten`

    const btn = document.createElement('button')
    btn.className = 'conv-item' + (conv.id === currentConversation?.id ? ' active' : '')
    btn.setAttribute('role', 'listitem')
    btn.innerHTML = `
      <span class="conv-date">${formatConvDate(conv.updated_at)} · ${countLabel}</span>
      <span class="conv-preview">${escapeHtml(preview)}</span>
      <button class="conv-delete" data-id="${conv.id}" title="Gespräch löschen">Löschen</button>
    `
    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('conv-delete')) return
      openConversation(conv)
    })
    btn.querySelector('.conv-delete').addEventListener('click', (e) => {
      e.stopPropagation()
      showConfirm(
        'Dieses Gespräch und alle Nachrichten darin löschen?',
        'Ja, löschen',
        () => deleteConversation(conv.id)
      )
    })
    convList.appendChild(btn)
  })
}

function escapeHtml (str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function openConversation (conv) {
  currentConversation = conv
  await loadMessages()
  // Mark active in list
  convList.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'))
  const active = [...convList.querySelectorAll('.conv-item')]
    .find(el => el.querySelector('.conv-delete')?.dataset.id === conv.id)
  if (active) active.classList.add('active')
  // On mobile: close panel after selecting
  if (window.innerWidth < 700) historyPanel.classList.add('hidden')
}

async function deleteConversation (id) {
  await sb.from('messages').delete().eq('conversation_id', id)
  await sb.from('conversations').delete().eq('id', id)

  if (currentConversation?.id === id) {
    currentConversation = null
    messagesEl.innerHTML = ''
    await loadOrCreateConversation()
    await loadMessages()
  }
  await loadConversations()
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
    console.error('[loadOrCreateConversation] error:', error)
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
  if (_activeSection !== 'chat') {
    showChatView()
    return
  }
  showConfirm(
    'Möchten Sie ein neues Gespräch beginnen? Das aktuelle Gespräch bleibt gespeichert.',
    'Ja, neu starten',
    async () => {
      await createNewConversation()
      messagesEl.innerHTML = ''
      appendWelcome()
      await loadConversations()
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

// ── Medications ───────────────────────────────────────────

let _activeSection = 'chat'

function showSection (name) {
  _activeSection = name
  chatSection.classList.toggle('hidden', name !== 'chat')
  todoSection.classList.toggle('hidden', name !== 'todo')
  medsSection.classList.toggle('hidden', name !== 'meds')
  calSection.classList.toggle('hidden', name !== 'calendar')
}

function showChatView () { showSection('chat') }

function showMedsView () {
  showSection('meds')
  loadMedicationsFromDB().then(meds => { _medications = meds; renderMedications() })
}

function showCalendarView () {
  showSection('calendar')
  loadCalendarFromDB().then(entries => { _calendarEntries = entries; renderCalendarView() })
}

medsBtn.addEventListener('click', showMedsView)
medsBack.addEventListener('click', showChatView)
medsAddBtn.addEventListener('click', () => showMedForm(null))
calBtn.addEventListener('click', showCalendarView)
calBack.addEventListener('click', showChatView)
calAddBtn.addEventListener('click', () => showCalendarForm(null, _calView === 'day' ? isoDate(_calDate) : null))

async function loadMedicationsFromDB () {
  const { data, error } = await sb
    .from('medications')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('time_of_day', { ascending: true })

  if (error) {
    medsList.innerHTML = '<p class="meds-empty" style="color:var(--danger)">Medikamente konnten nicht geladen werden.</p>'
    return []
  }

  return (data ?? []).map(med => ({
    id:        med.id,
    name:      med.name,
    dosage:    med.dosage ?? '',
    time:      med.time_of_day ? String(med.time_of_day).slice(0, 5) : '08:00',
    notes:     med.notes ?? '',
    frequency: med.frequency ?? 'daily',
    active:    med.active ?? true,
  }))
}

function renderMedications () {
  if (!_medications.length) {
    medsList.innerHTML = '<p class="meds-empty">Noch keine Medikamente eingetragen.<br>Tippen Sie auf „+ Hinzufügen".</p>'
    return
  }

  medsList.innerHTML = ''
  const freqLabel = { daily: 'Täglich', weekly: 'Wöchentlich', as_needed: 'Bei Bedarf' }

  _medications.forEach(med => {
    const card = document.createElement('div')
    card.className = 'med-card' + (med.active ? '' : ' inactive')

    const meta = [
      med.dosage && med.dosage,
      med.time && med.time + ' Uhr',
      freqLabel[med.frequency] ?? med.frequency,
    ].filter(Boolean).join(' · ')

    card.innerHTML = `
      <div class="med-card-header">
        <span class="med-name">${escapeHtml(med.name)}</span>
        <label class="med-toggle" title="${med.active ? 'Aktiv' : 'Inaktiv'}">
          <input type="checkbox" ${med.active ? 'checked' : ''}>
          <span class="med-toggle-slider"></span>
        </label>
      </div>
      ${meta ? `<span class="med-meta">${escapeHtml(meta)}</span>` : ''}
      ${med.notes ? `<span class="med-notes">${escapeHtml(med.notes)}</span>` : ''}
      <div class="med-card-actions">
        <button class="btn-edit">Bearbeiten</button>
        <button class="btn-delete">Löschen</button>
      </div>
    `

    // Toggle active
    const toggle = card.querySelector('input[type="checkbox"]')
    toggle.addEventListener('change', async () => {
      const ok = await updateMedicationActiveInDB(med.id, toggle.checked)
      if (!ok) { toggle.checked = !toggle.checked; return }
      med.active = toggle.checked
      card.classList.toggle('inactive', !med.active)
    })

    // Edit
    card.querySelector('.btn-edit').addEventListener('click', () => showMedForm(med))

    // Delete
    card.querySelector('.btn-delete').addEventListener('click', () => {
      showConfirm(
        `„${med.name}" wirklich löschen?`,
        'Ja, löschen',
        async () => {
          await deleteMedicationFromDB(med.id)
          _medications = await loadMedicationsFromDB()
          renderMedications()
        }
      )
    })

    medsList.appendChild(card)
  })
}

function showMedForm (med) {
  _editingMedId            = med?.id ?? null
  medFormTitle.textContent = med ? 'Medikament bearbeiten' : 'Medikament hinzufügen'
  medNameInput.value       = med?.name      ?? ''
  medDosageInput.value     = med?.dosage    ?? ''
  medTimeInput.value       = med?.time      ?? '08:00'
  medFreqInput.value       = med?.frequency ?? 'daily'
  medNotesInput.value      = med?.notes     ?? ''
  medFormOverlay.classList.remove('hidden')
  medNameInput.focus()
}

function hideMedForm () {
  medFormOverlay.classList.add('hidden')
  _editingMedId = null
}

medFormCancel.addEventListener('click', hideMedForm)

medFormSave.addEventListener('click', async () => {
  const name = medNameInput.value.trim()
  if (!name) { medNameInput.focus(); return }

  const med = {
    id:        _editingMedId,
    name,
    dosage:    medDosageInput.value.trim(),
    time:      medTimeInput.value,
    frequency: medFreqInput.value,
    notes:     medNotesInput.value.trim(),
    active:    true,
  }

  const ok = await saveMedicationToDB(med)
  if (!ok) {
    showBanner('Medikament konnte nicht gespeichert werden.', true)
    return
  }

  hideMedForm()
  _medications = await loadMedicationsFromDB()
  renderMedications()
})

async function saveMedicationToDB (med) {
  const payload = {
    user_id:     currentUser.id,
    name:        med.name,
    dosage:      med.dosage || null,
    frequency:   med.frequency ?? 'daily',
    time_of_day: med.time ? med.time + ':00' : null,
    notes:       med.notes || null,
    active:      med.active ?? true,
  }

  if (med.id) {
    const { error } = await sb.from('medications').update({ ...payload, updated_by: currentUser.id }).eq('id', med.id).eq('user_id', currentUser.id)
    return !error
  } else {
    const { error } = await sb.from('medications').insert([{ ...payload, created_by: currentUser.id }])
    return !error
  }
}

async function deleteMedicationFromDB (id) {
  const { error } = await sb.from('medications').delete().eq('id', id).eq('user_id', currentUser.id)
  return !error
}

async function updateMedicationActiveInDB (id, active) {
  const { error } = await sb.from('medications').update({ active }).eq('id', id).eq('user_id', currentUser.id)
  return !error
}

// ── Calendar ──────────────────────────────────────────────

let _calendarEntries = []
let _editingCalId    = null
let _calView         = 'month'
let _calDate         = new Date()

const freqLabel = { once: '', daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', yearly: 'Jährlich' }

function isoDate (d) {
  // Use LOCAL date (not UTC) so calendar cells and event dates always match
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function toLocalISOString (dateStr, timeStr) {
  const d    = new Date(`${dateStr}T${timeStr}`)
  const off  = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const hh   = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const mm   = String(Math.abs(off) % 60).padStart(2, '0')
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`
}
function occursOn (entry, dateStr) {
  if (entry.date > dateStr) return false
  if (entry.endDate && dateStr > entry.endDate) return false
  if (entry.date === dateStr) return true
  if (!entry.frequency || entry.frequency === 'once') return false
  const start    = new Date(entry.date + 'T12:00:00')
  const check    = new Date(dateStr   + 'T12:00:00')
  const diffDays = Math.round((check - start) / 86400000)
  switch (entry.frequency) {
    case 'daily':   return true
    case 'weekly':  return diffDays % 7 === 0
    case 'monthly': return start.getDate() === check.getDate()
    case 'yearly':  return start.getMonth() === check.getMonth() && start.getDate() === check.getDate()
    default:        return false
  }
}
function eventsForDate (dateStr) { return _calendarEntries.filter(e => occursOn(e, dateStr)) }

// ── Navigation ────────────────────────────────────────────

function calNavigate (dir) {
  if (_calView === 'month') {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + dir, 1)
  } else if (_calView === 'week') {
    _calDate = new Date(_calDate.getTime() + dir * 7 * 86400000)
  } else {
    _calDate = new Date(_calDate.getTime() + dir * 86400000)
  }
}

calPrevBtn.addEventListener('click', () => { calNavigate(-1); renderCalendarView() })
calNextBtn.addEventListener('click', () => { calNavigate(1);  renderCalendarView() })

calFullPrevBtn.addEventListener('click', () => { calNavigate(-1); renderFullCalendar(); renderCalendarView() })
calFullNextBtn.addEventListener('click', () => { calNavigate(1);  renderFullCalendar(); renderCalendarView() })
calFullCloseBtn.addEventListener('click', closeFullCalendar)
calFullOverlay.addEventListener('click', e => { if (e.target === calFullOverlay) closeFullCalendar() })

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !calFullOverlay.classList.contains('hidden')) closeFullCalendar()
})

document.querySelectorAll('.cal-view-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    _calView = tab.dataset.view
    document.querySelectorAll('.cal-view-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    renderCalendarView()
    if (!calFullOverlay.classList.contains('hidden')) renderFullCalendar()
  })
})

calCompact.addEventListener('click', e => {
  if (e.target.classList.contains('cal-event-chip')) return
  openFullCalendar()
})

document.getElementById('cal-expand-btn').addEventListener('click', openFullCalendar)

function openFullCalendar () {
  calFullOverlay.classList.remove('hidden')
  renderFullCalendar()
}

function closeFullCalendar () {
  calFullOverlay.classList.add('hidden')
}

// ── Render dispatchers ────────────────────────────────────

function renderCalendarView () {
  renderCalView(calCompact, calPeriodTitle, false)
  renderEntriesList()
}

function renderFullCalendar () {
  renderCalView(calFullGrid, calFullTitle, true)
}

function renderCalView (container, titleEl, isFull) {
  if (_calView === 'month')     renderMonthView(container, titleEl, isFull)
  else if (_calView === 'week') renderWeekView(container, titleEl, isFull)
  else                          renderDayView(container, titleEl, isFull)
}

// ── Entries list ──────────────────────────────────────────

function renderEntriesList () {
  if (!_calendarEntries.length) {
    calEntriesList.innerHTML = '<p class="cal-list-empty">Noch keine Termine eingetragen.<br>Tippen Sie auf „+ Hinzufügen".</p>'
    return
  }

  let html = '<div class="cal-entries-header">Alle Termine</div>'
  _calendarEntries.forEach(entry => {
    const d       = new Date(entry.date + 'T12:00:00')
    const dateStr = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    const timeStr = entry.allDay ? 'Ganztägig' : entry.time + ' Uhr'
    const badge   = entry.frequency && entry.frequency !== 'once' ? ` · ${freqLabel[entry.frequency]}` : ''
    html += `<div class="cal-list-row" data-id="${entry.id}">
      <span class="cal-list-date">${escapeHtml(dateStr)}</span>
      <span class="cal-list-title">${escapeHtml(entry.title)}</span>
      <span class="cal-list-meta">${timeStr}${badge}</span>
    </div>`
  })
  calEntriesList.innerHTML = html

  calEntriesList.querySelectorAll('.cal-list-row').forEach(row => {
    row.addEventListener('click', () => {
      const entry = _calendarEntries.find(e => String(e.id) === row.dataset.id)
      if (entry) showCalendarForm(entry)
    })
  })
}

// ── Month view ────────────────────────────────────────────

function renderMonthView (container, titleEl, isFull) {
  const year     = _calDate.getFullYear()
  const month    = _calDate.getMonth()
  const todayStr = isoDate(new Date())

  titleEl.textContent = _calDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  let html = '<div class="cal-month-grid">'
  dayNames.forEach(n => { html += `<div class="cal-month-header">${n}</div>` })
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day-cell other-month"></div>'

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = isoDate(new Date(year, month, d))
    const events  = eventsForDate(dateStr)
    const isToday = dateStr === todayStr
    html += `<div class="cal-day-cell${isToday ? ' today' : ''}" data-date="${dateStr}">
      <span class="cal-day-num">${d}</span>
      <div class="cal-day-events">${
        events.slice(0, 4).map(e => `<span class="cal-event-chip${e.allDay ? ' allday' : ''}" data-id="${e.id}">${escapeHtml(e.title)}</span>`).join('') +
        (events.length > 4 ? `<span class="cal-more-chips">+${events.length - 4}</span>` : '')
      }</div>
    </div>`
  }

  const remainder = (startDow + lastDay.getDate()) % 7
  if (remainder) for (let i = remainder; i < 7; i++) html += '<div class="cal-day-cell other-month"></div>'
  html += '</div>'
  container.innerHTML = html

  container.querySelectorAll('.cal-day-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.classList.contains('cal-event-chip')) return
      e.stopPropagation()
      _calDate = new Date(cell.dataset.date + 'T12:00:00')
      if (isFull) renderFullCalendar()
      else { renderCalendarView(); openFullCalendar() }
    })
  })

  container.querySelectorAll('.cal-event-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation()
      const entry = _calendarEntries.find(en => String(en.id) === chip.dataset.id)
      if (entry) showCalendarForm(entry)
    })
  })
}

// ── Week view ─────────────────────────────────────────────

function renderWeekView (container, titleEl, isFull) {
  const dow    = (_calDate.getDay() + 6) % 7
  const monday = new Date(_calDate)
  monday.setDate(_calDate.getDate() - dow)

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  const startStr = dates[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  const endStr   = dates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  titleEl.textContent = `${startStr} – ${endStr}`

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const todayStr = isoDate(new Date())

  let html = '<div class="cal-week-grid">'
  dates.forEach((d, i) => {
    const dateStr   = isoDate(d)
    const events    = eventsForDate(dateStr)
    const isToday   = dateStr === todayStr
    const allDay    = events.filter(e => e.allDay)
    const timed     = events.filter(e => !e.allDay)
    const hasAllDay = allDay.length > 0
    const hasTimed  = timed.length > 0

    const allDayHtml = hasAllDay
      ? `<div class="cal-week-allday-col">` +
        allDay.map(e =>
          `<div class="cal-week-event allday" data-id="${e.id}">` +
          `<span class="cal-week-event-time">Ganztg.</span>` +
          `<span class="cal-week-event-title">${escapeHtml(e.title)}</span>` +
          `</div>`
        ).join('') +
        `</div>`
      : ''

    const timedHtml = hasTimed
      ? `<div class="cal-week-timed-col">` +
        timed.map(e =>
          `<div class="cal-week-event" data-id="${e.id}">` +
          `<span class="cal-week-event-time">${e.time}</span>` +
          `<span class="cal-week-event-title">${escapeHtml(e.title)}</span>` +
          `</div>`
        ).join('') +
        `</div>`
      : ''

    html += `<div class="cal-week-col${isToday ? ' today' : ''}" data-date="${dateStr}">
      <div class="cal-week-day-header">
        <span class="cal-week-day-name">${dayNames[i]}</span>
        <span class="cal-week-day-num">${d.getDate()}</span>
      </div>
      <div class="cal-week-events${hasAllDay && hasTimed ? ' has-both' : ''}">${allDayHtml}${timedHtml}</div>
    </div>`
  })
  html += '</div>'
  container.innerHTML = html

  container.querySelectorAll('.cal-week-event').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation()
      const entry = _calendarEntries.find(en => String(en.id) === el.dataset.id)
      if (entry) showCalendarForm(entry)
    })
  })

  container.querySelectorAll('.cal-week-day-header').forEach(hdr => {
    hdr.addEventListener('click', e => {
      e.stopPropagation()
      _calDate = new Date(hdr.closest('.cal-week-col').dataset.date + 'T12:00:00')
      if (isFull) renderFullCalendar()
      else { renderCalendarView(); openFullCalendar() }
    })
  })
}

// ── Day view ──────────────────────────────────────────────

function renderDayView (container, titleEl, isFull) {
  const dateStr = isoDate(_calDate)
  const events  = eventsForDate(dateStr)

  titleEl.textContent = _calDate.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (!events.length) {
    container.innerHTML = '<p class="cal-empty">Keine Termine für diesen Tag.<br>Tippen Sie auf „+ Hinzufügen".</p>'
    return
  }

  let html = '<div class="cal-day-list">'
  events.forEach(entry => {
    const badge = entry.frequency && entry.frequency !== 'once' ? ` · ${freqLabel[entry.frequency]}` : ''
    html += `<div class="cal-entry-card" data-id="${entry.id}">
      <span class="cal-entry-date">${entry.allDay ? 'Ganztägig' : entry.time + ' Uhr'}${badge}</span>
      <span class="cal-entry-title">${escapeHtml(entry.title)}</span>
      ${entry.notes ? `<span class="cal-entry-notes">${escapeHtml(entry.notes)}</span>` : ''}
      <div class="cal-entry-actions">
        <button class="btn-edit">Bearbeiten</button>
        <button class="btn-delete">Löschen</button>
      </div>
    </div>`
  })
  html += '</div>'
  container.innerHTML = html

  container.querySelectorAll('.cal-entry-card').forEach(card => {
    const entry = _calendarEntries.find(e => String(e.id) === card.dataset.id)
    if (!entry) return
    card.querySelector('.btn-edit').addEventListener('click', () => showCalendarForm(entry))
    card.querySelector('.btn-delete').addEventListener('click', () => {
      showConfirm(`„${entry.title}" wirklich löschen?`, 'Ja, löschen', async () => {
        const ok = await deleteCalendarEntryFromDB(entry.id)
        if (!ok) { showBanner('Termin konnte nicht gelöscht werden.', true); return }
        _calendarEntries = await loadCalendarFromDB()
        renderCalendarView()
        if (!calFullOverlay.classList.contains('hidden')) renderFullCalendar()
      })
    })
  })
}

// ── DB / Form ─────────────────────────────────────────────

async function loadCalendarFromDB () {
  const { data, error } = await sb
    .from('calendar_events')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('starts_at', { ascending: true })

  if (error) {
    calContent.innerHTML = '<p class="cal-empty" style="color:var(--danger)">Termine konnten nicht geladen werden.</p>'
    return []
  }

  return (data ?? []).map(entry => {
    const start = new Date(entry.starts_at)
    const hh    = String(start.getHours()).padStart(2, '0')
    const mm    = String(start.getMinutes()).padStart(2, '0')
    return {
      id:         entry.id,
      title:      entry.title,
      date:       isoDate(start),
      time:       `${hh}:${mm}`,
      notes:      entry.description ?? '',
      allDay:     entry.all_day ?? false,
      frequency:  entry.frequency ?? 'once',
      endDate:    entry.ends_at ? isoDate(new Date(entry.ends_at)) : null,
      startsAt:   entry.starts_at,
      endsAt:     entry.ends_at,
      reminderAt: entry.reminder_at,
    }
  })
}

calAlldayInput.addEventListener('change', () => {
  calTimeGroup.style.visibility = calAlldayInput.checked ? 'hidden' : 'visible'
})
calRecurringInput.addEventListener('change', () => {
  calEndGroup.classList.toggle('hidden', calRecurringInput.value === 'once')
  if (calRecurringInput.value === 'once') calEndDateInput.value = ''
})

function showCalendarForm (entry, defaultDate = null) {
  _editingCalId              = entry?.id ?? null
  calFormTitle.textContent   = entry ? 'Termin bearbeiten' : 'Termin hinzufügen'
  calTitleInput.value        = entry?.title     ?? ''
  calDateInput.value         = entry?.date      ?? defaultDate ?? isoDate(new Date())
  calAlldayInput.checked     = entry?.allDay    ?? false
  calTimeGroup.style.visibility = (entry?.allDay) ? 'hidden' : 'visible'
  calTimeInput.value         = entry?.time      ?? '09:00'
  calRecurringInput.value    = entry?.frequency ?? 'once'
  calEndDateInput.value      = entry?.endDate   ?? ''
  calEndGroup.classList.toggle('hidden', !entry?.frequency || entry.frequency === 'once')
  calNotesInput.value        = entry?.notes     ?? ''
  calFormDelete.style.display = _editingCalId ? '' : 'none'
  calFormOverlay.classList.remove('hidden')
  calTitleInput.focus()
}

function hideCalendarForm () {
  calFormOverlay.classList.add('hidden')
  _editingCalId = null
}

calFormCancel.addEventListener('click', hideCalendarForm)

calFormDelete.addEventListener('click', () => {
  if (!_editingCalId) return
  const id    = _editingCalId
  const title = calTitleInput.value
  hideCalendarForm()
  showConfirm(`„${title}" wirklich löschen?`, 'Ja, löschen', async () => {
    const ok = await deleteCalendarEntryFromDB(id)
    if (!ok) { showBanner('Termin konnte nicht gelöscht werden.', true); return }
    _calendarEntries = await loadCalendarFromDB()
    renderCalendarView()
    if (!calFullOverlay.classList.contains('hidden')) renderFullCalendar()
  })
})

calFormSave.addEventListener('click', async () => {
  const title = calTitleInput.value.trim()
  if (!title) { calTitleInput.focus(); return }

  const allDay   = calAlldayInput.checked
  const freq     = calRecurringInput.value
  const ok = await saveCalendarEntryToDB({
    id:        _editingCalId,
    title,
    date:      calDateInput.value,
    time:      allDay ? '00:00' : calTimeInput.value,
    notes:     calNotesInput.value.trim(),
    allDay,
    frequency: freq,
    endDate:   freq !== 'once' ? (calEndDateInput.value || null) : null,
  })

  if (!ok) { showBanner('Termin konnte nicht gespeichert werden.', true); return }

  hideCalendarForm()
  _calendarEntries = await loadCalendarFromDB()
  renderCalendarView()
})

async function saveCalendarEntryToDB (entry) {
  // All-day: use noon UTC to avoid timezone date-shift across any timezone
  const startsAt = entry.allDay ? `${entry.date}T12:00:00Z` : toLocalISOString(entry.date, entry.time)
  const payload  = {
    user_id:     currentUser.id,
    title:       entry.title,
    description: entry.notes || null,
    starts_at:   startsAt,
    ends_at:     entry.endDate ? `${entry.endDate}T23:59:59Z` : (entry.endsAt ?? null),
    all_day:     entry.allDay ?? false,
    frequency:   entry.frequency ?? 'once',
    reminder_at: entry.reminderAt ?? null,
  }

  if (entry.id) {
    const updatePayload = { ...payload, updated_by: currentUser.id }
    let { error } = await sb.from('calendar_events').update(updatePayload).eq('id', entry.id).eq('user_id', currentUser.id)
    if (error) {
      const { frequency: _f, ...payloadNoFreq } = updatePayload
      ;({ error } = await sb.from('calendar_events').update(payloadNoFreq).eq('id', entry.id).eq('user_id', currentUser.id))
    }
    return !error
  } else {
    const insertPayload = { ...payload, created_by: currentUser.id }
    let { error } = await sb.from('calendar_events').insert([insertPayload])
    if (error) {
      const { frequency: _f, ...payloadNoFreq } = insertPayload
      ;({ error } = await sb.from('calendar_events').insert([payloadNoFreq]))
    }
    return !error
  }
}

async function deleteCalendarEntryFromDB (id) {
  const { error } = await sb.from('calendar_events').delete().eq('id', id).eq('user_id', currentUser.id)
  return !error
}

// ── To-Do ─────────────────────────────────────────────────

let _todoLists      = []
let _todoItems      = []
let _activeListId   = null
let _editingTodoId  = null
let _showDoneItems  = false

todoBtn.addEventListener('click', async () => {
  showSection('todo')
  await loadAndRenderTodos()
})
todoBack.addEventListener('click', () => showSection('chat'))

todoAddListBtn.addEventListener('click', async () => {
  const name = prompt('Name der neuen Liste:')
  if (!name?.trim()) return
  const { data, error } = await sb.from('todo_lists')
    .insert([{ user_id: currentUser.id, name: name.trim() }])
    .select('id, name').single()
  if (error || !data) { showBanner('Liste konnte nicht erstellt werden.', true); return }
  _todoLists.push(data)
  _activeListId = data.id
  renderTodoLists()
  await loadAndRenderTodoItems()
})

todoNewTitle.addEventListener('input', () => {
  todoAddItemBtn.disabled = !todoNewTitle.value.trim()
})
todoNewTitle.addEventListener('keydown', e => {
  if (e.key === 'Enter' && todoNewTitle.value.trim()) addTodoItem()
})
todoAddItemBtn.addEventListener('click', addTodoItem)

todoFormSave.addEventListener('click', saveTodoItemForm)
todoFormCancel.addEventListener('click', hideTodoForm)
todoFormArchive.addEventListener('click', archiveTodoItem)

async function loadAndRenderTodos () {
  const { data } = await sb.from('todo_lists')
    .select('id, name')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true })
  _todoLists = data ?? []

  // Auto-create default list on first use
  if (!_todoLists.length) {
    const { data: newList } = await sb.from('todo_lists')
      .insert([{ user_id: currentUser.id, name: 'Aufgaben' }])
      .select('id, name').single()
    if (newList) _todoLists = [newList]
  }

  if (!_activeListId || !_todoLists.find(l => l.id === _activeListId)) {
    _activeListId = _todoLists[0]?.id ?? null
  }
  renderTodoLists()
  await loadAndRenderTodoItems()
}

function renderTodoLists () {
  todoListsBar.innerHTML = ''
  _todoLists.forEach(list => {
    const btn = document.createElement('button')
    btn.className = 'todo-list-tab' + (list.id === _activeListId ? ' active' : '')
    btn.textContent = list.name
    btn.addEventListener('click', async () => {
      _activeListId = list.id
      renderTodoLists()
      await loadAndRenderTodoItems()
    })
    todoListsBar.appendChild(btn)
  })

  // Done-toggle
  const toggle = document.createElement('button')
  toggle.className = 'todo-done-toggle' + (_showDoneItems ? ' active' : '')
  toggle.textContent = _showDoneItems ? '✓ Erledigt ausblenden' : '✓ Erledigt anzeigen'
  toggle.addEventListener('click', () => {
    _showDoneItems = !_showDoneItems
    renderTodoLists()
    renderTodoItems()
  })
  todoListsBar.appendChild(toggle)
}

async function loadAndRenderTodoItems () {
  if (!_activeListId) { todoItemsList.innerHTML = ''; return }
  const { data } = await sb.from('todo_items')
    .select('id, title, notes, status, due_at, created_by')
    .eq('list_id', _activeListId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })
  _todoItems = data ?? []
  renderTodoItems()
}

function renderTodoItems () {
  const items = _showDoneItems
    ? _todoItems
    : _todoItems.filter(i => i.status !== 'done')

  if (!items.length) {
    todoItemsList.innerHTML = '<p class="todo-empty">Keine offenen Aufgaben.</p>'
    return
  }

  todoItemsList.innerHTML = ''
  items.forEach(item => {
    const row = document.createElement('div')
    row.className = 'todo-item' + (item.status === 'done' ? ' done' : '')

    const dueStr = item.due_at
      ? new Date(item.due_at).toLocaleDateString('de-DE', { day:'numeric', month:'short' })
      : ''
    const overdue = item.due_at && item.status !== 'done' && new Date(item.due_at) < new Date()

    row.innerHTML = `
      <button class="todo-check" data-id="${item.id}" aria-label="${item.status === 'done' ? 'Als offen markieren' : 'Als erledigt markieren'}">
        ${item.status === 'done' ? '✓' : ''}
      </button>
      <div class="todo-item-body">
        <span class="todo-item-title">${escapeHtml(item.title)}</span>
        ${dueStr ? `<span class="todo-due${overdue ? ' overdue' : ''}">${dueStr}</span>` : ''}
      </div>
      <button class="todo-edit-btn" data-id="${item.id}" aria-label="Bearbeiten">…</button>`

    row.querySelector('.todo-check').addEventListener('click', () => toggleTodoItem(item))
    row.querySelector('.todo-edit-btn').addEventListener('click', () => showTodoItemForm(item))
    todoItemsList.appendChild(row)
  })
}

async function addTodoItem () {
  const title = todoNewTitle.value.trim()
  if (!title || !_activeListId) return
  const { data, error } = await sb.from('todo_items')
    .insert([{
      list_id:    _activeListId,
      user_id:    currentUser.id,
      title,
      created_by: currentUser.id,
    }])
    .select('id, title, notes, status, due_at, created_by').single()
  if (error || !data) { showBanner('Aufgabe konnte nicht gespeichert werden.', true); return }
  todoNewTitle.value = ''
  todoAddItemBtn.disabled = true
  _todoItems.push(data)
  renderTodoItems()
}

async function toggleTodoItem (item) {
  const newStatus = item.status === 'done' ? 'open' : 'done'
  const patch = { status: newStatus }
  if (newStatus === 'done') patch.completed_at = new Date().toISOString()
  else patch.completed_at = null
  const { error } = await sb.from('todo_items').update(patch)
    .eq('id', item.id).eq('user_id', currentUser.id)
  if (error) return
  item.status = newStatus
  renderTodoItems()
}

function showTodoItemForm (item) {
  _editingTodoId = item.id
  todoFormTitleEl.textContent = 'Aufgabe bearbeiten'
  todoFormTitleInput.value = item.title
  todoFormNotes.value = item.notes ?? ''
  todoFormDue.value = item.due_at ? isoDate(new Date(item.due_at)) : ''
  // Populate list selector
  todoFormList.innerHTML = _todoLists.map(l =>
    `<option value="${l.id}"${l.id === _activeListId ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
  ).join('')
  todoFormArchive.style.display = ''
  todoFormOverlay.classList.remove('hidden')
  todoFormTitleInput.focus()
}

function hideTodoForm () {
  todoFormOverlay.classList.add('hidden')
  _editingTodoId = null
}

async function saveTodoItemForm () {
  const title = todoFormTitleInput.value.trim()
  if (!title) { todoFormTitleInput.focus(); return }
  const newListId = todoFormList.value
  const payload = {
    title,
    notes:  todoFormNotes.value.trim() || null,
    due_at: todoFormDue.value ? `${todoFormDue.value}T12:00:00Z` : null,
    list_id: newListId,
  }
  const { error } = await sb.from('todo_items').update(payload)
    .eq('id', _editingTodoId).eq('user_id', currentUser.id)
  if (error) { showBanner('Speichern fehlgeschlagen.', true); return }
  hideTodoForm()
  // Reload — item may have moved to a different list
  if (newListId !== _activeListId) _activeListId = newListId
  await loadAndRenderTodoItems()
}

async function archiveTodoItem () {
  if (!_editingTodoId) return
  const { error } = await sb.from('todo_items').update({ status: 'archived' })
    .eq('id', _editingTodoId).eq('user_id', currentUser.id)
  if (error) { showBanner('Archivieren fehlgeschlagen.', true); return }
  hideTodoForm()
  await loadAndRenderTodoItems()
}

// ── T4: Chat → Todo ───────────────────────────────────────

async function loadTodoContext () {
  if (!currentUser) return []
  const { data } = await sb.from('todo_items')
    .select('title, due_at, todo_lists(name)')
    .eq('user_id', currentUser.id)
    .eq('status', 'open')
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(10)
  if (!data) return []
  return data.map(i => ({
    title:     i.title,
    list_name: (i.todo_lists as any)?.name ?? 'Aufgaben',
    due_at:    i.due_at ? isoDate(new Date(i.due_at)) : undefined,
  }))
}

async function handleTodoAction (action) {
  if (!currentUser || action.type !== 'add') return

  // Find or create the list
  let listId = null
  const { data: lists } = await sb.from('todo_lists')
    .select('id, name').eq('user_id', currentUser.id)
  const match = lists?.find(l => l.name.toLowerCase() === action.list_name.toLowerCase())
  if (match) {
    listId = match.id
  } else {
    const { data: newList } = await sb.from('todo_lists')
      .insert([{ user_id: currentUser.id, name: action.list_name }])
      .select('id').single()
    listId = newList?.id ?? null
  }
  if (!listId) return

  await sb.from('todo_items').insert([{
    list_id:    listId,
    user_id:    currentUser.id,
    title:      action.title,
    created_by: currentUser.id,
  }])

  // Refresh todo section if open
  if (_activeSection === 'todo') await loadAndRenderTodos()

  // Show subtle confirmation in chat
  const note = document.createElement('div')
  note.className = 'message todo-confirm'
  note.textContent = `✓ Aufgabe gespeichert: „${action.title}" [${action.list_name}]`
  messagesEl.appendChild(note)
  messagesEl.scrollTop = messagesEl.scrollHeight
  setTimeout(() => note.remove(), 5000)
}

// ── T5: Reminder banner ────────────────────────────────────

async function loadTodoReminder () {
  if (!currentUser) return
  const today = isoDate(new Date())
  const { data } = await sb.from('todo_items')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('status', 'open')
    .lte('due_at', today + 'T23:59:59Z')
    .limit(10)
  const count = data?.length ?? 0
  const bar = document.getElementById('todo-reminder-bar')
  if (!bar) return
  if (count > 0) {
    bar.textContent = `📋 ${count === 1 ? '1 überfällige Aufgabe' : `${count} überfällige Aufgaben`} — `
    const link = document.createElement('button')
    link.className = 'todo-reminder-link'
    link.textContent = 'Jetzt anzeigen'
    link.addEventListener('click', async () => {
      showSection('todo')
      await loadAndRenderTodos()
    })
    bar.appendChild(link)
    bar.classList.remove('hidden')
  } else {
    bar.classList.add('hidden')
  }
}

// ── Mood ──────────────────────────────────────────────────

// Single authoritative mapping — Edge Function returns the label,
// this function converts to the DB enum value.
function mapMoodLabelToLevel (label) {
  switch (label) {
    case 'positive':  return '4'
    case 'neutral':   return '3'
    case 'subdued':   return '2'
    case 'concerned': return '1'
    default:          return '3'
  }
}

const MOOD_INDICATOR = {
  '4': { emoji: '😊', label: 'Positiv',        cls: 'm4' },
  '3': { emoji: '😐', label: 'Neutral',         cls: 'm3' },
  '2': { emoji: '🙂', label: 'Ruhig',           cls: 'm2' },
  '1': { emoji: '😟', label: 'Besorgt',         cls: 'm1' },
}

async function saveMoodToDB (label) {
  if (!currentUser) return
  const level = mapMoodLabelToLevel(label)
  const today = isoDate(new Date())
  await sb.from('mood_entries').upsert(
    { user_id: currentUser.id, mood: level, entry_date: today, recorded_at: new Date().toISOString() },
    { onConflict: 'user_id,entry_date' }
  )
  updateMoodIndicator(level)
}

async function loadTodayMood () {
  if (!currentUser) return
  const today = isoDate(new Date())
  const { data } = await sb
    .from('mood_entries')
    .select('mood')
    .eq('user_id', currentUser.id)
    .eq('entry_date', today)
    .maybeSingle()
  if (data?.mood) updateMoodIndicator(data.mood)
}

function updateMoodIndicator (level) {
  const el  = document.getElementById('mood-indicator')
  if (!el) return
  const info = MOOD_INDICATOR[level]
  if (!info) return
  el.textContent = `${info.emoji}`
  el.title       = `Heutige Stimmung: ${info.label}`
  el.className   = `mood-indicator ${info.cls}`
}

// ── Send ──────────────────────────────────────────────────

function appendErrorWithRetry (convId, errorText) {
  const div         = document.createElement('div')
  div.className     = 'message assistant error-msg'
  const span        = document.createElement('span')
  span.textContent  = errorText
  const btn         = document.createElement('button')
  btn.className     = 'retry-btn'
  btn.textContent   = 'Erneut versuchen'
  btn.addEventListener('click', () => { div.remove(); callChatAPI(convId) })
  div.appendChild(span)
  div.appendChild(btn)
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

async function callChatAPI (convId) {
  if (isSending) return
  isSending           = true
  sendBtn.disabled    = true
  sendBtn.textContent = 'Wird gesendet…'

  let typingEl = null
  try {
    const { data: history } = await sb
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (currentConversation?.id === convId) {
      typingEl             = document.createElement('div')
      typingEl.className   = 'message assistant typing'
      typingEl.textContent = 'Ich überlege kurz…'
      messagesEl.appendChild(typingEl)
      messagesEl.scrollTop = messagesEl.scrollHeight
    }

    const session = (await sb.auth.getSession()).data.session
    const fnRes = await fetch(
      'https://sycfzysiwshdijeintyt.supabase.co/functions/v1/chat',
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
          'apikey':        SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: history ?? [], context: { todos: await loadTodoContext() } }),
      }
    )

    if (typingEl) { typingEl.remove(); typingEl = null }

    let fnJson = null
    const rawBody = await fnRes.text()
    if (fnRes.ok) {
      try { fnJson = JSON.parse(rawBody) } catch (_) {}
    }

    if (fnJson?.content?.trim()) {
      const reply = fnJson.content.trim()
      if (currentConversation?.id === convId) appendMessage('assistant', reply)
      await sb.from('messages').insert({ conversation_id: convId, role: 'assistant', content: reply })
      if (fnJson.mood) saveMoodToDB(fnJson.mood)
      if (fnJson.todo_action?.type === 'add') handleTodoAction(fnJson.todo_action)
      await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
      await loadConversations()
    } else {
      const errText = fnRes.ok
        ? 'Entschuldigung, ich konnte gerade nicht antworten. Bitte versuchen Sie es noch einmal.'
        : `Fehler ${fnRes.status} — bitte erneut versuchen.`
      if (currentConversation?.id === convId) appendErrorWithRetry(convId, errText)
    }

  } catch (err) {
    if (typingEl) typingEl.remove()
    if (isAuthError(err)) {
      handleSessionExpired()
    } else {
      const errText = isNetworkError(err)
        ? 'Kein Internet — bitte versuchen Sie es erneut wenn Sie wieder online sind.'
        : 'Entschuldigung, es ist ein Fehler aufgetreten.'
      if (isNetworkError(err)) showOffline()
      if (currentConversation?.id === convId) appendErrorWithRetry(convId, errText)
    }
  } finally {
    isSending           = false
    sendBtn.disabled    = messageInput.value.trim() === ''
    sendBtn.textContent = 'Senden'
    messageInput.focus()
  }
}

async function sendMessage () {
  const text = messageInput.value.trim()
  if (!text || isSending || !currentConversation) return

  messageInput.value = ''
  autoResize()

  // Offline: queue for later delivery
  if (!navigator.onLine) {
    enqueueMessage(currentConversation.id, text)
    return
  }

  const convId = currentConversation.id
  isSending            = true
  sendBtn.disabled     = true
  sendBtn.textContent  = 'Wird gesendet…'

  try {
    appendMessage('user', text)
    await sb.from('messages').insert({ conversation_id: convId, role: 'user', content: text })
  } catch (err) {
    isSending           = false
    sendBtn.disabled    = messageInput.value.trim() === ''
    sendBtn.textContent = 'Senden'
    if (isAuthError(err)) handleSessionExpired()
    else showBanner('Nachricht konnte nicht gespeichert werden.', true)
    return
  }

  isSending = false
  await callChatAPI(convId)
}

// ── Offline detection ─────────────────────────────────────
window.addEventListener('offline', showOffline)
window.addEventListener('online', async () => {
  showOnline()
  if (currentUser && !currentConversation) {
    await loadOrCreateConversation()
    await loadMessages()
  }
  await flushQueue()
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
