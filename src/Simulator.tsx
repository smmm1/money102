import { useCallback, useEffect, useState, type FormEvent } from "react"
import "./simulator.css"

type Resident = { id: string; name: string; role: string; mood: string; x: number; y: number; color: string; bio: string; background?: string; personality?: string; goal?: string }
type EventItem = { id: string; text: string; time: string }
type WorldState = { residents: Resident[]; events: EventItem[]; day: number; hour: number; memoriesCount: number }
const API = window.location.hostname === "money102-command-center-preview.onrender.com" || window.location.hostname === "money102-staging.onrender.com" ? "https://money102-api-staging.s2mtha16.workers.dev" : "https://money102-api.s2mtha16.workers.dev"
const initialResidents: Resident[] = [
  { id: "mira", name: "Mira", role: "คนทำสวนประจำหมู่บ้าน", mood: "กำลังดูแปลงผัก", x: 28, y: 53, color: "coral", bio: "เติบโตมากับสวนผักของยาย ตื่นเช้ามารดน้ำทุกวัน และเก็บสมุดบันทึกสูตรอาหารพื้นบ้านไว้เล่มหนึ่ง", background: "Mira เติบโตในบ้านไม้ท้ายหมู่บ้านกับยายที่สอนให้เธอรู้จักพืชผักตามฤดูกาล หลังยายจากไป เธอดูแลสวนต่อและเก็บสมุดสูตรอาหารที่มีบันทึกเรื่องเล่าของคนในหมู่บ้าน", personality: "อบอุ่น ใส่ใจรายละเอียด ขยัน และค่อนข้างดื้อเมื่อเชื่อว่าสิ่งนั้นควรค่าแก่การรักษา", goal: "ฟื้นฟูสวนของครอบครัวและตามหาที่มาของบันทึกเก่าในสมุดยาย" },
  { id: "nori", name: "Nori", role: "คนดูแลร้านน้ำชา", mood: "กำลังชงชา", x: 52, y: 36, color: "mint", bio: "เปิดร้านน้ำชาเล็ก ๆ ริมลำธาร ชอบฟังเรื่องของคนในหมู่บ้าน และจำได้ว่าใครชอบชาแบบไหน", background: "Nori กลับมาเปิดร้านน้ำชาริมลำธารในอาคารที่ครอบครัวดูแลมาหลายรุ่น ร้านเป็นที่พักของชาวบ้านและเป็นจุดที่ข่าวสาร เรื่องเล่า และความทรงจำเดินทางมาถึงกัน", personality: "ช่างสังเกต สุภาพ มีอารมณ์ขันแห้ง ๆ และไม่รีบตัดสินคนอื่น", goal: "รักษาร้านน้ำชาให้เป็นพื้นที่ปลอดภัยของหมู่บ้าน และรวบรวมเรื่องเล่าที่กำลังเลือนหาย" },
  { id: "kai", name: "Kai", role: "ช่างไม้และช่างซ่อม", mood: "กำลังซ่อมรั้ว", x: 75, y: 59, color: "blue", bio: "ช่างไม้หนุ่มที่กลับมาอยู่บ้านเกิด เขากำลังซ่อมกังหันเก่าบนเนินเขา ซึ่งปู่ของเขาทิ้งปริศนาไว้ให้", background: "Kai เคยออกไปฝึกงานในเมืองก่อนกลับบ้านหลังได้รับกล่องเครื่องมือของปู่ ในนั้นมีแบบร่างกังหันเก่ากับโน้ตที่ขาดหาย เขาจึงค่อย ๆ ซ่อมโรงช่างและค้นหาความหมายของมัน", personality: "เงียบ สุขุม ชอบลงมือทำมากกว่าพูด และช่วยคนอื่นโดยไม่ค่อยบอกเหตุผล", goal: "ซ่อมกังหันบนเนินเขาให้กลับมาทำงานและไขปริศนาที่ปู่ทิ้งไว้" },
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
export default function Simulator({ onExit }: { onExit: () => void }) {
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
  const clock = String(world.hour).padStart(2, "0") + ":00"
  return <main className="simulator-page">
    <header className="sim-topline"><button className="sim-back" onClick={onExit}>← กลับ Money102</button><div className="sim-wordmark"><span>✳</span> TINY / WORLD</div><div className={"sim-status " + status}><i />{status === "connected" ? "D1 MEMORY CONNECTED" : status === "loading" ? "CONNECTING…" : "PREVIEW MODE"}</div></header>
    <section className="sim-intro"><div><span className="sim-eyebrow">A WORLD THAT LIVES ON</span><h1>ชีวิตเล็ก ๆ <em>ในโลกของเรา</em></h1><p>ตัวละคร AI ที่มีบุคลิก ความคิด และความทรงจำของตัวเอง</p></div><div className="sim-clock"><small>DAY {world.day}</small><strong>{clock}</strong><span>SIMULATION TIME</span></div></section>
    {error && <div className="sim-notice" role="status"><span>ⓘ</span><p>{error}</p></div>}
    <div className="sim-layout">
      <section className="sim-world-panel">
        <div className="sim-panel-heading"><div><span className="sim-eyebrow">THE NEIGHBORHOOD</span><h2>หมู่บ้านปลายทุ่ง</h2></div><span className="sim-resident-count">● {world.residents.length} residents</span></div>
        <div className="sim-map" aria-label="แผนที่โลกจำลอง Pixel Art">
          <div className="sim-cloud cloud-one" /><div className="sim-cloud cloud-two" /><div className="sim-mountain" />
          <div className="sim-river"><i /><i /><i /></div><div className="sim-path path-one" /><div className="sim-path path-two" /><div className="sim-path path-three" />
          <div className="sim-building sim-cafe"><span>ร้านน้ำชา</span><b>▦</b></div><div className="sim-building sim-home"><span>บ้านไม้</span><b>▤</b></div><div className="sim-building sim-library"><span>โรงช่าง</span><b>⚒</b></div><div className="sim-building sim-market"><span>ตลาดเช้า</span><b>▧</b></div><div className="sim-building sim-mill"><span>กังหันเก่า</span><b>✣</b></div>
          <div className="sim-crops"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="sim-fence fence-one" /><div className="sim-fence fence-two" /><div className="sim-pond"><i /><i /></div>
          <div className="sim-tree tree-one">✦</div><div className="sim-tree tree-two">✦</div><div className="sim-tree tree-three">✦</div><div className="sim-tree tree-four">✦</div><div className="sim-tree tree-five">✦</div><div className="sim-flower flower-one">✿</div><div className="sim-flower flower-two">✿</div><div className="sim-flower flower-three">✿</div>
          {world.residents.map((person, index) => <button key={person.id} className={"sim-person " + person.id + " " + person.color + (selected === person.id ? " selected" : "")} style={{ left: person.x + "%", top: person.y + "%" }} onClick={() => setSelected(person.id)} aria-label={"เลือก " + person.name}><span className="sim-sprite"><i /><b /><em /></span><small>{person.name}</small><span className="sim-mood">{index === 0 ? "✦" : index === 1 ? "♡" : "!"}</span></button>)}
          <div className="sim-map-label">ปลายทุ่ง · หมู่บ้านชนบท</div>
        </div>
        <div className="sim-world-actions"><button disabled={busy} onClick={() => void act("wander")}>↗ สำรวจเมือง</button><button disabled={busy} onClick={() => void act("socialize")}>♡ พบปะกัน</button><button disabled={busy} onClick={() => void act("advance_time")}>◷ เดินเวลา</button></div>
      </section>
      <aside className="sim-side">
        <section className="sim-card sim-character-card"><div className="sim-card-head"><span className="sim-eyebrow">CHARACTER FILE</span><span className="sim-online"><i /> {status === "connected" ? "LIVE" : "DEMO"}</span></div><div className={"sim-avatar " + (resident?.color || "mint")}><span className="sim-avatar-hair" /><span className="sim-avatar-face">•ᴗ•</span></div><h2>{resident?.name || "Resident"}</h2><p className="sim-role">{resident?.role || "Resident"}</p><p className="sim-bio">{resident?.bio || "ตัวละครในโลกจำลอง"}</p><div className="sim-profile-details"><div><small>ภูมิหลัง</small><p>{resident?.background || resident?.bio || "ยังไม่มีข้อมูล"}</p></div><div><small>บุคลิก</small><p>{resident?.personality || "กำลังเรียนรู้ตัวเอง"}</p></div><div><small>เป้าหมาย</small><p>{resident?.goal || "ใช้ชีวิตในหมู่บ้านและค้นหาสิ่งใหม่"}</p></div></div><div className="sim-traits"><span>CURIOUS</span><span>MEMORY</span><span>PERSONALITY</span></div><div className="sim-memory-count"><span>ความทรงจำที่บันทึก</span><strong>{world.memoriesCount}</strong></div></section>
        <section className="sim-card sim-events"><div className="sim-card-head"><div><span className="sim-eyebrow">HAPPENING NOW</span><h3>เรื่องราวในเมือง</h3></div><span className="sim-live-dot" /></div>{world.events.slice(0,5).map(item => <div className="sim-event" key={item.id}><span className="sim-event-dot" /><div><p>{item.text}</p><small>{item.time}</small></div></div>)}</section>
        <section className="sim-card sim-chat"><div className="sim-card-head"><div><span className="sim-eyebrow">TALK TO YOUR WORLD</span><h3>คุยกับ {resident?.name || "ตัวละคร"}</h3></div><span>✧</span></div>{reply && <div className="sim-reply"><strong>{resident?.name}</strong><p>{reply}</p></div>}<form onSubmit={talk}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="ชวนคุยเรื่องอะไรดี…" maxLength={500} /><button disabled={busy || !message.trim()} aria-label="ส่งข้อความ">↑</button></form><small className="sim-chat-foot">Gemini AI · ความทรงจำส่วนตัวของบัญชีคุณ</small></section>
      </aside>
    </div>
    <footer className="sim-footer"><span>✳ โลกจำลองส่วนตัว</span><span>ยังไม่เปิดเผยข้อมูลให้ผู้ใช้อื่น · {status === "connected" ? "บันทึกผ่าน D1" : "ข้อมูลตัวอย่างไม่ถูกบันทึก"}</span></footer>
  </main>
}
