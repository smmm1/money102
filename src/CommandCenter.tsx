import { useEffect, useMemo, useState, type FormEvent } from "react"
import "./command-center.css"

type Page = "home" | "money" | "notes" | "health"
type Transaction = { id: string; type: "income" | "expense"; amount: number; detail: string; date: string; createdAt: number }
type Note = { id: string; title: string; body: string; tags?: string[]; mood?: string; pinned?: boolean; createdAt: string; updatedAt: string }
type Profile = { id: string; name: string; height: number; age: number }
type HealthRecord = { id: string; profileId: string; date: string; type: "weight" | "exercise" | "wellness"; weight?: number; distance?: number; duration?: number; reps?: number; sets?: number; exercise?: string; water?: number; sleep?: number; note?: string }
type HealthData = { profiles: Profile[]; activeProfileId: string; records: HealthRecord[] }
type DashboardWidget = "recent" | "goal" | "trend"

const KEYS = { money: "lamoon-transactions", goal: "lamoon-saving-goal", goalTitle: "lamoon-saving-goal-title", notes: "lamoon-commonplace-notes-v1", health: "lamoon-health-dashboard-v1" }
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }
const uid = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  } catch {}
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
const safeGet = (key: string): string | null => { try { return localStorage.getItem(key) } catch { return null } }
const safeSet = (key: string, value: string) => { try { localStorage.setItem(key, value); return true } catch { return false } }
const safeRemove = (key: string) => { try { localStorage.removeItem(key) } catch {} }
const read = <T,>(key: string, fallback: T): T => { try { const raw = safeGet(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback } }
const cash = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n)
const dateLabel = (s: string) => { try { return new Date(s + "T12:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) } catch { return s } }

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6",
    money: "M3 6.5h18v13H3zM7 6.5V4h10v2.5M7 11h5",
    notes: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
    health: "M20.8 8.8c0 5.2-8.8 10-8.8 10S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z",
    plus: "M12 5v14M5 12h14", arrow: "M5 12h14M13 6l6 6-6 6", search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    close: "M6 6l12 12M18 6 6 18", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
    pin: "M16 3 21 8l-4 1-4 4-1 5-2-2-5 5 4-7-2-2 5-1 4-4z", wallet: "M4 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14M16 12h5",
    check: "m5 12 4 4L19 6", calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 10h16", sparkles: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.arrow} /></svg>
}

function Empty({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span className="empty-mark"><Icon name="plus" /></span><h3>{title}</h3><p>{body}</p><button className="button button-primary" onClick={onClick}><Icon name="plus" />{action}</button></div>
}


function AnimatedMoney({ value, className = "" }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const from = shown
    const start = performance.now()
    const duration = 650
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  // Animation intentionally follows only the target value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className={className}>{cash(Math.round(shown))}</span>
}

function MoneyTrend({ transactions }: { transactions: Transaction[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
    const items = transactions.filter(item => item.date === key)
    return { key, label: date.toLocaleDateString("th-TH", { day: "numeric", month: "short" }), income: items.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0), expense: items.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0) }
  })
  const max = Math.max(1, ...days.flatMap(day => [day.income, day.expense]))
  const point = (value: number, index: number) => `${24 + index * 52},${104 - value / max * 76}`
  const incomeLine = days.map((day, index) => point(day.income, index)).join(" ")
  const expenseLine = days.map((day, index) => point(day.expense, index)).join(" ")
  return <section className="surface trend-surface"><div className="surface-heading"><div><span className="eyebrow">จังหวะการเงิน</span><h3>7 วันที่ผ่านมา</h3></div><span className="trend-live"><i /> LIVE VIEW</span></div><div className="trend-legend"><span><i className="income-dot" />รายรับ</span><span><i className="expense-dot" />รายจ่าย</span></div><div className="trend-chart"><svg viewBox="0 0 360 124" role="img" aria-label="กราฟรายรับและรายจ่ายย้อนหลัง 7 วัน" preserveAspectRatio="none"><defs><linearGradient id="trend-income-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5c9b70" stopOpacity=".2"/><stop offset="100%" stopColor="#5c9b70" stopOpacity="0"/></linearGradient></defs>{[28,53,78,104].map(y => <line key={y} x1="18" x2="342" y1={y} y2={y} stroke="#e8ece5" strokeDasharray="3 5" />)}<polyline points={incomeLine} fill="none" stroke="#4e9162" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="trend-line" /> <polyline points={expenseLine} fill="none" stroke="#c78360" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="trend-line trend-line-delay" />{days.map((day,index)=><g key={day.key}><circle cx={24+index*52} cy={104-day.income/max*76} r="3.4" fill="#4e9162" stroke="#fff" strokeWidth="1.5"/><circle cx={24+index*52} cy={104-day.expense/max*76} r="3.4" fill="#c78360" stroke="#fff" strokeWidth="1.5"/></g>)}</svg><div className="trend-labels">{days.map(day=><span key={day.key}>{day.label}</span>)}</div></div><p className="trend-footnote">ภาพรวมจากรายการที่บันทึกไว้ในเครื่องนี้ · ไม่ได้เชื่อมข้อมูลภายนอก</p></section>
}

export default function CommandCenter() {
  const [page, setPage] = useState<Page>(() => { const hash = location.hash.slice(1); return hash === "saving" ? "money" : (["money", "notes", "health"].includes(hash) ? hash as Page : "home") })
  const [transactions, setTransactions] = useState<Transaction[]>(() => read(KEYS.money, []))
  const [goal, setGoal] = useState(() => Number(safeGet(KEYS.goal)) || 20000)
  const [goalTitle, setGoalTitle] = useState(() => safeGet(KEYS.goalTitle) || "เงินสำรองของฉัน")
  const [notes, setNotes] = useState<Note[]>(() => read(KEYS.notes, []))
  const [health, setHealth] = useState<HealthData>(() => read(KEYS.health, { profiles: [{ id: "profile-default", name: "ฉัน", height: 163, age: 26 }], activeProfileId: "profile-default", records: [] }))
  const [search, setSearch] = useState("")
  const [showEntry, setShowEntry] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileHeight, setProfileHeight] = useState("163")
  const [profileAge, setProfileAge] = useState("26")
  const [profileInitialWeight, setProfileInitialWeight] = useState("")
  const [showHealth, setShowHealth] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("expense")
  const [amount, setAmount] = useState("")
  const [detail, setDetail] = useState("")
  const [entryDate, setEntryDate] = useState(today())
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [healthType, setHealthType] = useState<"weight" | "exercise" | "wellness">("weight")
  const [weight, setWeight] = useState("")
  const [exercise, setExercise] = useState("เดิน")
  const [distance, setDistance] = useState("")
  const [duration, setDuration] = useState("")
  const [reps, setReps] = useState("")
  const [sets, setSets] = useState("3")
  const [water, setWater] = useState("6")
  const [sleep, setSleep] = useState("8")
  const [healthDate, setHealthDate] = useState(today())
  const [moneyFilter, setMoneyFilter] = useState<"all" | "income" | "expense">("all")
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>(() => read("money102-hidden-widgets-v1", []))
  const [dashboardOrder, setDashboardOrder] = useState<DashboardWidget[]>(() => {
    const saved = read<DashboardWidget[]>("money102-dashboard-order-v1", ["recent", "goal", "trend"])
    return (["recent", "goal", "trend"] as DashboardWidget[]).every(item => saved.includes(item)) ? saved : ["recent", "goal", "trend"]
  })
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidget | null>(null)
  const [memorySelectedDate, setMemorySelectedDate] = useState(today())
  const [delightActive, setDelightActive] = useState(false)
  const [themeStudioOpen, setThemeStudioOpen] = useState(false)
  const [theme, setTheme] = useState<"lavender" | "matcha" | "cream" | "midnight">(() => {
    const saved = read<string>("money102-theme-v1", "lavender")
    return (["lavender", "matcha", "cream", "midnight"] as string[]).includes(saved) ? saved as "lavender" | "matcha" | "cream" | "midnight" : "lavender"
  })
  const [motionLevel, setMotionLevel] = useState<"bold" | "soft">(() => { const saved = read<string>("money102-motion-v1", "soft"); return saved === "bold" ? "bold" : "soft" })
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => read("money102-sounds-enabled-v1", true))

  useEffect(() => { safeSet(KEYS.money, JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { safeSet("money102-hidden-widgets-v1", JSON.stringify(hiddenWidgets)) }, [hiddenWidgets])
  useEffect(() => { safeSet("money102-dashboard-order-v1", JSON.stringify(dashboardOrder)) }, [dashboardOrder])
  useEffect(() => { safeSet("money102-theme-v1", JSON.stringify(theme)) }, [theme])
  useEffect(() => { safeSet("money102-motion-v1", JSON.stringify(motionLevel)) }, [motionLevel])
  useEffect(() => { safeSet("money102-sounds-enabled-v1", JSON.stringify(soundsEnabled)) }, [soundsEnabled])
  useEffect(() => {
    if (!soundsEnabled) return
    let audio: AudioContext | null = null
    const play = (kind: string) => {
      try {
        audio ||= new AudioContext()
        if (audio.state === "suspended") void audio.resume()
        const ctx = audio
        const themeBase: Record<string, number> = { lavender: 0, matcha: -3, cream: 4, midnight: -7 }
        const base = themeBase[theme] ?? 0
        const sounds: Record<string, { notes: number[]; wave: OscillatorType; duration: number; volume: number }> = {
          nav: { notes: [523, 659], wave: "sine", duration: .11, volume: .035 },
          money: { notes: [392, 587, 784], wave: "triangle", duration: .16, volume: .04 },
          notes: { notes: [659, 784], wave: "sine", duration: .13, volume: .03 },
          health: { notes: [440, 554, 659], wave: "sine", duration: .2, volume: .03 },
          save: { notes: [587, 740, 880], wave: "triangle", duration: .18, volume: .04 },
          delete: { notes: [440, 349], wave: "triangle", duration: .16, volume: .025 },
          toggle: { notes: [740], wave: "sine", duration: .08, volume: .025 },
          date: { notes: [523, 392], wave: "sine", duration: .1, volume: .022 },
          quick: { notes: [440, 554, 659], wave: "triangle", duration: .14, volume: .03 },
          theme: { notes: [523, 659, 784], wave: "sine", duration: .2, volume: .03 },
          default: { notes: [587], wave: "sine", duration: .075, volume: .018 }
        }
        const sound = sounds[kind] || sounds.default
        sound.notes.forEach((note, index) => {
          const oscillator = ctx.createOscillator()
          const gain = ctx.createGain()
          const start = ctx.currentTime + index * (kind === "delete" ? .075 : .045)
          oscillator.type = sound.wave
          oscillator.frequency.setValueAtTime(note * Math.pow(2, base / 12), start)
          gain.gain.setValueAtTime(.0001, start)
          gain.gain.exponentialRampToValueAtTime(sound.volume, start + .012)
          gain.gain.exponentialRampToValueAtTime(.0001, start + sound.duration)
          oscillator.connect(gain); gain.connect(ctx.destination)
          oscillator.start(start); oscillator.stop(start + sound.duration + .01)
        })
      } catch { /* Audio is optional; UI actions must work even when sound is unavailable. */ }
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest("button")
      if (!button || button.disabled || button.getAttribute("aria-label") === "ปิดเสียง") return
      if (button.closest(".theme-studio")) { play(button.classList.contains("theme-swatch") ? "theme" : "toggle"); return }
      if (button.classList.contains("top-nav-link")) {
        const label = button.textContent || ""
        play(label.includes("การเงิน") ? "money" : label.includes("โน้ต") ? "notes" : label.includes("สุขภาพ") ? "health" : "nav"); return
      }
      if (button.classList.contains("tool-card")) {
        play(button.classList.contains("tool-money") ? "money" : button.classList.contains("tool-notes") ? "notes" : button.classList.contains("tool-health") ? "health" : "nav"); return
      }
      if (button.classList.contains("delete-button") || button.querySelector('[data-icon="trash"]')) { play("delete"); return }
      if (button.classList.contains("memory-day") || button.classList.contains("filter-tab") || button.classList.contains("layout-check")) { play("date"); return }
      if (button.classList.contains("theme-trigger")) { play("theme"); return }
      if (button.classList.contains("quick-add-button") || button.closest(".quick-add-menu")) { play("quick"); return }
      if (button.classList.contains("button-primary") || button.closest(".modal-card") && (button.type === "submit" || /บันทึก|สร้าง/.test(button.textContent || ""))) { play("save"); return }
      if (button.classList.contains("button") || button.classList.contains("text-button") || button.classList.contains("icon-button") || button.classList.contains("command-item")) { play("toggle"); return }
      play("default")
    }
    document.addEventListener("click", onClick)
    return () => { document.removeEventListener("click", onClick); if (audio) void audio.close() }
  }, [soundsEnabled, theme])
  useEffect(() => {
    if (!delightActive) return
    const timer = window.setTimeout(() => setDelightActive(false), 1100)
    return () => window.clearTimeout(timer)
  }, [delightActive])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(open => !open)
        setCommandQuery("")
        setQuickAddOpen(false)
      } else if (event.key === "Escape") {
        setCommandOpen(false)
        setQuickAddOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5500)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!showNote) return
    setDraftStatus("saving")
    const timer = window.setTimeout(() => {
      try {
        safeSet("lamoon-note-draft-v1", JSON.stringify({ title: noteTitle, body: noteBody, updatedAt: new Date().toISOString() }))
        setDraftStatus("saved")
      } catch { setDraftStatus("idle") }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [showNote, noteTitle, noteBody])
  useEffect(() => { safeSet(KEYS.notes, JSON.stringify(notes)) }, [notes])
  useEffect(() => { safeSet(KEYS.health, JSON.stringify(health)) }, [health])
  useEffect(() => { safeSet(KEYS.goal, String(goal)); safeSet(KEYS.goalTitle, goalTitle) }, [goal, goalTitle])
  useEffect(() => { const sync = () => { const next = location.hash.slice(1); if (next === "saving") setPage("money"); else if (["money", "notes", "health"].includes(next)) setPage(next as Page); else setPage("home") }; addEventListener("hashchange", sync); return () => removeEventListener("hashchange", sync) }, [])

  const go = (next: Page) => { setPage(next); history.replaceState(null, "", next === "home" ? location.pathname + location.search : "#" + next); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const balance = income - expense
  const month = today().slice(0, 7)
  const monthItems = transactions.filter(t => t.date.startsWith(month))
  const profile = health.profiles.find(p => p.id === health.activeProfileId) || health.profiles[0]
  const healthRecords = health.records.filter(r => r.profileId === profile?.id).sort((a, b) => b.date.localeCompare(a.date))
  const latestWeight = healthRecords.find(r => r.type === "weight" && typeof r.weight === "number")?.weight
  const bmi = latestWeight && profile?.height ? latestWeight / ((profile.height / 100) ** 2) : null
  const pinned = notes.filter(n => n.pinned)
  const filteredNotes = useMemo(() => notes.filter(n => (n.title + " " + n.body).toLowerCase().includes(search.toLowerCase().trim())).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt)), [notes, search])
  const sortedTransactions = useMemo(() => transactions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [transactions])
  const visibleTransactions = sortedTransactions.filter(t => moneyFilter === "all" || t.type === moneyFilter)
  const memoryDays = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (27 - index))
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
    const noteCount = notes.filter(note => (note.updatedAt || note.createdAt).slice(0, 10) === key).length
    const moneyCount = transactions.filter(item => item.date === key).length
    const healthCount = health.records.filter(record => record.date === key).length
    return { key, day: date.toLocaleDateString("th-TH", { day: "numeric" }), label: date.toLocaleDateString("th-TH", { day: "numeric", month: "short" }), noteCount, moneyCount, healthCount, count: noteCount + moneyCount + healthCount }
  }), [notes, transactions, health.records])
  const selectedMemoryDay = memoryDays.find(day => day.key === memorySelectedDate) || memoryDays[memoryDays.length - 1]
  const moveWidget = (from: DashboardWidget | null, to: DashboardWidget) => {
    if (!from || from === to) return
    setDashboardOrder(old => {
      const next = old.filter(item => item !== from)
      next.splice(next.indexOf(to), 0, from)
      return next
    })
    setDraggedWidget(null)
  }
  const greeting = new Date().getHours() < 12 ? "อรุณสวัสดิ์" : new Date().getHours() < 18 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น"

  function saveMoney(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0 || !detail.trim()) return
    const transaction: Transaction = { id: uid(), type: entryType, amount: value, detail: detail.trim(), date: entryDate, createdAt: Date.now() }
    setTransactions(old => [transaction, ...old])
    setDelightActive(true)
    setToast({ message: "บันทึกรายการแล้ว", undo: () => setTransactions(old => old.filter(item => item.id !== transaction.id)) })
    setAmount(""); setDetail(""); setEntryDate(today()); setShowEntry(false); setQuickAddOpen(false)
  }
  function saveNote(e: FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim() && !noteBody.trim()) return
    const now = new Date().toISOString()
    if (editingNoteId) setNotes(old => old.map(n => n.id === editingNoteId ? { ...n, title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), updatedAt: now } : n))
    else setNotes(old => [{ id: uid(), title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), tags: [], mood: "neutral", pinned: false, createdAt: now, updatedAt: now }, ...old])
    safeRemove("lamoon-note-draft-v1")
    setDelightActive(true)
    setToast({ message: editingNoteId ? "อัปเดตโน้ตแล้ว" : "บันทึกโน้ตแล้ว" })
    setNoteTitle(""); setNoteBody(""); setEditingNoteId(null); setShowNote(false); setQuickAddOpen(false)
  }
  function saveHealth(e: FormEvent) {
    e.preventDefault()
    const record: HealthRecord = { id: uid(), profileId: profile?.id || "profile-default", date: healthDate, type: healthType }
    if (healthType === "weight") { if (!(Number(weight) > 0)) return; record.weight = Number(weight) }
    if (healthType === "exercise") { record.exercise = exercise; record.distance = Number(distance) || 0; record.duration = Number(duration) || 0; record.reps = Number(reps) || 0; record.sets = Number(sets) || 0 }
    if (healthType === "wellness") { record.water = Number(water) || 0; record.sleep = Number(sleep) || 0 }
    setHealth(old => ({ ...old, records: [...old.records, record] }))
    setDelightActive(true)
    setWeight(""); setDistance(""); setDuration(""); setReps(""); setSets("3"); setShowHealth(false)
  }
  function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!profileName.trim()) return
    const nextProfile: Profile = { id: uid(), name: profileName.trim(), height: Number(profileHeight) || 163, age: Number(profileAge) || 0 }
    const initial = Number(profileInitialWeight)
    const initialRecord: HealthRecord | null = initial > 0 ? { id: uid(), profileId: nextProfile.id, date: today(), type: "weight", weight: initial, note: "น้ำหนักเริ่มต้นจากโปรไฟล์" } : null
    setHealth(old => ({ ...old, profiles: [...old.profiles, nextProfile], activeProfileId: nextProfile.id, records: initialRecord ? [...old.records, initialRecord] : old.records }))
    setProfileName(""); setProfileHeight("163"); setProfileAge("26"); setProfileInitialWeight(""); setShowProfile(false)
  }

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "ภาพรวม", icon: "home" },
    { id: "money", label: "การเงิน", icon: "money" },
    { id: "notes", label: "โน้ต", icon: "notes" },
    { id: "health", label: "สุขภาพ", icon: "health" }
  ]
  const pageTitle: Record<Page, string> = { home: "ภาพรวมของคุณ", money: "การเงิน", notes: "โน้ตของฉัน", health: "สุขภาพ" }

  return <div className={"app-shell theme-" + theme + (motionLevel === "soft" ? " motion-soft" : " motion-bold")}>
    <main className="main-area">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")} aria-label="กลับหน้าภาพรวม"><span className="brand-symbol" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><path className="brand-loop" d="M12 23C7 16 12 8 20 10c7 1 11 8 7 14-3 6-11 8-15 3-4-5 0-12 6-12 4 0 7 2 10 5" /><circle className="brand-spark" cx="30" cy="10" r="2.2" /></svg></span><span className="brand-name">moneyeep<small>พื้นที่ส่วนตัว</small></span></button>
        <nav className="top-nav" aria-label="เมนูหลัก">{nav.map(item => <button key={item.id} onClick={() => go(item.id)} className={page === item.id ? "top-nav-link active" : "top-nav-link"} aria-current={page === item.id ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
        <div className="topbar-actions"><span className="today-label"><Icon name="calendar" />{dateLabel(today())}</span><div className="theme-studio-wrap"><button className={themeStudioOpen ? "theme-trigger active" : "theme-trigger"} onClick={() => setThemeStudioOpen(open => !open)} aria-label="ปรับธีมและการเคลื่อนไหว" aria-expanded={themeStudioOpen}><Icon name="sparkles"/><span>ธีม</span></button>{themeStudioOpen && <div className="theme-studio" role="dialog" aria-label="Theme Studio"><div className="theme-studio-heading"><div><strong>Theme Studio</strong><small>ปรับอารมณ์พื้นที่ส่วนตัว</small></div><button className="theme-close" onClick={() => setThemeStudioOpen(false)} aria-label="ปิด">×</button></div><div className="theme-swatches">{([{id:"lavender",label:"Lavender",color:"#e8ddf8"},{id:"matcha",label:"Matcha",color:"#dcebd7"},{id:"cream",label:"Cream",color:"#f6e8cf"},{id:"midnight",label:"Midnight",color:"#343047"}] as const).map(option => <button key={option.id} className={theme === option.id ? "theme-swatch selected" : "theme-swatch"} onClick={() => setTheme(option.id)} aria-pressed={theme === option.id}><i style={{background:option.color}}/><span>{option.label}</span></button>)}</div><div className="sound-choice"><span><strong>เสียง UI</strong><small>เสียงต่างกันตามปุ่มและธีม</small></span><button className={soundsEnabled ? "sound-switch enabled" : "sound-switch"} onClick={() => setSoundsEnabled(enabled => !enabled)} aria-label={soundsEnabled ? "ปิดเสียง" : "เปิดเสียง"} aria-pressed={soundsEnabled}><i/></button></div><div className="motion-choice"><span>Motion</span><button className={motionLevel === "bold" ? "motion-option selected" : "motion-option"} onClick={() => setMotionLevel("bold")} aria-pressed={motionLevel === "bold"}>Bold</button><button className={motionLevel === "soft" ? "motion-option selected" : "motion-option"} onClick={() => setMotionLevel("soft")} aria-pressed={motionLevel === "soft"}>Soft</button></div><p>บันทึกการตั้งค่าไว้ในเครื่องนี้เท่านั้น</p></div>}</div><div className="topbar-account"><div className="cc-account-trigger" aria-label="พื้นที่ส่วนตัว"><span>M</span></div></div></div>
      </header>

      {page === "home" && <section className="page-content">
        <div className="welcome-row"><div><span className="eyebrow">{greeting} · ยินดีต้อนรับกลับมา</span><h1>ค่อย ๆ จัดการ<br/><em>ทีละเรื่องก็พอ</em></h1><p className="intro-copy">พื้นที่เล็ก ๆ สำหรับดูแลเงิน ความคิด และตัวเอง โดยไม่ต้องทำให้ทุกอย่างยุ่งยาก</p></div><div className="date-card"><span>วันนี้</span><strong>{new Date().toLocaleDateString("th-TH", { day: "numeric" })}</strong><small>{new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</small></div></div>
        <section className="balance-card"><div className="balance-copy"><span className="eyebrow light">ภาพรวมการเงิน</span><p>ยอดคงเหลือทั้งหมด</p><strong><AnimatedMoney value={balance} /></strong><div className="balance-detail"><span><i className="legend-dot income-dot" />รับเข้า {cash(income)}</span><span><i className="legend-dot expense-dot" />จ่ายออก {cash(expense)}</span></div></div><div className="balance-art" aria-hidden="true"><span className="art-ring ring-one"/><span className="art-ring ring-two"/><span className="art-core">฿</span></div><button className="balance-link" onClick={() => go("money")}>ดูรายละเอียด <Icon name="arrow"/></button></section>
        <div className="dashboard-playground">
          <div><span className="eyebrow">จัดพื้นที่ของคุณ</span><strong>Dashboard Playground</strong><small>ซ่อนการ์ดที่ไม่ใช้ หรือจับลากเพื่อเปลี่ยนลำดับ</small></div>
          <button className={layoutOpen ? "button button-secondary layout-toggle active" : "button button-secondary layout-toggle"} onClick={() => setLayoutOpen(open => !open)} aria-expanded={layoutOpen}>{layoutOpen ? "เสร็จแล้ว" : "ปรับหน้า"} <Icon name={layoutOpen ? "check" : "arrow"}/></button>
        </div>
        {layoutOpen && <div className="layout-controls" aria-label="ปรับแต่งแดชบอร์ด">
          {([{id:"recent",label:"รายการล่าสุด"},{id:"goal",label:"เป้าหมาย"},{id:"trend",label:"กราฟ 7 วัน"}] as const).map(widget => <label key={widget.id} className="layout-check"><input type="checkbox" checked={!hiddenWidgets.includes(widget.id)} onChange={event => setHiddenWidgets(old => event.target.checked ? old.filter(item => item !== widget.id) : [...old, widget.id])}/><span>{widget.label}</span></label>)}
          <button className="text-button" onClick={() => { setDashboardOrder(["recent","goal","trend"]); setHiddenWidgets([]) }}>คืนค่าเริ่มต้น</button>
        </div>}
        <div className="section-heading"><div><span className="eyebrow">เริ่มจากตรงนี้</span><h2>พื้นที่ของคุณ</h2></div><span className="section-note">3 เครื่องมือ · ใช้ได้ตามจังหวะของคุณ</span></div>
        <div className="tool-grid">
          <button className="tool-card tool-money" onClick={() => go("money")}><span className="tool-icon"><Icon name="wallet"/></span><span className="tool-meta">การเงิน</span><strong>บันทึกเงินเข้าออก</strong><p>รู้ว่าเงินมาจากไหน และไปอยู่ตรงไหน</p><span className="tool-bottom"><b>{monthItems.length} รายการเดือนนี้</b><i><Icon name="arrow"/></i></span></button>
          <button className="tool-card tool-notes" onClick={() => go("notes")}><span className="tool-icon"><Icon name="notes"/></span><span className="tool-meta">ความคิด</span><strong>เก็บโน้ตไว้ที่เดียว</strong><p>จดไอเดีย เรื่องที่ต้องจำ หรือสิ่งที่อยากกลับมาอ่าน</p><span className="tool-bottom"><b>{notes.length} โน้ต · ปักหมุด {pinned.length}</b><i><Icon name="arrow"/></i></span></button>
          <button className="tool-card tool-health" onClick={() => go("health")}><span className="tool-icon"><Icon name="health"/></span><span className="tool-meta">สุขภาพ</span><strong>ดูแลตัวเองทีละนิด</strong><p>บันทึกน้ำหนัก การเคลื่อนไหว และการพักผ่อน</p><span className="tool-bottom"><b>{latestWeight ? "น้ำหนัก " + latestWeight + " กก." : "เริ่มบันทึกสุขภาพ"}</b><i><Icon name="arrow"/></i></span></button>
        </div>
        <section className="memory-galaxy surface"><div className="surface-heading"><div><span className="eyebrow">MEMORY GALAXY · จากข้อมูลจริง</span><h3>ร่องรอยของ 28 วัน</h3></div><span className="history-count">{memoryDays.reduce((sum, day) => sum + day.count, 0)} กิจกรรม</span></div><div className="memory-calendar" aria-label="ปฏิทินกิจกรรม 28 วัน">{memoryDays.map(day => <button type="button" key={day.key} title={day.label + " · " + day.count + " กิจกรรม"} aria-label={day.label + " · " + day.count + " กิจกรรม"} aria-pressed={memorySelectedDate === day.key} onClick={() => setMemorySelectedDate(day.key)} className={"memory-day level-" + Math.min(4, day.count) + (memorySelectedDate === day.key ? " selected" : "")}><span>{day.day}</span>{day.count > 0 && <i/>}</button>)}</div><div className="memory-detail"><div><strong>{selectedMemoryDay.label}</strong><small>{selectedMemoryDay.count ? "มีบันทึกในวันนี้" : "ยังไม่มีบันทึกในวันที่เลือก"}</small></div><div className="memory-counts"><button onClick={() => { setSearch(""); go("notes") }}><b>{selectedMemoryDay.noteCount}</b><span>โน้ต</span></button><button onClick={() => go("money")}><b>{selectedMemoryDay.moneyCount}</b><span>การเงิน</span></button><button onClick={() => go("health")}><b>{selectedMemoryDay.healthCount}</b><span>สุขภาพ</span></button></div></div><p className="memory-caption">แตะวันที่เพื่อดูจำนวนรายการที่บันทึกไว้ · ไม่มีการสร้างข้อมูลตัวอย่าง</p></section>
        <div className="home-lower"><section className="surface recent-surface" draggable={layoutOpen} onDragStart={() => setDraggedWidget("recent")} onDragOver={event => { if (layoutOpen) event.preventDefault() }} onDrop={() => moveWidget(draggedWidget, "recent")} style={{ order: dashboardOrder.indexOf("recent"), display: hiddenWidgets.includes("recent") ? "none" : undefined }}><div className="surface-heading"><div><span className="eyebrow">รายการล่าสุด</span><h3>เงินเข้าออก</h3></div><button className="text-button" onClick={() => go("money")}>ดูทั้งหมด <Icon name="arrow"/></button></div>{sortedTransactions.slice(0, 4).length ? <div className="activity-list">{sortedTransactions.slice(0, 4).map(t => <div className="activity-row" key={t.id}><span className={t.type === "income" ? "activity-symbol is-income" : "activity-symbol is-expense"}>{t.type === "income" ? "+" : "−"}</span><span className="activity-info"><strong>{t.detail}</strong><small>{dateLabel(t.date)}</small></span><b className={t.type === "income" ? "positive" : "negative"}>{t.type === "income" ? "+" : "−"}{cash(t.amount)}</b></div>)}</div> : <div className="compact-empty"><p>ยังไม่มีรายการเงินเข้าออก</p><button className="text-button" onClick={() => { setEntryType("expense"); setShowEntry(true) }}>เพิ่มรายการแรก <Icon name="arrow"/></button></div>}</section>
          <section className="surface focus-surface" draggable={layoutOpen} onDragStart={() => setDraggedWidget("goal")} onDragOver={event => { if (layoutOpen) event.preventDefault() }} onDrop={() => moveWidget(draggedWidget, "goal")} style={{ order: dashboardOrder.indexOf("goal"), display: hiddenWidgets.includes("goal") ? "none" : undefined }}><div className="surface-heading"><div><span className="eyebrow">เป้าหมายเล็ก ๆ</span><h3>{goalTitle || "เงินสำรองของฉัน"}</h3></div><span className="goal-icon"><Icon name="check"/></span></div><p className="goal-amount">{cash(Math.max(0, balance))}<span> / {cash(goal)}</span></p><div className="progress-track"><span style={{ width: Math.min(100, Math.max(0, balance / Math.max(1, goal) * 100)) + "%" }} /></div><div className="goal-foot"><span>{Math.max(0, Math.min(100, Math.round(balance / Math.max(1, goal) * 100)))}% ของเป้าหมาย</span><button className="text-button" onClick={() => go("money")}>ปรับเป้าหมาย <Icon name="arrow"/></button></div></section>{!hiddenWidgets.includes("trend") && <div className="trend-widget" draggable={layoutOpen} onDragStart={() => setDraggedWidget("trend")} onDragOver={event => { if (layoutOpen) event.preventDefault() }} onDrop={() => moveWidget(draggedWidget, "trend")} style={{ order: dashboardOrder.indexOf("trend") }}><MoneyTrend transactions={transactions} /></div>}</div>
      </section>}

      {page === "money" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">เงินของคุณ · MONEY</span><h1>การเงิน</h1><p>บันทึกง่าย ๆ เพื่อให้เห็นภาพรวมชัดขึ้น</p></div><button className="button button-primary" onClick={() => { setEntryType("expense"); setShowEntry(true) }}><Icon name="plus"/>เพิ่มรายการ</button></div>
        <div className="money-summary"><div className="money-total"><span>ยอดคงเหลือ</span><strong><AnimatedMoney value={balance} /></strong><small>รายรับทั้งหมด ลบด้วยรายจ่ายทั้งหมด</small></div><div className="money-metric"><span><i className="legend-dot income-dot"/>รายรับ</span><strong className="positive"><AnimatedMoney value={income} /></strong></div><div className="money-metric"><span><i className="legend-dot expense-dot"/>รายจ่าย</span><strong className="negative"><AnimatedMoney value={expense} /></strong></div></div>
        <section className="surface goal-settings"><div className="surface-heading"><div><span className="eyebrow">เป้าหมายการออม</span><h3>ตั้งเป้าให้เป็นเรื่องง่าย</h3></div><span className="goal-icon"><Icon name="check"/></span></div><div className="goal-edit-grid"><label>ชื่อเป้าหมาย<input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="เช่น เงินสำรอง" /></label><label>จำนวนเงินเป้าหมาย (บาท)<input type="number" min="1" value={goal} onChange={e => setGoal(Number(e.target.value) || 0)} /></label></div><div className="progress-track"><span style={{ width: Math.min(100, Math.max(0, balance / Math.max(1, goal) * 100)) + "%" }} /></div><p className="goal-caption">ทำได้ {Math.max(0, Math.min(100, Math.round(balance / Math.max(1, goal) * 100)))}% ของเป้าหมาย · ตัวเลขนี้คำนวณจากยอดคงเหลือสุทธิ</p></section>
        <section className="surface ledger-surface"><div className="surface-heading"><div><span className="eyebrow">ประวัติ</span><h3>รายการเงินเข้าออก</h3></div><div className="filter-tabs" role="group" aria-label="กรองรายการ">{([{id:"all",label:"ทั้งหมด"},{id:"income",label:"รายรับ"},{id:"expense",label:"รายจ่าย"}] as const).map(f => <button key={f.id} onClick={() => setMoneyFilter(f.id)} className={moneyFilter === f.id ? "filter-tab active" : "filter-tab"}>{f.label}</button>)}</div></div>
          {visibleTransactions.length ? <div className="ledger-list">{visibleTransactions.map(t => <div className="ledger-row" key={t.id}><span className={t.type === "income" ? "ledger-symbol is-income" : "ledger-symbol is-expense"}>{t.type === "income" ? "+" : "−"}</span><span className="ledger-info"><strong>{t.detail}</strong><small>{dateLabel(t.date)}</small></span><span className={t.type === "income" ? "ledger-amount positive" : "ledger-amount negative"}>{t.type === "income" ? "+" : "−"}{cash(t.amount)}</span><button className="icon-button delete-button" aria-label={"ลบ " + t.detail} onClick={() => { if (confirm("ลบรายการนี้หรือไม่?")) setTransactions(old => old.filter(x => x.id !== t.id)) }}><Icon name="trash"/></button></div>)}</div> : <Empty title="ยังไม่มีรายการ" body="เพิ่มรายรับหรือรายจ่ายรายการแรก แล้วข้อมูลจะแสดงที่นี่" action="เพิ่มรายการ" onClick={() => setShowEntry(true)} />}</section>
      </section>}

      {page === "notes" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">ความคิดของคุณ · NOTES</span><h1>โน้ตของฉัน</h1><p>จดไว้ก่อน แล้วค่อยกลับมาจัดการทีหลัง</p></div><button className="button button-primary" onClick={() => { setEditingNoteId(null); try { const draft = JSON.parse(safeGet("lamoon-note-draft-v1") || "null"); setNoteTitle(typeof draft?.title === "string" ? draft.title : ""); setNoteBody(typeof draft?.body === "string" ? draft.body : "") } catch { setNoteTitle(""); setNoteBody("") } setShowNote(true) }}><Icon name="plus"/>เขียนโน้ต</button></div>
        <div className="notes-tools"><div className="notes-count"><strong>{notes.length}</strong> โน้ต <span>·</span> ปักหมุด {pinned.length}</div><label className="search-field"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาโน้ต..." aria-label="ค้นหาโน้ต"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="ล้างการค้นหา"><Icon name="close"/></button>}</label></div>
        {filteredNotes.length ? <div className="notes-grid">{filteredNotes.map(n => <article className="note-card" key={n.id}><div className="note-card-top"><span className="note-date">{dateLabel(n.updatedAt.slice(0, 10))}</span><button className={n.pinned ? "icon-button pin-button pinned" : "icon-button pin-button"} aria-label={n.pinned ? "เลิกปักหมุด" : "ปักหมุด"} onClick={() => setNotes(old => old.map(x => x.id === n.id ? { ...x, pinned: !x.pinned, updatedAt: new Date().toISOString() } : x))}><Icon name="pin"/></button></div><h3>{n.title || "ไม่มีชื่อ"}</h3><p>{n.body || "ไม่มีเนื้อหา"}</p><div className="note-card-actions"><button className="text-button" onClick={() => { setEditingNoteId(n.id); setNoteTitle(n.title); setNoteBody(n.body); setShowNote(true) }}>แก้ไข</button><button className="icon-button delete-button" aria-label="ลบโน้ต" onClick={() => { if (confirm("ลบโน้ตนี้หรือไม่?")) { const removed = n; setNotes(old => old.filter(x => x.id !== n.id)); setToast({ message: "ลบโน้ตแล้ว", undo: () => setNotes(old => [removed, ...old]) }) } }}><Icon name="trash"/></button></div></article>)}</div> : <Empty title={search ? "ไม่พบโน้ตที่ค้นหา" : "พื้นที่สำหรับความคิดใหม่"} body={search ? "ลองใช้คำค้นหาอื่น หรือกดล้างการค้นหา" : "เขียนสิ่งที่อยากจำ ไอเดีย หรือเรื่องเล็ก ๆ ที่ไม่อยากให้หายไป"} action={search ? "ล้างการค้นหา" : "เขียนโน้ตแรก"} onClick={() => search ? setSearch("") : setShowNote(true)} />}
      </section>}

      {page === "health" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">ดูแลตัวเอง · WELLBEING</span><h1>สุขภาพ</h1><p>ติดตามความเปลี่ยนแปลง เพื่อเข้าใจตัวเอง ไม่ใช่กดดันตัวเอง</p></div><button className="button button-primary" onClick={() => setShowHealth(true)}><Icon name="plus"/>บันทึกสุขภาพ</button></div>
        <section className="profile-bar"><span className="profile-avatar"><Icon name="health"/></span><div className="profile-info"><strong>{profile?.name || "ฉัน"}</strong><small>{profile?.height || 163} ซม. · อายุ {profile?.age || "—"} ปี</small></div><select aria-label="เลือกโปรไฟล์สุขภาพ" value={profile?.id || ""} onChange={e => setHealth(old => ({ ...old, activeProfileId: e.target.value }))}>{health.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="button button-secondary" onClick={() => setShowProfile(true)}><Icon name="plus"/>เพิ่มโปรไฟล์</button></section>
        <div className="health-stats"><div className="health-stat"><span>น้ำหนักล่าสุด</span><strong>{latestWeight ? <>{latestWeight} <small>กก.</small></> : "—"}</strong><small>{healthRecords.find(r => r.type === "weight")?.date ? dateLabel(healthRecords.find(r => r.type === "weight")!.date) : "ยังไม่มีบันทึก"}</small></div><div className="health-stat"><span>ดัชนีมวลกาย (BMI)</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong><small>{bmi ? bmi < 18.5 ? "ต่ำกว่าเกณฑ์ทั่วไป" : bmi < 25 ? "ช่วงเกณฑ์ทั่วไป" : "สูงกว่าเกณฑ์ทั่วไป" : "บันทึกน้ำหนักเพื่อคำนวณ"}</small></div><div className="health-stat"><span>เวลาออกกำลังกายสะสม</span><strong>{healthRecords.filter(r => r.type === "exercise").reduce((s, r) => s + (r.duration || 0), 0)} <small>นาที</small></strong><small>{healthRecords.filter(r => r.type === "exercise").length} กิจกรรม</small></div></div>
        <section className="surface health-history"><div className="surface-heading"><div><span className="eyebrow">บันทึกล่าสุด</span><h3>ความคืบหน้าของคุณ</h3></div><span className="history-count">{healthRecords.length} รายการ</span></div>
          {healthRecords.length ? <div className="health-list">{healthRecords.map(r => <div className="health-row" key={r.id}><span className={"health-record-symbol " + r.type}>{r.type === "weight" ? "กก." : r.type === "exercise" ? "↗" : "＋"}</span><span className="health-record-info"><strong>{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise || "ออกกำลังกาย" : "น้ำดื่มและการนอน"}</strong><small>{dateLabel(r.date)}{r.type === "exercise" ? " · " + (r.duration || 0) + " นาที" + (r.distance ? " · " + r.distance + " กม." : "") + (r.reps ? " · " + r.reps + " ครั้ง × " + (r.sets || 1) + " เซต" : "") : r.type === "wellness" ? " · " + (r.water || 0) + " แก้ว · " + (r.sleep || 0) + " ชม." : ""}</small></span><button className="icon-button delete-button" aria-label="ลบบันทึก" onClick={() => { if (confirm("ลบบันทึกนี้หรือไม่?")) setHealth(old => ({ ...old, records: old.records.filter(x => x.id !== r.id) })) }}><Icon name="trash"/></button></div>)}</div> : <Empty title="เริ่มจากการบันทึกครั้งแรก" body="จะเป็นน้ำหนัก การเดิน หรือการพักผ่อนก็ได้ เลือกสิ่งที่ทำได้วันนี้" action="บันทึกสุขภาพ" onClick={() => setShowHealth(true)} />}
        </section>
      </section>}
    </main>



    {showEntry && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowEntry(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="entry-title"><div className="modal-heading"><div><span className="eyebrow">การเงิน</span><h2 id="entry-title">เพิ่มรายการ</h2></div><button className="icon-button" onClick={() => setShowEntry(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveMoney} className="form-stack"><div className="segmented"><button type="button" className={entryType === "expense" ? "selected expense-selected" : ""} onClick={() => setEntryType("expense")}>รายจ่าย</button><button type="button" className={entryType === "income" ? "selected income-selected" : ""} onClick={() => setEntryType("income")}>รายรับ</button></div><label>จำนวนเงิน (บาท)<input autoFocus type="number" min="1" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/></label><label>รายการ<input required value={detail} onChange={e => setDetail(e.target.value)} placeholder="เช่น ค่าอาหาร เงินเดือน"/></label><label>วันที่<input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)}/></label><button className="button button-primary button-full" type="submit">บันทึกรายการ</button></form></section></div>}

    {showNote && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowNote(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="note-title"><div className="modal-heading"><div><span className="eyebrow">พื้นที่ความคิด</span><h2 id="note-title">{editingNoteId ? "แก้ไขโน้ต" : "เขียนโน้ตใหม่"}</h2></div><button className="icon-button" onClick={() => setShowNote(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveNote} className="form-stack"><div className="autosave-status" aria-live="polite"><span className={draftStatus === "saved" ? "autosave-dot saved" : "autosave-dot"} />{draftStatus === "saved" ? "บันทึกฉบับร่างอัตโนมัติแล้ว" : draftStatus === "saving" ? "กำลังบันทึกฉบับร่าง…" : "ฉบับร่างจะบันทึกอัตโนมัติ"}</div><label>หัวข้อ <span className="optional-label">ไม่จำเป็น</span><input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="โน้ตนี้เกี่ยวกับอะไร?"/></label><label>เนื้อหา <textarea rows={6} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="เขียนได้ตามสบาย..." /></label><button className="button button-primary button-full" type="submit" disabled={!noteTitle.trim() && !noteBody.trim()}>บันทึกโน้ต</button></form></section></div>}

    {showHealth && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowHealth(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="health-title"><div className="modal-heading"><div><span className="eyebrow">ดูแลตัวเอง</span><h2 id="health-title">บันทึกสุขภาพ</h2></div><button className="icon-button" onClick={() => setShowHealth(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveHealth} className="form-stack"><label>ประเภทบันทึก<select value={healthType} onChange={e => setHealthType(e.target.value as typeof healthType)}><option value="weight">น้ำหนัก</option><option value="exercise">ออกกำลังกาย</option><option value="wellness">น้ำดื่มและการนอน</option></select></label>{healthType === "weight" && <label>น้ำหนัก (กก.)<input autoFocus type="number" min="1" step="0.1" required value={weight} onChange={e => setWeight(e.target.value)} placeholder="เช่น 75.5"/></label>}{healthType === "exercise" && <><label>กิจกรรม<select value={exercise} onChange={e => setExercise(e.target.value)}><option>เดิน</option><option>วิ่ง</option><option>เวทเทรนนิ่ง</option><option>วิดพื้น</option><option>สควอต</option><option>ปั่นจักรยาน</option><option>อื่น ๆ</option></select></label><div className="form-two-col"><label>เวลา (นาที)<input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} placeholder="0"/></label><label>ระยะทาง (กม.)<input type="number" min="0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0"/></label></div><div className="form-two-col"><label>จำนวนครั้ง<input type="number" min="0" value={reps} onChange={e => setReps(e.target.value)} placeholder="ถ้ามี"/></label><label>จำนวนเซต<input type="number" min="0" value={sets} onChange={e => setSets(e.target.value)}/></label></div></>}{healthType === "wellness" && <div className="form-two-col"><label>น้ำดื่ม (แก้ว)<input type="number" min="0" value={water} onChange={e => setWater(e.target.value)}/></label><label>นอน (ชั่วโมง)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)}/></label></div>}<label>วันที่<input type="date" required value={healthDate} onChange={e => setHealthDate(e.target.value)}/></label><button className="button button-primary button-full" type="submit">บันทึกสุขภาพ</button></form></section></div>}

    {commandOpen && <div className="command-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setCommandOpen(false) }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div className="command-search-row"><Icon name="search" /><input autoFocus value={commandQuery} onChange={e => setCommandQuery(e.target.value)} placeholder="ค้นหาหน้า โน้ต หรือเริ่มทำอะไรสักอย่าง…" aria-label="ค้นหาและคำสั่ง" /><kbd>ESC</kbd></div>
        <div className="command-results">
          <span className="command-section-label" id="command-title">{commandQuery.trim() ? "ผลลัพธ์ที่ตรงกัน" : "ไปยังหน้า"}</span>
          {([
            { id: "home", label: "ภาพรวม", detail: "กลับไปหน้าแรก", icon: "home", run: () => go("home") },
            { id: "money", label: "การเงิน", detail: "ดูบันทึกเงินเข้าออก", icon: "money", run: () => go("money") },
            { id: "notes", label: "โน้ต", detail: "ค้นหาและจัดการโน้ต", icon: "notes", run: () => go("notes") },
            { id: "health", label: "สุขภาพ", detail: "เปิดบันทึกสุขภาพ", icon: "health", run: () => go("health") }
          ] as const).filter(item => (item.label + " " + item.detail).toLowerCase().includes(commandQuery.trim().toLowerCase())).map(item => <button className="command-item" key={item.id} onClick={() => { item.run(); setCommandOpen(false) }}><span className={"command-item-icon command-icon-" + item.id}><Icon name={item.icon}/></span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><kbd>↵</kbd></button>)}
          {[
            { id: "new-note", label: "เขียนโน้ตใหม่", detail: "จดไอเดียหรือสิ่งที่ต้องจำ", icon: "plus", run: () => { setEditingNoteId(null); setNoteTitle(""); setNoteBody(""); setShowNote(true) } },
            { id: "new-money", label: "เพิ่มรายการเงิน", detail: "บันทึกรายรับหรือรายจ่าย", icon: "plus", run: () => { setEntryType("expense"); setShowEntry(true) } },
            { id: "new-health", label: "บันทึกสุขภาพ", detail: "เพิ่มกิจกรรมหรือข้อมูลสุขภาพ", icon: "plus", run: () => setShowHealth(true) }
          ].filter(item => (item.label + " " + item.detail).toLowerCase().includes(commandQuery.trim().toLowerCase())).map(item => <button className="command-item" key={item.id} onClick={() => { item.run(); setCommandOpen(false) }}><span className="command-item-icon command-icon-action"><Icon name={item.icon}/></span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><kbd>↵</kbd></button>)}
          {commandQuery.trim() && filteredNotes.filter(note => (note.title + " " + note.body).toLowerCase().includes(commandQuery.trim().toLowerCase())).slice(0, 5).map(note => <button className="command-item" key={note.id} onClick={() => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteBody(note.body); setShowNote(true); setCommandOpen(false) }}><span className="command-item-icon command-icon-notes"><Icon name="notes"/></span><span className="command-item-copy"><strong>{note.title}</strong><small>{note.body || "ไม่มีเนื้อหา"}</small></span><kbd>↵</kbd></button>)}
          {commandQuery.trim() && !(["ภาพรวม","การเงิน","โน้ต","สุขภาพ","เขียนโน้ตใหม่","เพิ่มรายการเงิน","บันทึกสุขภาพ"].some(label => label.toLowerCase().includes(commandQuery.trim().toLowerCase())) || filteredNotes.some(note => (note.title + " " + note.body).toLowerCase().includes(commandQuery.trim().toLowerCase()))) && <p className="command-empty">ไม่พบสิ่งที่ตรงกัน ลองใช้คำอื่นดูนะ</p>}
        </div>
        <footer className="command-footer"><span><kbd>↑↓</kbd> เลือกด้วยเมาส์</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd> เปิด/ปิด</span><span>ค้นหาจากโน้ตที่บันทึกไว้</span></footer>
      </section>
    </div>}
    {quickAddOpen && <div className="quick-add-menu" role="menu" aria-label="เพิ่มข้อมูลด่วน"><button role="menuitem" onClick={() => { setEntryType("expense"); setShowEntry(true); setQuickAddOpen(false) }}><span className="quick-add-icon">−</span><span><strong>รายจ่าย</strong><small>บันทึกเงินออก</small></span></button><button role="menuitem" onClick={() => { setEntryType("income"); setShowEntry(true); setQuickAddOpen(false) }}><span className="quick-add-icon">＋</span><span><strong>รายรับ</strong><small>บันทึกเงินเข้า</small></span></button><button role="menuitem" onClick={() => { setEditingNoteId(null); try { const draft = JSON.parse(localStorage.getItem("lamoon-note-draft-v1") || "null"); setNoteTitle(typeof draft?.title === "string" ? draft.title : ""); setNoteBody(typeof draft?.body === "string" ? draft.body : "") } catch { setNoteTitle(""); setNoteBody("") } setShowNote(true); setQuickAddOpen(false) }}><span className="quick-add-icon">✎</span><span><strong>โน้ตใหม่</strong><small>จดสิ่งที่ต้องจำ</small></span></button><button role="menuitem" onClick={() => { setShowHealth(true); setQuickAddOpen(false) }}><span className="quick-add-icon">♡</span><span><strong>สุขภาพ</strong><small>เพิ่มบันทึกสุขภาพ</small></span></button></div>}
    {toast && <div className={delightActive ? "app-toast delight-pop" : "app-toast"} role="status"><span className="toast-check"><Icon name="check" /></span><span className="toast-message">{toast.message}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null) }}>Undo</button>}<button className="toast-dismiss" aria-label="ปิดการแจ้งเตือน" onClick={() => setToast(null)}><Icon name="close" /></button></div>}
    <button className={quickAddOpen ? "quick-add-button open" : "quick-add-button"} onClick={() => setQuickAddOpen(old => !old)} aria-label={quickAddOpen ? "ปิดเมนูเพิ่มข้อมูล" : "เพิ่มข้อมูลด่วน"} aria-expanded={quickAddOpen}><Icon name={quickAddOpen ? "close" : "plus"} /></button>
    {showProfile && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowProfile(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-heading"><div><span className="eyebrow">โปรไฟล์สุขภาพ</span><h2 id="profile-title">เพิ่มโปรไฟล์</h2></div><button className="icon-button" onClick={() => setShowProfile(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveProfile} className="form-stack"><label>ชื่อโปรไฟล์<input required value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="เช่น ฉัน"/></label><div className="form-two-col"><label>ส่วนสูง (ซม.)<input type="number" min="1" required value={profileHeight} onChange={e => setProfileHeight(e.target.value)}/></label><label>อายุ (ปี)<input type="number" min="1" required value={profileAge} onChange={e => setProfileAge(e.target.value)}/></label></div><label>น้ำหนักเริ่มต้น (กก.) <span className="optional-label">ไม่จำเป็น</span><input type="number" min="1" step="0.1" value={profileInitialWeight} onChange={e => setProfileInitialWeight(e.target.value)} placeholder="เช่น 70"/></label><button className="button button-primary button-full" type="submit">สร้างโปรไฟล์</button></form></section></div>}
  </div>
}
