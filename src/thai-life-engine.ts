/**
 * Money102 Life Simulation — deterministic rules only.
 * No LLM, Gemini, AI API, or random behavior that cannot be replayed.
 */
export type Need = "hunger" | "energy" | "hygiene" | "social" | "fun" | "bladder"
export type ActivityId = "sleep" | "eat" | "bathe" | "work" | "commute" | "shop" | "cook" | "clean" | "socialize" | "relax" | "exercise" | "study" | "use_phone" | "use_toilet" | "travel" | "idle"
export type Gender = "female" | "male" | "nonbinary"
export type LifeStatus = "awake" | "sleeping" | "working" | "travelling" | "at_home" | "out"
export type ThaiResident = {
  id: string; name: string; gender: Gender; age: number; occupation: string; home: string
  personality: string[]; bio: string; x: number; y: number; color: string
  money: number; needs: Record<Need, number>; mood: number; health: number
  relationship: Record<string, number>; activity: ActivityId; activityStartedAt: number
  status: LifeStatus; sleepDebt: number; workShift: { start: number; end: number } | null
  routine: Partial<Record<number, ActivityId>>; queuedActivity?: ActivityId; lastMealAt: number
  lastSocialAt: number; lastUpdatedAt: number; flags: string[]
}
export type LifeEvent = { id: string; minute: number; residentId: string; text: string; kind: "routine"|"need"|"social"|"money"|"player"|"health" }
export type LifeWorld = { version: 1; minute: number; day: number; residents: ThaiResident[]; events: LifeEvent[]; updatedAt: number }
export type PlayerCommand = { residentId: string; activity: ActivityId; target?: string }

const clamp = (n:number, min=0, max=100) => Math.max(min, Math.min(max, n))
const hour = (minute:number) => Math.floor((minute % 1440 + 1440) % 1440 / 60)
const uid = (prefix:string, minute:number, residentId:string) => prefix + "-" + minute + "-" + residentId

function resident(data: Omit<ThaiResident, "needs"|"mood"|"health"|"relationship"|"activity"|"activityStartedAt"|"status"|"sleepDebt"|"lastMealAt"|"lastSocialAt"|"lastUpdatedAt"|"flags">): ThaiResident {
  return { ...data, needs:{hunger:82,energy:80,hygiene:76,social:55,fun:52,bladder:78}, mood:68, health:88, relationship:{}, activity:"idle", activityStartedAt:0, status:"awake", sleepDebt:0, lastMealAt:420, lastSocialAt:480, lastUpdatedAt:0, flags:[] }
}

/** Fresh Thai neighbourhood. New identities replace the old Mira/Nori/Kai cast. */
export function createThaiLifeWorld(now = Date.now()): LifeWorld {
  const residents: ThaiResident[] = [
    resident({id:"ploy",name:"พลอย",gender:"female",age:27,occupation:"พนักงานบัญชี",home:"ห้องเช่าใกล้ตลาด",personality:["รับผิดชอบ","ประหยัด","เกรงใจ"],bio:"ทำงานบัญชีในบริษัทเล็ก ๆ ชอบกินข้าวแกงร้านป้าหน้าปากซอยและโทรหาแม่หลังเลิกงาน",x:24,y:29,color:"coral",money:6450,workShift:{start:9,end:18},routine:{6:"use_phone",7:"eat",8:"commute",9:"work",12:"eat",13:"work",18:"commute",19:"eat",20:"relax",22:"use_phone",23:"sleep"}}),
    resident({id:"non",name:"นนท์",gender:"male",age:30,occupation:"ไรเดอร์ส่งอาหาร",home:"บ้านเช่ากับเพื่อน",personality:["คล่องแคล่ว","เป็นมิตร","ใจร้อนนิด ๆ"],bio:"รับงานส่งอาหารตามช่วงพีค ชอบแวะร้านกาแฟโบราณและส่งเงินกลับบ้านต่างจังหวัด",x:55,y:54,color:"blue",money:3280,workShift:{start:10,end:21},routine:{7:"eat",8:"use_phone",10:"work",12:"eat",13:"work",17:"eat",18:"work",21:"relax",23:"sleep"}}),
    resident({id:"fah",name:"ฟ้า",gender:"female",age:22,occupation:"นักศึกษามหาวิทยาลัย",home:"หอพักนักศึกษา",personality:["ช่างสงสัย","เข้าสังคมเก่ง","ใช้เงินตามใจ"],bio:"เรียนมหาวิทยาลัย ทำงานพิเศษวันหยุด ชอบชานม ตลาดนัด และอ่านหนังสือก่อนสอบ",x:76,y:31,color:"mint",money:1850,workShift:null,routine:{7:"bathe",8:"eat",9:"commute",10:"study",12:"eat",13:"study",16:"socialize",18:"commute",19:"eat",20:"use_phone",23:"sleep"}}),
    resident({id:"ลุงสมชาย".normalize("NFC"),name:"ลุงสมชาย",gender:"male",age:58,occupation:"เจ้าของร้านข้าวแกง",home:"บ้านไม้หลังตลาด",personality:["ใจดี","ขยัน","รักชุมชน"],bio:"เปิดร้านข้าวแกงแต่เช้ามืด รู้จักคนในชุมชนแทบทุกคนและชอบรดน้ำต้นไม้ตอนเย็น",x:37,y:75,color:"amber",money:12800,workShift:{start:5,end:14},routine:{4:"relax",5:"cook",6:"work",11:"eat",12:"work",14:"relax",16:"clean",18:"socialize",20:"relax",21:"sleep"}}),
    resident({id:"may",name:"เมย์",gender:"female",age:34,occupation:"พยาบาลเวรสลับ",home:"แฟลตบุคลากร",personality:["ละเอียดรอบคอบ","อดทน","ห่วงใยคนอื่น"],bio:"ทำงานเป็นกะ พยายามดูแลเวลานอนให้พอ ชอบเดินสวนสาธารณะในวันที่หยุด",x:67,y:72,color:"lavender",money:9720,workShift:{start:7,end:19},routine:{5:"bathe",6:"eat",7:"work",12:"eat",13:"work",19:"commute",20:"eat",21:"relax",22:"sleep"}}),
    resident({id:"เจ".normalize("NFC"),name:"เจ",gender:"nonbinary",age:25,occupation:"ช่างซ่อมมือถือ",home:"ทาวน์เฮาส์กับพี่สาว",personality:["ช่างแก้ปัญหา","รักอิสระ","อารมณ์ขัน"],bio:"ซ่อมมือถือและคอมพิวเตอร์ในร้านเล็ก ๆ ชอบเล่นเกมกับเพื่อนหลังปิดร้าน",x:45,y:20,color:"teal",money:5100,workShift:{start:10,end:19},routine:{8:"eat",9:"commute",10:"work",12:"eat",13:"work",19:"commute",20:"eat",21:"use_phone",23:"sleep"}})
  ]
  return {version:1,minute:7*60,day:1,residents,events:[{id:"welcome",minute:420,residentId:"",kind:"routine",text:"เช้าวันใหม่ในชุมชนไทย ร้านข้าวแกงเริ่มเปิดและผู้คนกำลังเตรียมตัวออกจากบ้าน"}],updatedAt:now}
}

export function thaiTimeLabel(minute:number) {
  const m = ((minute % 1440) + 1440) % 1440
  return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")
}
export function thaiDayPart(minute:number) {
  const h=hour(minute)
  if(h>=4&&h<6)return "ก่อนรุ่งสาง"
  if(h>=6&&h<11)return "เช้า"
  if(h>=11&&h<14)return "เที่ยง"
  if(h>=14&&h<17)return "บ่าย"
  if(h>=17&&h<20)return "เย็น"
  if(h>=20&&h<23)return "กลางคืน"
  return "ดึก"
}
const activityEffects: Record<ActivityId, Record<string, number>> = {
  sleep:{energy:0.72,hunger:-0.05,bladder:-0.08}, eat:{hunger:0.8,fun:0.03}, cook:{hunger:0.06,energy:-0.06},
  bathe:{hygiene:0.8,energy:-0.02}, work:{energy:-0.12,hunger:-0.09,fun:-0.03}, commute:{energy:-0.04,fun:-0.01},
  shop:{fun:0.04,energy:-0.04}, clean:{hygiene:0.05,energy:-0.08}, socialize:{social:0.24,fun:0.1,energy:-0.03},
  relax:{energy:0.12,fun:0.12}, exercise:{health:0.1,energy:-0.16,fun:0.03}, study:{energy:-0.1,fun:-0.02},
  use_phone:{fun:0.08,social:0.04,energy:-0.02}, use_toilet:{bladder:0.85}, travel:{energy:-0.03}, idle:{energy:0.01}
}
const needsOf = (activity: ActivityId) => activityEffects[activity]
const activityText:Record<ActivityId,string> = {sleep:"กำลังนอนพัก",eat:"กำลังกินข้าว",bathe:"กำลังอาบน้ำ",work:"กำลังทำงาน",commute:"กำลังเดินทาง",shop:"กำลังซื้อของ",cook:"กำลังทำอาหาร",clean:"กำลังทำความสะอาด",socialize:"กำลังพูดคุยกับคนในชุมชน",relax:"กำลังพักผ่อน",exercise:"กำลังออกกำลังกาย",study:"กำลังเรียนหรืออ่านหนังสือ",use_phone:"กำลังใช้โทรศัพท์",use_toilet:"กำลังเข้าห้องน้ำ",travel:"กำลังเดินทาง",idle:"กำลังเลือกว่าจะทำอะไร"}

function chooseActivity(p:ThaiResident, minute:number):ActivityId {
  if(p.queuedActivity) return p.queuedActivity
  const h=hour(minute)
  // Physiological needs outrank routine, except urgent player orders.
  if(p.needs.bladder<15) return "use_toilet"
  if(p.needs.energy<13 || (p.sleepDebt>65 && p.needs.energy<32)) return "sleep"
  if(p.needs.hunger<18) return p.money>=35 ? "eat" : "cook"
  if(p.needs.hygiene<18) return "bathe"
  if(p.workShift && h>=p.workShift.start && h<p.workShift.end && p.needs.energy>20) return "work"
  const routine=p.routine[h]
  if(routine && p.needs.energy>12) return routine
  if(p.needs.social<22) return "socialize"
  if(p.needs.fun<20) return h>=22 || h<6 ? "sleep" : "relax"
  if(h>=23 || h<5) return "sleep"
  if(h>=6&&h<9) return "eat"
  if(h>=9&&h<17) return p.workShift ? "work" : "study"
  if(h>=17&&h<20) return "shop"
  return "relax"
}
function applyActivity(p:ThaiResident, activity:ActivityId, minute:number, world:LifeWorld) {
  p.activity=activity; p.activityStartedAt=minute; p.status=activity==="sleep"?"sleeping":activity==="work"?"working":activity==="commute"||activity==="travel"?"travelling":activity==="idle"?"awake":"out"
  const effects=needsOf(activity)
  for(const [key,value] of Object.entries(effects) as [string, number][]) {
    if(key==="health") p.health=clamp(p.health+value*10)
    else if(key in p.needs) p.needs[key as Need]=clamp(p.needs[key as Need]+value*10)
  }
  if(activity==="sleep") { p.sleepDebt=clamp(p.sleepDebt-4,0,100); p.needs.energy=clamp(p.needs.energy+8); }
  if(activity==="work") { p.money+=p.occupation.includes("ไรเดอร์")?55:p.occupation.includes("ร้าน")?80:120; p.sleepDebt=clamp(p.sleepDebt+0.5); }
  if(activity==="eat") { const cost=p.money>=70?55:25; p.money=Math.max(0,p.money-cost); p.needs.hunger=clamp(p.needs.hunger+18); p.lastMealAt=minute; }
  if(activity==="cook") { p.needs.hunger=clamp(p.needs.hunger+13); p.money=Math.max(0,p.money-18); p.lastMealAt=minute; }
  if(activity==="socialize") {
    p.lastSocialAt=minute
    const others=world.residents.filter(o=>o.id!==p.id).sort((a,b)=>(p.relationship[b.id]||0)-(p.relationship[a.id]||0))
    const other=others[0]
    if(other){p.relationship[other.id]=clamp((p.relationship[other.id]||35)+2,0,100);other.relationship[p.id]=clamp((other.relationship[p.id]||35)+1,0,100)}
  }
  if(activity==="use_toilet") p.needs.bladder=clamp(p.needs.bladder+55)
  if(activity==="bathe") p.needs.hygiene=clamp(p.needs.hygiene+22)
  if(activity==="relax") p.needs.energy=clamp(p.needs.energy+2)
  if(activity==="exercise") p.health=clamp(p.health+1)
  p.mood=clamp(((p.needs.energy+p.needs.hunger+p.needs.hygiene+p.needs.social+p.needs.fun+p.needs.bladder)/6)*0.7 + p.health*0.3)
  p.lastUpdatedAt=minute
}
function addEvent(world:LifeWorld, minute:number, p:ThaiResident, kind:LifeEvent["kind"], text:string) {
  world.events.unshift({id:uid(kind,minute,p.id),minute,residentId:p.id,kind,text})
  world.events=world.events.slice(0,80)
}

/** Deterministic offline catch-up. Caller must pass elapsed minutes and persist atomically. */
export function simulateMinutes(world:LifeWorld, elapsedMinutes:number, now=Date.now()):LifeWorld {
  const next=structuredClone(world)
  const steps=Math.max(0,Math.min(60*24*7,Math.floor(elapsedMinutes)))
  for(let i=0;i<steps;i+=10){
    next.minute+=10
    if(next.minute>=1440){next.minute-=1440;next.day+=1}
    for(const p of next.residents){
      // Natural needs drift per 10 game minutes.
      p.needs.hunger=clamp(p.needs.hunger-0.42)
      p.needs.energy=clamp(p.needs.energy-(p.activity==="sleep"?-0.35:0.28))
      p.needs.hygiene=clamp(p.needs.hygiene-0.08)
      p.needs.social=clamp(p.needs.social-0.07)
      p.needs.fun=clamp(p.needs.fun-0.04)
      p.needs.bladder=clamp(p.needs.bladder-0.23)
      const chosen=chooseActivity(p,next.minute)
      // Actions last at least one simulation interval to avoid jitter.
      if(chosen!==p.activity || next.minute-p.activityStartedAt>=30) {
        applyActivity(p,chosen,next.minute,next)
        if(chosen==="sleep") addEvent(next,next.minute,p,"routine",p.name+" เข้านอนพัก ร่างกายกำลังฟื้นพลัง")
        else if(chosen==="eat") addEvent(next,next.minute,p,"routine",p.name+" แวะกินข้าว ชีวิตประจำวันแบบคนไทย")
        else if(chosen==="work") addEvent(next,next.minute,p,"money",p.name+" ไปทำงานเป็นกิจวัตร")
        else if(chosen==="socialize") addEvent(next,next.minute,p,"social",p.name+" พูดคุยกับคนในชุมชน")
      }
    }
  }
  next.updatedAt=now
  return next
}

export function applyPlayerCommand(world:LifeWorld, command:PlayerCommand, now=Date.now()):LifeWorld {
  const next=structuredClone(world)
  const p=next.residents.find(r=>r.id===command.residentId)
  if(!p) throw new Error("ไม่พบตัวละคร")
  p.queuedActivity=command.activity
  applyActivity(p,command.activity,next.minute,next)
  delete p.queuedActivity
  addEvent(next,next.minute,p,"player","ผู้เล่นสั่งให้"+p.name+activityText[command.activity])
  next.updatedAt=now
  return next
}
export function activityLabel(activity:ActivityId) { return activityText[activity] || activity }
