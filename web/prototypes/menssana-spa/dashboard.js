// MensSana — Caregiver Dashboard

const SUPABASE_URL      = 'https://sycfzysiwshdijeintyt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y2Z6eXNpd3NoZGlqZWludHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk2MzUsImV4cCI6MjA5MDIyNTYzNX0.jaZwlY7dmWIHUm57L6j_gWkK9IIGn27-k2mV_n1PoDc'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── DOM refs ──────────────────────────────────────────────
const loginView    = document.getElementById('login-view')
const dashView     = document.getElementById('dashboard-view')
const loginForm    = document.getElementById('login-form')
const loginStatus  = document.getElementById('login-status')
const dashUser     = document.getElementById('dash-user')
const logoutBtn    = document.getElementById('logout-btn')
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
sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    setTimeout(() => initDashboard(session.user), 0)
  } else {
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
  // Load profile and verify role
  const { data: profile } = await sb
    .from('profiles')
    .select('role, display_name, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'caregiver' && profile.role !== 'family')) {
    loginStatus.textContent = 'Dieses Konto hat keinen Dashboard-Zugang. Bitte als Benutzer anmelden.'
    await sb.auth.signOut()
    return
  }

  const name = profile.display_name || profile.full_name || user.email
  dashUser.textContent = name
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

  // Load next medication per user (first alphabetically for MVP)
  const { data: meds } = await sb
    .from('medications')
    .select('user_id, name, scheduled_time')
    .in('user_id', userIds)
    .order('scheduled_time', { ascending: true })

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
          <div class="stat-value">${med ? `${escHtml(med.name)} ${med.scheduled_time ? med.scheduled_time.slice(0,5)+' Uhr' : ''}` : '—'}</div>
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
      .select('name, dosage, scheduled_time, frequency')
      .eq('user_id', userId)
      .order('scheduled_time', { ascending: true }),

    sb.from('calendar_events')
      .select('title, starts_at, all_day')
      .eq('user_id', userId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(5),
  ])

  renderMoodChart(moodRes.data ?? [])
  renderConversations(convRes.data ?? [])
  renderMedications(medsRes.data ?? [])
  renderEvents(eventsRes.data ?? [])
}

function renderMoodChart (entries) {
  const el = document.getElementById('mood-chart')
  const today = new Date()
  const DAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa']
  const HEIGHT_MAP = { '4': 56, '3': 40, '2': 28, '1': 16 }

  // Build map by date
  const byDate = {}
  entries.forEach(e => { byDate[e.entry_date] = e.mood })

  let html = ''
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today); d.setDate(today.getDate() - i)
    const key = isoDate(d)
    const mood = byDate[key]
    const cls  = mood ? (MOOD_CLASS[mood] ?? 'mx') : 'mx'
    const h    = mood ? HEIGHT_MAP[mood] : 4
    const day  = DAY_NAMES[d.getDay()]
    html += `<div class="mood-bar-wrap">
      <div class="mood-bar ${cls}" style="height:${h}px" title="${MOOD_LABELS[mood] ?? 'Kein Eintrag'}"></div>
      <span class="mood-day-label">${day}</span>
    </div>`
  }
  el.innerHTML = html
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
  el.innerHTML = meds.map(m => `
    <div class="detail-row">
      <div>
        <div class="detail-row-main">${escHtml(m.name)}${m.dosage ? ' · '+escHtml(m.dosage) : ''}</div>
        <div class="detail-row-sub">${freqLabel(m.frequency)}</div>
      </div>
      <span class="detail-row-sub">${m.scheduled_time ? m.scheduled_time.slice(0,5)+' Uhr' : ''}</span>
    </div>`).join('')
}

function renderEvents (events) {
  const el = document.getElementById('events-list')
  if (!events.length) { el.innerHTML = '<span class="detail-empty">Keine bevorstehenden Termine.</span>'; return }
  el.innerHTML = events.map(e => {
    const d = new Date(e.starts_at)
    const dateStr = d.toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short' })
    const timeStr = e.all_day ? 'Ganztägig' : d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })+' Uhr'
    return `<div class="detail-row">
      <span class="detail-row-main">${escHtml(e.title)}</span>
      <span class="detail-row-sub">${dateStr}, ${timeStr}</span>
    </div>`
  }).join('')
}
