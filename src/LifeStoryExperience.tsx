import LifeScene from "./LifeScene"
import { advanceLife, estimateChoiceChance, resolveLifeChoice, type LifeRecord } from "./lifeSimulation"

type Props = { life: LifeRecord; saving: boolean; onUpdate: (life: LifeRecord) => void; onHistory: () => void; onFinance: () => void }

const metrics = [
  { key: "health", label: "สุขภาพ", mark: "♡" },
  { key: "happiness", label: "ความสุข", mark: "☼" },
  { key: "education", label: "การศึกษา", mark: "⌑" },
  { key: "relationships", label: "คนรอบตัว", mark: "⌂" },
  { key: "skills", label: "ทักษะ", mark: "✳" },
  { key: "stress", label: "ความเครียด", mark: "〰" },
] as const

const money = (value: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value)

export default function LifeStoryExperience({ life, saving, onUpdate, onHistory, onFinance }: Props) {
  const event = life.pendingEvent
  const year = life.bornYear + life.age
  const scene = life.householdScene
  const cast = [
    life.age < 18 ? "ครอบครัวเดิม" : null,
    scene?.partner ? (scene.partnerAge ? `คู่ชีวิต · อายุ ${scene.partnerAge} ปี` : "คู่ชีวิต") : null,
    ...(scene?.childAges?.slice(0, scene.children).map((age, index) => `ลูก ${index + 1} · อายุ ${age} ปี${scene.childEducation?.[index] ? ` · ${scene.childEducation[index]}` : ""}`) ?? (scene?.children ? [`ลูก ${scene.children} คน`] : [])),
    ...(scene?.pets?.map((pet, index) => `${pet === "cat" ? "แมว" : "สุนัข"} ${index + 1}${scene.petAges?.[index] !== undefined ? ` · ${scene.petAges[index]} ปี` : ""}${scene.petCare?.[index] ? ` · ${scene.petCare[index]}` : ""}`) ?? []),
    scene?.vehicle ? (scene.vehicle === "motorcycle" ? "รถจักรยานยนต์" : scene.vehicle === "pickup" ? "รถกระบะ" : "รถยนต์") : null,
    scene?.housekeeper ? "ผู้ช่วยในบ้าน" : null,
  ].filter(Boolean)

  return <section className="life-story-experience">
    <div className="life-chapter-bar">
      <div><span className="life-eyebrow">YOUR LIFE · THAILAND</span><h2>บทที่ {life.age + 1} <i>·</i> {life.age < 7 ? "วัยเยาว์" : life.age < 13 ? "วัยเรียน" : life.age < 20 ? "วัยรุ่น" : life.age < 60 ? "วัยทำงาน" : "วัยเกษียณ"}</h2></div>
      <div className="life-chapter-date"><b>พ.ศ. {year + 543}</b><span>{life.province} · {life.areaType}</span></div>
    </div>

    <div className="life-story-grid">
      <div className="life-story-world">
        <div className="life-story-scene-top"><span>ภาพชีวิตในตอนนี้</span><span>{life.status === "alive" ? "● กำลังดำเนินเรื่อง" : "จบบันทึกชีวิต"}</span></div>
        <LifeScene life={life} />
        <div className="life-story-cast">
          <span className="life-eyebrow">คนและสิ่งที่อยู่ในชีวิต</span>
          <div>{cast.length ? cast.map(item => <span key={item}>{item}</span>) : <span>ตอนนี้มีเพียงคุณและเรื่องราวที่กำลังเริ่มต้น</span>}</div>
        </div>
        <div className="life-story-stats">
          {metrics.map(metric => <div key={metric.key}><span>{metric.mark} {metric.label}</span><b>{life.stats[metric.key]}<small>/100</small></b><i role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={life.stats[metric.key]}><em style={{ width: `${life.stats[metric.key]}%` }} /></i></div>)}
          <div className="life-story-cash"><span>เงินทุนครัวเรือน</span><b>{money(life.economy?.cash ?? life.stats.wealth)} ฿</b><small>หนี้ {money(life.economy?.debt ?? life.householdDebt)} ฿</small></div>
        </div>
        <button className="life-story-finance-link" onClick={onFinance}><span><b>การเงินของชีวิตนี้</b><small>รายรับ {money(life.economy?.monthlyIncome ?? 0)} ฿/เดือน · รายจ่าย {money(life.economy?.monthlyExpenses ?? 0)} ฿/เดือน</small></span><i>ดูบัญชีและการลงทุน ↗</i></button>
      </div>

      <aside className="life-story-panel">
        {event ? <>
          <div className="life-story-kicker"><span>{event.type === "historical" ? "เหตุการณ์ประวัติศาสตร์" : "เหตุการณ์ส่วนตัว"}</span><span>อายุ {event.age} ปี</span></div>
          <h2>{event.title}</h2>
          <p className="life-story-description">{event.description}</p>
          {event.context && <p className="life-story-context">{event.context}</p>}
          <div className="life-story-circumstances" aria-label="บริบทชีวิตในปีนี้">
            <span><small>อาชีพ</small><b>{life.occupation}</b></span>
            <span><small>ฐานะครัวเรือน</small><b>{life.householdIncome}</b></span>
            <span><small>พื้นฐานครอบครัว</small><b>{life.family}</b></span>
            <span><small>พื้นที่อาศัย</small><b>{life.province} · {life.areaType}</b></span>
          </div>
          {event.sourceTitle && <div className="life-story-source"><span>อ่านที่มา</span><a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceTitle} ↗</a><small>{event.sourceNote}</small></div>}
          <div className="life-story-choice-heading"><span>จุดตัดสินใจ</span><small>เลือกทางที่ตัวละครจะเดินต่อ</small></div>
          <div className="life-story-choices">{event.choices.map((choice, index) => {
            const chance = estimateChoiceChance(life, choice)
            return <button key={choice.id} disabled={saving} onClick={() => onUpdate(resolveLifeChoice(life, choice.id))}>
              <span className="life-story-choice-index">0{index + 1}</span>
              <span className="life-story-choice-copy"><b>{choice.label}</b><small>{choice.description}</small><i><em style={{ width: `${chance}%` }} /></i><small className="life-story-chance">โอกาสสำเร็จในเกม {chance}%</small></span>
              <span className="life-story-choice-arrow">↗</span>
            </button>
          })}</div>
        </> : life.status === "alive" ? <>
          <div className="life-story-kicker"><span>THE NEXT CHAPTER</span><span>พ.ศ. {year + 543}</span></div>
          <h2>หนึ่งปีผ่านไปแล้ว</h2>
          <p className="life-story-description">เวลาจะเดินต่ออีกหนึ่งปี พร้อมเหตุการณ์ใหม่ตามอายุ จังหวัด สถานะครอบครัว สุขภาพ และสิ่งที่คุณเคยเลือกไว้</p>
          <div className="life-story-next-facts"><span>อาชีพปัจจุบัน <b>{life.occupation}</b></span><span>ฐานะครอบครัว <b>{life.householdIncome}</b></span><span>หนี้ครัวเรือน <b>{money(life.householdDebt)} ฿</b></span></div>
          <button className="life-story-continue" disabled={saving} onClick={() => onUpdate(advanceLife(life))}>ดำเนินชีวิตต่อ <span>→</span></button>
        </> : <>
          <div className="life-story-kicker"><span>THE END OF A LIFE</span><span>อายุ {life.age} ปี</span></div>
          <h2>เรื่องราวชีวิตนี้จบลงแล้ว</h2>
          <p className="life-story-description">การเดินทางของ {life.name} สิ้นสุดลงแล้ว แต่ทุกเหตุการณ์และการตัดสินใจยังอยู่ในบันทึกชีวิต</p>
          <button className="life-story-continue" onClick={onHistory}>เปิดอ่านบันทึกทั้งหมด <span>→</span></button>
        </>}
      </aside>
    </div>
  </section>
}
