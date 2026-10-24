import { useEffect, useMemo, useState, type FormEvent } from "react"
import { AccountMenu } from "./CloudAuth"
import "./command-center.css"

type Page = "home" | "money" | "notes" | "health"
type Transaction = { id: string; type: "income" | "expense"; amount: number; detail: string; date: string; createdAt: number }
type Note = { id: string; title: string; body: string; tags?: string[]; mood?: string; pinned?: boolean; createdAt: string; updatedAt: string }
type Profile = { id: string; name: string; height: number; age: number }
type HealthRecord = { id: string; profileId: string; date: string; type: "weight" | "exercise" | "wellness"; weight?: number; distance?: number; duration?: number; reps?: number; sets?: number; exercise?: string; water?: number; sleep?: number; note?: string }
type HealthData = { profiles: Profile[]; activeProfileId: string; records: HealthRecord[] }

const KEYS = { money: "lamoon-transactions", goal: "lamoon-saving-goal", goalTitle: "lamoon-saving-goal-title", notes: "lamoon-commonplace-notes-v1", health: "lamoon-health-dashboard-v1" }
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }
const uid = () => crypto.randomUUID()
const read = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback } }
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
    check: "m5 12 4 4L19 6", calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 10h16"
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.arrow} /></svg>
}

function Empty({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span className="empty-mark"><Icon name="plus" /></span><h3>{title}</h3><p>{body}</p><button className="button button-primary" onClick={onClick}><Icon name="plus" />{action}</button></div>
}

export default function CommandCenter() {
  const [page, setPage] = useState<Page>(() => { const hash = location.hash.slice(1); return hash === "saving" ? "money" : (["money", "notes", "health"].includes(hash) ? hash as Page : "home") })
  const [transactions, setTransactions] = useState<Transaction[]>(() => read(KEYS.money, []))
  const [goal, setGoal] = useState(() => Number(localStorage.getItem(KEYS.goal)) || 20000)
  const [goalTitle, setGoalTitle] = useState(() => localStorage.getItem(KEYS.goalTitle) || "เงินสำรองของฉัน")
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

  useEffect(() => { localStorage.setItem(KEYS.money, JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { localStorage.setItem(KEYS.notes, JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem(KEYS.health, JSON.stringify(health)) }, [health])
  useEffect(() => { localStorage.setItem(KEYS.goal, String(goal)); localStorage.setItem(KEYS.goalTitle, goalTitle) }, [goal, goalTitle])
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

  function saveMoney(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0 || !detail.trim()) return
    setTransactions(old => [{ id: uid(), type: entryType, amount: value, detail: detail.trim(), date: entryDate, createdAt: Date.now() }, ...old])
    setAmount(""); setDetail(""); setEntryDate(today()); setShowEntry(false)
  }
  function saveNote(e: FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim() && !noteBody.trim()) return
    const now = new Date().toISOString()
    if (editingNoteId) setNotes(old => old.map(n => n.id === editingNoteId ? { ...n, title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), updatedAt: now } : n))
    else setNotes(old => [{ id: uid(), title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), tags: [], mood: "neutral", pinned: false, createdAt: now, updatedAt: now }, ...old])
    setNoteTitle(""); setNoteBody(""); setEditingNoteId(null); setShowNote(false)
  }
  function saveHealth(e: FormEvent) {
    e.preventDefault()
    const record: HealthRecord = { id: uid(), profileId: profile?.id || "profile-default", date: healthDate, type: healthType }
    if (healthType === "weight") { if (!(Number(weight) > 0)) return; record.weight = Number(weight) }
    if (healthType === "exercise") { record.exercise = exercise; record.distance = Number(distance) || 0; record.duration = Number(duration) || 0; record.reps = Number(reps) || 0; record.sets = Number(sets) || 0 }
    if (healthType === "wellness") { record.water = Number(water) || 0; record.sleep = Number(sleep) || 0 }
    setHealth(old => ({ ...old, records: [...old.records, record] }))
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

  return <div className="app-shell">
    <aside className="side-rail">
      <button className="brand" onClick={() => go("home")} aria-label="กลับหน้าภาพรวม"><span className="brand-symbol">m</span><span className="brand-name">moneyeep<small>พื้นที่ส่วนตัว</small></span></button>
      <div className="rail-label">พื้นที่ของฉัน</div>
      <nav className="main-nav" aria-label="เมนูหลัก">{nav.map(item => <button key={item.id} onClick={() => go(item.id)} className={page === item.id ? "nav-link active" : "nav-link"} aria-current={page === item.id ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span>{page === item.id && <i />}</button>)}</nav>
      <div className="rail-bottom"><div className="privacy-note"><span className="privacy-dot" /><div><strong>พื้นที่ของคุณ</strong><small>บันทึกอย่างเป็นส่วนตัว</small></div></div><div className="rail-account"><AccountMenu /><span>บัญชีของฉัน</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>พื้นที่ส่วนตัว</span><b>/</b><strong>{pageTitle[page]}</strong></div><div className="topbar-actions"><span className="today-label"><Icon name="calendar" />{dateLabel(today())}</span><button className="mobile-account" aria-label="เมนูบัญชี"><AccountMenu /></button></div></header>

      {page === "home" && <section className="page-content">
        <div className="welcome-row"><div><span className="eyebrow">ยินดีต้อนรับกลับมา</span><h1>ค่อย ๆ จัดการ<br/><em>ทีละเรื่องก็พอ</em></h1><p className="intro-copy">พื้นที่เล็ก ๆ สำหรับดูแลเงิน ความคิด และตัวเอง โดยไม่ต้องทำให้ทุกอย่างยุ่งยาก</p></div><div className="date-card"><span>วันนี้</span><strong>{new Date().toLocaleDateString("th-TH", { day: "numeric" })}</strong><small>{new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</small></div></div>
        <section className="balance-card"><div className="balance-copy"><span className="eyebrow light">ภาพรวมการเงิน</span><p>ยอดคงเหลือทั้งหมด</p><strong>{cash(balance)}</strong><div className="balance-detail"><span><i className="legend-dot income-dot" />รับเข้า {cash(income)}</span><span><i className="legend-dot expense-dot" />จ่ายออก {cash(expense)}</span></div></div><div className="balance-art" aria-hidden="true"><span className="art-ring ring-one"/><span className="art-ring ring-two"/><span className="art-core">฿</span></div><button className="balance-link" onClick={() => go("money")}>ดูรายละเอียด <Icon name="arrow"/></button></section>
        <div className="section-heading"><div><span className="eyebrow">เริ่มจากตรงนี้</span><h2>พื้นที่ของคุณ</h2></div><span className="section-note">3 เครื่องมือ · ใช้ได้ตามจังหวะของคุณ</span></div>
        <div className="tool-grid">
          <button className="tool-card tool-money" onClick={() => go("money")}><span className="tool-icon"><Icon name="wallet"/></span><span className="tool-meta">การเงิน</span><strong>บันทึกเงินเข้าออก</strong><p>รู้ว่าเงินมาจากไหน และไปอยู่ตรงไหน</p><span className="tool-bottom"><b>{monthItems.length} รายการเดือนนี้</b><i><Icon name="arrow"/></i></span></button>
          <button className="tool-card tool-notes" onClick={() => go("notes")}><span className="tool-icon"><Icon name="notes"/></span><span className="tool-meta">ความคิด</span><strong>เก็บโน้ตไว้ที่เดียว</strong><p>จดไอเดีย เรื่องที่ต้องจำ หรือสิ่งที่อยากกลับมาอ่าน</p><span className="tool-bottom"><b>{notes.length} โน้ต · ปักหมุด {pinned.length}</b><i><Icon name="arrow"/></i></span></button>
          <button className="tool-card tool-health" onClick={() => go("health")}><span className="tool-icon"><Icon name="health"/></span><span className="tool-meta">สุขภาพ</span><strong>ดูแลตัวเองทีละนิด</strong><p>บันทึกน้ำหนัก การเคลื่อนไหว และการพักผ่อน</p><span className="tool-bottom"><b>{latestWeight ? "น้ำหนัก " + latestWeight + " กก." : "เริ่มบันทึกสุขภาพ"}</b><i><Icon name="arrow"/></i></span></button>
        </div>
        <div className="home-lower"><section className="surface recent-surface"><div className="surface-heading"><div><span className="eyebrow">รายการล่าสุด</span><h3>เงินเข้าออก</h3></div><button className="text-button" onClick={() => go("money")}>ดูทั้งหมด <Icon name="arrow"/></button></div>{sortedTransactions.slice(0, 4).length ? <div className="activity-list">{sortedTransactions.slice(0, 4).map(t => <div className="activity-row" key={t.id}><span className={t.type === "income" ? "activity-symbol is-income" : "activity-symbol is-expense"}>{t.type === "income" ? "+" : "−"}</span><span className="activity-info"><strong>{t.detail}</strong><small>{dateLabel(t.date)}</small></span><b className={t.type === "income" ? "positive" : "negative"}>{t.type === "income" ? "+" : "−"}{cash(t.amount)}</b></div>)}</div> : <div className="compact-empty"><p>ยังไม่มีรายการเงินเข้าออก</p><button className="text-button" onClick={() => { setEntryType("expense"); setShowEntry(true) }}>เพิ่มรายการแรก <Icon name="arrow"/></button></div>}</section>
          <section className="surface focus-surface"><div className="surface-heading"><div><span className="eyebrow">เป้าหมายเล็ก ๆ</span><h3>{goalTitle || "เงินสำรองของฉัน"}</h3></div><span className="goal-icon"><Icon name="check"/></span></div><p className="goal-amount">{cash(Math.max(0, balance))}<span> / {cash(goal)}</span></p><div className="progress-track"><span style={{ width: Math.min(100, Math.max(0, balance / Math.max(1, goal) * 100)) + "%" }} /></div><div className="goal-foot"><span>{Math.max(0, Math.min(100, Math.round(balance / Math.max(1, goal) * 100)))}% ของเป้าหมาย</span><button className="text-button" onClick={() => go("money")}>ปรับเป้าหมาย <Icon name="arrow"/></button></div></section></div>
      </section>}

      {page === "money" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">เงินของคุณ · MONEY</span><h1>การเงิน</h1><p>บันทึกง่าย ๆ เพื่อให้เห็นภาพรวมชัดขึ้น</p></div><button className="button button-primary" onClick={() => { setEntryType("expense"); setShowEntry(true) }}><Icon name="plus"/>เพิ่มรายการ</button></div>
        <div className="money-summary"><div className="money-total"><span>ยอดคงเหลือ</span><strong>{cash(balance)}</strong><small>รายรับทั้งหมด ลบด้วยรายจ่ายทั้งหมด</small></div><div className="money-metric"><span><i className="legend-dot income-dot"/>รายรับ</span><strong className="positive">{cash(income)}</strong></div><div className="money-metric"><span><i className="legend-dot expense-dot"/>รายจ่าย</span><strong className="negative">{cash(expense)}</strong></div></div>
        <section className="surface goal-settings"><div className="surface-heading"><div><span className="eyebrow">เป้าหมายการออม</span><h3>ตั้งเป้าให้เป็นเรื่องง่าย</h3></div><span className="goal-icon"><Icon name="check"/></span></div><div className="goal-edit-grid"><label>ชื่อเป้าหมาย<input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="เช่น เงินสำรอง" /></label><label>จำนวนเงินเป้าหมาย (บาท)<input type="number" min="1" value={goal} onChange={e => setGoal(Number(e.target.value) || 0)} /></label></div><div className="progress-track"><span style={{ width: Math.min(100, Math.max(0, balance / Math.max(1, goal) * 100)) + "%" }} /></div><p className="goal-caption">ทำได้ {Math.max(0, Math.min(100, Math.round(balance / Math.max(1, goal) * 100)))}% ของเป้าหมาย · ตัวเลขนี้คำนวณจากยอดคงเหลือสุทธิ</p></section>
        <section className="surface ledger-surface"><div className="surface-heading"><div><span className="eyebrow">ประวัติ</span><h3>รายการเงินเข้าออก</h3></div><div className="filter-tabs" role="group" aria-label="กรองรายการ">{([{id:"all",label:"ทั้งหมด"},{id:"income",label:"รายรับ"},{id:"expense",label:"รายจ่าย"}] as const).map(f => <button key={f.id} onClick={() => setMoneyFilter(f.id)} className={moneyFilter === f.id ? "filter-tab active" : "filter-tab"}>{f.label}</button>)}</div></div>
          {visibleTransactions.length ? <div className="ledger-list">{visibleTransactions.map(t => <div className="ledger-row" key={t.id}><span className={t.type === "income" ? "ledger-symbol is-income" : "ledger-symbol is-expense"}>{t.type === "income" ? "+" : "−"}</span><span className="ledger-info"><strong>{t.detail}</strong><small>{dateLabel(t.date)}</small></span><span className={t.type === "income" ? "ledger-amount positive" : "ledger-amount negative"}>{t.type === "income" ? "+" : "−"}{cash(t.amount)}</span><button className="icon-button delete-button" aria-label={"ลบ " + t.detail} onClick={() => { if (confirm("ลบรายการนี้หรือไม่?")) setTransactions(old => old.filter(x => x.id !== t.id)) }}><Icon name="trash"/></button></div>)}</div> : <Empty title="ยังไม่มีรายการ" body="เพิ่มรายรับหรือรายจ่ายรายการแรก แล้วข้อมูลจะแสดงที่นี่" action="เพิ่มรายการ" onClick={() => setShowEntry(true)} />}</section>
      </section>}

      {page === "notes" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">ความคิดของคุณ · NOTES</span><h1>โน้ตของฉัน</h1><p>จดไว้ก่อน แล้วค่อยกลับมาจัดการทีหลัง</p></div><button className="button button-primary" onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteBody(""); setShowNote(true) }}><Icon name="plus"/>เขียนโน้ต</button></div>
        <div className="notes-tools"><div className="notes-count"><strong>{notes.length}</strong> โน้ต <span>·</span> ปักหมุด {pinned.length}</div><label className="search-field"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาโน้ต..." aria-label="ค้นหาโน้ต"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="ล้างการค้นหา"><Icon name="close"/></button>}</label></div>
        {filteredNotes.length ? <div className="notes-grid">{filteredNotes.map(n => <article className="note-card" key={n.id}><div className="note-card-top"><span className="note-date">{dateLabel(n.updatedAt.slice(0, 10))}</span><button className={n.pinned ? "icon-button pin-button pinned" : "icon-button pin-button"} aria-label={n.pinned ? "เลิกปักหมุด" : "ปักหมุด"} onClick={() => setNotes(old => old.map(x => x.id === n.id ? { ...x, pinned: !x.pinned, updatedAt: new Date().toISOString() } : x))}><Icon name="pin"/></button></div><h3>{n.title || "ไม่มีชื่อ"}</h3><p>{n.body || "ไม่มีเนื้อหา"}</p><div className="note-card-actions"><button className="text-button" onClick={() => { setEditingNoteId(n.id); setNoteTitle(n.title); setNoteBody(n.body); setShowNote(true) }}>แก้ไข</button><button className="icon-button delete-button" aria-label="ลบโน้ต" onClick={() => { if (confirm("ลบโน้ตนี้หรือไม่?")) setNotes(old => old.filter(x => x.id !== n.id)) }}><Icon name="trash"/></button></div></article>)}</div> : <Empty title={search ? "ไม่พบโน้ตที่ค้นหา" : "พื้นที่สำหรับความคิดใหม่"} body={search ? "ลองใช้คำค้นหาอื่น หรือกดล้างการค้นหา" : "เขียนสิ่งที่อยากจำ ไอเดีย หรือเรื่องเล็ก ๆ ที่ไม่อยากให้หายไป"} action={search ? "ล้างการค้นหา" : "เขียนโน้ตแรก"} onClick={() => search ? setSearch("") : setShowNote(true)} />}
      </section>}

      {page === "health" && <section className="page-content">
        <div className="page-heading-row"><div><span className="eyebrow">ดูแลตัวเอง · WELLBEING</span><h1>สุขภาพ</h1><p>ติดตามความเปลี่ยนแปลง เพื่อเข้าใจตัวเอง ไม่ใช่กดดันตัวเอง</p></div><button className="button button-primary" onClick={() => setShowHealth(true)}><Icon name="plus"/>บันทึกสุขภาพ</button></div>
        <section className="profile-bar"><span className="profile-avatar"><Icon name="health"/></span><div className="profile-info"><strong>{profile?.name || "ฉัน"}</strong><small>{profile?.height || 163} ซม. · อายุ {profile?.age || "—"} ปี</small></div><select aria-label="เลือกโปรไฟล์สุขภาพ" value={profile?.id || ""} onChange={e => setHealth(old => ({ ...old, activeProfileId: e.target.value }))}>{health.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="button button-secondary" onClick={() => setShowProfile(true)}><Icon name="plus"/>เพิ่มโปรไฟล์</button></section>
        <div className="health-stats"><div className="health-stat"><span>น้ำหนักล่าสุด</span><strong>{latestWeight ? latestWeight + " <small>กก.</small>" : "—"}</strong><small>{healthRecords.find(r => r.type === "weight")?.date ? dateLabel(healthRecords.find(r => r.type === "weight")!.date) : "ยังไม่มีบันทึก"}</small></div><div className="health-stat"><span>ดัชนีมวลกาย (BMI)</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong><small>{bmi ? bmi < 18.5 ? "ต่ำกว่าเกณฑ์ทั่วไป" : bmi < 25 ? "ช่วงเกณฑ์ทั่วไป" : "สูงกว่าเกณฑ์ทั่วไป" : "บันทึกน้ำหนักเพื่อคำนวณ"}</small></div><div className="health-stat"><span>เวลาออกกำลังกายสะสม</span><strong>{healthRecords.filter(r => r.type === "exercise").reduce((s, r) => s + (r.duration || 0), 0)} <small>นาที</small></strong><small>{healthRecords.filter(r => r.type === "exercise").length} กิจกรรม</small></div></div>
        <section className="surface health-history"><div className="surface-heading"><div><span className="eyebrow">บันทึกล่าสุด</span><h3>ความคืบหน้าของคุณ</h3></div><span className="history-count">{healthRecords.length} รายการ</span></div>
          {healthRecords.length ? <div className="health-list">{healthRecords.map(r => <div className="health-row" key={r.id}><span className={"health-record-symbol " + r.type}>{r.type === "weight" ? "กก." : r.type === "exercise" ? "↗" : "＋"}</span><span className="health-record-info"><strong>{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise || "ออกกำลังกาย" : "น้ำดื่มและการนอน"}</strong><small>{dateLabel(r.date)}{r.type === "exercise" ? " · " + (r.duration || 0) + " นาที" + (r.distance ? " · " + r.distance + " กม." : "") + (r.reps ? " · " + r.reps + " ครั้ง × " + (r.sets || 1) + " เซต" : "") : r.type === "wellness" ? " · " + (r.water || 0) + " แก้ว · " + (r.sleep || 0) + " ชม." : ""}</small></span><button className="icon-button delete-button" aria-label="ลบบันทึก" onClick={() => { if (confirm("ลบบันทึกนี้หรือไม่?")) setHealth(old => ({ ...old, records: old.records.filter(x => x.id !== r.id) })) }}><Icon name="trash"/></button></div>)}</div> : <Empty title="เริ่มจากการบันทึกครั้งแรก" body="จะเป็นน้ำหนัก การเดิน หรือการพักผ่อนก็ได้ เลือกสิ่งที่ทำได้วันนี้" action="บันทึกสุขภาพ" onClick={() => setShowHealth(true)} />}
        </section>
      </section>}
    </main>

    <nav className="mobile-nav" aria-label="เมนูหลักสำหรับมือถือ">{nav.map(item => <button key={item.id} onClick={() => go(item.id)} className={page === item.id ? "mobile-nav-link active" : "mobile-nav-link"}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>

    {showEntry && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowEntry(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="entry-title"><div className="modal-heading"><div><span className="eyebrow">การเงิน</span><h2 id="entry-title">เพิ่มรายการ</h2></div><button className="icon-button" onClick={() => setShowEntry(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveMoney} className="form-stack"><div className="segmented"><button type="button" className={entryType === "expense" ? "selected expense-selected" : ""} onClick={() => setEntryType("expense")}>รายจ่าย</button><button type="button" className={entryType === "income" ? "selected income-selected" : ""} onClick={() => setEntryType("income")}>รายรับ</button></div><label>จำนวนเงิน (บาท)<input autoFocus type="number" min="1" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/></label><label>รายการ<input required value={detail} onChange={e => setDetail(e.target.value)} placeholder="เช่น ค่าอาหาร เงินเดือน"/></label><label>วันที่<input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)}/></label><button className="button button-primary button-full" type="submit">บันทึกรายการ</button></form></section></div>}

    {showNote && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowNote(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="note-title"><div className="modal-heading"><div><span className="eyebrow">พื้นที่ความคิด</span><h2 id="note-title">{editingNoteId ? "แก้ไขโน้ต" : "เขียนโน้ตใหม่"}</h2></div><button className="icon-button" onClick={() => setShowNote(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveNote} className="form-stack"><label>หัวข้อ <span className="optional-label">ไม่จำเป็น</span><input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="โน้ตนี้เกี่ยวกับอะไร?"/></label><label>เนื้อหา <textarea rows={6} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="เขียนได้ตามสบาย..." /></label><button className="button button-primary button-full" type="submit" disabled={!noteTitle.trim() && !noteBody.trim()}>บันทึกโน้ต</button></form></section></div>}

    {showHealth && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowHealth(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="health-title"><div className="modal-heading"><div><span className="eyebrow">ดูแลตัวเอง</span><h2 id="health-title">บันทึกสุขภาพ</h2></div><button className="icon-button" onClick={() => setShowHealth(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveHealth} className="form-stack"><label>ประเภทบันทึก<select value={healthType} onChange={e => setHealthType(e.target.value as typeof healthType)}><option value="weight">น้ำหนัก</option><option value="exercise">ออกกำลังกาย</option><option value="wellness">น้ำดื่มและการนอน</option></select></label>{healthType === "weight" && <label>น้ำหนัก (กก.)<input autoFocus type="number" min="1" step="0.1" required value={weight} onChange={e => setWeight(e.target.value)} placeholder="เช่น 75.5"/></label>}{healthType === "exercise" && <><label>กิจกรรม<select value={exercise} onChange={e => setExercise(e.target.value)}><option>เดิน</option><option>วิ่ง</option><option>เวทเทรนนิ่ง</option><option>วิดพื้น</option><option>สควอต</option><option>ปั่นจักรยาน</option><option>อื่น ๆ</option></select></label><div className="form-two-col"><label>เวลา (นาที)<input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} placeholder="0"/></label><label>ระยะทาง (กม.)<input type="number" min="0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0"/></label></div><div className="form-two-col"><label>จำนวนครั้ง<input type="number" min="0" value={reps} onChange={e => setReps(e.target.value)} placeholder="ถ้ามี"/></label><label>จำนวนเซต<input type="number" min="0" value={sets} onChange={e => setSets(e.target.value)}/></label></div></>}{healthType === "wellness" && <div className="form-two-col"><label>น้ำดื่ม (แก้ว)<input type="number" min="0" value={water} onChange={e => setWater(e.target.value)}/></label><label>นอน (ชั่วโมง)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)}/></label></div>}<label>วันที่<input type="date" required value={healthDate} onChange={e => setHealthDate(e.target.value)}/></label><button className="button button-primary button-full" type="submit">บันทึกสุขภาพ</button></form></section></div>}

    {showProfile && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowProfile(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-heading"><div><span className="eyebrow">โปรไฟล์สุขภาพ</span><h2 id="profile-title">เพิ่มโปรไฟล์</h2></div><button className="icon-button" onClick={() => setShowProfile(false)} aria-label="ปิด"><Icon name="close"/></button></div><form onSubmit={saveProfile} className="form-stack"><label>ชื่อโปรไฟล์<input required value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="เช่น ฉัน"/></label><div className="form-two-col"><label>ส่วนสูง (ซม.)<input type="number" min="1" required value={profileHeight} onChange={e => setProfileHeight(e.target.value)}/></label><label>อายุ (ปี)<input type="number" min="1" required value={profileAge} onChange={e => setProfileAge(e.target.value)}/></label></div><label>น้ำหนักเริ่มต้น (กก.) <span className="optional-label">ไม่จำเป็น</span><input type="number" min="1" step="0.1" value={profileInitialWeight} onChange={e => setProfileInitialWeight(e.target.value)} placeholder="เช่น 70"/></label><button className="button button-primary button-full" type="submit">สร้างโปรไฟล์</button></form></section></div>}
  </div>
}
