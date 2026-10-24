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
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const uid = () => crypto.randomUUID()
const read = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback } }
const cash = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n)
const dateLabel = (s: string) => { try { return new Date(s + "T12:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) } catch { return s } }

function Glyph({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
    money: "M3 7h18v13H3zM3 7l3-4h12l3 4M7 12h4M7 16h7",
    notes: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
    health: "M20.8 8.8c0 5.2-8.8 10-8.8 10S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z",
    plus: "M12 5v14M5 12h14", arrow: "M5 12h14M13 6l6 6-6 6", search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    close: "M6 6l12 12M18 6 6 18", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
    pin: "M16 3 21 8l-4 1-4 4-1 5-2-2-5 5 4-7-2-2 5-1 4-4z"
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.arrow} /></svg>
}

export default function CommandCenter() {
  const [page, setPage] = useState<Page>(() => (["money","notes","health"].includes(location.hash.slice(1)) ? location.hash.slice(1) as Page : "home"))
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
  const [entryType, setEntryType] = useState<"income"|"expense">("expense")
  const [amount, setAmount] = useState("")
  const [detail, setDetail] = useState("")
  const [entryDate, setEntryDate] = useState(today())
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [healthType, setHealthType] = useState<"weight"|"exercise"|"wellness">("weight")
  const [weight, setWeight] = useState("")
  const [exercise, setExercise] = useState("เดิน")
  const [distance, setDistance] = useState("")
  const [duration, setDuration] = useState("")
  const [reps, setReps] = useState("")
  const [sets, setSets] = useState("3")
  const [water, setWater] = useState("6")
  const [sleep, setSleep] = useState("8")
  const [healthDate, setHealthDate] = useState(today())

  useEffect(() => { localStorage.setItem(KEYS.money, JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { localStorage.setItem(KEYS.notes, JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem(KEYS.health, JSON.stringify(health)) }, [health])
  useEffect(() => { localStorage.setItem(KEYS.goal, String(goal)); localStorage.setItem(KEYS.goalTitle, goalTitle) }, [goal, goalTitle])
  useEffect(() => { const sync = () => { const next = location.hash.slice(1); if (["money","notes","health"].includes(next)) setPage(next as Page); else setPage("home") }; addEventListener("hashchange", sync); return () => removeEventListener("hashchange", sync) }, [])
  const go = (next: Page) => { setPage(next); history.replaceState(null, "", next === "home" ? location.pathname + location.search : "#" + next); window.scrollTo({ top: 0, behavior: "smooth" }) }

  const income = transactions.filter(t => t.type === "income").reduce((s,t)=>s+t.amount,0)
  const expense = transactions.filter(t => t.type === "expense").reduce((s,t)=>s+t.amount,0)
  const balance = income - expense
  const month = today().slice(0,7)
  const monthItems = transactions.filter(t => t.date.startsWith(month))
  const profile = health.profiles.find(p => p.id === health.activeProfileId) || health.profiles[0]
  const healthRecords = health.records.filter(r => r.profileId === profile?.id).sort((a,b)=>b.date.localeCompare(a.date))
  const latestWeight = healthRecords.find(r => r.type === "weight" && typeof r.weight === "number")?.weight
  const bmi = latestWeight && profile?.height ? latestWeight / ((profile.height/100) ** 2) : null
  const pinned = notes.filter(n => n.pinned)
  const filteredNotes = useMemo(() => notes.filter(n => (n.title + " " + n.body).toLowerCase().includes(search.toLowerCase().trim())).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt)), [notes, search])

  function saveMoney(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0 || !detail.trim()) return
    setTransactions(old => [{ id: uid(), type: entryType, amount: value, detail: detail.trim(), date: entryDate, createdAt: Date.now() }, ...old])
    setAmount(""); setDetail(""); setShowEntry(false)
  }
  function saveNote(e: FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim() && !noteBody.trim()) return
    const now = new Date().toISOString()
    if (editingNoteId) {
      setNotes(old => old.map(n => n.id === editingNoteId ? { ...n, title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), updatedAt: now } : n))
    } else {
      setNotes(old => [{ id: uid(), title: noteTitle.trim() || "ไม่มีชื่อ", body: noteBody.trim(), tags: [], mood: "neutral", pinned: false, createdAt: now, updatedAt: now }, ...old])
    }
    setNoteTitle(""); setNoteBody(""); setEditingNoteId(null); setShowNote(false)
  }
  function saveHealth(e: FormEvent) {
    e.preventDefault()
    const record: HealthRecord = { id: uid(), profileId: profile?.id || "profile-default", date: healthDate, type: healthType }
    if (healthType === "weight") { if (!(Number(weight) > 0)) return; record.weight = Number(weight) }
    if (healthType === "exercise") { record.exercise = exercise; record.distance = Number(distance)||0; record.duration = Number(duration)||0; record.reps = Number(reps)||0; record.sets = Number(sets)||0 }
    if (healthType === "wellness") { record.water = Number(water)||0; record.sleep = Number(sleep)||0 }
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
  const pages: { id: Page; title: string; sub: string; symbol: string }[] = [
    { id: "home", title: "Command", sub: "ภาพรวม", symbol: "01" },
    { id: "money", title: "Money", sub: "การเงิน", symbol: "02" },
    { id: "notes", title: "Notes", sub: "บันทึก", symbol: "03" },
    { id: "health", title: "Body", sub: "สุขภาพ", symbol: "04" },
  ]
  return <div className="cc-root">
    <aside className="cc-rail">
      <button className="cc-mark" onClick={() => go("home")} aria-label="ไปหน้าหลัก"><span>m.</span></button>
      <div className="cc-rail-label">WORKSPACE</div>
      <nav className="cc-nav" aria-label="พื้นที่ทำงาน">{pages.map(p => <button key={p.id} onClick={() => go(p.id)} className={page===p.id?"cc-nav-item active":"cc-nav-item"} aria-current={page===p.id?"page":undefined}><span className="cc-nav-icon"><Glyph name={p.id==="home"?"home":p.id==="money"?"money":p.id==="notes"?"notes":"health"}/></span><span className="cc-nav-text">{p.sub}</span><small>{p.symbol}</small></button>)}</nav>
      <div className="cc-rail-bottom"><span className="cc-status-dot" /><span>ข้อมูลส่วนตัว</span><small>SYNC READY</small></div>
    </aside>
    <div className="cc-main">
      <header className="cc-topbar">
        <div className="cc-breadcrumb"><span>พื้นที่ของฉัน</span><b>/</b><strong>{pages.find(p=>p.id===page)?.sub}</strong></div>
        <div className="cc-top-actions"><label className="cc-search"><Glyph name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาโน้ต..." aria-label="ค้นหาโน้ต"/><kbd>⌘ K</kbd></label><span className="cc-date">{new Date().toLocaleDateString("th-TH",{weekday:"short",day:"numeric",month:"short"})}</span><AccountMenu /></div>
      </header>
      <main className="cc-content">
        {page === "home" && <section className="cc-home">
          <div className="cc-welcome"><div><p className="cc-kicker"><span className="cc-pulse"/> YOUR LIFE, IN VIEW <span className="cc-kicker-line"/></p><h1>Make room<br/><em>for what matters.</em></h1><p className="cc-lede">พื้นที่ส่วนตัวที่ช่วยให้คุณเห็นภาพรวม และกลับไปทำสิ่งสำคัญได้โดยไม่ต้องวุ่นกับเครื่องมือ</p><button className="cc-primary" onClick={()=>go("money")}>ดูภาพรวมการเงิน <Glyph name="arrow"/></button></div><div className="cc-orbit" aria-label="ภาพประกอบนามธรรม"><div className="cc-orbit-ring ring-a"/><div className="cc-orbit-ring ring-b"/><div className="cc-orbit-core"><span>MY</span><strong>SPACE</strong><small>01 — 04</small></div><span className="cc-orbit-node node-a">M</span><span className="cc-orbit-node node-b">N</span><span className="cc-orbit-node node-c">B</span></div></div>
          <div className="cc-section-heading"><div><span className="cc-overline">CONTROL PANEL / 01</span><h2>พื้นที่ของคุณ</h2></div><span className="cc-count">03 MODULES <i/></span></div>
          <div className="cc-module-grid">
            <button className="cc-module cc-module-money" onClick={()=>go("money")}><span className="cc-module-top"><span className="cc-module-index">A / FINANCE</span><span className="cc-module-arrow"><Glyph name="arrow"/></span></span><span className="cc-module-glyph"><Glyph name="money"/></span><span className="cc-module-name">Money<span>การเงินส่วนตัว</span></span><strong className="cc-module-metric">{cash(balance)}</strong><span className="cc-module-bottom">ยอดคงเหลือรวม <Glyph name="arrow"/></span><span className="cc-module-decoration">₿</span></button>
            <button className="cc-module cc-module-notes" onClick={()=>go("notes")}><span className="cc-module-top"><span className="cc-module-index">B / THOUGHTS</span><span className="cc-module-arrow"><Glyph name="arrow"/></span></span><span className="cc-module-glyph"><Glyph name="notes"/></span><span className="cc-module-name">Notes<span>พื้นที่เก็บความคิด</span></span><strong className="cc-module-metric">{notes.length.toString().padStart(2,"0")} <small>รายการ</small></strong><span className="cc-module-bottom">ปักหมุดไว้ {pinned.length} รายการ <Glyph name="arrow"/></span><span className="cc-module-decoration">✳</span></button>
            <button className="cc-module cc-module-health" onClick={()=>go("health")}><span className="cc-module-top"><span className="cc-module-index">C / WELLBEING</span><span className="cc-module-arrow"><Glyph name="arrow"/></span></span><span className="cc-module-glyph"><Glyph name="health"/></span><span className="cc-module-name">Body<span>สุขภาพและการเคลื่อนไหว</span></span><strong className="cc-module-metric">{latestWeight ? latestWeight + " <small>กก.</small>" : "—"}</strong><span className="cc-module-bottom">BMI {bmi ? bmi.toFixed(1) : "ยังไม่มีข้อมูล"} <Glyph name="arrow"/></span><span className="cc-module-decoration">◎</span></button>
          </div>
          <div className="cc-lower-grid"><section className="cc-panel cc-finance-panel"><div className="cc-panel-head"><div><span className="cc-overline">MONEY / THIS MONTH</span><h3>กระแสเงินสด</h3></div><button className="cc-text-action" onClick={()=>go("money")}>รายละเอียด <Glyph name="arrow"/></button></div><div className="cc-cashflow"><div><span>รายรับ</span><strong>+{cash(monthItems.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0))}</strong></div><div><span>รายจ่าย</span><strong>−{cash(monthItems.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0))}</strong></div></div><div className="cc-flow-bar"><span style={{width:(monthItems.length?Math.round(monthItems.filter(t=>t.type==="income").length/monthItems.length*100):50)+"%"}}/></div><div className="cc-panel-foot"><span>{monthItems.length} รายการในเดือนนี้</span><button onClick={()=>{setEntryType("expense");setShowEntry(true)}}><Glyph name="plus"/> เพิ่มรายการ</button></div></section><section className="cc-panel cc-focus-panel"><div className="cc-panel-head"><div><span className="cc-overline">RECENT ACTIVITY</span><h3>ความเคลื่อนไหว</h3></div><span className="cc-live-tag"><i/> LIVE</span></div>{transactions.slice(0,3).length ? transactions.slice(0,3).map(t=><div className="cc-activity" key={t.id}><span className={t.type==="income"?"cc-activity-icon in":"cc-activity-icon out"}>{t.type==="income"?"↙":"↗"}</span><span className="cc-activity-copy"><strong>{t.detail}</strong><small>{dateLabel(t.date)}</small></span><b className={t.type==="income"?"positive":"negative"}>{t.type==="income"?"+":"−"}{cash(t.amount)}</b></div>) : <div className="cc-empty-mini"><span>↗</span><p>รายการแรกของคุณจะปรากฏที่นี่</p><button onClick={()=>setShowEntry(true)}>บันทึกรายการแรก</button></div>}</section></div>
        </section>}
        {page === "money" && <section className="cc-page"><div className="cc-page-title"><div><span className="cc-overline">MODULE A / FINANCE</span><h1>Money<span>.</span></h1><p>ทุกการตัดสินใจทางการเงิน เริ่มจากการมองเห็นภาพรวม</p></div><button className="cc-primary" onClick={()=>setShowEntry(true)}><Glyph name="plus"/> เพิ่มรายการ</button></div><div className="cc-money-hero"><div><span className="cc-overline">TOTAL BALANCE</span><p className="cc-money-total">{cash(balance)}</p><span className="cc-money-caption">ยอดสุทธิจากรายรับและรายจ่ายทั้งหมด</span></div><div className="cc-money-goal"><label>เป้าหมายของฉัน</label><input value={goalTitle} onChange={e=>setGoalTitle(e.target.value)} aria-label="ชื่อเป้าหมาย"/><div className="cc-goal-edit"><input type="number" min="1" value={goal} onChange={e=>setGoal(Number(e.target.value)||0)} aria-label="จำนวนเงินเป้าหมาย"/><span>บาท</span></div><div className="cc-goal-track"><span style={{width:Math.min(100,Math.max(0,balance/Math.max(1,goal)*100))+"%"}}/></div><small>{Math.max(0,Math.min(100,Math.round(balance/Math.max(1,goal)*100)))}% ของเป้าหมาย</small></div></div><div className="cc-stat-grid"><div className="cc-stat"><span>รายรับทั้งหมด</span><strong className="positive">{cash(income)}</strong><small>INCOME / ALL TIME</small></div><div className="cc-stat"><span>รายจ่ายทั้งหมด</span><strong className="negative">{cash(expense)}</strong><small>EXPENSE / ALL TIME</small></div><div className="cc-stat"><span>รายการเดือนนี้</span><strong>{monthItems.length}</strong><small>TRANSACTIONS / MONTH</small></div></div><div className="cc-panel cc-table-panel"><div className="cc-panel-head"><div><span className="cc-overline">LEDGER / ALL RECORDS</span><h3>รายการล่าสุด</h3></div><span className="cc-count">{transactions.length} RECORDS</span></div>{transactions.length ? <div className="cc-table-wrap"><table className="cc-table"><thead><tr><th>รายการ</th><th>วันที่</th><th>ประเภท</th><th className="align-right">จำนวนเงิน</th><th/></tr></thead><tbody>{transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).map(t=><tr key={t.id}><td><strong>{t.detail}</strong></td><td>{dateLabel(t.date)}</td><td><span className={t.type==="income"?"cc-type income":"cc-type expense"}>{t.type==="income"?"รายรับ":"รายจ่าย"}</span></td><td className={"align-right "+(t.type==="income"?"positive":"negative")}>{t.type==="income"?"+":"−"}{cash(t.amount)}</td><td><button className="cc-icon-action danger" aria-label={"ลบ "+t.detail} onClick={()=>{if(confirm("ลบรายการนี้หรือไม่?"))setTransactions(old=>old.filter(x=>x.id!==t.id))}}><Glyph name="trash"/></button></td></tr>)}</tbody></table></div>:<div className="cc-empty"><span>01</span><h3>เริ่มต้นจากรายการแรก</h3><p>เพิ่มรายรับหรือรายจ่าย เพื่อให้ภาพรวมการเงินของคุณค่อย ๆ ชัดขึ้น</p><button className="cc-primary" onClick={()=>setShowEntry(true)}><Glyph name="plus"/> เพิ่มรายการแรก</button></div>}</div></section>}
        {page === "notes" && <section className="cc-page"><div className="cc-page-title"><div><span className="cc-overline">MODULE B / THOUGHTS</span><h1>Notes<span>.</span></h1><p>จับความคิดไว้ ก่อนที่มันจะหายไปกับวันธรรมดา</p></div><button className="cc-primary" onClick={()=>{setEditingNoteId(null);setNoteTitle("");setNoteBody("");setShowNote(true)}}><Glyph name="plus"/> เขียนโน้ต</button></div><div className="cc-note-toolbar"><div><strong>{notes.length}</strong><span> บันทึกทั้งหมด</span><i/> <strong>{pinned.length}</strong><span> ปักหมุด</span></div><label className="cc-search cc-note-search"><Glyph name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อหรือเนื้อหา..." aria-label="ค้นหาโน้ต"/></label></div>{filteredNotes.length ? <div className="cc-notes-grid">{filteredNotes.map((n,i)=><article key={n.id} className={"cc-note-card note-tone-"+(i%4)}><div className="cc-note-card-top"><span>NOTE / {String(i+1).padStart(2,"0")}</span><button className={n.pinned?"cc-pin-button selected":"cc-pin-button"} aria-label={n.pinned?"เลิกปักหมุด":"ปักหมุด"} onClick={()=>setNotes(old=>old.map(x=>x.id===n.id?{...x,pinned:!x.pinned,updatedAt:new Date().toISOString()}:x))}><Glyph name="pin"/></button></div><h3>{n.title || "ไม่มีชื่อ"}</h3><p>{n.body || "ไม่มีเนื้อหา"}</p><div className="cc-note-card-foot"><span>{dateLabel(n.updatedAt.slice(0,10))}</span><span className="cc-note-actions"><button className="cc-icon-action" aria-label="แก้ไขโน้ต" onClick={()=>{setEditingNoteId(n.id);setNoteTitle(n.title);setNoteBody(n.body);setShowNote(true)}}>↗</button><button className="cc-icon-action danger" aria-label="ลบโน้ต" onClick={()=>{if(confirm("ลบโน้ตนี้หรือไม่?"))setNotes(old=>old.filter(x=>x.id!==n.id))}}><Glyph name="trash"/></button></span></div></article>)}</div>:<div className="cc-empty"><span>02</span><h3>{search?"ไม่พบโน้ตที่ค้นหา":"พื้นที่สำหรับความคิดใหม่"}</h3><p>{search?"ลองค้นหาด้วยคำอื่น":"เขียนสิ่งที่อยากจำ ไอเดีย หรือเรื่องเล็ก ๆ ที่ไม่อยากให้หล่นหาย"}</p><button className="cc-primary" onClick={()=>setShowNote(true)}><Glyph name="plus"/> เขียนโน้ตแรก</button></div>}</section>}
        {page === "health" && <section className="cc-page"><div className="cc-page-title"><div><span className="cc-overline">MODULE C / WELLBEING</span><h1>Body<span>.</span></h1><p>ดูความเปลี่ยนแปลง ไม่ใช่เพื่อกดดันตัวเอง แต่เพื่อเข้าใจตัวเองมากขึ้น</p></div><button className="cc-primary" onClick={()=>setShowHealth(true)}><Glyph name="plus"/> บันทึกสุขภาพ</button></div><div className="cc-health-profile"><div className="cc-profile-symbol"><Glyph name="health"/></div><div><span className="cc-overline">ACTIVE PROFILE</span><strong>{profile?.name || "ฉัน"}</strong><small>{profile?.height || 163} ซม. · อายุ {profile?.age || "—"} ปี</small></div><select className="cc-profile-select" aria-label="เลือกโปรไฟล์สุขภาพ" value={profile?.id || ""} onChange={e=>setHealth(old=>({...old,activeProfileId:e.target.value}))}>{health.profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="cc-secondary cc-profile-add" onClick={()=>setShowProfile(true)}><Glyph name="plus"/> เพิ่มโปรไฟล์</button></div><div className="cc-stat-grid"><div className="cc-stat"><span>น้ำหนักล่าสุด</span><strong>{latestWeight ? latestWeight+" กก." : "—"}</strong><small>{healthRecords.find(r=>r.type==="weight")?.date || "ยังไม่มีบันทึก"}</small></div><div className="cc-stat"><span>ดัชนีมวลกาย (BMI)</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong><small>{bmi ? bmi<18.5?"ต่ำกว่าเกณฑ์ทั่วไป":bmi<25?"ช่วงเกณฑ์ทั่วไป":"สูงกว่าเกณฑ์ทั่วไป":"เพิ่มน้ำหนักและส่วนสูงเพื่อคำนวณ"}</small></div><div className="cc-stat"><span>ออกกำลังกายสะสม</span><strong>{healthRecords.filter(r=>r.type==="exercise").reduce((s,r)=>s+(r.duration||0),0)} <small>นาที</small></strong><small>{healthRecords.filter(r=>r.type==="exercise").length} กิจกรรม</small></div></div><div className="cc-health-columns"><section className="cc-panel"><div className="cc-panel-head"><div><span className="cc-overline">YOUR LOG / HISTORY</span><h3>บันทึกสุขภาพ</h3></div><span className="cc-count">{healthRecords.length} RECORDS</span></div>{healthRecords.length ? healthRecords.map(r=><div className="cc-health-record" key={r.id}><span className={"cc-health-record-icon "+r.type}>{r.type==="weight"?"kg":r.type==="exercise"?"↗":"+"}</span><div><strong>{r.type==="weight"?"น้ำหนัก "+r.weight+" กก.":r.type==="exercise"?r.exercise||"ออกกำลังกาย":"น้ำดื่มและการนอน"}</strong><small>{dateLabel(r.date)}{r.type==="exercise"?" · "+(r.duration||0)+" นาที"+(r.distance?" · "+r.distance+" กม.":"")+(r.reps?" · "+r.reps+" ครั้ง × "+(r.sets||1)+" เซต":""):r.type==="wellness"?" · "+(r.water||0)+" แก้ว · "+(r.sleep||0)+" ชม.":""}</small></div><button className="cc-icon-action danger" aria-label="ลบบันทึก" onClick={()=>{if(confirm("ลบบันทึกนี้หรือไม่?"))setHealth(old=>({...old,records:old.records.filter(x=>x.id!==r.id)}))}}><Glyph name="trash"/></button></div>):<div className="cc-empty-small"><p>ยังไม่มีบันทึกสุขภาพ</p><button onClick={()=>setShowHealth(true)}>เพิ่มบันทึกแรก <Glyph name="arrow"/></button></div>}</section><section className="cc-panel cc-wellbeing-panel"><span className="cc-overline">DAILY CHECK-IN</span><h3>ดูแลพื้นฐานในวันนี้</h3><p>บันทึกน้ำดื่มและการนอน เพื่อมองเห็นกิจวัตรในระยะยาว</p><div className="cc-wellbeing-number"><span>น้ำดื่ม</span><strong>{healthRecords.find(r=>r.type==="wellness"&&r.date===today())?.water ?? "—"} <small>แก้ว</small></strong></div><div className="cc-wellbeing-number"><span>การนอน</span><strong>{healthRecords.find(r=>r.type==="wellness"&&r.date===today())?.sleep ?? "—"} <small>ชั่วโมง</small></strong></div><button className="cc-secondary" onClick={()=>{setHealthType("wellness");setShowHealth(true)}}>บันทึกวันนี้ <Glyph name="arrow"/></button></section></div></section>}
      </main>
      <footer className="cc-footer"><span>m. / PERSONAL COMMAND CENTER</span><span>พื้นที่ส่วนตัว · ข้อมูลอยู่กับบัญชีของคุณ</span></footer>
    </div>
    <nav className="cc-mobile-nav" aria-label="เมนูหลัก">{pages.map(p=><button key={p.id} onClick={()=>go(p.id)} className={page===p.id?"active":""}><Glyph name={p.id==="home"?"home":p.id==="money"?"money":p.id==="notes"?"notes":"health"}/><span>{p.sub}</span></button>)}</nav>
    {showEntry && <div className="cc-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowEntry(false)}}><section className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="money-dialog-title"><div className="cc-dialog-head"><div><span className="cc-overline">NEW TRANSACTION</span><h2 id="money-dialog-title">เพิ่มรายการ</h2></div><button className="cc-icon-action" onClick={()=>setShowEntry(false)} aria-label="ปิด"><Glyph name="close"/></button></div><div className="cc-segment"><button type="button" className={entryType==="expense"?"active":""} onClick={()=>setEntryType("expense")}>รายจ่าย</button><button type="button" className={entryType==="income"?"active":""} onClick={()=>setEntryType("income")}>รายรับ</button></div><form onSubmit={saveMoney} className="cc-form"><label>ชื่อรายการ<input autoFocus required value={detail} onChange={e=>setDetail(e.target.value)} placeholder="เช่น อาหารกลางวัน"/></label><label>จำนวนเงิน (บาท)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>วันที่<input required type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)}/></label><div className="cc-dialog-actions"><button type="button" className="cc-secondary" onClick={()=>setShowEntry(false)}>ยกเลิก</button><button type="submit" className="cc-primary">บันทึกรายการ <Glyph name="arrow"/></button></div></form></section></div>}
    {showNote && <div className="cc-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowNote(false)}}><section className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title"><div className="cc-dialog-head"><div><span className="cc-overline">CAPTURE A THOUGHT</span><h2 id="note-dialog-title">{editingNoteId ? "แก้ไขโน้ต" : "เขียนโน้ตใหม่"}</h2></div><button className="cc-icon-action" onClick={()=>setShowNote(false)} aria-label="ปิด"><Glyph name="close"/></button></div><form onSubmit={saveNote} className="cc-form"><label>หัวข้อ<input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="ความคิดที่อยากเก็บไว้"/></label><label>เนื้อหา<textarea rows={5} value={noteBody} onChange={e=>setNoteBody(e.target.value)} placeholder="เขียนได้ตามสบาย..."/></label><div className="cc-dialog-actions"><button type="button" className="cc-secondary" onClick={()=>setShowNote(false)}>ยกเลิก</button><button type="submit" className="cc-primary">{editingNoteId ? "บันทึกการแก้ไข" : "บันทึกโน้ต"} <Glyph name="arrow"/></button></div></form></section></div>}
    {showHealth && <div className="cc-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowHealth(false)}}><section className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="health-dialog-title"><div className="cc-dialog-head"><div><span className="cc-overline">WELLBEING LOG</span><h2 id="health-dialog-title">บันทึกสุขภาพ</h2></div><button className="cc-icon-action" onClick={()=>setShowHealth(false)} aria-label="ปิด"><Glyph name="close"/></button></div><div className="cc-segment"><button type="button" className={healthType==="weight"?"active":""} onClick={()=>setHealthType("weight")}>น้ำหนัก</button><button type="button" className={healthType==="exercise"?"active":""} onClick={()=>setHealthType("exercise")}>กิจกรรม</button><button type="button" className={healthType==="wellness"?"active":""} onClick={()=>setHealthType("wellness")}>น้ำ / นอน</button></div><form onSubmit={saveHealth} className="cc-form"><label>วันที่<input type="date" required value={healthDate} onChange={e=>setHealthDate(e.target.value)}/></label>{healthType==="weight"&&<label>น้ำหนัก (กก.)<input autoFocus required type="number" min="1" max="500" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="เช่น 74.5"/></label>}{healthType==="exercise"&&<><label>กิจกรรม<select value={exercise} onChange={e=>setExercise(e.target.value)}>{["เดิน","วิ่ง","ปั่นจักรยาน","วิดพื้น","สควอต","ยกน้ำหนัก","ยืดเหยียด","อื่น ๆ"].map(x=><option key={x}>{x}</option>)}</select></label><div className="cc-form-row"><label>ระยะทาง (กม.)<input type="number" min="0" step="0.1" value={distance} onChange={e=>setDistance(e.target.value)}/></label><label>เวลา (นาที)<input type="number" min="0" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>จำนวนครั้ง<input type="number" min="0" value={reps} onChange={e=>setReps(e.target.value)}/></label><label>จำนวนเซต<input type="number" min="0" value={sets} onChange={e=>setSets(e.target.value)}/></label></div></>}{healthType==="wellness"&&<div className="cc-form-row"><label>น้ำดื่ม (แก้ว)<input type="number" min="0" value={water} onChange={e=>setWater(e.target.value)}/></label><label>การนอน (ชั่วโมง)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e=>setSleep(e.target.value)}/></label></div>}<div className="cc-dialog-actions"><button type="button" className="cc-secondary" onClick={()=>setShowHealth(false)}>ยกเลิก</button><button type="submit" className="cc-primary">บันทึกข้อมูล <Glyph name="arrow"/></button></div></form></section></div>}
    {showProfile && <div className="cc-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowProfile(false)}}><section className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title"><div className="cc-dialog-head"><div><span className="cc-overline">PROFILE / PERSONAL DATA</span><h2 id="profile-dialog-title">เพิ่มโปรไฟล์สุขภาพ</h2></div><button className="cc-icon-action" onClick={()=>setShowProfile(false)} aria-label="ปิด"><Glyph name="close"/></button></div><p className="cc-profile-help">ข้อมูลของแต่ละโปรไฟล์จะแยกประวัติออกจากกัน</p><form onSubmit={saveProfile} className="cc-form"><label>ชื่อโปรไฟล์<input autoFocus required value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="เช่น ฉัน, พ่อ, แม่"/></label><div className="cc-form-row"><label>ส่วนสูง (ซม.)<input type="number" min="50" max="250" value={profileHeight} onChange={e=>setProfileHeight(e.target.value)}/></label><label>อายุ<input type="number" min="1" max="120" value={profileAge} onChange={e=>setProfileAge(e.target.value)}/></label></div><label>น้ำหนักเริ่มต้น (กก.)<input type="number" min="1" max="500" step="0.1" value={profileInitialWeight} onChange={e=>setProfileInitialWeight(e.target.value)} placeholder="ไม่จำเป็นต้องกรอก"/></label><div className="cc-dialog-actions"><button type="button" className="cc-secondary" onClick={()=>setShowProfile(false)}>ยกเลิก</button><button type="submit" className="cc-primary">สร้างโปรไฟล์ <Glyph name="arrow"/></button></div></form></section></div>}
  </div>
}
