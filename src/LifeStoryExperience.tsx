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
const stageName = (age: number) => age < 7 ? "วัยเด็กเล็ก" : age < 13 ? "วัยเรียน" : age < 20 ? "วัยรุ่น" : age < 60 ? "วัยทำงาน" : "วัยสูงอายุ"

export default function LifeStoryExperience({ life, saving, onUpdate, onHistory, onFinance }: Props) {
  const event = life.pendingEvent
  const year = life.bornYear + life.age
  const scene = life.householdScene
  const cast = [
    ...(life.parentAges?.map((age,index) => `${index===0 ? "พ่อ" : "แม่"} · ${life.parentAlive?.[index]===false ? `ถึงแก่กรรม อายุ ${age} ปี` : `อายุ ${age} ปี`}`) ?? []),
    scene?.partner ? (scene.partnerAge ? `คู่ชีวิต · อายุ ${scene.partnerAge} ปี` : "คู่ชีวิต") : null,
    ...(scene?.childAges?.slice(0, scene.children).map((age, index) => `ลูก ${index + 1} · อายุ ${age} ปี${scene.childEducation?.[index] ? ` · ${scene.childEducation[index]}` : ""}`) ?? (scene?.children ? [`ลูก ${scene.children} คน`] : [])),
    ...(scene?.pets?.map((pet, index) => `${pet === "cat" ? "แมว" : "สุนัข"} ${index + 1}${scene.petAges?.[index] !== undefined ? ` · ${scene.petAges[index]} ปี` : ""}`) ?? []),
    scene?.vehicle ? (scene.vehicle === "motorcycle" ? "รถจักรยานยนต์" : scene.vehicle === "pickup" ? "รถกระบะ" : "รถยนต์") : null,
    scene?.housekeeper ? "ผู้ช่วยในบ้าน" : null,
  ].filter(Boolean)

  return <section className="life-story-experience life-easy-play">
    <div className="life-chapter-bar">
      <div><span className="life-eyebrow">เรื่องราวชีวิตของคุณ</span><h2>{stageName(life.age)} <i>·</i> อายุ {life.age} ปี</h2></div>
      <div className="life-chapter-date"><b>พ.ศ. {year + 543}</b><span>{life.province} · {life.areaType}</span></div>
    </div>

    <div className="life-story-grid">
      <aside className="life-story-panel life-easy-story">
        {event ? <>
          <div className="life-story-kicker"><span>{event.type === "historical" ? "เหตุการณ์สำคัญของยุค" : "เรื่องที่เกิดขึ้นในชีวิต"}</span><span>อายุ {event.age} ปี</span></div>
          <h2>{event.title}</h2>
          <p className="life-story-description">{event.description}</p>

          <div className="life-story-choice-heading"><span>คุณจะเลือกทำอย่างไร?</span><small>เลือกหนึ่งข้อเพื่อดูผลที่เกิดขึ้นกับชีวิต</small></div>
          <div className="life-story-choices">{event.choices.map((choice, index) => {
            const chance = estimateChoiceChance(life, choice)
            return <button key={choice.id} disabled={saving} onClick={() => onUpdate(resolveLifeChoice(life, choice.id))}>
              <span className="life-story-choice-index">{index + 1}</span>
              <span className="life-story-choice-copy"><b>{choice.label}</b><small>{choice.description}</small></span>
              <span className="life-easy-chance">{chance}%</span>
            </button>
          })}</div>
          <p className="life-easy-hint">ตัวเลขคือโอกาสสำเร็จโดยประมาณในเกม ผลลัพธ์อาจแตกต่างกันตามพื้นฐานและสิ่งที่คุณเคยเลือก</p>

          <details className="life-easy-more">
            <summary>อ่านบริบทและที่มาของเหตุการณ์</summary>
            {event.context && <p>{event.context}</p>}
            <div className="life-story-circumstances">
              <span><small>อาชีพ</small><b>{life.occupation}</b></span>
              <span><small>ฐานะครัวเรือน</small><b>{life.householdIncome}</b></span>
              <span><small>พื้นฐานครอบครัว</small><b>{life.family}</b></span>
              <span><small>พื้นที่อาศัย</small><b>{life.province} · {life.areaType}</b></span>
            </div>
            {event.sourceTitle && <div className="life-story-source"><span>แหล่งอ้างอิง</span><a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceTitle} ↗</a><small>{event.sourceNote}</small></div>}
          </details>
        </> : life.status === "alive" ? <>
          <div className="life-story-kicker"><span>ก้าวต่อไปของชีวิต</span><span>พ.ศ. {year + 543}</span></div>
          <h2>ปีนี้ผ่านไปแล้ว</h2>
          <p className="life-story-description">พร้อมเริ่มปีถัดไปหรือยัง? เหตุการณ์ใหม่จะเปลี่ยนไปตามอายุ ครอบครัว สุขภาพ และทางเลือกที่ผ่านมา</p>
          <div className="life-story-next-facts"><span>อาชีพปัจจุบัน <b>{life.occupation}</b></span><span>ฐานะครอบครัว <b>{life.householdIncome}</b></span></div>
          <button className="life-story-continue" disabled={saving} onClick={() => onUpdate(advanceLife(life))}>ไปปีถัดไป <span>→</span></button>
        </> : <>
          <div className="life-story-kicker"><span>บันทึกชีวิต</span><span>อายุ {life.age} ปี</span></div>
          <h2>เรื่องราวชีวิตนี้จบลงแล้ว</h2>
          <p className="life-story-description">การเดินทางของ {life.name} สิ้นสุดลงแล้ว ทุกเหตุการณ์และการตัดสินใจยังอยู่ในบันทึกชีวิต</p>
          <button className="life-story-continue" onClick={onHistory}>อ่านบันทึกชีวิต <span>→</span></button>
        </>}
      </aside>

      <div className="life-story-world">
        <div className="life-story-scene-top"><span>ชีวิตรอบตัวคุณ</span><span>{life.status === "alive" ? "● กำลังดำเนินชีวิต" : "จบบันทึกชีวิต"}</span></div>
        <LifeScene life={life} />
        <details className="life-easy-family">
          <summary>คนในครอบครัวและสิ่งที่มี ({cast.length})</summary>
          <div>{cast.length ? cast.map(item => <span key={item}>{item}</span>) : <span>เรื่องราวของคุณเพิ่งเริ่มต้น</span>}</div>
        </details>
        <details className="life-easy-status">
          <summary>ดูสถานะชีวิตและเงิน</summary>
          <div className="life-story-stats">
            {metrics.map(metric => <div key={metric.key}><span>{metric.mark} {metric.label}</span><b>{life.stats[metric.key]}<small>/100</small></b><i role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={life.stats[metric.key]}><em style={{ width: `${life.stats[metric.key]}%` }} /></i></div>)}
            <div className="life-story-cash"><span>เงินสดครัวเรือน</span><b>{money(life.economy?.cash ?? life.stats.wealth)} ฿</b><small>หนี้ {money(life.economy?.debt ?? life.householdDebt)} ฿</small></div>
          </div>
        </details>
        <button className="life-story-finance-link" onClick={onFinance}><span><b>การเงินของครอบครัว</b><small>รายรับ {money(life.economy?.monthlyIncome ?? 0)} ฿/เดือน · รายจ่าย {money((life.economy?.monthlyExpenses ?? 0) + (life.economy?.householdCostMonthly ?? 0))} ฿/เดือน</small></span><i>เปิดบัญชี →</i></button>
      </div>
    </div>
  </section>
}
