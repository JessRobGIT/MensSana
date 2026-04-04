// MensSana — Caregiver Dashboard

const SUPABASE_URL      = 'https://sycfzysiwshdijeintyt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2Z6eXNpd3NoZGlqZWludHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk2MzUsImV4cCI6MjA5MDIyNTYzNX0.jaZwlY7dmWIHUm57L6j_gWkK9IIGn27-k2mV_n1PoDc'

// Separate storageKey so dashboard session doesn't collide with companion app
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'menssana-dashboard-auth' }
})

// ── DOM refs ──────────────────────────────────────────────
const dashTodoOverlay   = document.getElementById('dash-todo-overlay')
const dashTodoFormTitle = document.getElementById('dash-todo-form-title')
const dashTodoTitle     = document.getElementById('dash-todo-title')
const dashTodoNotes     = document.getElementById('dash-todo-notes')
const dashTodoDue       = document.getElementById('dash-todo-due')
const dashTodoList      = document.getElementById('dash-todo-list')
const dashTodoSave      = document.getElementById('dash-todo-save')
const dashTodoCancel    = document.getElementById('dash-todo-cancel')
const dashTodoArchive   = document.getElementById('dash-todo-archive')
const loginView    = document.getElementById('login-view')
const dashView     = document.getElementById('dashboard-view')
const loginForm    = document.getElementById('login-form')
const loginStatus  = document.getElementById('login-status')
const dashUser      = document.getElementById('dash-user')
const dashRoleBadge = document.getElementById('dash-role-badge')
const logoutBtn     = document.getElementById('logout-btn')
const usersSection = document.getElementById('users-section')
const usersGrid    = document.getElementById('users-grid')
const usersEmpty   = document.getElementById('users-empty')
const detailPanel  = document.getElementById('detail-panel')
const detailBack   = document.getElementById('detail-back')
const detailName   = document.getElementById('detail-name')

// ── Helpers ───────────────────────────────────────────────
function isoDate (d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function toLocalISOString (dateStr, timeStr) {
  const d   = new Date(`${dateStr}T${timeStr}`)
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const hh   = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const mm   = String(Math.abs(off) % 60).padStart(2, '0')
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`
}

function escHtml (s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

const MOOD_LABELS = { '4':'Positiv', '3':'Neutral', '2':'Zurückhaltend', '1':'Besorgt' }
const MOOD_CLASS  = { '4':'m4', '3':'m3', '2':'m2', '1':'m1' }

function moodBadge (level) {
  if (!level) return '<span class="detail-empty">—</span>'
  const cls   = MOOD_CLASS[level] ?? 'mx'
  const label = MOOD_LABELS[level] ?? '—'
  return `<span class="mood-badge ${cls}"><span class="mood-dot ${cls}"></span>${label}</span>`
}

function relativeTime (iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2)   return 'Gerade eben'
  if (m < 60)  return `Vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Gestern'
  if (d < 7)   return `Vor ${d} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day:'numeric', month:'short' })
}

function activityClass (iso) {
  if (!iso) return 'activity-none'
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000
  if (hours < 24) return 'activity-ok'
  if (hours < 72) return 'activity-warn'
  return 'activity-none'
}

function initials (name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

function freqLabel (f) {
  return { daily:'Täglich', weekly:'Wöchentlich', as_needed:'Bei Bedarf' }[f] ?? f
}

// ── Auth ──────────────────────────────────────────────────
let _dashInitialized  = false
let _caregiverId      = null   // logged-in caregiver's user id
let _detailUserId     = null   // currently viewed user in detail panel
let _dashCalEvents    = []     // cached events for mini calendar
let _dashCalDate      = new Date()
let _dashSelectedDate = null

sb.auth.onAuthStateChange((event, session) => {
  if (session?.user && !_dashInitialized) {
    setTimeout(() => initDashboard(session.user), 0)
  } else if (!session?.user) {
    _dashInitialized = false
    showLogin()
  }
})

loginForm.addEventListener('submit', async e => {
  e.preventDefault()
  loginStatus.textContent = ''
  const btn = document.getElementById('login-btn')
  btn.disabled = true
  btn.textContent = 'Anmelden …'

  const email    = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    loginStatus.textContent = 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.'
    btn.disabled = false
    btn.textContent = 'Anmelden'
  }
})

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut()
})

function showLogin () {
  loginView.classList.remove('hidden')
  dashView.classList.add('hidden')
}

async function initDashboard (user) {
  _dashInitialized = true
  _caregiverId = user.id

  // Load profile and verify role
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('role, display_name, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'caregiver' && profile.role !== 'family')) {
    const reason = profileError
      ? `Profil-Fehler: ${profileError.message}`
      : `Rolle "${profile?.role}" hat keinen Dashboard-Zugang.`
    loginStatus.textContent = reason
    _dashInitialized = false
    await sb.auth.signOut()
    return
  }

  const ROLE_LABELS = { caregiver: 'Pflegeperson', family: 'Familie' }
  const name = profile.display_name || profile.full_name || user.email
  dashUser.textContent = name
  dashRoleBadge.textContent = ROLE_LABELS[profile.role] ?? profile.role
  dashRoleBadge.classList.remove('hidden')
  dashRoleBadge.className = `dash-role-badge role-${profile.role}`
  loginView.classList.add('hidden')
  dashView.classList.remove('hidden')
  showUserList()
}

// ── User list ─────────────────────────────────────────────
async function showUserList () {
  usersSection.classList.remove('hidden')
  detailPanel.classList.add('hidden')
  usersGrid.innerHTML = '<p class="empty-msg">Wird geladen …</p>'
  usersEmpty.classList.add('hidden')

  // Get assigned users
  const { data: assignments } = await sb
    .from('caregiver_assignments')
    .select('user_id')

  if (!assignments?.length) {
    usersGrid.innerHTML = ''
    usersEmpty.classList.remove('hidden')
    return
  }

  const userIds = assignments.map(a => a.user_id)

  // Load profiles for all assigned users
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, display_name')
    .in('id', userIds)

  // Load last activity (last updated conversation) per user
  const { data: convs } = await sb
    .from('conversations')
    .select('user_id, updated_at')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false })

  // Load today's mood per user
  const today = isoDate(new Date())
  const { data: moods } = await sb
    .from('mood_entries')
    .select('user_id, mood')
    .in('user_id', userIds)
    .eq('entry_date', today)

  // Load next medication per user
  const { data: meds } = await sb
    .from('medications')
    .select('user_id, name, time_of_day')
    .in('user_id', userIds)
    .order('time_of_day', { ascending: true })

  // Load next calendar event per user
  const { data: events } = await sb
    .from('calendar_events')
    .select('user_id, title, starts_at, all_day')
    .in('user_id', userIds)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  // Build lookup maps
  const lastActivity = {}
  convs?.forEach(c => { if (!lastActivity[c.user_id]) lastActivity[c.user_id] = c.updated_at })

  const todayMood = {}
  moods?.forEach(m => { todayMood[m.user_id] = m.mood })

  const nextMed = {}
  meds?.forEach(m => { if (!nextMed[m.user_id]) nextMed[m.user_id] = m })

  const nextEvent = {}
  events?.forEach(e => { if (!nextEvent[e.user_id]) nextEvent[e.user_id] = e })

  usersGrid.innerHTML = ''
  profiles?.forEach(p => {
    const displayName = p.display_name || p.full_name || 'Unbekannt'
    const lastAct     = lastActivity[p.id]
    const mood        = todayMood[p.id]
    const med         = nextMed[p.id]
    const evt         = nextEvent[p.id]
    const actCls      = activityClass(lastAct)
    const moodCls     = mood ? (MOOD_CLASS[mood] ?? 'mx') : 'mx'

    const card = document.createElement('div')
    card.className = 'user-card'
    card.dataset.userId = p.id
    card.innerHTML = `
      <div class="user-card-header">
        <div class="user-avatar">${escHtml(initials(displayName))}</div>
        <div>
          <div class="user-card-name">${escHtml(displayName)}</div>
        </div>
      </div>
      <div class="user-card-stats">
        <div class="stat-item">
          <div class="stat-label">Letzte Aktivität</div>
          <div class="stat-value ${actCls}">${relativeTime(lastAct)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Stimmung heute</div>
          <div class="stat-value">
            <span class="mood-dot ${moodCls}"></span>${MOOD_LABELS[mood] ?? '—'}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Nächstes Medikament</div>
          <div class="stat-value">${med ? `${escHtml(med.name)} ${med.time_of_day ? String(med.time_of_day).slice(0,5)+' Uhr' : ''}` : '—'}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Nächster Termin</div>
          <div class="stat-value">${evt ? escHtml(evt.title) : '—'}</div>
        </div>
      </div>
    `
    card.addEventListener('click', () => showDetail(p.id, displayName))
    usersGrid.appendChild(card)
  })
}

// ── Detail view ───────────────────────────────────────────
detailBack.addEventListener('click', showUserList)

async function showDetail (userId, name) {
  _detailUserId = userId
  usersSection.classList.add('hidden')
  detailPanel.classList.remove('hidden')
  detailName.textContent = name

  // Clear previous content
  document.getElementById('mood-chart').innerHTML = '<span class="detail-empty">Wird geladen …</span>'
  document.getElementById('conv-list').innerHTML  = '<span class="detail-empty">Wird geladen …</span>'
  document.getElementById('meds-list').innerHTML  = '<span class="detail-empty">Wird geladen …</span>'
  document.getElementById('events-list').innerHTML = '<span class="detail-empty">Wird geladen …</span>'

  // Load all data in parallel
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  const [moodRes, convRes, medsRes, eventsRes] = await Promise.all([
    sb.from('mood_entries')
      .select('mood, entry_date')
      .eq('user_id', userId)
      .gte('entry_date', isoDate(sevenDaysAgo))
      .order('entry_date', { ascending: true }),

    sb.from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),

    sb.from('medications')
      .select('id, name, dosage, time_of_day, frequency, notes, created_by, updated_by')
      .eq('user_id', userId)
      .order('time_of_day', { ascending: true }),

    sb.from('calendar_events')
      .select('id, title, starts_at, all_day, description, frequency, ends_at, created_by, updated_by')
      .eq('user_id', userId)
      .gte('starts_at', (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString() })())
      .order('starts_at', { ascending: true }),
  ])

  renderMoodChart(moodRes.data ?? [])
  renderConversations(convRes.data ?? [])
  renderMedications(medsRes.data ?? [])
  renderDashCalendar(eventsRes.data ?? [])
  await loadAndRenderDashTodos(userId)
}

function renderMoodChart (entries) {
  const el = document.getElementById('mood-chart')
  const today = new Date()
  const DAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa']
  const HEIGHT_MAP = { '4': 56, '3': 40, '2': 28, '1': 16 }

  // Build map by date
  const byDate = {}
  entries.forEach(e => { byDate[e.entry_date] = e.mood })

  // Collect numeric values for the 7 days
  const values = []
  let html = ''
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today); d.setDate(today.getDate() - i)
    const key = isoDate(d)
    const mood = byDate[key]
    const cls  = mood ? (MOOD_CLASS[mood] ?? 'mx') : 'mx'
    const h    = mood ? HEIGHT_MAP[mood] : 4
    const day  = DAY_NAMES[d.getDay()]
    if (mood) values.push(Number(mood))
    html += `<div class="mood-bar-wrap">
      <div class="mood-bar ${cls}" style="height:${h}px" title="${MOOD_LABELS[mood] ?? 'Kein Eintrag'}"></div>
      <span class="mood-day-label">${day}</span>
    </div>`
  }
  el.innerHTML = html

  // ── Metrics below the chart ────────────────────────────
  const metaEl = document.getElementById('mood-meta')
  if (!metaEl) return

  if (values.length === 0) {
    metaEl.textContent = 'Noch keine Einträge'
    return
  }

  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const avgLabel = avg >= 3.5 ? 'Positiv' : avg >= 2.5 ? 'Neutral' : avg >= 1.5 ? 'Ruhig' : 'Besorgt'

  // Trend: recent 3 days vs older days
  let trendText = '↔ Stabil'
  if (values.length >= 4) {
    const recent = values.slice(-3).reduce((s, v) => s + v, 0) / 3
    const older  = values.slice(0, -3).reduce((s, v) => s + v, 0) / values.slice(0, -3).length
    const diff   = recent - older
    if (diff > 0.4)       trendText = '↑ Eher besser'
    else if (diff < -0.4) trendText = '↓ Eher schlechter'
  }

  metaEl.innerHTML = `<span>Ø ${avgLabel}</span><span class="mood-meta-sep">·</span><span>${trendText}</span>`
}

function renderConversations (convs) {
  const el = document.getElementById('conv-list')
  if (!convs.length) { el.innerHTML = '<span class="detail-empty">Keine Gespräche vorhanden.</span>'; return }
  el.innerHTML = convs.map(c => `
    <div class="detail-row">
      <span class="detail-row-main">${escHtml(c.title || 'Gespräch')}</span>
      <span class="detail-row-sub">${relativeTime(c.updated_at)}</span>
    </div>`).join('')
}

function renderMedications (meds) {
  const el = document.getElementById('meds-list')
  if (!meds.length) { el.innerHTML = '<span class="detail-empty">Keine Medikamente eingetragen.</span>'; return }
  el.innerHTML = ''
  meds.forEach(m => {
    const row = document.createElement('div')
    row.className = 'detail-row'
    const medByCaregiver = m.created_by && m.created_by !== _detailUserId
    const medUpdated     = m.updated_by && m.updated_by !== _detailUserId
    row.innerHTML = `
      <div>
        <div class="detail-row-main">${escHtml(m.name)}${m.dosage ? ' · '+escHtml(m.dosage) : ''}${medByCaregiver ? ' <span class="audit-badge">P</span>' : medUpdated ? ' <span class="audit-badge audit-badge-edit">P</span>' : ''}</div>
        <div class="detail-row-sub">${freqLabel(m.frequency)}${m.time_of_day ? ' · '+String(m.time_of_day).slice(0,5)+' Uhr' : ''}</div>
      </div>
      <button class="detail-edit-btn" data-id="${m.id}">Bearbeiten</button>`
    row.querySelector('.detail-edit-btn').addEventListener('click', () => openMedForm(m))
    el.appendChild(row)
  })
}

function renderDashCalendar (events) {
  _dashCalEvents    = events
  _dashCalDate      = new Date()
  _dashSelectedDate = null
  renderDashMiniCal()
  renderDashEventList(null)
}

function renderDashMiniCal () {
  const year    = _dashCalDate.getFullYear()
  const month   = _dashCalDate.getMonth()
  const todayStr = isoDate(new Date())

  document.getElementById('dash-cal-month-title').textContent =
    _dashCalDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const byDate = {}
  _dashCalEvents.forEach(e => {
    const key = isoDate(new Date(e.starts_at))
    byDate[key] = (byDate[key] || 0) + 1
  })

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So']

  let html = DAY_NAMES.map(n => `<div class="dmg-header">${n}</div>`).join('')
  for (let i = 0; i < startDow; i++) html += '<div class="dmg-cell other"></div>'

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = isoDate(new Date(year, month, d))
    const count   = byDate[dateStr] || 0
    const cls = ['dmg-cell',
      dateStr === todayStr        ? 'today'      : '',
      dateStr === _dashSelectedDate ? 'selected' : '',
      count                       ? 'has-events' : '',
    ].filter(Boolean).join(' ')
    html += `<div class="${cls}" data-date="${dateStr}">
      <span class="dmg-num">${d}</span>
      ${count ? '<span class="dmg-dot"></span>' : ''}
    </div>`
  }

  const remainder = (startDow + lastDay.getDate()) % 7
  if (remainder) for (let i = remainder; i < 7; i++) html += '<div class="dmg-cell other"></div>'

  const grid = document.getElementById('dash-mini-grid')
  grid.innerHTML = html
  grid.querySelectorAll('.dmg-cell:not(.other)').forEach(cell => {
    cell.addEventListener('click', () => {
      _dashSelectedDate = cell.dataset.date
      renderDashMiniCal()
      renderDashEventList(_dashSelectedDate)
    })
  })
}

function renderDashEventList (dateStr) {
  const el     = document.getElementById('events-list')
  const allBtn = document.getElementById('dash-cal-all-btn')
  allBtn.style.display = dateStr ? '' : 'none'

  const events = dateStr
    ? _dashCalEvents.filter(e => isoDate(new Date(e.starts_at)) === dateStr)
    : _dashCalEvents.filter(e => new Date(e.starts_at) >= new Date(new Date().setHours(0,0,0,0)))

  if (!events.length) {
    el.innerHTML = `<span class="detail-empty">${dateStr ? 'Keine Termine an diesem Tag.' : 'Keine bevorstehenden Termine.'}</span>`
    return
  }
  el.innerHTML = ''
  events.forEach(e => {
    const d        = new Date(e.starts_at)
    const dateLabel = d.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short' })
    const timeStr  = e.all_day ? 'Ganztägig' : d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })+' Uhr'
    const freqStr  = e.frequency && e.frequency !== 'once' ? ' · ' + freqLabel(e.frequency) : ''
    const evtByCaregiver = e.created_by && e.created_by !== _detailUserId
    const evtUpdated     = e.updated_by && e.updated_by !== _detailUserId
    const auditBadge = evtByCaregiver
      ? ' <span class="audit-badge">P</span>'
      : evtUpdated ? ' <span class="audit-badge audit-badge-edit">P</span>' : ''
    const row = document.createElement('div')
    row.className = 'detail-row'
    row.innerHTML = `
      <div>
        <div class="detail-row-main">${escHtml(e.title)}${auditBadge}</div>
        <div class="detail-row-sub">${dateLabel}, ${timeStr}${freqStr}</div>
      </div>
      <button class="detail-edit-btn" data-id="${e.id}">Bearbeiten</button>`
    row.querySelector('.detail-edit-btn').addEventListener('click', () => openCalForm(e))
    el.appendChild(row)
  })
}

// ── Medication CRUD ────────────────────────────────────────

const dashMedOverlay  = document.getElementById('dash-med-overlay')
const dashMedName     = document.getElementById('dash-med-name')
const dashMedDosage   = document.getElementById('dash-med-dosage')
const dashMedTime     = document.getElementById('dash-med-time')
const dashMedFreq     = document.getElementById('dash-med-freq')
const dashMedNotes    = document.getElementById('dash-med-notes')
const dashMedDelete   = document.getElementById('dash-med-delete')
let _editingMedId = null

document.getElementById('dash-med-add-btn').addEventListener('click', () => openMedForm(null))
document.getElementById('dash-med-cancel').addEventListener('click', closeMedForm)
document.getElementById('dash-med-save').addEventListener('click', saveMed)
dashMedDelete.addEventListener('click', deleteMed)

function openMedForm (med) {
  _editingMedId = med?.id ?? null
  document.getElementById('dash-med-form-title').textContent = med ? 'Medikament bearbeiten' : 'Medikament hinzufügen'
  dashMedName.value   = med?.name ?? ''
  dashMedDosage.value = med?.dosage ?? ''
  dashMedTime.value   = med?.time_of_day ? String(med.time_of_day).slice(0,5) : '08:00'
  dashMedFreq.value   = med?.frequency ?? 'daily'
  dashMedNotes.value  = med?.notes ?? ''
  dashMedDelete.style.display = med ? '' : 'none'
  dashMedOverlay.classList.remove('hidden')
  dashMedName.focus()
}

function closeMedForm () {
  dashMedOverlay.classList.add('hidden')
  _editingMedId = null
}

async function saveMed () {
  const name = dashMedName.value.trim()
  if (!name || !_detailUserId) { dashMedName.focus(); return }

  const payload = {
    user_id:     _detailUserId,
    name,
    dosage:      dashMedDosage.value.trim() || null,
    frequency:   dashMedFreq.value,
    time_of_day: dashMedTime.value ? dashMedTime.value + ':00' : null,
    notes:       dashMedNotes.value.trim() || null,
    active:      true,
  }

  let error
  if (_editingMedId) {
    ;({ error } = await sb.from('medications').update({ ...payload, updated_by: _caregiverId }).eq('id', _editingMedId).eq('user_id', _detailUserId))
  } else {
    ;({ error } = await sb.from('medications').insert([{ ...payload, created_by: _caregiverId }]))
  }

  if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return }
  closeMedForm()
  showDetail(_detailUserId, detailName.textContent)
}

async function deleteMed () {
  if (!_editingMedId || !_detailUserId) return
  if (!confirm('Dieses Medikament wirklich löschen?')) return
  await sb.from('medications').delete().eq('id', _editingMedId).eq('user_id', _detailUserId)
  closeMedForm()
  showDetail(_detailUserId, detailName.textContent)
}

// ── Calendar CRUD ──────────────────────────────────────────

const dashCalOverlay    = document.getElementById('dash-cal-overlay')
const dashCalTitle      = document.getElementById('dash-cal-title')
const dashCalDate       = document.getElementById('dash-cal-date')
const dashCalTime       = document.getElementById('dash-cal-time')
const dashCalRecurring  = document.getElementById('dash-cal-recurring')
const dashCalEndGroup   = document.getElementById('dash-cal-end-group')
const dashCalEndDate    = document.getElementById('dash-cal-end-date')
const dashCalNotes      = document.getElementById('dash-cal-notes')
const dashCalDelete     = document.getElementById('dash-cal-delete')
let _editingCalId = null

document.getElementById('dash-cal-add-btn').addEventListener('click', () => openCalForm(null))
document.getElementById('dash-cal-cancel').addEventListener('click', closeCalForm)
document.getElementById('dash-cal-save').addEventListener('click', saveCal)
dashCalRecurring.addEventListener('change', () => {
  dashCalEndGroup.classList.toggle('hidden', dashCalRecurring.value === 'once')
  if (dashCalRecurring.value === 'once') dashCalEndDate.value = ''
})
document.getElementById('dash-cal-prev').addEventListener('click', () => {
  _dashCalDate = new Date(_dashCalDate.getFullYear(), _dashCalDate.getMonth() - 1, 1)
  _dashSelectedDate = null
  renderDashMiniCal()
  renderDashEventList(null)
})
document.getElementById('dash-cal-next').addEventListener('click', () => {
  _dashCalDate = new Date(_dashCalDate.getFullYear(), _dashCalDate.getMonth() + 1, 1)
  _dashSelectedDate = null
  renderDashMiniCal()
  renderDashEventList(null)
})
document.getElementById('dash-cal-all-btn').addEventListener('click', () => {
  _dashSelectedDate = null
  renderDashMiniCal()
  renderDashEventList(null)
})
dashCalDelete.addEventListener('click', deleteCal)

function openCalForm (event) {
  _editingCalId = event?.id ?? null
  document.getElementById('dash-cal-form-title').textContent = event ? 'Termin bearbeiten' : 'Termin hinzufügen'
  dashCalTitle.value = event?.title ?? ''
  if (event?.starts_at) {
    const d = new Date(event.starts_at)
    dashCalDate.value = isoDate(d)
    dashCalTime.value = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')
  } else {
    dashCalDate.value = isoDate(new Date())
    dashCalTime.value = '09:00'
  }
  const freq = event?.frequency ?? 'once'
  dashCalRecurring.value = freq
  dashCalEndDate.value   = event?.ends_at ? isoDate(new Date(event.ends_at)) : ''
  dashCalEndGroup.classList.toggle('hidden', freq === 'once')
  dashCalNotes.value  = event?.description ?? ''
  dashCalDelete.style.display = event ? '' : 'none'
  dashCalOverlay.classList.remove('hidden')
  dashCalTitle.focus()
}

function closeCalForm () {
  dashCalOverlay.classList.add('hidden')
  _editingCalId = null
}

async function saveCal () {
  const title = dashCalTitle.value.trim()
  if (!title || !_detailUserId) { dashCalTitle.focus(); return }

  const startsAt = toLocalISOString(dashCalDate.value, dashCalTime.value)
  const freq     = dashCalRecurring.value
  const payload  = {
    user_id:     _detailUserId,
    title,
    starts_at:   startsAt,
    all_day:     false,
    description: dashCalNotes.value.trim() || null,
    frequency:   freq,
    ends_at:     freq !== 'once' && dashCalEndDate.value ? `${dashCalEndDate.value}T23:59:59Z` : null,
  }

  let error
  if (_editingCalId) {
    ;({ error } = await sb.from('calendar_events').update({ ...payload, updated_by: _caregiverId }).eq('id', _editingCalId).eq('user_id', _detailUserId))
  } else {
    ;({ error } = await sb.from('calendar_events').insert([{ ...payload, created_by: _caregiverId }]))
  }

  if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return }
  closeCalForm()
  showDetail(_detailUserId, detailName.textContent)
}

async function deleteCal () {
  if (!_editingCalId || !_detailUserId) return
  if (!confirm('Diesen Termin wirklich löschen?')) return
  await sb.from('calendar_events').delete().eq('id', _editingCalId).eq('user_id', _detailUserId)
  closeCalForm()
  showDetail(_detailUserId, detailName.textContent)
}

// ── To-Do (Dashboard) ──────────────────────────────────────

let _dashTodoLists      = []
let _dashTodoItems      = []
let _dashActiveListId   = null
let _editingTodoId      = null
let _dashShowDone       = false

document.getElementById('dash-todo-add-btn').addEventListener('click', () => openDashTodoForm(null))
dashTodoSave.addEventListener('click',    saveDashTodo)
dashTodoCancel.addEventListener('click',  closeDashTodoForm)
dashTodoArchive.addEventListener('click', archiveDashTodo)

async function loadAndRenderDashTodos (userId) {
  const { data: lists } = await sb.from('todo_lists')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  _dashTodoLists = lists ?? []
  _dashActiveListId = _dashTodoLists[0]?.id ?? null
  _dashShowDone = false
  renderDashTodoListsBar()
  await loadDashTodoItems()
}

function renderDashTodoListsBar () {
  const bar = document.getElementById('dash-todo-lists-bar')
  bar.innerHTML = ''

  if (!_dashTodoLists.length) return

  _dashTodoLists.forEach(list => {
    const btn = document.createElement('button')
    btn.className = 'dash-todo-tab' + (list.id === _dashActiveListId ? ' active' : '')
    btn.textContent = list.name
    btn.addEventListener('click', async () => {
      _dashActiveListId = list.id
      renderDashTodoListsBar()
      await loadDashTodoItems()
    })
    bar.appendChild(btn)
  })

  const toggle = document.createElement('button')
  toggle.className = 'dash-todo-done-toggle' + (_dashShowDone ? ' active' : '')
  toggle.textContent = _dashShowDone ? '✓ Ausblenden' : '✓ Erledigt'
  toggle.addEventListener('click', () => {
    _dashShowDone = !_dashShowDone
    renderDashTodoListsBar()
    renderDashTodoItems()
  })
  bar.appendChild(toggle)
}

async function loadDashTodoItems () {
  const el = document.getElementById('dash-todo-items')
  if (!_dashActiveListId) { el.innerHTML = '<span class="detail-empty">Keine Listen vorhanden.</span>'; return }
  const { data } = await sb.from('todo_items')
    .select('id, title, notes, status, due_at, created_by')
    .eq('list_id', _dashActiveListId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })
  _dashTodoItems = data ?? []
  renderDashTodoItems()
}

function renderDashTodoItems () {
  const el = document.getElementById('dash-todo-items')
  const items = _dashShowDone
    ? _dashTodoItems
    : _dashTodoItems.filter(i => i.status !== 'done')

  if (!items.length) {
    el.innerHTML = '<span class="detail-empty">Keine offenen Aufgaben.</span>'
    return
  }

  el.innerHTML = ''
  items.forEach(item => {
    const row = document.createElement('div')
    row.className = 'detail-row' + (item.status === 'done' ? ' todo-done' : '')

    const dueStr = item.due_at
      ? new Date(item.due_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
      : ''
    const overdue = item.due_at && item.status !== 'done' && new Date(item.due_at) < new Date()
    const byCaregiver = item.created_by && item.created_by !== _detailUserId

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <button class="dash-todo-check" data-id="${item.id}">${item.status === 'done' ? '✓' : ''}</button>
        <div style="flex:1;min-width:0">
          <div class="detail-row-main${item.status === 'done' ? ' dash-todo-strike' : ''}">
            ${escHtml(item.title)}${byCaregiver ? ' <span class="audit-badge">P</span>' : ''}
          </div>
          ${dueStr ? `<div class="detail-row-sub${overdue ? ' dash-todo-overdue' : ''}">${dueStr}</div>` : ''}
        </div>
      </div>
      <button class="detail-edit-btn">Bearbeiten</button>`

    row.querySelector('.dash-todo-check').addEventListener('click', () => toggleDashTodo(item))
    row.querySelector('.detail-edit-btn').addEventListener('click', () => openDashTodoForm(item))
    el.appendChild(row)
  })
}

async function toggleDashTodo (item) {
  const newStatus = item.status === 'done' ? 'open' : 'done'
  const patch = { status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }
  const { error } = await sb.from('todo_items').update(patch)
    .eq('id', item.id).eq('user_id', _detailUserId)
  if (error) return
  item.status = newStatus
  renderDashTodoItems()
}

function openDashTodoForm (item) {
  _editingTodoId = item?.id ?? null
  dashTodoFormTitle.textContent = item ? 'Aufgabe bearbeiten' : 'Aufgabe hinzufügen'
  dashTodoTitle.value = item?.title ?? ''
  dashTodoNotes.value = item?.notes ?? ''
  dashTodoDue.value   = item?.due_at ? isoDate(new Date(item.due_at)) : ''
  dashTodoList.innerHTML = _dashTodoLists.map(l =>
    `<option value="${l.id}"${l.id === _dashActiveListId ? ' selected' : ''}>${escHtml(l.name)}</option>`
  ).join('')
  dashTodoArchive.style.display = item ? '' : 'none'
  dashTodoOverlay.classList.remove('hidden')
  dashTodoTitle.focus()
}

function closeDashTodoForm () {
  dashTodoOverlay.classList.add('hidden')
  _editingTodoId = null
}

async function saveDashTodo () {
  const title = dashTodoTitle.value.trim()
  if (!title || !_detailUserId) { dashTodoTitle.focus(); return }

  let listId = dashTodoList.value || _dashActiveListId

  // Auto-create default list if patient has none yet
  if (!listId) {
    const { data: newList, error: listErr } = await sb.from('todo_lists')
      .insert([{ user_id: _detailUserId, name: 'Aufgaben' }])
      .select('id').single()
    if (listErr) { alert('Liste konnte nicht angelegt werden: ' + listErr.message); return }
    listId = newList.id
    _dashTodoLists.push({ id: listId, name: 'Aufgaben' })
    _dashActiveListId = listId
  }
  const payload = {
    title,
    notes:   dashTodoNotes.value.trim() || null,
    due_at:  dashTodoDue.value ? `${dashTodoDue.value}T12:00:00Z` : null,
    list_id: listId,
    user_id: _detailUserId,
  }

  let error
  if (_editingTodoId) {
    ;({ error } = await sb.from('todo_items')
      .update({ ...payload, updated_by: _caregiverId })
      .eq('id', _editingTodoId).eq('user_id', _detailUserId))
  } else {
    ;({ error } = await sb.from('todo_items')
      .insert([{ ...payload, created_by: _caregiverId }]))
  }

  if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return }
  if (listId !== _dashActiveListId) _dashActiveListId = listId
  closeDashTodoForm()
  renderDashTodoListsBar()
  await loadDashTodoItems()
}

async function archiveDashTodo () {
  if (!_editingTodoId || !_detailUserId) return
  const { error } = await sb.from('todo_items').update({ status: 'archived' })
    .eq('id', _editingTodoId).eq('user_id', _detailUserId)
  if (error) { alert('Archivieren fehlgeschlagen.'); return }
  closeDashTodoForm()
  await loadDashTodoItems()
}
