import { lifeStageForAge, type LifeRecord, type LifeStage } from "./lifeSimulation"

type SceneActivity = "sleep" | "play" | "read" | "walk" | "rest" | "work"
type ScenePerson = {
  id: string
  label: string
  shirt: string
  hair: string
  stage: LifeStage
  activity: SceneActivity
}
type SceneState = {
  partner: boolean
  partnerAge?: number
  children: number
  childAges: number[]
  pets: ("cat" | "dog")[]
  housekeeper: boolean
  vehicle: "motorcycle" | "car" | "pickup" | null
}

const stageLabels: Record<LifeStage, string> = {
  infant: "ทารก",
  child: "เด็ก",
  teen: "วัยรุ่น",
  adult: "ผู้ใหญ่",
  elder: "ผู้สูงอายุ",
}

function activityForStage(stage: LifeStage): SceneActivity {
  if (stage === "infant") return "sleep"
  if (stage === "child") return "play"
  if (stage === "teen") return "read"
  if (stage === "elder") return "rest"
  return "walk"
}

function Sprite({ x, y, person }: { x: number; y: number; person: ScenePerson }) {
  const scale = person.stage === "infant" ? 0.76 : person.stage === "child" ? 0.82 : person.stage === "teen" ? 0.92 : 1
  const transform = "translate(" + x + " " + y + ") scale(" + scale + ")"
  const className = "life-scene-character life-scene-character--" + person.stage + " life-scene-activity--" + person.activity
  const labelY = person.stage === "infant" ? 59 : 75

  if (person.stage === "infant") {
    return <g transform={transform}><g className={className} shapeRendering="crispEdges">
      <ellipse cx="16" cy="13" rx="10" ry="9" fill="#dca77f" />
      <path d="M7 11 Q8 -1 19 3 Q25 4 26 12 L22 8 L12 8 Z" fill={person.hair} />
      <rect x="11" y="13" width="2" height="2" fill="#493b35" /><rect x="19" y="13" width="2" height="2" fill="#493b35" />
      <path d="M3 25 Q16 17 29 25 L34 45 Q17 54 0 45 Z" fill={person.shirt} />
      <path d="M5 36 Q16 43 29 35" fill="none" stroke="#f5e7c9" strokeWidth="4" />
      <path d="M2 28 Q-2 35 4 39 M30 28 Q36 35 30 39" fill="none" stroke="#dca77f" strokeWidth="4" />
      <text x="16" y={labelY} textAnchor="middle" fontSize="8" fill="#52645a">{person.label}</text>
    </g></g>
  }

  const child = person.stage === "child"
  const teen = person.stage === "teen"
  const elder = person.stage === "elder"
  const bodyWidth = child ? 21 : 24
  const bodyX = 16 - bodyWidth / 2
  const bodyHeight = child ? 18 : teen ? 21 : 23
  const legStart = 22 + bodyHeight
  return <g transform={transform}><g className={className} shapeRendering="crispEdges">
    <rect x={child ? 8 : 7} y="0" width={child ? 16 : 18} height={child ? 16 : 17} rx="5" fill="#dca77f" />
    <path d={elder ? "M6 8 Q7 -3 16 1 Q25 -3 27 9 L23 7 L20 4 L13 7 Z" : "M6 8 Q6 -2 16 0 Q26 -2 27 8 L23 7 L20 4 L12 7 Z"} fill={elder ? "#aeb3ad" : person.hair} />
    <rect x="10" y="9" width="2" height="2" fill="#493b35" /><rect x="20" y="9" width="2" height="2" fill="#493b35" />
    <rect x="10" y="17" width="13" height="5" fill="#dca77f" />
    {child && <path d="M4 25 L0 30 L5 39 L8 36 M28 25 L33 30 L28 39 L25 36" fill="none" stroke="#dca77f" strokeWidth="4" />}
    {!child && <path d="M4 25 L0 38 L5 43 M28 25 L32 38 L27 43" fill="none" stroke="#dca77f" strokeWidth="5" />}
    <rect x={bodyX} y="22" width={bodyWidth} height={bodyHeight} rx="4" fill={person.shirt} />
    {teen && <path d="M5 24 L1 29 L5 43" fill="none" stroke="#b58a58" strokeWidth="3" />}
    <rect x="7" y={legStart} width={child ? 6 : 7} height={child ? 10 : 15} fill="#4b5662" />
    <rect x="19" y={legStart} width={child ? 6 : 7} height={child ? 10 : 15} fill="#4b5662" />
    <rect x="5" y={legStart + (child ? 9 : 14)} width="10" height="4" rx="1" fill="#66534a" />
    <rect x="18" y={legStart + (child ? 9 : 14)} width="10" height="4" rx="1" fill="#66534a" />
    {person.activity === "read" && <g aria-hidden="true"><path d="M27 29 L39 26 L39 40 L27 43 Z" fill="#f0d99c" stroke="#987d55" strokeWidth="1.5" /><path d="M33 28 L33 41" stroke="#987d55" strokeWidth="1" /></g>}
    {person.activity === "play" && <g aria-hidden="true"><circle cx="38" cy="44" r="5" fill="#e6bd68" stroke="#9e8050" strokeWidth="1.5" /></g>}
    {elder && <g aria-hidden="true"><path d="M34 35 L34 61 Q34 65 39 65" fill="none" stroke="#806b51" strokeWidth="2.5" /><path d="M28 27 Q34 30 32 37" fill="none" stroke="#dca77f" strokeWidth="4" /></g>}
    <text x="16" y={labelY} textAnchor="middle" fontSize="8" fill="#52645a">{person.label}</text>
    </g></g>
}

function Cat({ x, y }: { x: number; y: number }) {
  return <g transform={"translate(" + x + " " + y + ")"} className="life-scene-pet" shapeRendering="crispEdges">
    <path d="M5 11 L2 1 L11 7 L21 7 L29 1 L27 13" fill="#8b8178" />
    <rect x="5" y="8" width="24" height="15" rx="7" fill="#b9a99a" />
    <rect x="10" y="13" width="3" height="3" fill="#3e5148" /><rect x="21" y="13" width="3" height="3" fill="#3e5148" />
    <path className="life-scene-pet-tail" d="M29 17 Q39 9 35 4" fill="none" stroke="#8b8178" strokeWidth="4" strokeLinecap="square" />
  </g>
}

function Dog({ x, y }: { x: number; y: number }) {
  return <g transform={"translate(" + x + " " + y + ")"} className="life-scene-pet" shapeRendering="crispEdges">
    <rect x="5" y="8" width="29" height="17" rx="6" fill="#bd8b5f" />
    <rect x="26" y="3" width="15" height="15" rx="6" fill="#d6a477" />
    <rect x="25" y="2" width="6" height="12" fill="#79553e" /><rect x="37" y="2" width="6" height="12" fill="#79553e" />
    <rect x="31" y="9" width="2" height="2" fill="#493b35" /><rect x="38" y="9" width="2" height="2" fill="#493b35" />
    <rect x="10" y="23" width="5" height="8" fill="#79553e" /><rect x="28" y="23" width="5" height="8" fill="#79553e" />
    <path className="life-scene-pet-tail" d="M5 13 Q-4 8 1 2" fill="none" stroke="#79553e" strokeWidth="4" />
  </g>
}

function Vehicle({ kind }: { kind: NonNullable<SceneState["vehicle"]> }) {
  const pickup = kind === "pickup"
  const bike = kind === "motorcycle"
  if (bike) return <g transform="translate(700 274)" shapeRendering="crispEdges"><circle cx="12" cy="25" r="10" fill="#34464a" /><circle cx="60" cy="25" r="10" fill="#34464a" /><path d="M12 25 L28 8 L43 25 L60 25 L47 5" fill="none" stroke="#d97745" strokeWidth="5" /><rect x="27" y="3" width="18" height="7" fill="#e9c16f" /></g>
  return <g transform="translate(674 260)" shapeRendering="crispEdges">
    <rect x="0" y="15" width="105" height="29" rx="7" fill={pickup ? "#698c79" : "#b86e55"} />
    <path d={pickup ? "M8 15 L20 0 H55 L68 15 Z" : "M12 15 L25 0 H70 L87 15 Z"} fill="#587c80" />
    <rect x="31" y="3" width="18" height="10" fill="#cce0df" /><rect x="53" y="3" width="17" height="10" fill="#cce0df" />
    {pickup && <rect x="72" y="18" width="25" height="17" fill="#547565" />}
    <circle cx="23" cy="45" r="9" fill="#34464a" /><circle cx="81" cy="45" r="9" fill="#34464a" />
  </g>
}

export default function LifeScene({ life }: { life: LifeRecord }) {
  const storedScene = life.householdScene
  const state: SceneState = {
    partner: storedScene?.partner ?? false,
    partnerAge: storedScene?.partnerAge,
    children: Math.max(0, Math.min(4, storedScene?.children ?? 0)),
    childAges: storedScene?.childAges ?? Array.from({ length: Math.max(0, storedScene?.children ?? 0) }, () => 0),
    pets: storedScene?.pets ?? [],
    housekeeper: storedScene?.housekeeper ?? false,
    vehicle: storedScene?.vehicle ?? null,
  }
  const selfStage = lifeStageForAge(life.age)
  const childPeople = state.childAges.slice(0, state.children).map((age, index): ScenePerson => {
    const stage = lifeStageForAge(age)
    return {
      id: "child-" + index,
      label: "ลูก " + (index + 1),
      shirt: index % 2 ? "#d5a85e" : "#7996a5",
      hair: "#4a3932",
      stage,
      activity: activityForStage(stage),
    }
  })
  const people: ScenePerson[] = [
    ...(life.age < 18 ? life.parents.slice(0, 2).map((job, index) => ({
      id: "parent-" + index,
      label: index === 0 ? "พ่อ" : "แม่",
      shirt: index === 0 ? "#628b79" : "#bd8c76",
      hair: "#493d35",
      stage: "adult" as LifeStage,
      activity: "rest" as SceneActivity,
    })) : []),
    {
      id: "self",
      label: "คุณ",
      shirt: "#507f76",
      hair: "#443a35",
      stage: selfStage,
      activity: activityForStage(selfStage),
    },
    ...(state.partner ? [{
      id: "partner",
      label: "คู่ชีวิต",
      shirt: "#c58d67",
      hair: "#4a3932",
      stage: lifeStageForAge(state.partnerAge ?? life.age),
      activity: "walk" as SceneActivity,
    }] : []),
    ...childPeople,
    ...(state.housekeeper ? [{
      id: "housekeeper",
      label: "แม่บ้าน",
      shirt: "#8d9b83",
      hair: "#4a3932",
      stage: "adult" as LifeStage,
      activity: "work" as SceneActivity,
    }] : []),
  ].slice(0, 9)
  const pets = state.pets.slice(0, 3)
  const hasExtras = state.partner || state.children > 0 || pets.length > 0 || state.housekeeper || !!state.vehicle
  const left = 30
  const right = 650
  const positions = people.map((_, index) => people.length <= 1 ? 330 : left + index * (right - left) / (people.length - 1))
  const stageSummary = "คุณอยู่ในวัย" + stageLabels[selfStage]

  return <section className="life-scene-card" aria-label="ภาพจำลองบ้านและสมาชิกในชีวิต">
    <div className="life-scene-heading"><div><span className="life-eyebrow">A LITTLE WORLD OF YOUR OWN</span><h2>ฉากชีวิตปัจจุบัน</h2></div><span className="life-scene-era">พ.ศ. {life.bornYear + life.age + 543} · {life.province}</span></div>
    <div className="life-scene-frame">
      <svg viewBox="0 0 820 390" role="img" aria-label={"ฉากบ้านของ " + life.name + " มีสมาชิกในครอบครัว " + people.length + " คน สัตว์เลี้ยง " + pets.length + " ตัว"}>
        <rect width="820" height="390" fill="#dcebe4" />
        <rect y="235" width="820" height="155" fill="#9ab79c" />
        <rect y="225" width="820" height="16" fill="#86a98c" />
        <circle className="life-scene-sun" cx="685" cy="65" r="29" fill="#f3d991" />
        <g className="life-scene-cloud" opacity=".65" fill="#f5faf4"><rect x="70" y="72" width="85" height="17" rx="8"/><rect x="100" y="59" width="45" height="22" rx="10"/><rect x="560" y="105" width="100" height="16" rx="8"/><rect x="595" y="91" width="44" height="21" rx="10"/></g>
        <g shapeRendering="crispEdges">
          <rect x="285" y="112" width="260" height="143" fill="#f1e3c9" />
          <path d="M265 118 L415 35 L565 118 Z" fill="#9c6955" />
          <path d="M281 114 L415 49 L549 114" fill="none" stroke="#805444" strokeWidth="8" />
          <rect x="312" y="151" width="53" height="48" fill="#91b7b0" stroke="#fff8e9" strokeWidth="7" />
          <rect x="466" y="151" width="53" height="48" fill="#91b7b0" stroke="#fff8e9" strokeWidth="7" />
          <rect x="390" y="177" width="52" height="78" fill="#936b51" /><rect x="430" y="212" width="4" height="4" fill="#f5d889" />
          <rect x="274" y="247" width="283" height="10" fill="#c7b18e" />
          <rect x="72" y="185" width="24" height="56" fill="#80634c" /><circle cx="84" cy="166" r="47" fill="#70947a" /><circle cx="54" cy="185" r="28" fill="#83a785" />
          <rect x="720" y="175" width="20" height="58" fill="#80634c" /><circle cx="730" cy="155" r="38" fill="#72967a" />
          <path d="M0 280 Q180 248 300 285 T600 278 T820 284 V390 H0Z" fill="#86aa88" />
          <path d="M370 255 Q390 300 405 390" stroke="#d8c6a2" strokeWidth="30" fill="none" />
          <rect x="165" y="248" width="28" height="8" fill="#6e896c"/><rect x="200" y="258" width="16" height="6" fill="#6e896c"/>
        </g>
        {people.map((person, index) => <Sprite key={person.id} x={positions[index]} y={250} person={person} />)}
        {pets.map((pet, index) => pet === "cat" ? <Cat key={"pet-" + index} x={590 + index * 42} y={318} /> : <Dog key={"pet-" + index} x={585 + index * 45} y={315} />)}
        {state.vehicle && <Vehicle kind={state.vehicle} />}
        <g fill="#6e8e70" shapeRendering="crispEdges"><rect x="120" y="220" width="8" height="22"/><rect x="110" y="211" width="28" height="11"/><rect x="620" y="235" width="9" height="18"/><rect x="612" y="226" width="25" height="10"/></g>
      </svg>
    </div>
    <div className="life-scene-legend">
      <span><i className="scene-dot home" /> บ้านในเรื่องราว</span>
      <span><i className="scene-dot people" /> {people.length} ตัวละคร</span>
      <span><i className="scene-dot people" /> {stageSummary}</span>
      {pets.length > 0 && <span><i className="scene-dot pet" /> สัตว์เลี้ยง {pets.length}</span>}
      {state.vehicle && <span><i className="scene-dot vehicle" /> {state.vehicle === "motorcycle" ? "รถจักรยานยนต์" : state.vehicle === "pickup" ? "รถกระบะ" : "รถยนต์"}</span>}
      {state.housekeeper && <span><i className="scene-dot helper" /> ผู้ช่วยในบ้าน</span>}
      {!hasExtras && <small>ฉากและสมาชิกจะค่อย ๆ เปลี่ยนตามเหตุการณ์และการตัดสินใจของชีวิตนี้</small>}
      {hasExtras && <small>รูปลักษณ์ตามช่วงวัยและสมาชิกในฉากอิงจากข้อมูลชีวิตที่บันทึกไว้ · ท่าทางเคลื่อนไหวอย่างนุ่มนวล</small>}
    </div>
  </section>
}
