import { useCallback, useEffect, useState } from "react"
import "./simulator.css"
import PixelCity from "./PixelCity"
import { SIMULATOR_PORTALS, formatPortalCurrency, formatWorldClock, worldPhase, type SimulatorPortalId, type SimulatorPortalSnapshot } from "./simulator-world"

type Resident = { id: string; name: string; role: string; mood: string; activity?: string; x: number; y: number; color: string; bio: string; money?: number; health?: number; needs?: Record<string, number>; moodScore?: number; skills?: Record<string, { xp: number; level: number }> }
type EventItem = { id: string; text: string; time: string }
type WorldState = { residents: Resident[]; events: EventItem[]; day: number; hour: number; minute?: number; memoriesCount: number; last_simulated_at?: number; lastSimulatedAt?: string }
// Unknown hosts (including Vercel preview deployments and localhost) must use staging.
const PRODUCTION_HOSTS = new Set(["money102.onrender.com", "money102-web.onrender.com", "money102-new-live.onrender.com"])
const API = PRODUCTION_HOSTS.has(window.location.hostname.toLowerCase()) ? "https://money102-api.s2mtha16.workers.dev" : "https://money102-api-staging.s2mtha16.workers.dev"
const initialResidents: Resident[] = [
  { id: "ploy", name: "พลอย", role: "พนักงานบัญชี · 27 ปี", mood: "เตรียมตัวไปทำงาน", activity: "เตรียมอาหารเช้า", x: 24, y: 28, color: "coral", bio: "พนักงานบัญชีที่เช่าห้องใกล้ตลาด ชอบวางแผนค่าใช้จ่ายและโทรหาแม่หลังเลิกงาน" },
  { id: "non", name: "นนท์", role: "ไรเดอร์ส่งอาหาร · 30 ปี", mood: "พักก่อนเริ่มกะ", activity: "เช็กงานส่งอาหาร", x: 53, y: 55, color: "mint", bio: "ไรเดอร์ที่ทำงานตามช่วงเวลาคนสั่งเยอะและแบ่งเงินส่งกลับบ้านต่างจังหวัด" },
  { id: "fah", name: "ฟ้า", role: "นักศึกษามหาวิทยาลัย · 22 ปี", mood: "กำลังอ่านหนังสือ", activity: "ทบทวนบทเรียน", x: 76, y: 30, color: "blue", bio: "นักศึกษาที่อยู่หอพัก ทำงานพิเศษบางวัน และต้องจัดสมดุลระหว่างเรียนกับค่าใช้จ่าย" },
  { id: "somchai", name: "ลุงสมชาย", role: "เจ้าของร้านข้าวแกง · 58 ปี", mood: "เปิดร้านแต่เช้า", activity: "เตรียมอาหาร", x: 37, y: 75, color: "coral", bio: "เจ้าของร้านข้าวแกงที่รู้จักคนในชุมชนและชอบรดน้ำต้นไม้ช่วงเย็น" },
  { id: "may", name: "เมย์", role: "พยาบาลเวรสลับ · 34 ปี", mood: "พักฟื้นหลังเวร", activity: "พักผ่อน", x: 67, y: 72, color: "mint", bio: "พยาบาลที่ต้องจัดการเวลานอนตามกะงานและใช้วันหยุดเดินเล่นในสวน" },
  { id: "jay", name: "เจ", role: "ช่างซ่อมมือถือ · 25 ปี", mood: "กำลังเปิดร้าน", activity: "จัดอุปกรณ์ช่าง", x: 45, y: 20, color: "blue", bio: "ช่างซ่อมมือถือที่ทำงานในร้านเล็ก ๆ และเล่นเกมกับเพื่อนหลังปิดร้าน" },
]
const initialState: WorldState = { residents: initialResidents, events: [{ id: "welcome", text: "เริ่มชีวิตใหม่ในชุมชนไทย — ตัวละครชุดใหม่พร้อมแล้ว", time: "07:00" }], day: 1, hour: 7, memoriesCount: 1 }
const activityNames: Record<string, string> = { wake: "ตื่นนอน", sleep: "นอนหลับ", eat: "กินข้าว", bathe: "อาบน้ำ", work: "ทำงาน", commute: "เดินทาง", shop: "ซื้อของ", cook: "ทำอาหาร", clean: "ทำความสะอาด", socialize: "พบปะพูดคุย", relax: "พักผ่อน", exercise: "ออกกำลังกาย", study: "เรียน/อ่านหนังสือ", use_phone: "ใช้โทรศัพท์", use_toilet: "เข้าห้องน้ำ", travel: "เดินทาง", idle: "พักระหว่างกิจกรรม" }
function token() { try { return sessionStorage.getItem("money102_auth_token") || "" } catch { return "" } }
function presentWorld(data: any): WorldState {
  const residents = Array.isArray(data?.residents)
    ? data.residents.map((person: Resident & { activityLabel?: string }) => ({
        ...person,
        activity: person.activityLabel || activityNames[person.activity || ""] || person.activity,
        mood: typeof person.mood === "string" ? person.mood : "กำลังใช้ชีวิต",
      }))
    : initialResidents
  return { ...initialState, ...data, residents }
}
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
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState("ploy")
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    try {
      const data = await request("/api/simulator/state")
      if (data && Array.isArray(data.residents) && Array.isArray(data.events)) {
        setWorld(presentWorld(data))
        setStatus("connected")
        setError("")
      } else {
        setStatus("offline")
        setError("API ของโลกจำลองตอบกลับไม่ครบ — โลกนี้ยังไม่ยืนยันว่าบันทึกลง D1 แล้ว")
      }
    } catch {
      setStatus("offline")
      setError("เชื่อม API ของโลกจำลองไม่ได้ โลกที่เห็นเป็นเพียงตัวอย่าง และยังไม่มีการบันทึกลง D1")
    }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => { void load() }, 30000)
    return () => window.clearInterval(timer)
  }, [load])
  async function act(action: string, target?: { x: number; y: number }) {
    if (busy) return
    setBusy(true); setError("")
    try {
      const data = await request("/api/simulator/action", { method: "POST", body: JSON.stringify({ action, residentId: selected, ...(target ? { target } : {}) }) })
      if (data.state) {
        setWorld(presentWorld(data.state))
        setStatus("connected")
      } else {
        // Keep the status reported by load(); never claim persistence succeeded if refresh failed.
        await load()
      }
    } catch (err) {
      setStatus("offline")
      setError(err instanceof Error ? err.message : "บันทึกการกระทำไม่สำเร็จ")
    } finally { setBusy(false) }
  }
  const resident = world.residents.find(item => item.id === selected) || world.residents[0]
  const clock = formatWorldClock(world.hour, world.minute == null ? 0 : world.minute % 60)
  return <main className="simulator-page">
    <header className="sim-topline"><button className="sim-back" onClick={onExit}>← กลับ Money102</button><div className="sim-wordmark"><span>✳</span> TINY / WORLD</div><div className={"sim-status " + status}><i />{status === "connected" ? "D1 MEMORY CONNECTED" : status === "loading" ? "CONNECTING…" : "PREVIEW MODE"}</div></header>
    <section className="sim-intro"><div><span className="sim-eyebrow">A WORLD THAT LIVES ON</span><h1>ชีวิตเล็ก ๆ <em>ในโลกของเรา</em></h1><p>ชีวิตประจำวันของคนไทย จำลองด้วยกฎ เวลา และการตัดสินใจของตัวละคร</p></div><div className="sim-clock"><small>DAY {world.day}</small><strong>{clock}</strong><span>{worldPhase(world.hour)}</span><span className="sim-offline-hint">โลกเดินต่อเมื่อคุณไม่อยู่</span></div></section>
    {error && <div className="sim-notice" role="status"><span>ⓘ</span><p>{error}</p></div>}
    <div className="sim-layout">
      <section className="sim-world-panel">
        <div className="sim-panel-heading"><div><span className="sim-eyebrow">THE NEIGHBORHOOD</span><h2>Little Pixel Town</h2></div><span className="sim-resident-count">● {world.residents.length} residents</span></div>
        <PixelCity residents={world.residents} selectedId={selected} onSelect={setSelected} onAction={(action, target) => void act(action, target)} hour={world.hour} />
        <div className="sim-world-actions"><button disabled={busy} onClick={() => void act("wander")}>↗ สำรวจเมือง</button><button disabled={busy} onClick={() => void act("socialize")}>♡ พบปะกัน</button><button disabled={busy} onClick={() => void act("advance_time")}>◷ เดินเวลา</button></div>
      </section>
      <aside className="sim-side">
        <section className="sim-card sim-character-card"><div className="sim-card-head"><span className="sim-eyebrow">CHARACTER FILE</span><span className="sim-online"><i /> {status === "connected" ? "LIVE" : "DEMO"}</span></div><div className={"sim-avatar " + (resident?.color || "mint")}><span className="sim-avatar-hair" /><span className="sim-avatar-face">•ᴗ•</span></div><h2>{resident?.name || "Resident"}</h2><p className="sim-role">{resident?.role || "Resident"}</p><p className="sim-bio">{resident?.bio || "ตัวละครในโลกจำลอง"}</p><p className="sim-activity">● {resident?.activity || resident?.mood || "กำลังใช้ชีวิตในหมู่บ้าน"}</p><div className="sim-wallet"><span>เงินติดตัวในเกม</span><strong>฿{Number(resident?.money || 0).toLocaleString("th-TH")}</strong><small>เงินจำลองแยกจากบัญชีเงินจริงของ Money102</small></div><div className="sim-needs"><div className="sim-needs-title"><strong>สภาพชีวิตตอนนี้</strong><span>{resident?.mood || "กำลังใช้ชีวิต"}</span></div>{([["hunger","อิ่มท้อง"],["energy","พลังงาน"],["health","สุขภาพกาย"],["hygiene","สุขอนามัย"],["social","ความสัมพันธ์"],["fun","ความสนุก"],["bladder","ความสบายตัว"]] as [string,string][]).map(([key,label])=>{const fallback=key==="health"?(resident?.health??80):65;const value=Math.max(0,Math.min(100,Number(resident?.needs?.[key] ?? fallback)));return <div className="sim-need" key={key}><span>{label}</span><div className="sim-need-track"><i style={{width:value+"%"}} /></div><small>{Math.round(value)}%</small></div>})}</div><div className="sim-skills"><div className="sim-skills-head"><strong>ทักษะชีวิต</strong><span>พัฒนาจากการลงมือทำ</span></div>{([[ "career","อาชีพ" ],[ "learning","การเรียนรู้" ],[ "cooking","ทำอาหาร" ],[ "social","เข้าสังคม" ],[ "fitness","สุขภาพกาย" ]] as [string,string][]).map(([key,label])=>{const skill=resident?.skills?.[key]??{xp:0,level:1};const progress=Math.max(0,Math.min(100,skill.xp%100));return <div className="sim-skill" key={key}><span>{label}</span><div className="sim-skill-track"><i style={{width:progress+"%"}} /></div><small>Lv.{skill.level}</small></div>})}</div><div className="sim-memory-count"><span>เหตุการณ์ในบันทึก</span><strong>{world.events.length}</strong></div></section>
        <section className="sim-card sim-events"><div className="sim-card-head"><div><span className="sim-eyebrow">HAPPENING NOW</span><h3>เรื่องราวในเมือง</h3></div><span className="sim-live-dot" /></div>{world.events.slice(0,5).map(item => <div className="sim-event" key={item.id}><span className="sim-event-dot" /><div><p>{item.text}</p><small>{item.time}</small></div></div>)}</section>
        <section className="sim-card sim-chat"><div className="sim-card-head"><div><span className="sim-eyebrow">PLAYER ORDERS</span><h3>สั่งกิจกรรมให้{resident?.name || "ตัวละคร"}</h3></div><span>⌘</span></div><p className="sim-command-intro">เลือกกิจกรรม ตัวละครจะทำตามคำสั่งผ่านระบบกฎของเกม ไม่มี AI สนทนา</p><div className="sim-command-grid">{[["sleep","นอนพัก"],["eat","กินข้าว"],["bathe","อาบน้ำ"],["use_toilet","เข้าห้องน้ำ"],["work","ไปทำงาน"],["study","เรียน/อ่านหนังสือ"],["socialize","พบปะคน"],["shop","ซื้อของ"],["cook","ทำอาหาร"],["clean","ทำความสะอาด"],["exercise","ออกกำลังกาย"],["relax","พักผ่อน"],["use_phone","ใช้โทรศัพท์"]].map(([action,label])=><button key={action} type="button" disabled={busy} onClick={()=>void act(action)}>{label}</button>)}</div><small className="sim-chat-foot">กฎจำลองชีวิต · กิจวัตรแบบไทย · ไม่ใช้ AI API</small></section>
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
