import type { LifeRecord } from "./lifeSimulation"

type SceneState = {
  partner: boolean
  children: number
  pets: ("cat" | "dog")[]
  housekeeper: boolean
  vehicle: "motorcycle" | "car" | "pickup" | null
}

function Sprite({ x, y, shirt, hair, label, small = false }: { x:number; y:number; shirt:string; hair:string; label:string; small?:boolean }) {
  const scale = small ? 0.78 : 1
  return <g transform={`translate(${x} ${y}) scale(${scale})`} shapeRendering="crispEdges">
    <rect x="7" y="0" width="18" height="17" rx="5" fill="#dca77f" />
    <rect x="6" y="0" width="20" height="7" rx="4" fill={hair} />
    <rect x="10" y="9" width="2" height="2" fill="#493b35" /><rect x="20" y="9" width="2" height="2" fill="#493b35" />
    <rect x="10" y="17" width="13" height="5" fill="#dca77f" />
    <rect x="4" y="22" width="24" height="23" rx="4" fill={shirt} />
    <rect x="0" y="25" width="5" height="17" rx="2" fill="#dca77f" /><rect x="27" y="25" width="5" height="17" rx="2" fill="#dca77f" />
    <rect x="7" y="44" width="7" height="15" fill="#4b5662" /><rect x="19" y="44" width="7" height="15" fill="#4b5662" />
    <rect x="5" y="57" width="10" height="4" rx="1" fill="#66534a" /><rect x="18" y="57" width="10" height="4" rx="1" fill="#66534a" />
    <text x="16" y="75" textAnchor="middle" fontSize="8" fill="#52645a">{label}</text>
  </g>
}

function Cat({ x, y }: { x:number; y:number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges">
    <path d="M5 11 L2 1 L11 7 L21 7 L29 1 L27 13" fill="#8b8178" />
    <rect x="5" y="8" width="24" height="15" rx="7" fill="#b9a99a" />
    <rect x="10" y="13" width="3" height="3" fill="#3e5148" /><rect x="21" y="13" width="3" height="3" fill="#3e5148" />
    <path d="M29 17 Q39 9 35 4" fill="none" stroke="#8b8178" strokeWidth="4" strokeLinecap="square" />
  </g>
}

function Dog({ x, y }: { x:number; y:number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges">
    <rect x="5" y="8" width="29" height="17" rx="6" fill="#bd8b5f" />
    <rect x="26" y="3" width="15" height="15" rx="6" fill="#d6a477" />
    <rect x="25" y="2" width="6" height="12" fill="#79553e" /><rect x="37" y="2" width="6" height="12" fill="#79553e" />
    <rect x="31" y="9" width="2" height="2" fill="#493b35" /><rect x="38" y="9" width="2" height="2" fill="#493b35" />
    <rect x="10" y="23" width="5" height="8" fill="#79553e" /><rect x="28" y="23" width="5" height="8" fill="#79553e" />
  </g>
}

function Vehicle({ kind }: { kind:NonNullable<SceneState["vehicle"]> }) {
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

export default function LifeScene({ life }: { life:LifeRecord }) {
  const state:SceneState = {
    partner: life.householdScene?.partner ?? false,
    children: Math.max(0, Math.min(4, life.householdScene?.children ?? 0)),
    pets: life.householdScene?.pets ?? [],
    housekeeper: life.householdScene?.housekeeper ?? false,
    vehicle: life.householdScene?.vehicle ?? null,
  }
  const young = life.age < 18
  const people = [
    ...(young ? life.parents.slice(0, 2).map((job, i) => ({ label:i === 0 ? "พ่อ" : "แม่", shirt:i === 0 ? "#628b79" : "#bd8c76", hair:"#493d35" })) : []),
    { label:"คุณ", shirt:"#507f76", hair:"#443a35" },
    ...(state.partner ? [{ label:"คู่ชีวิต", shirt:"#c58d67", hair:"#4a3932" }] : []),
    ...Array.from({ length:state.children }, (_, i) => ({ label:`ลูก ${i+1}`, shirt:i % 2 ? "#d5a85e" : "#7996a5", hair:"#4a3932" })),
    ...(state.housekeeper ? [{ label:"แม่บ้าน", shirt:"#8d9b83", hair:"#4a3932" }] : []),
  ].slice(0, 7)
  const positions = [90, 172, 254, 336, 418, 500, 582]
  const pets = state.pets.slice(0, 3)
  const hasExtras = state.partner || state.children > 0 || pets.length > 0 || state.housekeeper || !!state.vehicle
  return <section className="life-scene-card" aria-label="ภาพจำลองบ้านและสมาชิกในชีวิต">
    <div className="life-scene-heading"><div><span className="life-eyebrow">A LITTLE WORLD OF YOUR OWN</span><h2>ฉากชีวิตปัจจุบัน</h2></div><span className="life-scene-era">พ.ศ. {life.bornYear + life.age + 543} · {life.province}</span></div>
    <div className="life-scene-frame">
      <svg viewBox="0 0 820 390" role="img" aria-label={`ฉากบ้านของ ${life.name} มีสมาชิกในครอบครัว ${people.length} คน สัตว์เลี้ยง ${pets.length} ตัว`}>
        <rect width="820" height="390" fill="#dcebe4" />
        <rect y="235" width="820" height="155" fill="#9ab79c" />
        <rect y="225" width="820" height="16" fill="#86a98c" />
        <circle cx="685" cy="65" r="29" fill="#f3d991" />
        <g opacity=".65" fill="#f5faf4"><rect x="70" y="72" width="85" height="17" rx="8"/><rect x="100" y="59" width="45" height="22" rx="10"/><rect x="560" y="105" width="100" height="16" rx="8"/><rect x="595" y="91" width="44" height="21" rx="10"/></g>
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
        {people.map((person, i) => <Sprite key={person.label} x={positions[i]} y={250} shirt={person.shirt} hair={person.hair} label={person.label} small={i >= 4} />)}
        {pets.map((pet, i) => pet === "cat" ? <Cat key={`pet-${i}`} x={590 + i * 42} y={318} /> : <Dog key={`pet-${i}`} x={585 + i * 45} y={315} />)}
        {state.vehicle && <Vehicle kind={state.vehicle} />}
        <g fill="#6e8e70" shapeRendering="crispEdges"><rect x="120" y="220" width="8" height="22"/><rect x="110" y="211" width="28" height="11"/><rect x="620" y="235" width="9" height="18"/><rect x="612" y="226" width="25" height="10"/></g>
      </svg>
    </div>
    <div className="life-scene-legend">
      <span><i className="scene-dot home" /> บ้านในเรื่องราว</span>
      <span><i className="scene-dot people" /> {people.length} ตัวละคร</span>
      {pets.length > 0 && <span><i className="scene-dot pet" /> สัตว์เลี้ยง {pets.length}</span>}
      {state.vehicle && <span><i className="scene-dot vehicle" /> {state.vehicle === "motorcycle" ? "รถจักรยานยนต์" : state.vehicle === "pickup" ? "รถกระบะ" : "รถยนต์"}</span>}
      {state.housekeeper && <span><i className="scene-dot helper" /> ผู้ช่วยในบ้าน</span>}
      {!hasExtras && <small>ฉากและสมาชิกจะค่อย ๆ เปลี่ยนตามเหตุการณ์และการตัดสินใจของชีวิตนี้</small>}
      {hasExtras && <small>องค์ประกอบในฉากมาจากเหตุการณ์ที่เลือกและบันทึกไว้ในชีวิตนี้</small>}
    </div>
  </section>
}
