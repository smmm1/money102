import { useEffect, useMemo, useState } from "react"
import { api, useAuth } from "./CloudAuth"
import {
  advanceLife, createLife, resolveLifeChoice, validateLifeRecord,
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

const formatMoney = (amount: number) => `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(amount)} หน่วย`
const statLabels = [
  { key: "health", label: "สุขภาพ", icon: "♡" },
  { key: "happiness", label: "ความสุข", icon: "☼" },
  { key: "education", label: "การศึกษา", icon: "⌑" },
  { key: "relationships", label: "ความสัมพันธ์", icon: "⌂" },
  { key: "skills", label: "ทักษะ", icon: "✳" },
] as const

export default function LifeWorld() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<View>("world")
  const [lives, setLives] = useState<LifeRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState("")
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
    const life = createLife(name)
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

  if (loading) return <main className="life-loading"><span className="life-mark">8</span><p>กำลังเปิดหน้าต่างสู่ชีวิตใหม่…</p></main>

  return <div className="life-app">
    <header className="life-topbar">
      <button className="life-brand" onClick={() => setView("world")}><span className="life-brand-mark">8</span><span><b>DayTogether</b><small>A LIFE IN 8 BILLION</small></span></button>
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
          <div className="life-welcome-art" aria-hidden="true"><div className="life-orbit orbit-one" /><div className="life-orbit orbit-two" /><div className="life-globe"><span>8</span></div><i className="life-star star-one">✦</i><i className="life-star star-two">✧</i><i className="life-star star-three">·</i></div>
          <div className="life-welcome-copy"><span className="life-eyebrow">ONE PERSON · ONE UNIVERSE</span><h1>ในโลกที่มีผู้คน<br /><em>นับพันล้าน</em></h1><p>มีชีวิตหนึ่งที่ไม่เคยเกิดขึ้นมาก่อน และชีวิตนั้นอาจเป็นของคุณ ลองเริ่มต้นจากจุดที่ไม่รู้จัก แล้วดูว่าเรื่องราวจะพาคุณไปที่ไหน</p><button className="life-primary" onClick={() => setShowCreate(true)}>เริ่มต้นชีวิตใหม่ <span>↗</span></button><small>ทุกชีวิตเริ่มต้นจากโอกาสที่ไม่เหมือนกัน</small></div>
        </section> : <section className="life-dashboard">
          <div className="life-page-heading"><div><span className="life-eyebrow">YOUR CURRENT LIFE · {activeLife.status === "alive" ? "IN PROGRESS" : "COMPLETED"}</span><h1>{activeLife.name}<span className="life-age">อายุ {activeLife.age} ปี</span></h1><p>{activeLife.background} · {activeLife.country}</p></div><button className="life-secondary" onClick={() => setShowCreate(true)}>＋ เริ่มชีวิตใหม่</button></div>
          <div className="life-world-card">
            <div className="life-world-visual"><div className="life-map-glow" /><div className="life-world-circle"><span>{activeLife.country === "ประเทศไทย" ? "TH" : activeLife.country.slice(0,2).toUpperCase()}</span></div><div className="life-world-caption"><span>จุดเริ่มต้นของชีวิต</span><b>{activeLife.region}</b></div></div>
            <div className="life-origin"><span className="life-eyebrow">BORN INTO THIS WORLD</span><h2>{activeLife.family}</h2><p>{activeLife.background} ใน{activeLife.country}</p><div className="life-facts"><span>ปีเกิด <b>{activeLife.bornYear}</b></span><span>เพศ <b>{activeLife.gender}</b></span><span>อายุปัจจุบัน <b>{activeLife.age} ปี</b></span></div></div>
          </div>
          <div className="life-section-head"><div><span className="life-eyebrow">LIFE CONDITION</span><h2>สถานะชีวิต</h2></div><small>ค่าต่าง ๆ เปลี่ยนตามการตัดสินใจของคุณ</small></div>
          <div className="life-stat-grid">
            {statLabels.map(stat => <div className="life-stat" key={stat.key}><div><span>{stat.icon} &nbsp;{stat.label}</span><b>{activeLife.stats[stat.key]}<small>/100</small></b></div><div className="life-meter"><i style={{ width: `${activeLife.stats[stat.key]}%` }} /></div></div>)}
            <div className="life-stat wealth"><div><span>◈ &nbsp;ทรัพย์สินโดยประมาณ</span><b>{formatMoney(activeLife.stats.wealth)}</b></div><small>สกุลเงินจำลองตามโลกที่เกิด</small></div>
          </div>
          {activeLife.pendingEvent ? <section className="life-event-card"><span className="life-eyebrow">A MOMENT THAT SHAPES YOU · AGE {activeLife.pendingEvent.age}</span><h2>{activeLife.pendingEvent.title}</h2><p>{activeLife.pendingEvent.description}</p><div className="life-choices">{activeLife.pendingEvent.choices.map(choice => <button key={choice.id} disabled={saving} onClick={() => void updateLife(resolveLifeChoice(activeLife, choice.id))}><b>{choice.label}</b><span>เลือกเส้นทางนี้ ↗</span></button>)}</div></section> : activeLife.status === "alive" ? <section className="life-next"><div><span className="life-eyebrow">THE NEXT CHAPTER</span><h2>พร้อมก้าวไปอีกหนึ่งปีหรือยัง?</h2><p>ไม่มีเส้นทางไหนถูกหรือผิด มีเพียงเรื่องราวที่คุณเลือกสร้างขึ้น</p></div><button className="life-primary" disabled={saving} onClick={() => void updateLife(advanceLife(activeLife))}>ใช้ชีวิตต่อ <span>→</span></button></section> : <section className="life-event-card life-ending"><span className="life-eyebrow">THE END OF A LIFE</span><h2>เรื่องราวของ {activeLife.name} จบลงแล้ว</h2><p>ชีวิตนี้เดินทางมาถึงอายุ {activeLife.age} ปี ความทรงจำทั้งหมดถูกเก็บไว้ในเรื่องราวชีวิต</p><button className="life-primary" onClick={() => setView("history")}>อ่านบันทึกชีวิต <span>→</span></button></section>}
          <div className="life-section-head"><div><span className="life-eyebrow">LIFE TIMELINE</span><h2>เส้นทางที่ผ่านมา</h2></div><button className="life-text-button" onClick={() => setView("history")}>ดูทั้งหมด →</button></div>
          <div className="life-timeline">{activeLife.timeline.slice(0,4).map(item => <article key={item.id}><span className="life-timeline-age">{item.age} ปี</span><div><b>{item.title}</b><p>{item.detail}</p></div><small>{item.year}</small></article>)}</div>
        </section>}
      </>}

      {view === "history" && <section className="life-history"><span className="life-eyebrow">EVERY LIFE LEAVES A STORY</span><h1>เรื่องราวที่เคยมีชีวิต</h1><p>ทุกชีวิตมีจุดเริ่มต้น ทางแยก และความทรงจำที่ไม่เหมือนกัน</p>{lives.length === 0 ? <div className="life-empty">ยังไม่มีเรื่องราว เริ่มต้นชีวิตแรกของคุณได้เลย</div> : <div className="life-history-list">{lives.map(life => <article key={life.id}><div className="life-history-number">0{lives.indexOf(life)+1}</div><div className="life-history-copy"><span>{life.country} · {life.bornYear}</span><h2>{life.name}</h2><p>{life.family} · อายุ {life.age} ปี</p></div><span className={life.status === "alive" ? "life-status alive" : "life-status"}>{life.status === "alive" ? "กำลังดำเนินชีวิต" : "จบเรื่องราวแล้ว"}</span><button onClick={() => void selectLife(life.id)}>เปิดเรื่องราว →</button></article>)}</div>}</section>}

      {view === "about" && <section className="life-about"><span className="life-eyebrow">ABOUT THIS LITTLE UNIVERSE</span><h1>หนึ่งชีวิต<br /><em>ในผู้คนอีกนับพันล้าน</em></h1><p>DayTogether คือพื้นที่ทดลองจินตนาการถึงชีวิตที่แตกต่าง แต่ละการเริ่มต้นสุ่มบริบทครอบครัว ประเทศ และโอกาส จากนั้นการตัดสินใจของคุณจะค่อย ๆ สร้างเรื่องราวที่ไม่ซ้ำกัน</p><div className="life-about-grid"><article><b>01</b><h2>จุดเริ่มต้นไม่เท่ากัน</h2><p>สถานที่เกิดและสภาพครอบครัวกำหนดบริบทเริ่มต้นของแต่ละชีวิต</p></article><article><b>02</b><h2>ทุกการเลือกมีผล</h2><p>การตัดสินใจส่งผลต่อสุขภาพ ความสุข การศึกษา ความสัมพันธ์ ทักษะ และทรัพย์สิน</p></article><article><b>03</b><h2>เรื่องราวไม่เหมือนกัน</h2><p>ชีวิตแต่ละเส้นทางถูกบันทึกไว้ เพื่อให้คุณย้อนกลับไปอ่านได้เสมอ</p></article></div><small>หมายเหตุ: นี่คือเกมจำลองเชิงสร้างสรรค์ ไม่ใช่การพยากรณ์ชีวิตจริงหรือแบบจำลองประชากรที่ผ่านการรับรองทางสถิติ</small></section>}
    </main>

    <footer className="life-footer"><span>DAYTOGETHER · A LIFE IN 8 BILLION</span><span>{saving ? "กำลังบันทึก…" : message || "หนึ่งชีวิต หนึ่งเรื่องราว"}</span><button onClick={() => void signOut()}>ออกจากระบบ</button></footer>

    {showCreate && <div className="life-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="life-modal" role="dialog" aria-modal="true" aria-labelledby="life-modal-title"><button className="life-modal-close" onClick={() => setShowCreate(false)} aria-label="ปิด">×</button><span className="life-eyebrow">A BRAND NEW BEGINNING</span><h2 id="life-modal-title">ชีวิตใหม่กำลังรออยู่</h2><p>ระบบจะสุ่มประเทศ ครอบครัว และจุดเริ่มต้นให้คุณ ชื่อสามารถกำหนดเองหรือปล่อยว่างไว้ก็ได้</p><label htmlFor="life-name">ชื่อของชีวิตนี้ (ไม่บังคับ)</label><input id="life-name" value={name} onChange={event => setName(event.target.value)} placeholder="ตั้งชื่อหรือเว้นว่างเพื่อสุ่ม" maxLength={40} /><div className="life-modal-actions"><button className="life-secondary" onClick={() => setShowCreate(false)}>ยกเลิก</button><button className="life-primary" onClick={() => void startNewLife()} disabled={saving}>สุ่มและเริ่มชีวิต <span>↗</span></button></div></section></div>}
  </div>
}
