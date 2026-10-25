import { useCallback, useEffect, useState, type FormEvent } from "react"
import "./simulator.css"
import { SIMULATOR_PORTALS, formatPortalCurrency, formatWorldClock, worldPhase, type SimulatorPortalId, type SimulatorPortalSnapshot } from "./simulator-world"

type Resident = { id: string; name: string; role: string; mood: string; activity?: string; x: number; y: number; color: string; bio: string }
type EventItem = { id: string; text: string; time: string }
type WorldState = { residents: Resident[]; events: EventItem[]; day: number; hour: number; memoriesCount: number; lastSimulatedAt?: string }
const API = window.location.hostname === "money102-command-center-preview.onrender.com" || window.location.hostname === "money102-staging.onrender.com" ? "https://money102-api-staging.s2mtha16.workers.dev" : "https://money102-api.s2mtha16.workers.dev"
const initialResidents: Resident[] = [
  { id: "mira", name: "Mira", role: "The Planner", mood: "กำลังวางแผน", x: 24, y: 28, color: "coral", bio: "ชอบวางแผนและจัดระเบียบสิ่งต่าง ๆ" },
  { id: "nori", name: "Nori", role: "The Observer", mood: "กำลังสังเกต", x: 53, y: 55, color: "mint", bio: "ช่างสังเกตและชอบจดจำเรื่องเล็ก ๆ" },
  { id: "kai", name: "Kai", role: "The Explorer", mood: "กำลังสำรวจ", x: 76, y: 30, color: "blue", bio: "อยากรู้อยากเห็นและชอบค้นพบสิ่งใหม่" },
]
const initialState: WorldState = { residents: initialResidents, events: [{ id: "welcome", text: "โลกจำลองพร้อมแล้ว — รอเชื่อมระบบความทรงจำ", time: "NOW" }], day: 1, hour: 9, memoriesCount: 0 }
function token() { try { return sessionStorage.getItem("money102_auth_token") || "" } catch { return "" } }
async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  const auth = token()
  if (auth) headers.set("Authorization", "Bearer " + auth)
  if (init?.body) headers.set("Content-Type", "application/json")
  const response = await fetch(API + path, { ...init, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "HTTP " + response.status)
  return body
}
export default function Simulator({ onExit, onNavigate, portal }: { onExit: () => void; onNavigate: (page: SimulatorPortalId) => void; portal: SimulatorPortalSnapshot }) {
  const [world, setWorld] = useState<WorldState>(initialState)
  const [status, setStatus] = useState<"loading" | "connected" | "offline">("loading")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState("mira")
  const [reply, setReply] = useState("")
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    try {
      const data = await request("/api/simulator/state")
      if (data && Array.isArray(data.residents) && Array.isArray(data.events)) {
        setWorld({ ...initialState, ...data })
        setStatus("connected")
        setError("")
      } else {
        setStatus("offline")
        setError("API สำหรับ Simulator ยังไม่ได้ติดตั้ง — โลกนี้ยังไม่บันทึกลง D1")
      }
    } catch {
      setStatus("offline")
      setError("ยังเชื่อมระบบความทรงจำไม่ได้ โลกที่เห็นเป็นเพียงตัวอย่าง และยังไม่มีการบันทึกลง D1")
    }
  }, [])
  useEffect(() => { void load() }, [load])
  async function act(action: string) {
    setBusy(true); setError("")
    try {
      const data = await request("/api/simulator/action", { method: "POST", body: JSON.stringify({ action, residentId: selected }) })
      if (data.state) setWorld({ ...initialState, ...data.state })
      else await load()
      setStatus("connected")
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกการกระทำไม่สำเร็จ")
    } finally { setBusy(false) }
  }
  async function talk(event: FormEvent) {
    event.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true); setError("")
    try {
      const data = await request("/api/simulator/turn", { method: "POST", body: JSON.stringify({ residentId: selected, message: message.trim() }) })
      if (data.state) setWorld({ ...initialState, ...data.state })
      if (typeof data.reply === "string") setReply(data.reply)
      setMessage("")
      setStatus("connected")
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งข้อความถึง Gemini ไม่สำเร็จ")
    } finally { setBusy(false) }
  }
  const resident = world.residents.find(item => item.id === selected) || world.residents[0]
  const clock = formatWorldClock(world.hour)
  return <main className="simulator-page">
    <header className="sim-topline"><button className="sim-back" onClick={onExit}>← กลับ Money102</button><div className="sim-wordmark"><span>✳</span> TINY / WORLD</div><div className={"sim-status " + status}><i />{status === "connected" ? "D1 MEMORY CONNECTED" : status === "loading" ? "CONNECTING…" : "PREVIEW MODE"}</div></header>
    <section className="sim-intro"><div><span className="sim-eyebrow">A WORLD THAT LIVES ON</span><h1>ชีวิตเล็ก ๆ <em>ในโลกของเรา</em></h1><p>ตัวละคร AI ที่มีบุคลิก ความคิด และความทรงจำของตัวเอง</p></div><div className="sim-clock"><small>DAY {world.day}</small><strong>{clock}</strong><span>{worldPhase(world.hour)}</span><span className="sim-offline-hint">โลกเดินต่อเมื่อคุณไม่อยู่</span></div></section>
    {error && <div className="sim-notice" role="status"><span>ⓘ</span><p>{error}</p></div>}
    <div className="sim-layout">
      <section className="sim-world-panel">
        <div className="sim-panel-heading"><div><span className="sim-eyebrow">THE NEIGHBORHOOD</span><h2>Little Pixel Town</h2></div><span className="sim-resident-count">● {world.residents.length} residents</span></div>
        <div className="sim-map" aria-label="แผนที่โลกจำลอง Pixel Art">
          <div className="sim-cloud cloud-one" /><div className="sim-cloud cloud-two" />
          <div className="sim-path path-one" /><div className="sim-path path-two" />
          <button type="button" className="sim-building sim-cafe" onClick={() => onNavigate("money")} aria-label="เปิดบ้านการเงิน"><span>FINANCE</span><b>฿</b></button><button type="button" className="sim-building sim-home" onClick={() => onNavigate("notes")} aria-label="เปิดคาเฟ่บันทึก"><span>NOTES</span><b>▤</b></button><button type="button" className="sim-building sim-library" onClick={() => onNavigate("health")} aria-label="เปิดสวนสุขภาพ"><span>HEALTH</span><b>♡</b></button><button type="button" className="sim-building sim-market" onClick={() => onNavigate("split")} aria-label="เปิดตลาดหารบิล"><span>SPLIT</span><b>÷</b></button><button type="button" className="sim-building sim-bbq" onClick={() => onNavigate("pork")} aria-label="เปิดลานหมูกระทะ"><span>BBQ</span><b>♨</b></button>
          <div className="sim-pond"><i /><i /></div><div className="sim-tree tree-one">✦</div><div className="sim-tree tree-two">✦</div><div className="sim-tree tree-three">✦</div><div className="sim-flower flower-one">✿</div><div className="sim-flower flower-two">✿</div>
          {world.residents.map((person, index) => <button key={person.id} className={"sim-person " + person.color + (selected === person.id ? " selected" : "")} style={{ left: person.x + "%", top: person.y + "%" }} onClick={() => setSelected(person.id)} aria-label={"เลือก " + person.name}><span className="sim-sprite"><i /><b /><em /></span><small>{person.name}</small><span className="sim-mood">{index === 0 ? "✦" : index === 1 ? "♡" : "!"}</span></button>)}
          <div className="sim-map-label">PIXEL WORLD · LIVE MAP</div>
        </div>
        <div className="sim-world-actions"><button disabled={busy} onClick={() => void act("wander")}>↗ สำรวจเมือง</button><button disabled={busy} onClick={() => void act("socialize")}>♡ พบปะกัน</button><button disabled={busy} onClick={() => void act("advance_time")}>◷ เดินเวลา</button></div>
      </section>
      <aside className="sim-side">
        <section className="sim-card sim-character-card"><div className="sim-card-head"><span className="sim-eyebrow">CHARACTER FILE</span><span className="sim-online"><i /> {status === "connected" ? "LIVE" : "DEMO"}</span></div><div className={"sim-avatar " + (resident?.color || "mint")}><span className="sim-avatar-hair" /><span className="sim-avatar-face">•ᴗ•</span></div><h2>{resident?.name || "Resident"}</h2><p className="sim-role">{resident?.role || "Resident"}</p><p className="sim-bio">{resident?.bio || "ตัวละครในโลกจำลอง"}</p><p className="sim-activity">● {resident?.activity || resident?.mood || "กำลังใช้ชีวิตในหมู่บ้าน"}</p><div className="sim-traits"><span>CURIOUS</span><span>MEMORY</span><span>PERSONALITY</span></div><div className="sim-memory-count"><span>ความทรงจำที่บันทึก</span><strong>{world.memoriesCount}</strong></div></section>
        <section className="sim-card sim-events"><div className="sim-card-head"><div><span className="sim-eyebrow">HAPPENING NOW</span><h3>เรื่องราวในเมือง</h3></div><span className="sim-live-dot" /></div>{world.events.slice(0,5).map(item => <div className="sim-event" key={item.id}><span className="sim-event-dot" /><div><p>{item.text}</p><small>{item.time}</small></div></div>)}</section>
        <section className="sim-card sim-chat"><div className="sim-card-head"><div><span className="sim-eyebrow">TALK TO YOUR WORLD</span><h3>คุยกับ {resident?.name || "ตัวละคร"}</h3></div><span>✧</span></div>{reply && <div className="sim-reply"><strong>{resident?.name}</strong><p>{reply}</p></div>}<form onSubmit={talk}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="ชวนคุยเรื่องอะไรดี…" maxLength={500} /><button disabled={busy || !message.trim()} aria-label="ส่งข้อความ">↑</button></form><small className="sim-chat-foot">Gemini AI · ความทรงจำส่วนตัวของบัญชีคุณ</small></section>
      </aside>
      <section className="sim-portal-zone">
          <div className="sim-portal-heading"><div><span className="sim-eyebrow">YOUR REAL LIFE, IN THIS WORLD</span><h3>ประตูสู่ระบบ Money102</h3></div><span className="sim-portal-live">ข้อมูลจากบัญชีของคุณ</span></div>
          <div className="sim-portal-grid">
            {SIMULATOR_PORTALS.map(item => <button type="button" key={item.id} className={"sim-portal-tile tone-" + item.tone} onClick={() => onNavigate(item.id)}>
              <span className="sim-portal-symbol">{item.symbol}</span><span className="sim-portal-copy"><strong>{item.name}</strong><small>{item.description}</small></span><span className="sim-portal-arrow">↗</span>
            </button>)}
          </div>
          <div className="sim-live-data">
            <div><small>ยอดสุทธิ</small><strong>{formatPortalCurrency(portal.balance)}</strong><span>รับ {formatPortalCurrency(portal.income)} · จ่าย {formatPortalCurrency(portal.expense)}</span></div>
            <div><small>รายการเงิน</small><strong>{portal.transactionCount}</strong><span>รายการที่บันทึกไว้</span></div>
            <div><small>โน้ตส่วนตัว</small><strong>{portal.notesCount}</strong><span>บันทึกที่เก็บไว้</span></div>
            <div><small>สุขภาพล่าสุด</small><strong>{portal.latestWeight == null ? "—" : portal.latestWeight + " กก."}</strong><span>{portal.healthRecordCount} รายการสุขภาพ</span></div>
            <div><small>เป้าหมายออมเงิน</small><strong>{formatPortalCurrency(portal.savingsGoal)}</strong><span>เป้าหมายที่ตั้งไว้</span></div>
          </div>
        </section>
    </div>
    <footer className="sim-footer"><span>✳ โลกจำลองส่วนตัว</span><span>ยังไม่เปิดเผยข้อมูลให้ผู้ใช้อื่น · {status === "connected" ? "บันทึกผ่าน D1" : "ข้อมูลตัวอย่างไม่ถูกบันทึก"}</span></footer>
  </main>
}
