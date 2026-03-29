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
const loginView       = document.getElementById('login-view')
const appView         = document.getElementById('app-view')
const loginForm       = document.getElementById('login-form')
const signupBtn       = document.getElementById('signup-btn')
const loginStatus     = document.getElementById('login-status')
const emailInput      = document.getElementById('email')
const passwordInput   = document.getElementById('password')
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
const medsSection    = document.getElementById('meds-section')
const chatSection    = document.getElementById('chat-section')
const medsBack       = document.getElementById('meds-back')
const medsAddBtn     = document.getElementById('meds-add-btn')
const medsList       = document.getElementById('meds-list')
const calBtn         = document.getElementById('cal-btn')
const calSection     = document.getElementById('calendar-section')
const calBack        = document.getElementById('calendar-back')
const calAddBtn      = document.getElementById('calendar-add-btn')
const calContent     = document.getElementById('cal-content')
const calPeriodTitle = document.getElementById('cal-period-title')
const calPrevBtn     = document.getElementById('cal-prev')
const calNextBtn     = document.getElementById('cal-next')
const calFormOverlay    = document.getElementById('cal-form-overlay')
const calFormTitle      = document.getElementById('cal-form-title')
const calFormSave       = document.getElementById('cal-form-save')
const calFormCancel     = document.getElementById('cal-form-cancel')
const calTitleInput     = document.getElementById('cal-title')
const calDateInput      = document.getElementById('cal-date')
const calAlldayInput    = document.getElementById('cal-allday')
const calTimeGroup      = document.getElementById('cal-time-group')
const calTimeInput      = document.getElementById('cal-time')
const calRecurringInput = document.getElementById('cal-recurring')
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
  await loadConversations()
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

function showSection (name) {
  chatSection.classList.toggle('hidden', name !== 'chat')
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
    const { error } = await sb.from('medications').update(payload).eq('id', med.id).eq('user_id', currentUser.id)
    return !error
  } else {
    const { error } = await sb.from('medications').insert([payload])
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

function isoDate (d) { return d.toISOString().slice(0, 10) }

function eventsForDate (dateStr) {
  return _calendarEntries.filter(e => e.date === dateStr)
}

// Navigation
calPrevBtn.addEventListener('click', () => calNavigate(-1))
calNextBtn.addEventListener('click', () => calNavigate(1))

document.querySelectorAll('.cal-view-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    _calView = tab.dataset.view
    document.querySelectorAll('.cal-view-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    renderCalendarView()
  })
})

function calNavigate (dir) {
  if (_calView === 'month') {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + dir, 1)
  } else if (_calView === 'week') {
    _calDate = new Date(_calDate.getTime() + dir * 7 * 86400000)
  } else {
    _calDate = new Date(_calDate.getTime() + dir * 86400000)
  }
  renderCalendarView()
}

function renderCalendarView () {
  if (_calView === 'month')     renderMonthView()
  else if (_calView === 'week') renderWeekView()
  else                          renderDayView()
}

// ── Month view ────────────────────────────────────────────

function renderMonthView () {
  const year     = _calDate.getFullYear()
  const month    = _calDate.getMonth()
  const todayStr = isoDate(new Date())

  calPeriodTitle.textContent = _calDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7  // 0 = Montag

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
      ${events.map(e => `<span class="cal-event-chip" data-id="${e.id}">${escapeHtml(e.title)}</span>`).join('')}
    </div>`
  }

  const remainder = (startDow + lastDay.getDate()) % 7
  if (remainder) for (let i = remainder; i < 7; i++) html += '<div class="cal-day-cell other-month"></div>'
  html += '</div>'
  calContent.innerHTML = html

  // Tag-Klick → Tagesansicht
  calContent.querySelectorAll('.cal-day-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.classList.contains('cal-event-chip')) return
      _calDate = new Date(cell.dataset.date + 'T12:00:00')
      _calView = 'day'
      document.querySelectorAll('.cal-view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'day'))
      renderCalendarView()
    })
  })

  // Termin-Chip-Klick → Bearbeitungsformular
  calContent.querySelectorAll('.cal-event-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation()
      const entry = _calendarEntries.find(en => String(en.id) === chip.dataset.id)
      if (entry) showCalendarForm(entry)
    })
  })
}

// ── Week view ─────────────────────────────────────────────

function renderWeekView () {
  const dow    = (_calDate.getDay() + 6) % 7
  const monday = new Date(_calDate)
  monday.setDate(_calDate.getDate() - dow)

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  const startStr = dates[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  const endStr   = dates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  calPeriodTitle.textContent = `${startStr} – ${endStr}`

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const todayStr = isoDate(new Date())

  let html = '<div class="cal-week-grid">'
  dates.forEach((d, i) => {
    const dateStr = isoDate(d)
    const events  = eventsForDate(dateStr)
    const isToday = dateStr === todayStr
    html += `<div class="cal-week-col${isToday ? ' today' : ''}" data-date="${dateStr}">
      <div class="cal-week-day-header">
        <span class="cal-week-day-name">${dayNames[i]}</span>
        <span class="cal-week-day-num">${d.getDate()}</span>
      </div>
      <div class="cal-week-events">
        ${events.map(e => `<div class="cal-week-event" data-id="${e.id}">
          <span class="cal-week-event-time">${e.allDay ? 'Ganztg.' : e.time}</span>
          <span class="cal-week-event-title">${escapeHtml(e.title)}</span>
        </div>`).join('')}
      </div>
    </div>`
  })
  html += '</div>'
  calContent.innerHTML = html

  calContent.querySelectorAll('.cal-week-event').forEach(el => {
    el.addEventListener('click', () => {
      const entry = _calendarEntries.find(e => String(e.id) === el.dataset.id)
      if (entry) showCalendarForm(entry)
    })
  })

  calContent.querySelectorAll('.cal-week-day-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      _calDate = new Date(hdr.closest('.cal-week-col').dataset.date + 'T12:00:00')
      _calView = 'day'
      document.querySelectorAll('.cal-view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'day'))
      renderCalendarView()
    })
  })
}

// ── Day view ──────────────────────────────────────────────

function renderDayView () {
  const dateStr = isoDate(_calDate)
  const events  = eventsForDate(dateStr)

  calPeriodTitle.textContent = _calDate.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (!events.length) {
    calContent.innerHTML = '<p class="cal-empty">Keine Termine für diesen Tag.<br>Tippen Sie auf „+ Hinzufügen".</p>'
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
  calContent.innerHTML = html

  calContent.querySelectorAll('.cal-entry-card').forEach(card => {
    const entry = _calendarEntries.find(e => String(e.id) === card.dataset.id)
    if (!entry) return
    card.querySelector('.btn-edit').addEventListener('click', () => showCalendarForm(entry))
    card.querySelector('.btn-delete').addEventListener('click', () => {
      showConfirm(`„${entry.title}" wirklich löschen?`, 'Ja, löschen', async () => {
        const ok = await deleteCalendarEntryFromDB(entry.id)
        if (!ok) { showBanner('Termin konnte nicht gelöscht werden.', true); return }
        _calendarEntries = await loadCalendarFromDB()
        renderCalendarView()
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
      startsAt:   entry.starts_at,
      endsAt:     entry.ends_at,
      reminderAt: entry.reminder_at,
    }
  })
}

calAlldayInput.addEventListener('change', () => {
  calTimeGroup.style.visibility = calAlldayInput.checked ? 'hidden' : 'visible'
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
  calNotesInput.value        = entry?.notes     ?? ''
  calFormOverlay.classList.remove('hidden')
  calTitleInput.focus()
}

function hideCalendarForm () {
  calFormOverlay.classList.add('hidden')
  _editingCalId = null
}

calFormCancel.addEventListener('click', hideCalendarForm)

calFormSave.addEventListener('click', async () => {
  const title = calTitleInput.value.trim()
  if (!title) { calTitleInput.focus(); return }

  const allDay = calAlldayInput.checked
  const ok = await saveCalendarEntryToDB({
    id:        _editingCalId,
    title,
    date:      calDateInput.value,
    time:      allDay ? '00:00' : calTimeInput.value,
    notes:     calNotesInput.value.trim(),
    allDay,
    frequency: calRecurringInput.value,
  })

  if (!ok) { showBanner('Termin konnte nicht gespeichert werden.', true); return }

  hideCalendarForm()
  _calendarEntries = await loadCalendarFromDB()
  renderCalendarView()
})

async function saveCalendarEntryToDB (entry) {
  const startsAt = `${entry.date}T${entry.time}:00`
  const payload  = {
    user_id:     currentUser.id,
    title:       entry.title,
    description: entry.notes || null,
    starts_at:   startsAt,
    ends_at:     entry.endsAt ?? null,
    all_day:     entry.allDay ?? false,
    frequency:   entry.frequency ?? 'once',
    reminder_at: entry.reminderAt ?? null,
  }

  if (entry.id) {
    const { error } = await sb.from('calendar_events').update(payload).eq('id', entry.id).eq('user_id', currentUser.id)
    return !error
  } else {
    const { error } = await sb.from('calendar_events').insert([payload])
    return !error
  }
}

async function deleteCalendarEntryFromDB (id) {
  const { error } = await sb.from('calendar_events').delete().eq('id', id).eq('user_id', currentUser.id)
  return !error
}

// ── Send ──────────────────────────────────────────────────
async function sendMessage () {
  const text   = messageInput.value.trim()
  if (!text || isSending || !currentConversation) return

  // Snapshot: pin the conversation this message belongs to
  const convId = currentConversation.id

  isSending            = true
  sendBtn.disabled     = true
  sendBtn.textContent  = 'Wird gesendet…'
  messageInput.value   = ''
  autoResize()

  let typingEl = null

  try {
    appendMessage('user', text)

    // Persist user message to the pinned conversation
    await sb.from('messages').insert({
      conversation_id: convId,
      role:            'user',
      content:         text,
    })

    // Fetch history for the pinned conversation
    const { data: history } = await sb
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Typing indicator — only show if still in the same conversation
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
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
          'apikey':        SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: history ?? [] }),
      }
    )

    if (typingEl) { typingEl.remove(); typingEl = null }

    let fnJson = null
    const rawBody = await fnRes.text()
    if (fnRes.ok) {
      try { fnJson = JSON.parse(rawBody) } catch (_) {}
    } else {
      showBanner(`Fehler ${fnRes.status}: ${rawBody}`, true)
    }
    const reply = fnJson?.content?.trim() ||
      'Entschuldigung, ich konnte gerade nicht antworten. Bitte versuchen Sie es noch einmal.'

    // Only show reply in UI if user is still viewing this conversation
    if (currentConversation?.id === convId) {
      appendMessage('assistant', reply)
    }

    // Always persist the reply to the correct (pinned) conversation
    if (fnJson?.content?.trim()) {
      await sb.from('messages').insert({
        conversation_id: convId,
        role:            'assistant',
        content:         reply,
      })
    }

    // Update timestamp for the pinned conversation
    await sb
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId)
    await loadConversations()

  } catch (err) {
    if (typingEl) typingEl.remove()
    if (isNetworkError(err)) {
      showOffline()
      if (currentConversation?.id === convId)
        appendMessage('assistant', 'Kein Internet — bitte versuchen Sie es erneut wenn Sie wieder online sind.')
    } else if (isAuthError(err)) {
      handleSessionExpired()
    } else {
      if (currentConversation?.id === convId)
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
