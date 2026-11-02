import { useEffect, useMemo, useState } from "react"
import { api, useAuth } from "./CloudAuth"
import {
  advanceLife, createLife, estimateChoiceChance, resolveLifeChoice, validateLifeRecord,
  type LifeRecord,
} from "./lifeSimulation"
import "./life-simulation.css"

const LIFE_KEY = "lamoon-life-sim-v1"
type LifeSnapshot = { version: 1; activeId: string | null; lives: LifeRecord[] }
type ApiState = { payload?: Record<string, string> | null; updated_at?: string | null }
type View = "world" | "history" | "about"

function readSnapshot(raw?: string): LifeSnapshot {
  if (!raw) return { version: 1, activeId: null, lives: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<LifeSnapshot>
    if (parsed.version !== 1 || !Array.isArray(parsed.lives)) return { version: 1, activeId: null, lives: [] }
    return { version: 1, activeId: parsed.activeId ?? null, lives: parsed.lives.filter(validateLifeRecord) }
  } catch {
    return { version: 1, activeId: null, lives: [] }
  }
}

const formatMoney = (amount: number) => `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(amount)} หน่วยจำลอง`
const statLabels = [
  { key: "health", label: "สุขภาพ", icon: "♡" },
  { key: "happiness", label: "ความสุข", icon: "☼" },
  { key: "education", label: "การศึกษา", icon: "⌑" },
  { key: "relationships", label: "ความสัมพันธ์", icon: "⌂" },
  { key: "skills", label: "ทักษะ", icon: "✳" },
  { key: "stress", label: "ความเครียด", icon: "〰" },
] as const

export default function LifeWorld() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<View>("world")
  const [lives, setLives] = useState<LifeRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [yearFrom, setYearFrom] = useState("1930")
  const [yearTo, setYearTo] = useState("2025")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState("")
  const activeLife = useMemo(() => lives.find(life => life.id === activeId) ?? null, [lives, activeId])

  useEffect(() => {
    let cancelled = false
    api("/api/state").then(result => {
      if (cancelled) return
      const response = result as ApiState
      const snapshot = readSnapshot(response.payload?.[LIFE_KEY])
      setLives(snapshot.lives)
      setActiveId(snapshot.activeId)
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "โหลดข้อมูลชีวิตไม่สำเร็จ")
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function persist(nextLives: LifeRecord[], nextActiveId: string | null) {
    setSaving(true)
    setMessage("")
    try {
      let saved = false
      for (let attempt = 0; attempt < 2 && !saved; attempt++) {
        const current = await api("/api/state") as ApiState
        const payload = { ...(current.payload ?? {}), [LIFE_KEY]: JSON.stringify({ version: 1, activeId: nextActiveId, lives: nextLives } satisfies LifeSnapshot) }
        try {
          await api("/api/state", { method: "PUT", body: JSON.stringify({ payload, expected_updated_at: current.updated_at ?? null }) })
          saved = true
        } catch (reason) {
          if ((reason as { status?: number }).status !== 409 || attempt === 1) throw reason
        }
      }
      setMessage("บันทึกชีวิตนี้ไว้ในคลาวด์แล้ว")
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setSaving(false)
    }
  }

  async function startNewLife() {
    const life = createLife(name, Number(yearFrom), Number(yearTo))
    const nextLives = [life, ...lives].slice(0, 30)
    setLives(nextLives)
    setActiveId(life.id)
    setName("")
    setShowCreate(false)
    setView("world")
    await persist(nextLives, life.id)
  }

  async function updateLife(nextLife: LifeRecord) {
    const nextLives = lives.map(life => life.id === nextLife.id ? nextLife : life)
    setLives(nextLives)
    await persist(nextLives, activeId)
  }

  async function selectLife(id: string) {
    setActiveId(id)
    setView("world")
    await persist(lives, id)
  }

  if (loading) return <main className="life-loading"><span className="life-mark">TH</span><p>กำลังเปิดหน้าต่างสู่ชีวิตใหม่…</p></main>

  return <div className="life-app">
    <header className="life-topbar">
      <button className="life-brand" onClick={() => setView("world")}><span className="life-brand-mark">TH</span><span><b>DayTogether</b><small>THAI LIFE SIMULATION</small></span></button>
      <nav className="life-nav" aria-label="เมนูหลัก">
        <button className={view === "world" ? "active" : ""} onClick={() => setView("world")}>โลกของฉัน</button>
        <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>เรื่องราวชีวิต</button>
        <button className={view === "about" ? "active" : ""} onClick={() => setView("about")}>เกี่ยวกับโลกนี้</button>
      </nav>
      <div className="life-user"><span>{user.email}</span><button onClick={() => void signOut()}>ออกจากระบบ</button></div>
    </header>

    <main className="life-main">
      {error && <div className="life-alert" role="alert">{error}</div>}
      {view === "world" && <>
        {!activeLife ? <section className="life-welcome">
          <div className="life-welcome-art" aria-hidden="true"><div className="life-orbit orbit-one" /><div className="life-orbit orbit-two" /><div className="life-globe"><span>TH</span></div><i className="life-star star-one">✦</i><i className="life-star star-two">✧</i><i className="life-star star-three">·</i></div>
          <div className="life-welcome-copy"><span className="life-eyebrow">THAILAND · LIFE THROUGH THE ERAS</span><h1>หนึ่งชีวิต<br /><em>ผ่านกาลเวลาไทย</em></h1><p>เกิดในปีที่ไม่เหมือนกัน เติบโตในจังหวัดและครอบครัวที่ต่างกัน แล้วใช้ชีวิตท่ามกลางเหตุการณ์จริงของประเทศไทย ทุกทางเลือกมีต้นทุนและโอกาสของมัน</p><button className="life-primary" onClick={() => setShowCreate(true)}>สุ่มปีเกิดและเริ่มชีวิต <span>↗</span></button><small>ข้อมูลประวัติศาสตร์มีแหล่งอ้างอิง ส่วนพื้นฐานครอบครัวเป็นสถานการณ์จำลอง</small></div>
        </section> : <section className="life-dashboard">
          <div className="life-page-heading"><div><span className="life-eyebrow">YOUR CURRENT LIFE · {activeLife.status === "alive" ? "IN PROGRESS" : "COMPLETED"}</span><h1>{activeLife.name}<span className="life-age">อายุ {activeLife.age} ปี</span></h1><p>{activeLife.background} · ประเทศไทย · {activeLife.province}</p></div><button className="life-secondary" onClick={() => setShowCreate(true)}>＋ เริ่มชีวิตใหม่</button></div>
          <div className="life-world-card">
            <div className="life-world-visual"><div className="life-map-glow" /><div className="life-world-circle"><span>TH</span></div><div className="life-world-caption"><span>จุดเริ่มต้นของชีวิต</span><b>{activeLife.region}</b></div></div>
            <div className="life-origin"><span className="life-eyebrow">จุดเริ่มต้นของชีวิต · {activeLife.bornYear + activeLife.age} พ.ศ.</span><h2>{activeLife.family}</h2><p>{activeLife.background}</p><div className="life-facts"><span>จังหวัด <b>{activeLife.province}</b></span><span>พื้นที่ <b>{activeLife.areaType}</b></span><span>เพศ <b>{activeLife.gender}</b></span></div><div className="life-facts"><span>ผู้ปกครอง <b>{activeLife.parents.join(" / ")}</b></span><span>พี่น้อง <b>{activeLife.siblings} คน</b></span></div><div className="life-facts"><span>ฐานะครอบครัว <b>{activeLife.householdIncome}</b></span><span>หนี้ครัวเรือนเริ่มต้น <b>{formatMoney(activeLife.householdDebt)}</b></span></div></div>
          </div>
          <div className="life-section-head"><div><span className="life-eyebrow">LIFE CONDITION</span><h2>สถานะชีวิต</h2></div><small>ค่าต่าง ๆ เปลี่ยนตามการตัดสินใจของคุณ</small></div>
          <div className="life-stat-grid">
            {statLabels.map(stat => <div className="life-stat" key={stat.key}><div><span>{stat.icon} &nbsp;{stat.label}</span><b>{activeLife.stats[stat.key]}<small>/100</small></b></div><div className="life-meter"><i style={{ width: `${activeLife.stats[stat.key]}%` }} /></div></div>)}
            <div className="life-stat wealth"><div><span>◈ &nbsp;ทุนครอบครัวจำลอง</span><b>{formatMoney(activeLife.stats.wealth)}</b></div><small>หน่วยเงินบาทจำลอง · ค่าทรัพย์สินเป็นกลไกเกม ไม่ใช่ข้อมูลเศรษฐกิจจริง</small></div>
          </div>
          {activeLife.pendingEvent ? <section className="life-event-card"><span className="life-eyebrow">{activeLife.pendingEvent.type === "historical" ? "เหตุการณ์ประวัติศาสตร์ · มีแหล่งอ้างอิง" : "เหตุการณ์ชีวิตประจำปี"} · อายุ {activeLife.pendingEvent.age} ปี · พ.ศ. {activeLife.pendingEvent.year + 543}</span><h2>{activeLife.pendingEvent.title}</h2><p>{activeLife.pendingEvent.description}</p>{activeLife.pendingEvent.context && <p className="life-event-context">{activeLife.pendingEvent.context}</p>}{activeLife.pendingEvent.sourceTitle && <div className="life-source"><b>ที่มา: </b><a href={activeLife.pendingEvent.sourceUrl} target="_blank" rel="noreferrer">{activeLife.pendingEvent.sourceTitle} ↗</a><small>{activeLife.pendingEvent.sourceNote}</small></div>}<h3>คุณจะรับมืออย่างไร?</h3><div className="life-choices">{activeLife.pendingEvent.choices.map(choice => <button key={choice.id} disabled={saving} onClick={() => void updateLife(resolveLifeChoice(activeLife, choice.id))}><b>{choice.label}</b><span>{choice.description}</span><small>โอกาสสำเร็จโดยประมาณ {estimateChoiceChance(activeLife, choice)}% · คำนวณจากทักษะ การศึกษา ทรัพยากร สุขภาพ และภาระชีวิต</small><em>เลือกทางนี้ ↗</em></button>)}</div></section> : activeLife.status === "alive" ? <section className="life-next"><div><span className="life-eyebrow">THE NEXT CHAPTER</span><h2>พร้อมก้าวไปอีกหนึ่งปีหรือยัง?</h2><p>พ.ศ. {activeLife.bornYear + activeLife.age + 543} · {activeLife.province} · {activeLife.occupation}</p></div><button className="life-primary" disabled={saving} onClick={() => void updateLife(advanceLife(activeLife))}>ใช้ชีวิตต่อ <span>→</span></button></section> : <section className="life-event-card life-ending"><span className="life-eyebrow">THE END OF A LIFE</span><h2>เรื่องราวของ {activeLife.name} จบลงแล้ว</h2><p>ชีวิตนี้เดินทางมาถึงอายุ {activeLife.age} ปี ความทรงจำทั้งหมดถูกเก็บไว้ในเรื่องราวชีวิต</p><button className="life-primary" onClick={() => setView("history")}>อ่านบันทึกชีวิต <span>→</span></button></section>}
          <div className="life-section-head"><div><span className="life-eyebrow">LIFE TIMELINE</span><h2>เส้นทางที่ผ่านมา</h2></div><button className="life-text-button" onClick={() => setView("history")}>ดูทั้งหมด →</button></div>
          <div className="life-timeline">{activeLife.timeline.slice(0,4).map(item => <article key={item.id}><span className="life-timeline-age">{item.age} ปี</span><div><b>{item.title}</b><p>{item.detail}</p>{item.sourceTitle && <a className="life-timeline-source" href={item.sourceUrl} target="_blank" rel="noreferrer">แหล่งอ้างอิง: {item.sourceTitle} ↗</a>}</div><small>พ.ศ. {item.year + 543}</small></article>)}</div>
        </section>}
      </>}

      {view === "history" && <section className="life-history"><span className="life-eyebrow">EVERY LIFE LEAVES A STORY</span><h1>เรื่องราวที่เคยมีชีวิต</h1><p>ทุกชีวิตมีจุดเริ่มต้น ทางแยก และความทรงจำที่ไม่เหมือนกัน</p>{lives.length === 0 ? <div className="life-empty">ยังไม่มีเรื่องราว เริ่มต้นชีวิตแรกของคุณได้เลย</div> : <div className="life-history-list">{lives.map(life => <article key={life.id}><div className="life-history-number">0{lives.indexOf(life)+1}</div><div className="life-history-copy"><span>ประเทศไทย · {life.province} · พ.ศ. {life.bornYear + 543}</span><h2>{life.name}</h2><p>{life.family} · อายุ {life.age} ปี · {life.areaType}</p></div><span className={life.status === "alive" ? "life-status alive" : "life-status"}>{life.status === "alive" ? "กำลังดำเนินชีวิต" : "จบเรื่องราวแล้ว"}</span><button onClick={() => void selectLife(life.id)}>เปิดเรื่องราว →</button><details className="life-history-timeline"><summary>ดูเหตุการณ์ทั้งหมด ({life.timeline.length})</summary><div>{life.timeline.map(item => <article key={item.id}><span>พ.ศ. {item.year + 543} · อายุ {item.age}</span><b>{item.title}</b><p>{item.detail}</p>{item.sourceTitle && <a href={item.sourceUrl} target="_blank" rel="noreferrer">อ้างอิง: {item.sourceTitle} ↗</a>}</article>)}</div></details></article>)}</div>}</section>}

      {view === "about" && <section className="life-about"><span className="life-eyebrow">ABOUT THIS LITTLE UNIVERSE</span><h1>หนึ่งชีวิต<br /><em>ผ่านประวัติศาสตร์ไทย</em></h1><p>DayTogether จำลองชีวิตคนไทยจากปีเกิด จังหวัด พื้นฐานครอบครัว และโอกาสที่เปลี่ยนไปตามยุค เหตุการณ์ประวัติศาสตร์สำคัญจะอิงแหล่งข้อมูลที่ตรวจสอบได้ ส่วนเหตุการณ์ครอบครัวและผลลัพธ์ทางเลือกเป็นสถานการณ์สมมติของเกม</p><div className="life-about-grid"><article><b>01</b><h2>เกิดคนละปี คนละจังหวัด</h2><p>ปีเกิด จังหวัด เมืองหรือชนบท และพื้นฐานครอบครัวกำหนดบริบทของชีวิต</p></article><article><b>02</b><h2>ทุกทางเลือกมีต้นทุน</h2><p>ทางเลือกมีโอกาสสำเร็จและล้มเหลว โดยคำนวณจากทักษะ การศึกษา และสถานะชีวิต</p></article><article><b>03</b><h2>ประวัติศาสตร์มีที่มา</h2><p>เหตุการณ์ใหญ่แสดงแหล่งอ้างอิง พร้อมแยกผลกระทบระดับประเทศและพื้นที่จริง</p></article></div><small>หมายเหตุ: ปีเกิดและพื้นฐานครอบครัวสุ่มเพื่อการเล่น ไม่ใช่การกระจายประชากรหรือสถิติสำมะโน เหตุการณ์ประวัติศาสตร์อ้างอิงแหล่งข้อมูลที่แสดงในแต่ละเหตุการณ์ ส่วนเหตุการณ์ส่วนบุคคล โอกาสสำเร็จ และอายุขัยเป็นกลไกจำลอง ไม่ใช่การทำนายชีวิตจริง</small></section>}
    </main>

    <footer className="life-footer"><span>DAYTOGETHER · THAILAND LIFE THROUGH THE ERAS</span><span>{saving ? "กำลังบันทึก…" : message || "หนึ่งชีวิต หนึ่งเรื่องราว"}</span><button onClick={() => void signOut()}>ออกจากระบบ</button></footer>

    {showCreate && <div className="life-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="life-modal" role="dialog" aria-modal="true" aria-labelledby="life-modal-title"><button className="life-modal-close" onClick={() => setShowCreate(false)} aria-label="ปิด">×</button><span className="life-eyebrow">เริ่มต้นชีวิตคนไทยในอดีตหรือยุคปัจจุบัน</span><h2 id="life-modal-title">สุ่มปีเกิดและพื้นฐานครอบครัว</h2><p>กำหนดช่วงปีเกิดได้ ระบบจะสุ่มจังหวัด พื้นที่ ครอบครัว อาชีพผู้ปกครอง และเหตุการณ์ตามปีที่ตัวละครเติบโต</p><label htmlFor="life-name">ชื่อของชีวิตนี้ (ไม่บังคับ)</label><input id="life-name" value={name} onChange={event => setName(event.target.value)} placeholder="ตั้งชื่อหรือเว้นว่างเพื่อสุ่ม" maxLength={40} /><div className="life-year-range"><div><label htmlFor="life-year-from">ปีเกิดตั้งแต่ (พ.ศ.)</label><input id="life-year-from" type="number" min="2473" max="2568" value={Number(yearFrom)+543} onChange={event => setYearFrom(String(Math.max(1930,Math.min(2025,Number(event.target.value)-543))))} /></div><div><label htmlFor="life-year-to">ถึง (พ.ศ.)</label><input id="life-year-to" type="number" min="2473" max="2568" value={Number(yearTo)+543} onChange={event => setYearTo(String(Math.max(1930,Math.min(2025,Number(event.target.value)-543))))} /></div></div><small className="life-modal-note">ช่วงที่เลือก: ค.ศ. {yearFrom}–{yearTo} · พ.ศ. {Number(yearFrom)+543}–{Number(yearTo)+543}</small><div className="life-modal-actions"><button className="life-secondary" onClick={() => setShowCreate(false)}>ยกเลิก</button><button className="life-primary" onClick={() => void startNewLife()} disabled={saving}>สุ่มชีวิตในประเทศไทย <span>↗</span></button></div></section></div>}
  </div>
}
