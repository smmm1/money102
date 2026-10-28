import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import "./daytogether.css"
import { AccountMenu } from "./CloudAuth"
import { distributeCents, parseMoneyCents, safeCsvCell, suggestSettlements } from "./domain/money.mjs"

type Page = "home" | "savings" | "health" | "notes" | "split" | "bbq" | "settings"
type Goal = { id: string; title: string; targetCents: number; dueDate: string; status: "active" | "done" | "archived"; createdAt: string }
type SavingEntry = { id: string; type: "deposit" | "withdrawal"; amountCents: number; date: string; goalId: string; note: string; createdAt: string }
type HealthEntry = { id: string; type: "weight" | "bloodPressure" | "sleep" | "water" | "symptom"; date: string; value?: number; systolic?: number; diastolic?: number; pulse?: number; bedtime?: string; wakeTime?: string; quality?: string; title?: string; severity?: number; note?: string }
type Note = { id: string; title: string; body: string; kind: "note" | "diary"; date: string; tags: string[]; mood: string; pinned: boolean; archived: boolean; updatedAt: string; version: number }
type Participant = { id: string; name: string; paidCents: number; shareCents: number }
type Bill = { id: string; title: string; date: string; shop: string; participants: Participant[]; totalCents: number; settled: boolean; notes: string; bbqId?: string; settlements: { id: string; fromId: string; toId: string; amountCents: number; date: string }[] }
type Bbq = { id: string; shop: string; title: string; date: string; area: string; friends: string; people: number; totalCents: number; personalCents: number | null; rating: number | null; menu: string; memory: string; billId?: string }
type State = { goals: Goal[]; savings: SavingEntry[]; health: HealthEntry[]; notes: Note[]; bills: Bill[]; bbq: Bbq[]; prefs: { timezone: string; theme: "light" | "dark" | "system"; hidden: boolean; healthTypes: string[]; dashboard: string[]; appName: string } }
const STORE = "lamoon-daytogether-v1"
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const id = () => crypto.randomUUID()
const emptyState = (): State => ({ goals: [], savings: [], health: [], notes: [], bills: [], bbq: [], prefs: { timezone: "Asia/Bangkok", theme: "system", hidden: false, healthTypes: ["weight", "water", "sleep"], dashboard: ["savings", "health", "notes", "split", "bbq"], appName: "DayTogether" } })
const readState = (): State => { try { const raw = localStorage.getItem(STORE); if (!raw) return emptyState(); const v = JSON.parse(raw); const e = emptyState(); return { ...e, ...v, prefs: { ...e.prefs, ...(v.prefs || {}) } } } catch { return emptyState() } }
const money = (cents: number, hidden = false) => hidden ? "••••••" : new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100)
const cents = (value: string) => parseMoneyCents(value) ?? 0
const dateText = (value: string) => { if (!value) return "ยังไม่ระบุวันที่"; const d = new Date(value.length === 10 ? value + "T12:00:00" : value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) }
const labels: Record<Page, string> = { home: "หน้าหลัก", savings: "ออมเงิน", health: "สุขภาพ", notes: "โน้ต / ไดอารี", split: "หารตัง", bbq: "ประวัติกินหมูกระทะ", settings: "ตั้งค่า" }
const icons: Record<Page, string> = { home: "⌂", savings: "฿", health: "♡", notes: "▤", split: "⇄", bbq: "♨", settings: "⚙" }
const mainPages: Page[] = ["home", "savings", "health", "notes", "split", "bbq"]
function routeFromPath(path: string): { page: Page; detailId: string | null } {
  const p = path.split("/").filter(Boolean)
  const map: Record<string, Page> = { savings: "savings", health: "health", notes: "notes", split: "split", bbq: "bbq", settings: "settings" }
  if (!p.length) return { page: "home", detailId: null }
  return { page: map[p[0]] || "home", detailId: p.length > 1 ? decodeURIComponent(p[p.length - 1]) : null }
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="dt-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
function Button({ children, onClick, kind = "secondary", type = "button", disabled = false }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "secondary" | "danger" | "quiet"; type?: "button" | "submit"; disabled?: boolean }) { return <button type={type} disabled={disabled} className={`dt-btn dt-btn-${kind}`} onClick={onClick}>{children}</button> }
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`dt-panel ${className}`}>{children}</section> }
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="dt-empty"><span>＋</span><strong>{title}</strong><p>{detail}</p>{action}</div> }
function downloadCsv(filename: string, rows: unknown[][]) {
  const cell = (value: unknown) => '"' + String(safeCsvCell(value)).replace(/"/g, '""') + '"'
  const content = "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function DayTogether() {
  const [data, setData] = useState<State>(readState)
  const [page, setPage] = useState<Page>(() => routeFromPath(location.pathname).page)
  const [detailId, setDetailId] = useState<string | null>(() => routeFromPath(location.pathname).detailId)
  const [savedStatus, setSavedStatus] = useState<"saved" | "saving" | "error">("saved")
  const [toast, setToast] = useState("")
  const [moreOpen, setMoreOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [tab, setTab] = useState("all")
    const [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string } | null>(null)

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(data)); setSavedStatus("saving") }
    catch { setSavedStatus("error") }
  }, [data])
  useEffect(() => {
    const ok = () => setSavedStatus("saved")
    const fail = () => setSavedStatus("error")
    window.addEventListener("d1-persist-success", ok)
    window.addEventListener("d1-persist-error", fail)
    return () => { window.removeEventListener("d1-persist-success", ok); window.removeEventListener("d1-persist-error", fail) }
  }, [])
  useEffect(() => {
    const onPop = () => { const r = routeFromPath(location.pathname); setPage(r.page); setDetailId(r.detailId); setEditing(null); setForm({}) }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(t) }, [toast])

  const navigate = (next: Page, idValue: string | null = null) => {
    const paths: Record<Page, string> = { home: "/", savings: "/savings", health: "/health", notes: "/notes", split: "/split", bbq: "/bbq", settings: "/settings" }
    const detailPath: Partial<Record<Page, string>> = { notes: "/notes/", split: "/split/", bbq: "/bbq/", savings: "/savings/goals/" }
    const path = idValue ? (detailPath[next] || paths[next] + "/") + encodeURIComponent(idValue) : paths[next]
    history.pushState({}, "", path); setPage(next); setDetailId(idValue); setEditing(null); setForm({}); setFormError(""); setMoreOpen(false); setQuickOpen(false); window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const patch = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }))
  const startEdit = (kind: string, item: any) => {
    setEditing(kind + ":" + item.id)
    let next: Record<string, string> = {}
    if (kind === "goal") next = { kind:"goal", title:item.title, target:String(item.targetCents/100), dueDate:item.dueDate||"", status:item.status }
    else if (kind === "saving") next = { type:item.type, amount:String(item.amountCents/100), date:item.date, goalId:item.goalId||"", note:item.note||"" }
    else if (kind === "health") next = { ...item, date:item.date, value:item.value==null?"":String(item.value), systolic:item.systolic==null?"":String(item.systolic), diastolic:item.diastolic==null?"":String(item.diastolic), pulse:item.pulse==null?"":String(item.pulse) }
    else if (kind === "note") next = { title:item.title, body:item.body, kind:item.kind, date:item.date, tags:item.tags.join(", "), mood:item.mood||"", pinned:String(item.pinned), archived:String(item.archived) }
    else if (kind === "bill") next = { title:item.title, date:item.date, shop:item.shop||"", total:String(item.totalCents/100), people:item.participants.map((p:Participant)=>p.name).join(", "), notes:item.notes||"" }
    else if (kind === "bbq") next = { shop:item.shop, title:item.title, date:item.date, area:item.area||"", friends:item.friends||"", people:String(item.people), total:String(item.totalCents/100), personal:item.personalCents==null?"":String(item.personalCents/100), rating:item.rating==null?"":String(item.rating), menu:item.menu||"", memory:item.memory||"", billId:item.billId||"" }
    if (kind === "bill") next.payer = item.participants.find((p:Participant)=>p.paidCents>0)?.name || item.participants[0]?.name || ""
    setForm(next); setFormError("")
  }
  const resetForm = () => { setEditing(null); setForm({}); setFormError("") }
  const askDelete = (kind: string, itemId: string) => setConfirmDelete({ kind, id: itemId })
  const removeConfirmed = () => {
    if (!confirmDelete) return
    const { kind, id: target } = confirmDelete
    if (kind === "goal") setData(d => ({ ...d, goals: d.goals.filter(x => x.id !== target), savings: d.savings.map(x => x.goalId === target ? { ...x, goalId: "" } : x) }))
    if (kind === "saving") setData(d => ({ ...d, savings: d.savings.filter(x => x.id !== target) }))
    if (kind === "health") setData(d => ({ ...d, health: d.health.filter(x => x.id !== target) }))
    if (kind === "note") setData(d => ({ ...d, notes: d.notes.filter(x => x.id !== target) }))
    if (kind === "bill") setData(d => ({ ...d, bills: d.bills.filter(x => x.id !== target), bbq: d.bbq.map(x => x.billId === target ? { ...x, billId: undefined } : x) }))
    if (kind === "bbq") setData(d => ({ ...d, bbq: d.bbq.filter(x => x.id !== target), bills: d.bills.map(b => b.bbqId === target ? { ...b, bbqId: undefined } : b) }))
    setConfirmDelete(null); setToast("ลบรายการออกจากข้อมูลของคุณแล้ว"); if (detailId === target) navigate(page)
  }

  const totalSavings = data.savings.reduce((s, x) => s + (x.type === "deposit" ? x.amountCents : -x.amountCents), 0)
  const currentMonth = today().slice(0, 7)
  const thisMonthSavings = data.savings.filter(x => x.date.startsWith(currentMonth))
  const thisMonthBbq = data.bbq.filter(x => x.date.startsWith(currentMonth))
  const openBills = data.bills.filter(b => !b.settled)
  const latestWeight = data.health.filter(x => x.type === "weight" && x.value != null).sort((a,b) => b.date.localeCompare(a.date))[0]
  const filteredNotes = data.notes.filter(n => !n.archived && (n.title + " " + n.body + " " + n.tags.join(" ")).toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")) && (tab === "all" || (tab === "note" ? n.kind === "note" : tab === "diary" ? n.kind === "diary" : n.pinned))).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  const filteredBbq = data.bbq.filter(x => (x.shop + " " + x.title + " " + x.memory).toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")) && (tab === "all" || x.date.startsWith(tab))).sort((a,b) => b.date.localeCompare(a.date))
  const detail = page === "notes" ? data.notes.find(x => x.id === detailId) : page === "split" ? data.bills.find(x => x.id === detailId) : page === "bbq" ? data.bbq.find(x => x.id === detailId) : page === "savings" ? data.goals.find(x => x.id === detailId) : null

  const saveForm = (event: FormEvent) => {
    event.preventDefault(); setFormError("")
    const now = new Date().toISOString()
    const editToken = editing?.split(":")[1]
    const oldId = editToken && editToken !== "new" ? editToken : null
    const mode = editing?.split(":")[0]
    const newId = oldId || id()
    const replace = <T extends { id: string }>(list: T[], value: T) => oldId ? list.map(x => x.id === oldId ? value : x) : [value, ...list]
    if (page === "savings" && (mode === "goal" || form.kind === "goal")) {
      const target = cents(form.target || "0")
      if (!form.title?.trim() || target <= 0) { setFormError("ใส่ชื่อเป้าหมายและยอดเป้าหมายที่มากกว่า 0 บาท"); return }
      const item: Goal = { id: newId, title: form.title.trim(), targetCents: target, dueDate: form.dueDate || "", status: (form.status as Goal["status"]) || "active", createdAt: oldId ? data.goals.find(x=>x.id===oldId)?.createdAt || now : now }
      setData(d => ({ ...d, goals: replace(d.goals, item) })); resetForm(); setToast("บันทึกเป้าหมายแล้ว"); return
    }
    if (page === "savings") {
      const amountCents = cents(form.amount || "0")
      if (amountCents <= 0 || !form.date) { setFormError("ใส่ยอดเงินและวันที่ให้ถูกต้อง"); return }
      const goalId = form.goalId || ""
      const scoped = data.savings.filter(x => x.goalId === goalId && x.id !== oldId)
      const current = scoped.reduce((sum,x)=>sum+(x.type==="deposit"?x.amountCents:-x.amountCents),0)
      if (form.type === "withdrawal" && amountCents > current) { setFormError("ยอดถอนมากกว่ายอดออมในกองนี้"); return }
      const item: SavingEntry = { id:newId, type: form.type === "withdrawal" ? "withdrawal" : "deposit", amountCents, date:form.date, goalId, note:form.note?.trim() || "", createdAt: oldId ? data.savings.find(x=>x.id===oldId)?.createdAt || now : now }
      setData(d=>({...d,savings:replace(d.savings,item)})); resetForm(); setToast("บันทึกรายการออมแล้ว"); return
    }
    if (page === "health") {
      const type = (form.type || "weight") as HealthEntry["type"]
      const value = Number(form.value)
      if (!form.date) { setFormError("กรุณาเลือกวันที่และเวลา"); return }
      if (["weight","water"].includes(type) && !(value > 0)) { setFormError("ค่าที่บันทึกต้องมากกว่า 0"); return }
      if (type === "bloodPressure" && (!(Number(form.systolic)>0) || !(Number(form.diastolic)>0))) { setFormError("กรุณากรอกความดันตัวบนและตัวล่าง"); return }
      if (type === "sleep" && (!form.bedtime || !form.wakeTime)) { setFormError("กรุณากรอกเวลาเข้านอนและตื่น"); return }
      const item: HealthEntry = { id:newId,type,date:form.date,value: Number.isFinite(value) && form.value ? value : undefined,systolic:form.systolic ? Number(form.systolic):undefined,diastolic:form.diastolic?Number(form.diastolic):undefined,pulse:form.pulse?Number(form.pulse):undefined,bedtime:form.bedtime,wakeTime:form.wakeTime,quality:form.quality,title:form.title?.trim(),severity:form.severity?Number(form.severity):undefined,note:form.note?.trim() }
      setData(d=>({...d,health:replace(d.health,item)})); resetForm(); setToast("บันทึกสุขภาพแล้ว"); return
    }
    if (page === "notes") {
      if (!form.title?.trim() && !form.body?.trim()) { setFormError("เขียนหัวข้อหรือเนื้อหาก่อนบันทึก"); return }
      const item: Note = { id:newId,title:form.title?.trim()||"ไม่มีชื่อ",body:form.body||"",kind:form.kind==="diary"?"diary":"note",date:form.date||today(),tags:(form.tags||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,20),mood:form.mood||"",pinned:form.pinned==="true",archived:form.archived==="true",updatedAt:now,version: oldId ? (data.notes.find(x=>x.id===oldId)?.version||0)+1:1 }
      setData(d=>({...d,notes:replace(d.notes,item)})); resetForm(); navigate("notes",item.id); setToast("ส่งบันทึกให้ระบบจัดเก็บแล้ว"); return
    }
    if (page === "split") {
      const people = (form.people||"").split(",").map(x=>x.trim()).filter(Boolean)
      const totalCents = cents(form.total||"0")
      if (!form.title?.trim() || totalCents <= 0 || people.length < 2) { setFormError("ใส่ชื่อบิล ยอดรวม และชื่อผู้ร่วมอย่างน้อย 2 คน"); return }
      const shares = distributeCents(totalCents, people)
      const participants: Participant[] = people.map((name,index)=>{ const old = oldId ? data.bills.find(x=>x.id===oldId)?.participants.find(p=>p.name===name) : undefined; return { id: old?.id || id(), name, paidCents: old ? (name === (form.payer || people[0]) ? totalCents : 0) : name === (form.payer || people[0]) ? totalCents : 0, shareCents: shares[index] } })
      const previous = oldId ? data.bills.find(x=>x.id===oldId) : undefined
      if (previous?.settlements.length && (previous.totalCents !== totalCents || previous.participants.some(p=>{const next=participants.find(n=>n.id===p.id);return !next||p.shareCents!==next.shareCents||p.paidCents!==next.paidCents}))) { setFormError("บิลมีประวัติชำระแล้ว กรุณายกเลิกรายการชำระก่อนแก้ยอด"); return }
      const item: Bill = { id:newId,title:form.title.trim(),date:form.date||today(),shop:form.shop?.trim()||"",participants,totalCents,settled:previous?.settled||false,notes:form.notes?.trim()||"",bbqId:previous?.bbqId||form.bbqId||undefined,settlements:previous?.settlements||[] }
      setData(d=>({...d,bills:replace(d.bills,item),bbq:item.bbqId?d.bbq.map(v=>v.id===item.bbqId?{...v,billId:item.id}:v):d.bbq})); resetForm(); navigate("split",item.id); setToast("บันทึกบิลแล้ว"); return
    }
    if (page === "bbq") {
      if (!form.shop?.trim() || !form.date) { setFormError("กรุณากรอกร้านและวันที่"); return }
      const item: Bbq = { id:newId,shop:form.shop.trim(),title:form.title?.trim()||"มื้อหมูกระทะ",date:form.date,area:form.area?.trim()||"",friends:form.friends?.trim()||"",people:Math.max(1,Number(form.people)||1),totalCents:cents(form.total||"0"),personalCents:form.personal===""||form.personal==null?null:cents(form.personal),rating:form.rating?Math.min(5,Math.max(1,Number(form.rating))):null,menu:form.menu?.trim()||"",memory:form.memory?.trim()||"",billId:form.billId||undefined }
      const previous = oldId ? data.bbq.find(x=>x.id===oldId):undefined
      setData(d=>({...d,bbq:replace(d.bbq,{...item,billId:previous?.billId||item.billId})})); resetForm(); navigate("bbq",item.id); setToast("บันทึกมื้ออาหารแล้ว"); return
    }
  }

  const beginNew = (target: Page, kind = "entry") => {
    setPage(target); setEditing(kind === "goal" ? "goal:new" : "new"); setDetailId(null); setFormError(""); setForm({ date: target === "health" ? new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16) : today(), type: target === "health" ? "weight" : target === "notes" ? "note" : target === "savings" ? "deposit" : "", goalId:"", people:"ฉัน, เพื่อน", payer:"ฉัน", kind: target === "notes" ? "note" : "", rating:"", personal:"", status:"active" }); setQuickOpen(false)
    const paths: Record<Page,string> = { home:"/", savings:"/savings", health:"/health", notes:"/notes", split:"/split", bbq:"/bbq", settings:"/settings" }
    history.pushState({}, "", paths[target]); setPage(target)
  }
  const editItem = (kind: string, item: any, target: Page) => { setPage(target); startEdit(kind,item); setDetailId(item.id); const paths: Record<Page,string> = { home:"/", savings:"/savings", health:"/health", notes:"/notes", split:"/split", bbq:"/bbq", settings:"/settings" }; history.pushState({}, "", (paths[target]+"/"+encodeURIComponent(item.id))); setPage(target); setDetailId(item.id) }
  const saveSettlement = (bill: Bill, fromId: string, toId: string, amountCents: number) => {
    if (amountCents <= 0 || fromId === toId) return
    const balance = (p: Participant, settlements: Bill["settlements"]) => p.paidCents-p.shareCents + settlements.filter(s=>s.fromId===p.id).reduce((sum,s)=>sum+s.amountCents,0) - settlements.filter(s=>s.toId===p.id).reduce((sum,s)=>sum+s.amountCents,0)
    const from = bill.participants.find(p=>p.id===fromId), to = bill.participants.find(p=>p.id===toId)
    if (!from || !to) return
    const max = Math.max(0, -balance(from,bill.settlements))
    if (amountCents > max) { setToast("ยอดชำระเกินยอดที่ผู้โอนต้องจ่าย"); return }
    const settlement = { id:id(), fromId, toId, amountCents, date:new Date().toISOString() }
    setData(d=>({...d,bills:d.bills.map(b=>{ if(b.id!==bill.id)return b; const settlements=[...b.settlements,settlement]; const clear=b.participants.every(p=>balance(p,settlements)===0); return {...b,settlements,settled:clear} })}))
    setToast("บันทึกการชำระแล้ว")
  }

  const submit = (e: FormEvent) => { void saveForm(e) }
  const currentForm = () => {
    const isEdit = Boolean(editing && editing !== "new" && editing !== "goal:new")
    const heading = editing === "goal:new" ? "เพิ่มเป้าหมายออมเงิน" : isEdit ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"
    return <Panel className="dt-form-panel"><div className="dt-panel-head"><div><span className="dt-kicker">บันทึกข้อมูล</span><h2>{heading}</h2></div><Button onClick={resetForm}>ปิด</Button></div><form className="dt-form" onSubmit={submit}>
      {page==="savings" && (editing==="goal:new" || editing?.startsWith("goal:") || form.kind==="goal") ? <><Field label="ชื่อเป้าหมาย"><input required value={form.title||""} onChange={e=>patch("title",e.target.value)} /></Field><Field label="ยอดเป้าหมาย (บาท)"><input required type="number" min="0.01" step="0.01" value={form.target||""} onChange={e=>patch("target",e.target.value)} /></Field><Field label="วันที่เป้าหมาย (ไม่บังคับ)"><input type="date" value={form.dueDate||""} onChange={e=>patch("dueDate",e.target.value)} /></Field><Field label="สถานะ"><select value={form.status||"active"} onChange={e=>patch("status",e.target.value)}><option value="active">กำลังออม</option><option value="done">สำเร็จ</option><option value="archived">เก็บถาวร</option></select></Field></> :
      page==="savings" ? <><Field label="ประเภท"><select value={form.type||"deposit"} onChange={e=>patch("type",e.target.value)}><option value="deposit">ฝากออม</option><option value="withdrawal">ถอน</option></select></Field><Field label="จำนวนเงิน (บาท)"><input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount||""} onChange={e=>patch("amount",e.target.value)} /></Field><Field label="วันที่"><input type="date" required value={form.date||today()} onChange={e=>patch("date",e.target.value)} /></Field><Field label="เป้าหมาย"><select value={form.goalId||""} onChange={e=>patch("goalId",e.target.value)}><option value="">ออมทั่วไป</option>{data.goals.filter(g=>g.status==="active").map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></Field><Field label="หมายเหตุ (ไม่บังคับ)"><input value={form.note||""} onChange={e=>patch("note",e.target.value)} /></Field></> :
      page==="health" ? <><Field label="หมวดที่บันทึก"><select value={form.type||"weight"} onChange={e=>patch("type",e.target.value)}><option value="weight">น้ำหนัก</option><option value="bloodPressure">ความดัน</option><option value="sleep">การนอน</option><option value="water">ดื่มน้ำ</option><option value="symptom">อาการ / บันทึกสุขภาพ</option></select></Field><Field label="วันที่และเวลา"><input type="datetime-local" required value={form.date||today()} onChange={e=>patch("date",e.target.value)} /></Field>{(form.type==="weight"||form.type==="water")&&<Field label={form.type==="weight"?"น้ำหนัก (กก.)":"ปริมาณน้ำ (มล.)"}><input type="number" inputMode="decimal" min="0.01" step="any" required value={form.value||""} onChange={e=>patch("value",e.target.value)} /></Field>}{form.type==="bloodPressure"&&<><Field label="ตัวบน (mmHg)"><input type="number" min="1" value={form.systolic||""} onChange={e=>patch("systolic",e.target.value)} /></Field><Field label="ตัวล่าง (mmHg)"><input type="number" min="1" value={form.diastolic||""} onChange={e=>patch("diastolic",e.target.value)} /></Field><Field label="ชีพจร (ครั้ง/นาที ไม่บังคับ)"><input type="number" min="1" value={form.pulse||""} onChange={e=>patch("pulse",e.target.value)} /></Field></>}{form.type==="sleep"&&<><Field label="เวลาเข้านอน"><input type="time" value={form.bedtime||""} onChange={e=>patch("bedtime",e.target.value)} /></Field><Field label="เวลาตื่น"><input type="time" value={form.wakeTime||""} onChange={e=>patch("wakeTime",e.target.value)} /></Field><Field label="คุณภาพการนอน"><select value={form.quality||""} onChange={e=>patch("quality",e.target.value)}><option value="">ไม่ระบุ</option><option>ดี</option><option>พอใช้</option><option>ไม่ดี</option></select></Field></>}{form.type==="symptom"&&<><Field label="หัวข้อ / อาการ"><input required value={form.title||""} onChange={e=>patch("title",e.target.value)} /></Field><Field label="ระดับความรู้สึก (1–5)"><input type="number" min="1" max="5" value={form.severity||""} onChange={e=>patch("severity",e.target.value)} /></Field></>}<Field label="หมายเหตุ"><textarea rows={3} value={form.note||""} onChange={e=>patch("note",e.target.value)} /></Field></> :
      page==="notes" ? <><Field label="ประเภท"><select value={form.kind||"note"} onChange={e=>patch("kind",e.target.value)}><option value="note">โน้ต</option><option value="diary">ไดอารี</option></select></Field><Field label="หัวข้อ"><input value={form.title||""} onChange={e=>patch("title",e.target.value)} placeholder="ไม่มีชื่อ" /></Field><Field label="เนื้อหา"><textarea rows={7} value={form.body||""} onChange={e=>patch("body",e.target.value)} /></Field><Field label="วันที่ของบันทึก"><input type="date" value={form.date||today()} onChange={e=>patch("date",e.target.value)} /></Field><Field label="แท็ก (คั่นด้วยจุลภาค)"><input value={form.tags||""} onChange={e=>patch("tags",e.target.value)} /></Field>{form.kind==="diary"&&<Field label="อารมณ์วันนี้"><select value={form.mood||""} onChange={e=>patch("mood",e.target.value)}><option value="">ไม่ระบุ</option><option value="ดีใจ">ดีใจ</option><option value="เฉยๆ">เฉยๆ</option><option value="เศร้า">เศร้า</option></select></Field>}<Field label="ปักหมุด"><select value={form.pinned||"false"} onChange={e=>patch("pinned",e.target.value)}><option value="false">ไม่ปักหมุด</option><option value="true">ปักหมุด</option></select></Field></> :
      page==="split" ? <><Field label="ชื่อบิล"><input required value={form.title||""} onChange={e=>patch("title",e.target.value)} /></Field><Field label="วันที่"><input type="date" value={form.date||today()} onChange={e=>patch("date",e.target.value)} /></Field><Field label="ร้าน (ไม่บังคับ)"><input value={form.shop||""} onChange={e=>patch("shop",e.target.value)} /></Field><Field label="ยอดรวม (บาท)"><input required type="number" min="0.01" step="0.01" value={form.total||""} onChange={e=>patch("total",e.target.value)} /></Field><Field label="ผู้ร่วมบิล (คั่นด้วยจุลภาค)"><input required value={form.people||""} onChange={e=>patch("people",e.target.value)} /><small>หารเท่ากัน เศษสตางค์กระจายตามลำดับรายชื่อ</small></Field><Field label="ใครออกเงินให้ร้าน?"><select value={form.payer||""} onChange={e=>patch("payer",e.target.value)}>{(form.people||"ฉัน, เพื่อน").split(",").map(x=>x.trim()).filter(Boolean).map(name=><option key={name} value={name}>{name}</option>)}</select><small>เวอร์ชันนี้รองรับผู้จ่ายร้านหลักหนึ่งคนต่อบิล</small></Field><Field label="หมายเหตุ"><textarea rows={2} value={form.notes||""} onChange={e=>patch("notes",e.target.value)} /></Field></> :
      page==="bbq" ? <><Field label="ชื่อร้าน"><input required value={form.shop||""} onChange={e=>patch("shop",e.target.value)} /></Field><Field label="ชื่อมื้อ / โอกาส"><input value={form.title||""} onChange={e=>patch("title",e.target.value)} /></Field><Field label="วันเวลา"><input type="date" required value={form.date||today()} onChange={e=>patch("date",e.target.value)} /></Field><Field label="สาขาหรือย่าน"><input value={form.area||""} onChange={e=>patch("area",e.target.value)} /></Field><Field label="เพื่อนที่ไปด้วย"><input value={form.friends||""} onChange={e=>patch("friends",e.target.value)} /></Field><Field label="จำนวนคน"><input type="number" min="1" value={form.people||"1"} onChange={e=>patch("people",e.target.value)} /></Field><Field label="ยอดรวมมื้อ (บาท)"><input type="number" min="0" step="0.01" value={form.total||""} onChange={e=>patch("total",e.target.value)} /></Field><Field label="ค่าใช้จ่ายส่วนตัว (บาท)"><input type="number" min="0" step="0.01" value={form.personal||""} onChange={e=>patch("personal",e.target.value)} /></Field><Field label="คะแนน (1–5)"><select value={form.rating||""} onChange={e=>patch("rating",e.target.value)}><option value="">ไม่ให้คะแนน</option>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></Field><Field label="เมนูที่ชอบ"><input value={form.menu||""} onChange={e=>patch("menu",e.target.value)} /></Field><Field label="ความทรงจำ"><textarea rows={3} value={form.memory||""} onChange={e=>patch("memory",e.target.value)} /></Field></> : null}
      {formError&&<p role="alert" className="dt-error">{formError}</p>}<div className="dt-form-actions"><Button type="submit" kind="primary">บันทึก</Button><Button onClick={resetForm}>ยกเลิก</Button></div></form></Panel>
  }

  const savingsPage = () => {
    if (detail && "targetCents" in detail) {
      const selectedGoal = detail
      const entries = data.savings.filter(x=>x.goalId===selectedGoal.id).sort((a,b)=>b.date.localeCompare(a.date))
      const total = entries.reduce((sum,x)=>sum+(x.type==="deposit"?x.amountCents:-x.amountCents),0)
      const pct = Math.max(0,Math.min(100,total/selectedGoal.targetCents*100))
      return <><Panel><div className="dt-panel-head"><div><span className="dt-kicker">รายละเอียดเป้าหมาย</span><h2>{selectedGoal.title}</h2><p>{selectedGoal.dueDate?"วันที่ตั้งเป้า "+dateText(selectedGoal.dueDate):"ไม่มีวันกำหนดเป้าหมาย"}</p></div><div className="dt-item-actions"><Button onClick={()=>startEdit("goal",selectedGoal)}>แก้ไข</Button><Button kind="danger" onClick={()=>askDelete("goal",selectedGoal.id)}>ลบ</Button></div></div><strong className="dt-big-number">{money(total,data.prefs.hidden)} <small>/ {money(selectedGoal.targetCents,data.prefs.hidden)}</small></strong><div className="dt-progress"><span style={{width:pct+"%"}}/></div><p>{Math.round(pct)}% ของเป้าหมาย · ยอดจากรายการที่คุณบันทึก</p><Button kind="primary" onClick={()=>{beginNew("savings");setForm(f=>({...f,goalId:selectedGoal.id,type:"deposit"}))}}>＋ ฝากออมเข้าเป้าหมายนี้</Button></Panel><div className="dt-section-title"><div><h2>ประวัติของเป้าหมายนี้</h2></div></div><Panel>{entries.length?entries.map(x=><div className="dt-list-row" key={x.id}><div><strong>{x.type==="deposit"?"ฝากออม":"ถอนเงิน"}</strong><small>{dateText(x.date)} {x.note&&"· "+x.note}</small></div><b>{x.type==="deposit"?"+":"−"}{money(x.amountCents,data.prefs.hidden)}</b><button onClick={()=>startEdit("saving",x)}>แก้ไข</button><button onClick={()=>askDelete("saving",x.id)}>ลบ</button></div>):<Empty title="ยังไม่มีรายการออมในเป้าหมายนี้" detail="เพิ่มรายการฝากออมเพื่อเริ่มสะสม"/>}</Panel>{editing&&currentForm()}</>
    }
    const goals = data.goals.filter(g=>g.status!=="archived")
    const goalTotal = (goalId: string) => data.savings.filter(x=>x.goalId===goalId).reduce((sum,x)=>sum+(x.type==="deposit"?x.amountCents:-x.amountCents),0)
    const records = data.savings.filter(x=>tab==="all"||x.type===tab).sort((a,b)=>b.date.localeCompare(a.date))
    return <><div className="dt-stats"><Panel><span>ยอดออมคงเหลือ</span><strong>{money(totalSavings,data.prefs.hidden)}</strong><small>จากรายการที่คุณบันทึก</small></Panel><Panel><span>ฝากออมเดือนนี้</span><strong>{money(thisMonthSavings.filter(x=>x.type==="deposit").reduce((s,x)=>s+x.amountCents,0),data.prefs.hidden)}</strong></Panel><Panel><span>ถอนเดือนนี้</span><strong>{money(thisMonthSavings.filter(x=>x.type==="withdrawal").reduce((s,x)=>s+x.amountCents,0),data.prefs.hidden)}</strong></Panel></div><div className="dt-section-title"><div><h2>เป้าหมายออมเงิน</h2><p>ยอดจากรายการที่คุณบันทึก ไม่ได้เชื่อมต่อบัญชีธนาคาร</p></div><Button kind="primary" onClick={()=>{beginNew("savings","goal");setForm(f=>({...f,kind:"goal"}))}}>＋ เพิ่มเป้าหมาย</Button></div>{goals.length?<div className="dt-card-grid">{goals.map(g=>{const total=goalTotal(g.id);const pct=Math.max(0,Math.min(100,total/g.targetCents*100));return <Panel key={g.id}><div className="dt-item-head"><span className="dt-chip green">{g.status==="done"?"สำเร็จ":"กำลังออม"}</span><div className="dt-item-actions"><button onClick={()=>{startEdit("goal",g);setForm(f=>({...f,kind:"goal"}))}}>แก้ไข</button><button onClick={()=>askDelete("goal",g.id)}>ลบ</button></div></div><h3>{g.title}</h3><strong className="dt-big-number">{money(total,data.prefs.hidden)} <small>/ {money(g.targetCents,data.prefs.hidden)}</small></strong><div className="dt-progress"><span style={{width:pct+"%"}}/></div><small>{Math.round(pct)}% ของเป้าหมาย {g.dueDate? "· กำหนด "+dateText(g.dueDate):""}</small></Panel>})}</div>:<Empty title="ยังไม่มีเป้าหมายออมเงิน" detail="เริ่มจากเป้าหมายเล็ก ๆ ที่อยากเก็บให้สำเร็จ" action={<Button kind="primary" onClick={()=>{beginNew("savings","goal");setForm(f=>({...f,kind:"goal"}))}}>เพิ่มเป้าหมาย</Button>}/>}<div className="dt-section-title"><div><h2>ประวัติการออม</h2><p>ถอนเกินยอดที่บันทึกในกองนั้นไม่ได้</p></div><Button kind="primary" onClick={()=>beginNew("savings")}>＋ เพิ่มรายการ</Button></div><div className="dt-filter-row"><button className={tab==="all"?"active":""} onClick={()=>setTab("all")}>ทั้งหมด</button><button className={tab==="deposit"?"active":""} onClick={()=>setTab("deposit")}>ฝากออม</button><button className={tab==="withdrawal"?"active":""} onClick={()=>setTab("withdrawal")}>ถอน</button></div><Panel>{records.length?records.map(x=><div className="dt-list-row" key={x.id}><div><strong>{x.type==="deposit"?"ฝากออม":"ถอนเงิน"}</strong><small>{dateText(x.date)} · {x.goalId?goals.find(g=>g.id===x.goalId)?.title||"เป้าหมายที่ถูกลบ":"ออมทั่วไป"} {x.note&&"· "+x.note}</small></div><b>{x.type==="deposit"?"+":"−"}{money(x.amountCents,data.prefs.hidden)}</b><button onClick={()=>startEdit("saving",x)}>แก้ไข</button><button onClick={()=>askDelete("saving",x.id)}>ลบ</button></div>):<Empty title="ยังไม่มีรายการออม" detail="เพิ่มรายการฝากออมหรือถอนเพื่อเริ่มดูยอดสะสม"/>}</Panel>{editing&&currentForm()}</>
  }

  const healthPage = () => {
    const records = data.health.filter(x=>tab==="all"||x.type===tab).sort((a,b)=>b.date.localeCompare(a.date))
    const sleepHours = (x: HealthEntry) => { if(!x.bedtime||!x.wakeTime)return null; const [bh,bm]=x.bedtime.split(":").map(Number),[wh,wm]=x.wakeTime.split(":").map(Number); let mins=wh*60+wm-(bh*60+bm); if(mins<=0)mins+=1440;return mins/60 }
    return <><div className="dt-section-title"><div><h2>ติดตามสิ่งที่คุณสนใจ</h2><p>เลือกบันทึกเฉพาะหมวดที่ต้องการ ไม่ใช่เครื่องมือวินิจฉัย</p></div><Button kind="primary" onClick={()=>beginNew("health")}>＋ บันทึกสุขภาพ</Button></div><div className="dt-filter-row dt-filter-wrap">{[["all","ทั้งหมด"],["weight","น้ำหนัก"],["bloodPressure","ความดัน"],["sleep","การนอน"],["water","ดื่มน้ำ"],["symptom","อาการ"]].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}</div>{latestWeight&&<Panel className="dt-health-highlight"><span>น้ำหนักล่าสุด · {dateText(latestWeight.date)}</span><strong>{data.prefs.hidden?"••••":latestWeight.value+" กก."}</strong><small>ค่าที่บันทึกครั้งล่าสุด ไม่ใช่ค่าของวันนี้หากวัดคนละวัน</small></Panel>}<Panel>{records.length?records.map(x=><div className="dt-list-row" key={x.id}><div><strong>{x.type==="weight"?"น้ำหนัก":x.type==="bloodPressure"?"ความดัน":x.type==="sleep"?"การนอน":x.type==="water"?"ดื่มน้ำ":"อาการ / บันทึก"}</strong><small>{dateText(x.date)} {x.note&&"· "+x.note}</small>{x.type==="sleep"&&<small>นอน {x.bedtime}–{x.wakeTime} · {sleepHours(x)?.toLocaleString("th-TH",{maximumFractionDigits:1})} ชม.</small>}</div><b>{data.prefs.hidden?"••••":x.type==="weight"?x.value+" กก.":x.type==="water"?x.value+" มล.":x.type==="bloodPressure"?x.systolic+"/"+x.diastolic+" mmHg":x.type==="sleep"?(sleepHours(x)?.toLocaleString("th-TH",{maximumFractionDigits:1})||"—")+" ชม.":x.title||"บันทึก"}</b><button onClick={()=>startEdit("health",x)}>แก้ไข</button><button onClick={()=>askDelete("health",x.id)}>ลบ</button></div>):<Empty title="ยังไม่มีข้อมูลสุขภาพ" detail="เลือกหมวดที่อยากติดตาม แล้วเริ่มบันทึกได้ตามสะดวก"/>}</Panel><p className="dt-disclaimer">ข้อมูลนี้เป็นบันทึกส่วนตัว ไม่ใช่การวินิจฉัยทางการแพทย์</p>{editing&&currentForm()}</>
  }

  const notesPage = () => <><div className="dt-notes-toolbar"><div className="dt-search"><span>⌕</span><input aria-label="ค้นหาโน้ต" placeholder="ค้นหาหัวข้อ เนื้อหา หรือแท็ก" value={query} onChange={e=>setQuery(e.target.value)}/></div><Button kind="primary" onClick={()=>beginNew("notes")}>＋ เขียนบันทึก</Button></div><div className="dt-filter-row">{[["all","ทั้งหมด"],["note","โน้ต"],["diary","ไดอารี"],["pinned","ปักหมุด"]].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}</div>{editing&&currentForm()}{detail&&"body" in detail?<Panel className="dt-note-detail"><div className="dt-panel-head"><div><span className="dt-kicker">{detail.kind==="diary"?"ไดอารี":"โน้ต"} · {dateText(detail.date)}</span><h2>{data.prefs.hidden?"••••••":detail.title}</h2></div><div className="dt-item-actions"><Button onClick={()=>startEdit("note",detail)}>แก้ไข</Button><Button onClick={()=>setData(d=>({...d,notes:d.notes.map(n=>n.id===detail.id?{...n,pinned:!n.pinned}:n)}))}>{detail.pinned?"เลิกปักหมุด":"ปักหมุด"}</Button><Button onClick={()=>askDelete("note",detail.id)} kind="danger">ลบ</Button></div></div><p className="dt-note-body">{data.prefs.hidden?"••••••••••••••":detail.body||"ไม่มีเนื้อหา"}</p><div className="dt-tags">{detail.tags.map(t=><span key={t}>#{t}</span>)}</div><small>แก้ไขล่าสุด {dateText(detail.updatedAt)}</small></Panel>:<div className="dt-card-grid">{filteredNotes.map(n=><Panel key={n.id} className="dt-note-card"><div className="dt-item-head"><span className="dt-chip violet">{n.kind==="diary"?"ไดอารี":"โน้ต"}{n.pinned?" · ปักหมุด":""}</span><button aria-label="เปิดบันทึก" onClick={()=>navigate("notes",n.id)}>เปิด ↗</button></div><button className="dt-note-title" onClick={()=>navigate("notes",n.id)}>{data.prefs.hidden?"••••••":n.title}</button><p>{data.prefs.hidden?"••••••••••••••":n.body||"ไม่มีเนื้อหา"}</p><div className="dt-tags">{n.tags.map(t=><span key={t}>#{t}</span>)}</div><small>{dateText(n.date)} · แก้ไข {dateText(n.updatedAt)}</small><div className="dt-item-actions"><button onClick={()=>startEdit("note",n)}>แก้ไข</button><button onClick={()=>setData(d=>({...d,notes:d.notes.map(x=>x.id===n.id?{...x,pinned:!x.pinned}:x)}))}>{n.pinned?"เลิกปักหมุด":"ปักหมุด"}</button><button onClick={()=>askDelete("note",n.id)}>ลบ</button></div></Panel>)}{!filteredNotes.length&&<Empty title="ยังไม่มีบันทึก" detail="เก็บไอเดีย เรื่องที่อยากจำ หรือบันทึกประจำวันไว้ที่นี่" action={<Button kind="primary" onClick={()=>beginNew("notes")}>เขียนบันทึกแรก</Button>}/>}</div></>

  const splitPage = () => {
    if(detail && "participants" in detail) {
      const bill = detail
      const balanceFor = (p: Participant) => p.paidCents-p.shareCents + bill.settlements.filter(s=>s.fromId===p.id).reduce((sum,s)=>sum+s.amountCents,0)-bill.settlements.filter(s=>s.toId===p.id).reduce((sum,s)=>sum+s.amountCents,0)
      const transfers = suggestSettlements(bill.participants,bill.settlements).map(t=>({from:bill.participants.find(p=>p.id===t.fromId)!,to:bill.participants.find(p=>p.id===t.toId)!,amount:t.amountCents}))
      return <><Panel><div className="dt-panel-head"><div><span className="dt-kicker">รายละเอียดบิล</span><h2>{bill.title}</h2><p>{dateText(bill.date)} {bill.shop&&"· "+bill.shop}</p></div><div className="dt-item-actions"><Button onClick={()=>startEdit("bill",bill)}>แก้ไข</Button><Button onClick={()=>askDelete("bill",bill.id)} kind="danger">ลบ</Button>{bill.bbqId?<Button onClick={()=>navigate("bbq",bill.bbqId!)}>เปิดมื้ออาหาร</Button>:<Button onClick={()=>createVisitFromBill(bill)}>บันทึกเป็นมื้อหมูกระทะ</Button>}</div></div><strong className="dt-big-number">{money(bill.totalCents,data.prefs.hidden)}</strong><p>{bill.settled?"เคลียร์แล้ว":"กำลังเคลียร์"} · หารเท่ากัน {bill.participants.length} คน</p>{bill.participants.map(p=><div className="dt-list-row" key={p.id}><div><strong>{p.name}</strong><small>ส่วนรับผิดชอบ {money(p.shareCents,data.prefs.hidden)} · ออกไปแล้ว {money(p.paidCents,data.prefs.hidden)}</small></div><b>{balanceFor(p)>0?"ต้องรับ ":balanceFor(p)<0?"ต้องจ่าย ":"เคลียร์แล้ว"}{money(Math.abs(balanceFor(p)),data.prefs.hidden)}</b></div>)}</Panel><Panel><div className="dt-panel-head"><div><h2>คำแนะนำการเคลียร์เงิน</h2><p>คำนวณจากยอดรับผิดชอบและรายการชำระที่บันทึกไว้</p></div></div>{transfers.length?transfers.map((t,i)=><div className="dt-list-row" key={i}><div><strong>{t.from.name} โอนให้ {t.to.name}</strong><small>ยอดแนะนำ ณ ตอนนี้</small></div><b>{money(t.amount,data.prefs.hidden)}</b><Button onClick={()=>saveSettlement(bill,t.from.id,t.to.id,t.amount)} kind="primary">บันทึกโอนแล้ว</Button></div>):<Empty title="ไม่มีเงินค้างเคลียร์" detail="ยอดรับและยอดจ่ายสุทธิสมดุลกันแล้ว"/>}{bill.settlements.length>0&&<><h3>ประวัติการชำระ</h3>{bill.settlements.map(s=><div className="dt-list-row" key={s.id}><div><strong>{bill.participants.find(p=>p.id===s.fromId)?.name} → {bill.participants.find(p=>p.id===s.toId)?.name}</strong><small>{dateText(s.date)}</small></div><b>{money(s.amountCents,data.prefs.hidden)}</b><button onClick={()=>setData(d=>({...d,bills:d.bills.map(b=>b.id===bill.id?{...b,settlements:b.settlements.filter(x=>x.id!==s.id),settled:false}:b)}))}>ยกเลิก</button></div>)}</>}</Panel>{editing&&currentForm()}</>
    }
    return <><div className="dt-section-title"><div><h2>บิลทั้งหมด</h2><p>ยอดค้างเคลียร์ {openBills.length} บิล</p></div><Button kind="primary" onClick={()=>beginNew("split")}>＋ สร้างบิล</Button></div>{editing&&currentForm()}<div className="dt-card-grid">{data.bills.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(b=><Panel key={b.id}><div className="dt-item-head"><span className={"dt-chip "+(b.settled?"green":"orange")}>{b.settled?"เคลียร์แล้ว":"กำลังเคลียร์"}</span><small>{dateText(b.date)}</small></div><button className="dt-note-title" onClick={()=>navigate("split",b.id)}>{b.title}</button><p>{b.shop||"ไม่ได้ระบุร้าน"} · {b.participants.length} คน</p><strong className="dt-big-number">{money(b.totalCents,data.prefs.hidden)}</strong><div className="dt-item-actions"><button onClick={()=>navigate("split",b.id)}>รายละเอียด</button><button onClick={()=>startEdit("bill",b)}>แก้ไข</button><button onClick={()=>askDelete("bill",b.id)}>ลบ</button></div>{b.bbqId&&<small>เชื่อมกับมื้อหมูกระทะแล้ว</small>}</Panel>)}</div>{!data.bills.length&&<Empty title="ยังไม่มีบิลหารตัง" detail="สร้างบิลและระบุรายชื่อผู้ร่วมเพื่อคำนวณส่วนแบ่ง" action={<Button kind="primary" onClick={()=>beginNew("split")}>สร้างบิลแรก</Button>}/>}</>
  }

  const createBillFromVisit = (visit: Bbq) => {
    beginNew("split")
    const names = ["ฉัน", ...(visit.friends || "เพื่อน").split(",").map(name => name.trim()).filter(Boolean)]
    setForm({ title: visit.title + " · " + visit.shop, shop: visit.shop, date: visit.date, total: (visit.totalCents / 100).toFixed(2), people: names.join(", "), payer: "ฉัน", bbqId: visit.id, notes: "" })
  }
  const openOrCreateBillForVisit = (visit: Bbq) => {
    if (visit.billId) navigate("split", visit.billId)
    else createBillFromVisit(visit)
  }
  const createVisitFromBill = (bill: Bill) => {
    const visitId = id()
    const visit: Bbq = { id: visitId, shop: bill.shop || "ไม่ระบุร้าน", title: bill.title, date: bill.date, area: "", friends: bill.participants.filter(p => p.name !== "ฉัน").map(p => p.name).join(", "), people: bill.participants.length, totalCents: bill.totalCents, personalCents: bill.participants.find(p => p.name === "ฉัน")?.shareCents ?? null, rating: null, menu: "", memory: "", billId: bill.id }
    setData(d => ({ ...d, bbq: [visit, ...d.bbq], bills: d.bills.map(b => b.id === bill.id ? { ...b, bbqId: visitId } : b) }))
    navigate("bbq", visitId)
    setToast("เชื่อมบิลกับประวัติมื้ออาหารแล้ว")
  }

  const bbqPage = () => {
    const selectedVisit = detailId ? data.bbq.find(visit => visit.id === detailId) : undefined
    return (
    <section className="dt-panel">
      <h2>ประวัติมื้อหมูกระทะ</h2>
      <Button kind="primary" onClick={() => beginNew("bbq")}>＋ เพิ่มมื้อ</Button>
      <div className="dt-search"><span>⌕</span><input aria-label="ค้นหาประวัติมื้ออาหาร" placeholder="ค้นหาร้านหรือความทรงจำ" value={query} onChange={e => setQuery(e.target.value)} /></div>
      {editing ? currentForm() : null}
      {selectedVisit ? <div className="dt-panel-body">
        <h3>{data.prefs.hidden ? "••••••" : selectedVisit.shop}</h3>
        <p>{dateText(selectedVisit.date)} · {data.prefs.hidden ? "••••••" : selectedVisit.title}</p>
        <Button onClick={() => startEdit("bbq", detail)}>แก้ไข</Button>
        <Button kind="danger" onClick={() => askDelete("bbq", selectedVisit.id)}>ลบ</Button>
        <Button kind={selectedVisit.billId ? "secondary" : "primary"} onClick={() => openOrCreateBillForVisit(detail)}>{selectedVisit.billId ? "เปิดบิลที่เชื่อม" : "สร้างบิลหารตังจากมื้อนี้"}</Button>
      </div> : null}
      {filteredBbq.length === 0 ? <Empty title="ยังไม่มีประวัติมื้อหมูกระทะ" detail="บันทึกร้าน ค่าใช้จ่าย และความทรงจำของแต่ละมื้อ" action={<Button kind="primary" onClick={() => beginNew("bbq")}>เพิ่มมื้อแรก</Button>} /> : null}
      {filteredBbq.map(visit => <div className="dt-list-row" key={visit.id}>
        <div><strong>{data.prefs.hidden ? "••••••" : visit.shop}</strong><small>{dateText(visit.date)}</small></div>
        <Button onClick={() => navigate("bbq", visit.id)}>เปิด</Button>
        <Button onClick={() => startEdit("bbq", visit)}>แก้ไข</Button>
        <Button kind="danger" onClick={() => askDelete("bbq", visit.id)}>ลบ</Button>
      </div>)}
    </section>
    )
  }

  const pageContent = () => {
    if(page==="savings")return savingsPage()
    if(page==="health")return healthPage()
    if(page==="notes")return notesPage()
    if(page==="split")return splitPage()
    if(page==="bbq")return bbqPage()
    if(page==="settings")return <><Panel><h2>การตั้งค่าส่วนตัว</h2><div className="dt-form"><Field label="ชื่อแอป"><input maxLength={40} value={data.prefs.appName} onChange={e=>setData(d=>({...d,prefs:{...d.prefs,appName:e.target.value||"DayTogether"}}))} /></Field><Field label="ธีม"><select value={data.prefs.theme} onChange={e=>setData(d=>({...d,prefs:{...d.prefs,theme:e.target.value as State["prefs"]["theme"]}}))}><option value="system">ตามระบบ</option><option value="light">สว่าง</option><option value="dark">มืด</option></select></Field><Field label="เขตเวลา"><select value={data.prefs.timezone} onChange={e=>setData(d=>({...d,prefs:{...d.prefs,timezone:e.target.value}}))}><option value="Asia/Bangkok">กรุงเทพฯ (Asia/Bangkok)</option><option value="Asia/Tokyo">โตเกียว</option><option value="UTC">UTC</option></select></Field><label className="dt-toggle"><input type="checkbox" checked={data.prefs.hidden} onChange={e=>setData(d=>({...d,prefs:{...d.prefs,hidden:e.target.checked}}))}/> ซ่อนยอดเงินและข้อความส่วนตัวชั่วคราว</label><Button kind="secondary" onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="daytogether-export.json";a.click();URL.revokeObjectURL(url);setToast("ส่งออกข้อมูล JSON แล้ว")}}>ส่งออกข้อมูล JSON</Button><Button kind="secondary" onClick={()=>{downloadCsv("daytogether-savings.csv",[["id","type","amount_baht","date","goal_id","note"],...data.savings.map(x=>[x.id,x.type,(x.amountCents/100).toFixed(2),x.date,x.goalId,x.note])]);setToast("ส่งออก CSV รายการออมแล้ว")}}>ส่งออก CSV · ออมเงิน</Button><Button kind="secondary" onClick={()=>{downloadCsv("daytogether-health.csv",[["id","type","date","value","systolic","diastolic","pulse","note"],...data.health.map(x=>[x.id,x.type,x.date,x.value??"",x.systolic??"",x.diastolic??"",x.pulse??"",x.note??""])]);setToast("ส่งออก CSV สุขภาพแล้ว")}}>ส่งออก CSV · สุขภาพ</Button><Button kind="secondary" onClick={()=>{downloadCsv("daytogether-notes.csv",[["id","title","kind","date","tags","body"],...data.notes.map(x=>[x.id,x.title,x.kind,x.date,x.tags.join("|"),x.body])]);setToast("ส่งออก CSV โน้ตแล้ว")}}>ส่งออก CSV · โน้ต</Button></div></Panel><Panel><h2>ความเป็นส่วนตัว</h2><p>ข้อมูลนี้บันทึกภายใต้บัญชีที่เข้าสู่ระบบ และส่งไปยัง Cloudflare D1 ผ่าน API ของโปรเจกต์ การแสดงสถานะบันทึกสำเร็จจะอิงเหตุการณ์ตอบกลับจาก API แต่ข้อมูลยังอยู่ในรูป snapshot JSON ไม่ใช่ตารางแยกตามหมวดในขณะนี้</p><p>ไม่มีการแชร์โน้ตหรือข้อมูลสุขภาพไปยังบิลโดยอัตโนมัติ การทำเครื่องหมายโอนแล้วเป็นเพียงการบันทึกของผู้ใช้ ไม่ใช่การตรวจสอบจากธนาคาร</p><p>สถานะการจัดเก็บ: <strong>{savedStatus==="saved"?"บันทึกแล้ว":savedStatus==="saving"?"กำลังบันทึก":"บันทึกไม่สำเร็จ"}</strong></p></Panel></>
    return <><div className="dt-welcome"><div><span className="dt-kicker">พื้นที่ส่วนตัวของคุณ · {dateText(today())}</span><h2>ค่อย ๆ จัดการ<br/><em>ทีละเรื่องก็พอ</em></h2><p>เงิน สุขภาพ ความคิด และความทรงจำ — รวมไว้ในที่เดียว</p></div><Button kind="primary" onClick={()=>setQuickOpen(true)}>＋ เพิ่มรายการ</Button></div><div className="dt-stats dt-home-stats"><Panel><span>ยอดออมคงเหลือ</span><strong>{money(totalSavings,data.prefs.hidden)}</strong><small>จากรายการที่บันทึกไว้</small></Panel><Panel><span>สุขภาพล่าสุด</span><strong>{latestWeight?latestWeight.value+" กก.":"ยังไม่มีข้อมูล"}</strong><small>{latestWeight?dateText(latestWeight.date):"เริ่มบันทึกสุขภาพ"}</small></Panel><Panel><span>บิลค้างเคลียร์</span><strong>{openBills.length} บิล</strong><small>{money(openBills.reduce((s,b)=>s+b.totalCents,0),data.prefs.hidden)} ยอดรวม</small></Panel><Panel><span>มื้อหมูกระทะเดือนนี้</span><strong>{thisMonthBbq.length} มื้อ</strong><small>ค่าใช้จ่ายส่วนตัว {money(thisMonthBbq.reduce((s,b)=>s+(b.personalCents||0),0),data.prefs.hidden)}{thisMonthBbq.some(b=>b.personalCents==null)?" · ข้อมูลยังไม่ครบ":""}</small></Panel></div><div className="dt-section-title"><div><h2>ไปยังหมวดที่ต้องการ</h2><p>เข้าถึงบันทึกได้โดยตรง</p></div></div><div className="dt-card-grid">{mainPages.filter(p=>p!=="home").map(p=><button className="dt-shortcut" key={p} onClick={()=>navigate(p)}><span className={"dt-shortcut-icon "+p}>{icons[p]}</span><strong>{labels[p]}</strong><small>{p==="savings"?"เป้าหมายและรายการออม":p==="health"?"บันทึกและแนวโน้ม":p==="notes"?"โน้ตส่วนตัวและไดอารี":p==="split"?"ส่วนแบ่งและการเคลียร์เงิน":"ร้าน ค่าใช้จ่าย และความทรงจำ"}</small><span className="dt-arrow">↗</span></button>)}</div><div className="dt-section-title"><div><h2>รายการล่าสุด</h2><p>จากข้อมูลที่บันทึกจริงในบัญชีนี้</p></div></div><Panel>{[...data.savings.map(x=>({id:x.id,kind:"savings" as Page,title:x.note|| (x.type==="deposit"?"ฝากออม":"ถอนเงิน"),date:x.date,amount:money(x.amountCents,data.prefs.hidden)})),...data.notes.map(x=>({id:x.id,kind:"notes" as Page,title:x.title,date:x.updatedAt,amount:""})),...data.health.map(x=>({id:x.id,kind:"health" as Page,title:x.type==="weight"?"บันทึกน้ำหนัก":x.type==="water"?"บันทึกน้ำ":"บันทึกสุขภาพ",date:x.date,amount:data.prefs.hidden?"••••":x.value?String(x.value):""})),...data.bbq.map(x=>({id:x.id,kind:"bbq" as Page,title:x.shop,date:x.date,amount:x.personalCents==null?"":money(x.personalCents,data.prefs.hidden)}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(x=><div className="dt-list-row" key={x.kind+x.id}><div><strong>{data.prefs.hidden && x.kind==="notes"?"••••••••":x.title}</strong><small>{labels[x.kind]} · {dateText(x.date)}</small></div><b>{x.amount}</b><Button onClick={()=>navigate(x.kind,x.id)}>เปิด</Button></div>)}</Panel></>
  }

  return <div className={`dt-app ${data.prefs.theme==="dark"?"dt-dark":""}`}>
    <aside className="dt-sidebar"><button className="dt-brand" onClick={()=>navigate("home")}><span>dt</span><div><strong>{data.prefs.appName||"DayTogether"}</strong><small>พื้นที่ส่วนตัวของคุณ</small></div></button><span className="dt-nav-label">เมนูหลัก</span><nav>{mainPages.map(p=><button key={p} className={page===p?"active":""} onClick={()=>navigate(p)}><span>{icons[p]}</span>{labels[p]}</button>)}</nav><div className="dt-sidebar-bottom"><button className={page==="settings"?"active":""} onClick={()=>navigate("settings")}><span>⚙</span>ตั้งค่า</button><div className="dt-sync"><i className={savedStatus==="error"?"error":savedStatus==="saving"?"pending":""}/><span>{savedStatus==="saved"?"เชื่อมต่อแล้ว":savedStatus==="saving"?"กำลังบันทึก":"บันทึกไม่สำเร็จ"}</span></div></div></aside>
    <main className="dt-main"><header className="dt-topbar"><div><span className="dt-kicker">{(data.prefs.appName||"DayTogether").toUpperCase()} / PERSONAL SPACE</span><h1>{labels[page]}</h1></div><div className="dt-top-actions"><span className="dt-date">{dateText(today())}</span><AccountMenu /><Button kind="primary" onClick={()=>setQuickOpen(true)}>＋ เพิ่มรายการ</Button></div></header><div className="dt-content">{page==="home"?pageContent():<><div className="dt-page-intro"><p>{page==="savings"?"ติดตามเงินออมและเป้าหมายส่วนตัว":page==="health"?"บันทึกสิ่งที่อยากติดตามด้วยตัวเอง":page==="notes"?"พื้นที่ส่วนตัวสำหรับความคิดและความทรงจำ":page==="split"?"แบ่งค่าใช้จ่ายกับเพื่อนอย่างชัดเจน":page==="bbq"?"เก็บร้าน มื้ออาหาร และความทรงจำ": "ปรับพื้นที่ให้เหมาะกับคุณ"}</p><span className="dt-save-status">{savedStatus==="saved"?"✓ บันทึกแล้ว":savedStatus==="saving"?"กำลังบันทึก…":"บันทึกไม่สำเร็จ"}</span></div>{pageContent()}</>}</div></main>
    <nav className="dt-mobile-nav" aria-label="เมนูมือถือ">{(["home","savings","health","notes"] as Page[]).map(p=><button key={p} className={page===p?"active":""} onClick={()=>navigate(p)}><span>{icons[p]}</span><small>{labels[p]}</small></button>)}<button className={moreOpen||page==="split"||page==="bbq"||page==="settings"?"active":""} onClick={()=>setMoreOpen(v=>!v)}><span>•••</span><small>เพิ่มเติม</small></button></nav>
    {moreOpen&&<><button className="dt-sheet-backdrop" aria-label="ปิดเมนูเพิ่มเติม" onClick={()=>setMoreOpen(false)}/><section className="dt-more-sheet"><div className="dt-sheet-handle"/><h2>เพิ่มเติม</h2>{(["split","bbq","settings"] as Page[]).map(p=><button key={p} onClick={()=>navigate(p)}><span>{icons[p]}</span>{labels[p]}<b>↗</b></button>)}</section></>}
    {quickOpen&&<><button className="dt-modal-backdrop" aria-label="ปิดหน้าต่างเพิ่มรายการ" onClick={()=>setQuickOpen(false)}/><section className="dt-quick-modal" role="dialog" aria-modal="true" aria-labelledby="dt-quick-title"><div className="dt-panel-head"><div><span className="dt-kicker">เพิ่มข้อมูลใหม่</span><h2 id="dt-quick-title">อยากบันทึกอะไรวันนี้?</h2></div><Button onClick={()=>setQuickOpen(false)}>ปิด</Button></div>{(["savings","health","notes","split","bbq"] as Page[]).map(p=><button className="dt-quick-option" key={p} onClick={()=>{setQuickOpen(false);beginNew(p)}}><span>{icons[p]}</span><div><strong>{p==="savings"?"เงินออม":p==="health"?"สุขภาพ":p==="notes"?"โน้ต / ไดอารี":p==="split"?"บิลหารตัง":"มื้อหมูกระทะ"}</strong><small>{p==="savings"?"ฝากออม ถอน หรือเพิ่มเป้าหมาย":p==="health"?"น้ำหนัก การนอน น้ำดื่ม หรืออาการ":p==="notes"?"เก็บความคิดหรือเขียนไดอารี":p==="split"?"แบ่งค่าใช้จ่ายกับเพื่อน":"ร้านและความทรงจำ"}</small></div><b>＋</b></button>)}</section></>}
    {confirmDelete&&<><button className="dt-modal-backdrop" aria-label="ปิดการยืนยันลบ" onClick={()=>setConfirmDelete(null)}/><section className="dt-confirm-modal" role="alertdialog" aria-modal="true"><h2>ยืนยันการลบรายการ?</h2><p>ข้อมูลที่ลบจะถูกนำออกจากพื้นที่ส่วนตัวนี้ การลบมื้ออาหารจะไม่ลบบิลที่เชื่อมอยู่</p><div className="dt-form-actions"><Button kind="danger" onClick={removeConfirmed}>ลบรายการ</Button><Button onClick={()=>setConfirmDelete(null)}>ยกเลิก</Button></div></section></>}
    {toast&&<div role="status" className="dt-toast">{toast}</div>}
  </div>
}
