export type LifeStats = {
  health: number
  happiness: number
  education: number
  relationships: number
  skills: number
  wealth: number
}

export type LifeChoice = {
  id: string
  label: string
  outcome: string
  effects: Partial<LifeStats>
}

export type LifeEvent = {
  id: string
  age: number
  title: string
  description: string
  choices: LifeChoice[]
}

export type LifeEntry = {
  id: string
  age: number
  title: string
  detail: string
  year: number
}

export type LifeRecord = {
  id: string
  name: string
  gender: string
  country: string
  region: string
  family: string
  background: string
  bornYear: number
  age: number
  expectedLifespan: number
  status: "alive" | "ended"
  stats: LifeStats
  pendingEvent: LifeEvent | null
  timeline: LifeEntry[]
  createdAt: string
  endedAt?: string
}

const origins = [
  { country: "อินเดีย", region: "เอเชียใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในครอบครัวใหญ่ที่ช่วยเหลือกัน", wealth: 500, education: 35, weight: 17.8, lifeExpectancy: 68 },
  { country: "จีน", region: "เอเชียตะวันออก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองหรือชุมชนที่มีการเปลี่ยนแปลงรวดเร็ว", wealth: 2600, education: 62, weight: 17.4, lifeExpectancy: 78 },
  { country: "สหรัฐอเมริกา", region: "อเมริกาเหนือ", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในชานเมืองที่มีความหลากหลาย", wealth: 6800, education: 68, weight: 4.2, lifeExpectancy: 77 },
  { country: "อินโดนีเซีย", region: "เอเชียตะวันออกเฉียงใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนที่มีความผูกพัน", wealth: 1000, education: 49, weight: 3.5, lifeExpectancy: 71 },
  { country: "ปากีสถาน", region: "เอเชียใต้", family: "ครอบครัวรายได้น้อย", background: "เติบโตในครอบครัวที่มีเครือญาติใกล้ชิด", wealth: 600, education: 39, weight: 3.1, lifeExpectancy: 67 },
  { country: "ไนจีเรีย", region: "แอฟริกาตะวันตก", family: "ครอบครัวรายได้น้อย", background: "เติบโตในเมืองที่มีชีวิตชีวาและความท้าทาย", wealth: 650, education: 38, weight: 2.9, lifeExpectancy: 54 },
  { country: "บราซิล", region: "อเมริกาใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในเมืองที่มีความหลากหลายทางวัฒนธรรม", wealth: 1100, education: 48, weight: 2.7, lifeExpectancy: 75 },
  { country: "บังกลาเทศ", region: "เอเชียใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนที่ผู้คนพึ่งพาอาศัยกัน", wealth: 700, education: 44, weight: 2.1, lifeExpectancy: 73 },
  { country: "รัสเซีย", region: "ยุโรปตะวันออก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองที่มีฤดูกาลแตกต่างชัดเจน", wealth: 2400, education: 67, weight: 1.8, lifeExpectancy: 70 },
  { country: "เม็กซิโก", region: "อเมริกาเหนือ", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนที่มีวัฒนธรรมเข้มแข็ง", wealth: 1300, education: 47, weight: 1.6, lifeExpectancy: 75 },
  { country: "ญี่ปุ่น", region: "เอเชียตะวันออก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองที่มีระบบขนส่งสะดวก", wealth: 4200, education: 66, weight: 1.5, lifeExpectancy: 84 },
  { country: "เอธิโอเปีย", region: "แอฟริกาตะวันออก", family: "ครอบครัวชนบท", background: "เติบโตใกล้ชิดธรรมชาติและชุมชน", wealth: 450, education: 33, weight: 1.4, lifeExpectancy: 66 },
  { country: "ฟิลิปปินส์", region: "เอเชียตะวันออกเฉียงใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนที่ครอบครัวมีบทบาทสำคัญ", wealth: 950, education: 52, weight: 1.4, lifeExpectancy: 71 },
  { country: "อียิปต์", region: "แอฟริกาเหนือ", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในสังคมที่มีประวัติศาสตร์ยาวนาน", wealth: 900, education: 48, weight: 1.3, lifeExpectancy: 70 },
  { country: "เวียดนาม", region: "เอเชียตะวันออกเฉียงใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนที่ให้ความสำคัญกับการศึกษา", wealth: 1100, education: 58, weight: 1.2, lifeExpectancy: 74 },
  { country: "สาธารณรัฐประชาธิปไตยคองโก", region: "แอฟริกากลาง", family: "ครอบครัวรายได้น้อย", background: "เติบโตในครอบครัวที่มีเครือญาติใกล้ชิด", wealth: 400, education: 31, weight: 1.2, lifeExpectancy: 62 },
  { country: "อิหร่าน", region: "เอเชียตะวันตก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองที่มีมรดกทางวัฒนธรรม", wealth: 1700, education: 61, weight: 1.1, lifeExpectancy: 75 },
  { country: "เยอรมนี", region: "ยุโรปตะวันตก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองขนาดกลาง", wealth: 5200, education: 72, weight: 1.0, lifeExpectancy: 81 },
  { country: "ตุรกี", region: "เอเชียตะวันตก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตระหว่างวัฒนธรรมหลายภูมิภาค", wealth: 1900, education: 55, weight: 1.0, lifeExpectancy: 77 },
  { country: "ประเทศไทย", region: "เอเชียตะวันออกเฉียงใต้", family: "ครอบครัวชนชั้นแรงงาน", background: "เติบโตในชุมชนเมืองขนาดเล็ก", wealth: 900, education: 52, weight: 0.9, lifeExpectancy: 79 },
  { country: "ฝรั่งเศส", region: "ยุโรปตะวันตก", family: "ครอบครัวชนชั้นกลาง", background: "เติบโตในเมืองที่เต็มไปด้วยศิลปะและประวัติศาสตร์", wealth: 4700, education: 70, weight: 0.8, lifeExpectancy: 82 },
  { country: "เคนยา", region: "แอฟริกาตะวันออก", family: "ครอบครัวชนบท", background: "เติบโตใกล้ชิดธรรมชาติและชุมชน", wealth: 700, education: 40, weight: 0.7, lifeExpectancy: 62 },
  { country: "ประเทศอื่น ๆ", region: "ภูมิภาคอื่นของโลก", family: "ครอบครัวที่มีบริบทเฉพาะ", background: "เติบโตในหนึ่งในอีกหลายประเทศของโลก", wealth: 1500, education: 50, weight: 29.4, lifeExpectancy: 72 },
]

const firstNames = ["อเล็กซ์", "มิน", "โซเฟีย", "อามีร์", "ลิน", "โนอาห์", "อารยา", "เรย์", "เอลล่า", "คีริน"]
const genders = ["หญิง", "ชาย", "ไม่ระบุ"]

const eventBank: Array<Omit<LifeEvent, "id" | "age"> & { min: number; max: number }> = [
  { min: 1, max: 5, title: "โลกใบแรกของฉัน", description: "คุณเริ่มรับรู้โลกผ่านเสียง กลิ่น และใบหน้าของคนที่ดูแลคุณ ช่วงเวลานี้ความอบอุ่นจากครอบครัวสำคัญมาก", choices: [
    { id: "close", label: "ใช้เวลาใกล้ชิดกับครอบครัว", outcome: "ความผูกพันในบ้านค่อย ๆ เติบโต", effects: { happiness: 7, relationships: 5, health: 2 } },
    { id: "explore", label: "ออกไปเรียนรู้สิ่งรอบตัว", outcome: "ความอยากรู้อยากเห็นเริ่มก่อตัว", effects: { skills: 5, happiness: 3 } },
  ] },
  { min: 6, max: 11, title: "วันแรกในโรงเรียน", description: "คุณได้พบเพื่อนใหม่และเริ่มเรียนรู้กติกาของโลกนอกบ้าน จะใช้เวลาในวัยเด็กแบบไหนดี?", choices: [
    { id: "study", label: "ตั้งใจเรียนและค้นหาสิ่งที่ชอบ", outcome: "พื้นฐานการเรียนรู้ของคุณแข็งแรงขึ้น", effects: { education: 8, skills: 5, happiness: -1 } },
    { id: "friends", label: "ใช้เวลากับเพื่อนและกิจกรรม", outcome: "คุณเริ่มสร้างมิตรภาพที่มีความหมาย", effects: { relationships: 9, happiness: 5, skills: 2 } },
  ] },
  { min: 12, max: 17, title: "ค้นหาตัวเอง", description: "ช่วงวัยรุ่นมาพร้อมคำถามมากมาย คุณเริ่มมีความฝันและมองเห็นเส้นทางที่แตกต่างจากคนรอบตัว", choices: [
    { id: "creative", label: "ลองทำสิ่งใหม่และสร้างผลงาน", outcome: "คุณค้นพบความสามารถที่ซ่อนอยู่", effects: { skills: 10, happiness: 5, education: 2 } },
    { id: "responsible", label: "ช่วยแบ่งเบาภาระครอบครัว", outcome: "คุณเติบโตเป็นคนที่รับผิดชอบมากขึ้น", effects: { relationships: 6, skills: 5, wealth: 2 } },
  ] },
  { min: 18, max: 24, title: "ก้าวแรกสู่โลกผู้ใหญ่", description: "คุณต้องตัดสินใจว่าจะเรียนต่อ ทำงาน หรือทดลองเส้นทางใหม่ ทุกทางมีโอกาสและต้นทุนของมัน", choices: [
    { id: "university", label: "เรียนต่อเพื่อเพิ่มโอกาสในอนาคต", outcome: "การศึกษาเปิดประตูสู่โอกาสใหม่ แต่ต้องใช้เวลาและเงิน", effects: { education: 12, skills: 6, wealth: -900, happiness: 1 } },
    { id: "work", label: "เริ่มทำงานและสร้างรายได้", outcome: "คุณเริ่มมีรายได้และประสบการณ์จากโลกจริง", effects: { wealth: 1300, skills: 7, education: 1 } },
  ] },
  { min: 25, max: 34, title: "โอกาสที่เข้ามา", description: "มีโอกาสใหม่เข้ามาในชีวิต อาจเป็นงานที่ท้าทายกว่าเดิม หรือการเริ่มต้นบางอย่างด้วยตัวเอง", choices: [
    { id: "career", label: "รับความท้าทายใหม่ในงาน", outcome: "ประสบการณ์และทักษะของคุณเพิ่มขึ้น", effects: { skills: 10, wealth: 1200, happiness: -2 } },
    { id: "balance", label: "เลือกเวลาชีวิตและความสัมพันธ์", outcome: "คุณมีพื้นที่ให้คนสำคัญและตัวเองมากขึ้น", effects: { happiness: 9, relationships: 8, health: 3 } },
  ] },
  { min: 35, max: 49, title: "สิ่งที่สร้างมาถึงวันนี้", description: "คุณเริ่มมองเห็นผลของการตัดสินใจในอดีต และอาจต้องเลือกระหว่างความมั่นคงกับการเปลี่ยนแปลง", choices: [
    { id: "build", label: "สร้างความมั่นคงระยะยาว", outcome: "คุณค่อย ๆ สร้างฐานชีวิตที่มั่นคงขึ้น", effects: { wealth: 1800, happiness: 2, health: -2 } },
    { id: "change", label: "เริ่มต้นบทใหม่ที่อยากทำ", outcome: "การเปลี่ยนแปลงทำให้ชีวิตมีความหมายในแบบใหม่", effects: { happiness: 10, skills: 6, wealth: -500 } },
  ] },
  { min: 50, max: 64, title: "มองชีวิตจากอีกมุม", description: "ประสบการณ์ที่ผ่านมาเปลี่ยนวิธีที่คุณมองโลก คุณอยากใช้ช่วงเวลาต่อจากนี้อย่างไร?", choices: [
    { id: "mentor", label: "แบ่งปันประสบการณ์ให้คนรุ่นหลัง", outcome: "ความสัมพันธ์และความรู้สึกมีคุณค่าของคุณเพิ่มขึ้น", effects: { relationships: 10, happiness: 7, skills: 3 } },
    { id: "health", label: "หันมาใส่ใจสุขภาพและความสงบ", outcome: "คุณเริ่มให้ความสำคัญกับการดูแลตัวเอง", effects: { health: 12, happiness: 5, wealth: -250 } },
  ] },
  { min: 65, max: 100, title: "วันเวลาที่มีความหมาย", description: "คุณผ่านเรื่องราวมามากมายแล้ว อะไรคือสิ่งที่อยากรักษาไว้ในช่วงเวลานี้?", choices: [
    { id: "family", label: "ใช้เวลากับคนที่รัก", outcome: "ช่วงเวลาธรรมดากลายเป็นความทรงจำที่มีค่า", effects: { relationships: 10, happiness: 8 } },
    { id: "legacy", label: "ทำสิ่งที่อยากฝากไว้ให้โลก", outcome: "คุณได้ส่งต่อบางอย่างที่มีความหมาย", effects: { skills: 5, happiness: 9, relationships: 5 } },
  ] },
]

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}
function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let point = Math.random() * total
  for (const item of items) {
    point -= item.weight
    if (point < 0) return item
  }
  return items[items.length - 1]
}
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function createLife(name = ""): LifeRecord {
  const origin = pickWeighted(origins)
  const gender = pick(genders)
  const age = 0
  const lifeName = name.trim() || pick(firstNames)
  const life: LifeRecord = {
    id: crypto.randomUUID(),
    name: lifeName,
    gender,
    country: origin.country,
    region: origin.region,
    family: origin.family,
    background: origin.background,
    bornYear: new Date().getFullYear(),
    age,
    expectedLifespan: Math.max(50, origin.lifeExpectancy + Math.floor(Math.random() * 17) - 8),
    status: "alive",
    stats: { health: 82, happiness: 65, education: origin.education, relationships: 55, skills: 35, wealth: origin.wealth },
    pendingEvent: null,
    timeline: [{ id: crypto.randomUUID(), age: 0, year: new Date().getFullYear(), title: "วันแรกของชีวิต", detail: `คุณได้ถือกำเนิดในประเทศ${origin.country} · ${origin.family}` }],
    createdAt: new Date().toISOString(),
  }
  return life
}

export function advanceLife(life: LifeRecord): LifeRecord {
  if (life.status !== "alive" || life.pendingEvent) return life
  const nextAge = life.age + 1
  if (nextAge >= life.expectedLifespan) {
    const ended: LifeRecord = {
      ...life, age: nextAge, status: "ended", endedAt: new Date().toISOString(),
      timeline: [{ id: crypto.randomUUID(), age: nextAge, year: life.bornYear + nextAge, title: "เรื่องราวชีวิตเดินทางมาถึงปลายทาง", detail: "ชีวิตหนึ่งได้สิ้นสุดลง เหลือไว้ซึ่งความทรงจำและผลของการตัดสินใจ" }, ...life.timeline],
    }
    return ended
  }
  const template = eventBank.find(event => nextAge >= event.min && nextAge <= event.max) ?? eventBank[eventBank.length - 1]
  const pendingEvent: LifeEvent = {
    id: crypto.randomUUID(), age: nextAge, title: template.title, description: template.description,
    choices: template.choices,
  }
  return { ...life, age: nextAge, pendingEvent }
}

export function resolveLifeChoice(life: LifeRecord, choiceId: string): LifeRecord {
  const event = life.pendingEvent
  if (!event) return life
  const choice = event.choices.find(item => item.id === choiceId)
  if (!choice) return life
  const stats = { ...life.stats }
  for (const [key, value] of Object.entries(choice.effects)) {
    const statKey = key as keyof LifeStats
    stats[statKey] = statKey === "wealth" ? Math.max(-50000, stats.wealth + (value ?? 0)) : clamp(stats[statKey] + (value ?? 0))
  }
  const entry: LifeEntry = {
    id: crypto.randomUUID(), age: life.age, year: life.bornYear + life.age,
    title: event.title, detail: choice.outcome,
  }
  return { ...life, stats, pendingEvent: null, timeline: [entry, ...life.timeline] }
}

export function validateLifeRecord(value: unknown): value is LifeRecord {
  if (!value || typeof value !== "object") return false
  const life = value as Partial<LifeRecord>
  return typeof life.id === "string" && typeof life.name === "string" &&
    typeof life.age === "number" && typeof life.bornYear === "number" &&
    (life.status === "alive" || life.status === "ended") &&
    !!life.stats && typeof life.stats.health === "number" &&
    Array.isArray(life.timeline)
}
