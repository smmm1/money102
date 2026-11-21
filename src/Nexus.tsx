import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import "./nexus.css"

type User = { id: string; email: string }
type Turn = { id: string; role: "player" | "narrator"; content: string; metadata?: { speaker?: string; scene?: string; memory?: string }; created_at: string }
type World = { id: string; title: string; setting_json: string; state_json: string; image_settings_json: string; updated_at: string }
const API = ((import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) || "https://money102-api.s2mtha16.workers.dev").replace(/\/$/, "")
const TOKEN_KEY = "money102_auth_token"
const SETTING = {
  universe: "โลกฮันเตอร์แฟนโรลเพลย์แนว Solo Leveling",
  era: "ยุคปัจจุบันในโลกที่มีเกต ดันเจียน มอนสเตอร์ และสมาคมฮันเตอร์",
  rules: ["มีแรงก์ E, D, C, B, A, S", "Raid มีความเสี่ยงและผลลัพธ์จริง", "เศรษฐกิจ อุปกรณ์ ค่าตอบแทน และชื่อเสียงมีผล", "NPC มีเป้าหมายและตัดสินใจเอง", "ผู้เล่นพิมพ์การกระทำได้อิสระ ห้ามบังคับตัวเลือก"],
  player: { name: "มาร์ค", role: "สมาชิกกิลด์ Blue Dragon", publicRank: "F (ผลตรวจวัดผิดปกติ)", truePower: "ไม่ทราบ", ability: "สามารถเพิ่มศักยภาพของสมาชิกคนอื่นได้ แต่ขอบเขตยังไม่เปิดเผย", agreement: "สมาชิกธรรมดา ไม่รับเงินเดือนหรือส่วนแบ่งรายได้ สัญญา 1 ปี" },
  guild: { name: "Blue Dragon Guild", membersBeforePlayer: 17, totalMembers: 18, condition: "กิลด์ขนาดเล็ก ขาดแคลนเงินทุนและอุปกรณ์" },
  characters: [
    { name: "Kim Taegwon", role: "หัวหน้ากิลด์", rank: "C" },
    { name: "Kang Seongcheol", role: "รองหัวหน้ากิลด์", rank: "C" },
    { name: "Hyejin", role: "เมจ", rank: "D" },
    { name: "Mujin", role: "แทงก์", rank: "C" },
    { name: "Yura", role: "ธนู", rank: "D" },
    { name: "Hyeonwoo", role: "ฮีล", rank: "D" },
    { name: "Jintae", role: "แอสซาซิน", rank: "D" }
  ],
  continuity: "มาร์คปฏิเสธเงินเดือนและส่วนแบ่งกิลด์ ขอเป็นสมาชิกธรรมดาเพื่อเติบโตไปพร้อมกัน ล่าสุดกำลังดูหน้าจอภารกิจ Raid แบบเรียลไทม์จากสมาคมฮันเตอร์ และชี้เลือกภารกิจแรงก์ B โดยบอกว่าสมาชิกน่าจะไหว จุดเริ่มเล่นต่อคือก่อนยืนยันรับภารกิจ"
}
const START_STATE = { location: "ศูนย์บัญชาการสมาคมฮันเตอร์", time: "17:42", currentObjective: "พิจารณาภารกิจ Raid ระดับ B", guildFunds: "ยังไม่ระบุ", inventory: [], relationships: {}, timeline: ["มาร์คเข้าร่วม Blue Dragon Guild ในฐานะสมาชิกธรรมดา", "มาร์คปฏิเสธเงินเดือนและส่วนแบ่งรายได้", "มาร์คเลือกดูภารกิจ Raid ระดับ B เพื่อหาเงินอัปเกรดอุปกรณ์ให้กิลด์"] }
async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const token = window.sessionStorage.getItem(TOKEN_KEY) || ""
  if (token) headers.set("Authorization", "Bearer " + token)
  if (init.body) headers.set("Content-Type", "application/json")
  const response = await fetch(API + path, { ...init, headers, cache: "no-store" })
  const body = await response.json().catch(() => ({})) as Record<string, any>
  if (!response.ok) {
    const error = new Error(body.error || "Request failed (" + response.status + ")")
    Object.assign(error, { status: response.status, code: body.code })
    throw error
  }
  return body
}
function newId() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) }
function timeLabel(value: string) { return new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) }

export default function Nexus({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [worlds, setWorlds] = useState<World[]>([])
  const [world, setWorld] = useState<World | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [images, setImages] = useState({ enabled: false, auto: false })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const transcript = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  const loadWorld = useCallback(async (selected?: string) => {
    setLoading(true); setError("")
    try {
      const result = await api("/api/story/worlds")
      let list = (result.worlds || []) as World[]
      if (!list.length) {
        const created = await api("/api/story/worlds", { method: "POST", body: JSON.stringify({ title: "Blue Dragon Guild — การเติบโตของกิลด์มังกรคราม", setting: SETTING, state: START_STATE, imageSettings: { enabled: false, auto: false } }) })
        list = [created.world]
      }
      setWorlds(list)
      const chosen = list.find(item => item.id === (selected || (world && world.id))) || list[0]
      const detail = await api("/api/story/worlds/" + chosen.id)
      setWorld(detail.world)
      const imageSettings = JSON.parse(detail.world.image_settings_json || '{"enabled":false,"auto":false}')
      setImages({ enabled: Boolean(imageSettings.enabled), auto: Boolean(imageSettings.auto) })
      const history = await api("/api/story/worlds/" + chosen.id + "/turns?limit=80")
      setTurns((history.turns || []).map((turn: any) => ({ ...turn, metadata: JSON.parse(turn.metadata_json || "{}") })))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [world && world.id])

  useEffect(() => { void loadWorld() }, [])
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight }, [turns, sending])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const message = draft.trim()
    if (!message || sending || !world) return
    setDraft(""); setSending(true); setError("")
    try {
      const result = await api("/api/story/worlds/" + world.id + "/turns", { method: "POST", body: JSON.stringify({ message }) })
      const playerTurn: Turn = { id: newId(), role: "player", content: message, created_at: new Date().toISOString() }
      setTurns(previous => [...previous, playerTurn, result.turn])
      setWorlds(previous => previous.map(item => item.id === world.id ? { ...item, updated_at: new Date().toISOString() } : item))
    } catch (e) { setDraft(message); setError(e instanceof Error ? e.message : String(e)) }
    finally { setSending(false); textarea.current?.focus() }
  }
  async function saveImages(next: { enabled: boolean; auto: boolean }) {
    if (!world) return
    setImages(next)
    try { await api("/api/story/worlds/" + world.id, { method: "PUT", body: JSON.stringify({ imageSettings: next }) }) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  const latestScene = [...turns].reverse().find(turn => turn.role === "narrator" && turn.metadata?.scene)?.metadata?.scene
  const characters = SETTING.characters
  return <main className="nexus-shell">
    <header className="nexus-topbar">
      <button className="nexus-brand" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="เปิดเมนู"><span className="nexus-mark">N</span><span><b>NEXUS</b><small>AI STORY WORLD</small></span></button>
      <div className="nexus-world-label"><span className="live-dot" />{world?.title || "กำลังโหลดโลก..."}</div>
      <div className="nexus-top-actions"><button className="icon-button" onClick={() => setSettingsOpen(true)} title="ตั้งค่าโลก">⚙</button><button className="signout-button" onClick={onSignOut}>ออกจากระบบ</button></div>
    </header>
    <div className="nexus-layout">
      <aside className={"nexus-sidebar " + (sidebarOpen ? "is-open" : "")}>
        <div className="side-section"><div className="side-heading">WORLD</div><div className="world-switch active"><span className="world-emblem">龍</span><span><b>Blue Dragon Guild</b><small>Hunter universe · Roleplay</small></span><span className="side-chevron">⌄</span></div></div>
        <div className="side-section"><div className="side-heading">PLAYER PROFILE</div><div className="player-card"><div className="player-avatar">M</div><div><b>มาร์ค</b><small>Guild Member · Rank F*</small></div><span className="rank-tag">F</span></div><div className="player-facts"><span>สถานะ <b>สมาชิกธรรมดา</b></span><span>กิลด์ <b>Blue Dragon</b></span><span>ข้อตกลง <b>1 ปี</b></span></div></div>
        <div className="side-section"><div className="side-heading">GUILD MEMBERS <span>18</span></div><div className="member-list">{characters.map((character, index) => <div className="member-row" key={character.name}><span className={"member-avatar tone-" + (index % 5)}>{character.name.slice(0, 1)}</span><span><b>{character.name}</b><small>{character.role}</small></span><em>{character.rank}</em></div>)}</div><div className="member-note">แสดงตัวละครสำคัญ · สมาชิกที่เหลืออีก 11 คนยังไม่ระบุรายละเอียด</div></div>
        <div className="side-bottom"><div className="sync-indicator"><span />บันทึกโลกผ่าน Cloudflare D1</div><small>{user.email}</small></div>
      </aside>
      <section className="nexus-main">
        <div className="scene-banner"><div className="scene-art"><div className="scene-skyline"><i /><i /><i /><i /><i /><i /><i /></div><div className="scene-overlay" /></div><div className="scene-content"><div className="scene-kicker">CURRENT SCENE <span>CHAPTER 01</span></div><h1>ศูนย์บัญชาการสมาคมฮันเตอร์</h1><p>{latestScene || "แสงจากหน้าจอภารกิจสะท้อนบนกระจก ข้อมูลเกตและทีม Raid ไหลผ่านจอขนาดใหญ่"}</p><div className="scene-meta"><span>◷ 17:42 น.</span><span>⌖ เขตสมาคมฮันเตอร์</span><span>☁ สภาพอากาศปกติ</span></div></div><div className="scene-chapter">01 <span>/</span> 01</div></div>
        <div className="story-heading"><div><span className="eyebrow">STORY LOG</span><h2>เรื่องราวที่กำลังดำเนินอยู่</h2></div><div className="story-tools"><button onClick={() => void loadWorld(world?.id)}>↻ <span>รีเฟรช</span></button><button onClick={() => setSettingsOpen(true)}>☷ <span>ตั้งค่า</span></button></div></div>
        <div className="story-transcript" ref={transcript}>
          {loading ? <div className="empty-state">กำลังโหลดความทรงจำของโลก…</div> : turns.length === 0 ? <div className="opening-card"><span className="opening-label">STORY CONTINUATION</span><h3>ภารกิจแรงก์ B</h3><p>คุณยืนอยู่หน้าจอแสดงงาน Raid แบบเรียลไทม์ของสมาคมฮันเตอร์ ภารกิจระดับ B ที่คุณเลือกยังแสดงรายละเอียดอยู่บนหน้าจอ สมาชิก Blue Dragon Guild รอฟังการตัดสินใจของคุณ</p><small>เรื่องราวจะดำเนินต่อจากการตัดสินใจล่าสุดในแชทเดิม</small></div> : turns.map(turn => turn.role === "player" ? <div className="player-turn" key={turn.id}><span className="turn-label">มาร์ค · ผู้เล่น</span><p>{turn.content}</p><time>{timeLabel(turn.created_at)}</time></div> : <article className="narrator-turn" key={turn.id}><div className="narrator-avatar">✦</div><div className="narrator-body"><div className="turn-label">{turn.metadata?.speaker || "ผู้บรรยาย"} <span>· NARRATOR</span></div><p>{turn.content}</p>{turn.metadata?.memory && <div className="memory-chip">✧ บันทึกความทรงจำ: {turn.metadata.memory}</div>}<time>{timeLabel(turn.created_at)}</time></div></article>)}
          {sending && <div className="narrator-turn typing"><div className="narrator-avatar">✦</div><div className="narrator-body"><div className="turn-label">กำลังดำเนินเรื่อง</div><p><i /><i /><i /></p></div></div>}
          {!loading && turns.length === 0 && <div className="opening-hint">พิมพ์การกระทำแรกเพื่อดำเนินเรื่องต่อจากจุดที่ค้างไว้</div>}
        </div>
        {error && <div className="nexus-error" role="alert"><span>{error}</span>{error.includes("Gemini API Key") && <small>ตั้งค่า AI_API_KEY ใน Cloudflare Worker ก่อน แล้วกลับมาส่งข้อความอีกครั้ง</small>}</div>}
        <form className="composer" onSubmit={send}><div className="composer-top"><span>YOUR ACTION</span><span>พิมพ์ได้อย่างอิสระ · ไม่มีตัวเลือกบังคับ</span></div><textarea ref={textarea} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send() } }} placeholder="บอกสิ่งที่คุณต้องการทำ พูด หรือคิด... (Enter เพื่อส่ง, Shift + Enter เพื่อขึ้นบรรทัดใหม่)" rows={2} maxLength={3000} /><div className="composer-bottom"><span>{draft.length.toLocaleString("th-TH")} / 3,000</span><button type="submit" disabled={!draft.trim() || sending || loading}>{sending ? "กำลังเล่าเรื่อง…" : "ส่งการกระทำ  ↗"}</button></div></form>
        <footer className="nexus-footer"><span>WORLD MEMORY · AUTO-SAVED</span><span>SESSION ACTIVE</span></footer>
      </section>
      <aside className="nexus-inspector"><div className="inspector-heading">WORLD STATUS <span>LIVE</span></div><div className="status-card"><small>ACTIVE QUEST</small><b>Raid ระดับ B</b><p>กำลังพิจารณารับภารกิจ</p><div className="quest-meter"><i /></div><span>ยังไม่ยืนยันเข้าร่วม</span></div><div className="inspector-section"><div className="inspector-title">WORLD MEMORY</div><div className="memory-row"><span>⌖</span><div><small>สถานที่</small><b>สมาคมฮันเตอร์</b></div></div><div className="memory-row"><span>◷</span><div><small>เวลาในเรื่อง</small><b>17:42 น.</b></div></div><div className="memory-row"><span>♧</span><div><small>เป้าหมายปัจจุบัน</small><b>หาเงินอัปเกรดอุปกรณ์กิลด์</b></div></div></div><div className="inspector-section"><div className="inspector-title">PLAYER AGREEMENT</div><div className="agreement"><b>สมาชิกธรรมดา</b><p>ไม่รับเงินเดือน<br />ไม่รับส่วนแบ่งรายได้<br />สัญญา 1 ปี</p><span>ข้อตกลงที่บันทึกไว้</span></div></div><div className="inspector-bottom"><span className="cloud-icon">◉</span><div><b>Cloud Save</b><small>ข้อมูลผูกกับบัญชี Owner</small></div></div></aside>
    </div>
    {settingsOpen && <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}><section className="settings-panel" onClick={e => e.stopPropagation()}><div className="settings-head"><div><span className="eyebrow">WORLD CONFIGURATION</span><h2>ตั้งค่าโลก</h2></div><button onClick={() => setSettingsOpen(false)}>✕</button></div><div className="settings-group"><h3>ภาพประกอบ AI</h3><p>ควบคุมการสร้างภาพโดยไม่กระทบการเล่นเนื้อเรื่อง</p><label className="setting-toggle"><span><b>เปิดใช้ภาพ AI</b><small>อนุญาตให้โลกนี้ใช้ระบบสร้างภาพเมื่อเชื่อมต่อผู้ให้บริการ</small></span><input type="checkbox" checked={images.enabled} onChange={e => void saveImages({ ...images, enabled: e.target.checked, auto: e.target.checked ? images.auto : false })} /></label><label className="setting-toggle"><span><b>สร้างภาพอัตโนมัติ</b><small>เจนภาพเฉพาะฉากสำคัญเมื่อระบบภาพพร้อมใช้งาน</small></span><input type="checkbox" checked={images.auto} disabled={!images.enabled} onChange={e => void saveImages({ ...images, auto: e.target.checked })} /></label><div className="settings-note">ขณะนี้ยังไม่ได้เชื่อม Image API การเปิดตัวเลือกนี้เป็นการบันทึกความต้องการไว้เท่านั้น</div></div><div className="settings-group"><h3>ข้อมูลโลก</h3><p>Blue Dragon Guild · Hunter roleplay · Anime-inspired</p><div className="settings-facts"><span>โลก <b>Solo Leveling-inspired</b></span><span>ตัวละครหลัก <b>มาร์ค</b></span><span>จุดต่อเนื่อง <b>ภารกิจ Raid ระดับ B</b></span></div></div><button className="settings-done" onClick={() => setSettingsOpen(false)}>เสร็จสิ้น</button></section></div>}
  </main>
}
