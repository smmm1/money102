import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "./CloudAuth"

type Raw=Record<string,unknown>
type Payload={payload?:Record<string,string>|null;updated_at?:string|null}
type Item={id:string;title:string;category:string;date:string;detail:string}
const labels={daily:"บันทึกวันนี้",journal:"ไดอารี่",health:"สุขภาพ",finance:"การเงิน",life:"อาหารและชีวิต"}
const object=(v:unknown):Raw=>v&&typeof v==="object"&&!Array.isArray(v)?v as Raw:{}
const array=(v:unknown):Raw[]=>Array.isArray(v)?v.filter((x):x is Raw=>!!x&&typeof x==="object"&&!Array.isArray(x)):[]
const parse=(v?:string):unknown=>{try{return JSON.parse(v||"null")}catch{return null}}
const str=(v:unknown)=>typeof v==="string"?v:""
const day=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
const dateLabel=(v:string)=>{if(!/^\d{4}-\d{2}-\d{2}/.test(v))return "ไม่ระบุวัน";const d=new Date(v.slice(0,10)+"T12:00:00");return Number.isNaN(d.getTime())?"ไม่ระบุวัน":new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short"}).format(d)}
function collect(payload:Record<string,string>):Item[]{
 const out:Item[]=[]
 const add=(category:keyof typeof labels,x:Raw,title:string,detail="")=>out.push({id:str(x.id)||category+"-"+out.length,title:title||"ไม่มีหัวข้อ",category:labels[category],date:str(x.date),detail})
 const daily=parse(payload["lamoon-daily-log-v1"])
 for(const x of array(daily))add("daily",x,str(x.title)||str(x.body).slice(0,60),str(x.mood))
 const shared=object(parse(payload["lamoon-daytogether-v1"]))
 for(const x of array(shared.notes))add("journal",x,str(x.title)||str(x.body).slice(0,60),str(x.mood))
 for(const x of array(shared.health)){const k=str(x.kind);const title=k==="weight"?"น้ำหนัก "+str(x.value)+" กก.":k==="bloodPressure"?"ความดัน "+str(x.systolic)+"/"+str(x.diastolic):k==="pressure"?"ความดัน "+str(x.value):k==="water"?"ดื่มน้ำ "+str(x.value)+" มล.":k==="sleep"?"บันทึกการนอน":k==="symptom"?"อาการ "+str(x.title||x.value):"ออกกำลังกาย "+str(x.title||x.value);add("health",x,title,str(x.note))}
 for(const x of array(shared.goals))add("finance",x,"เป้าหมายออมเงิน: "+str(x.title||x.name))
 for(const x of array(shared.savings)){const amount=Number(x.amount ?? (((Number(x.amountCents??x.amountSatang)/100)||x.value)||0));const kind=str(x.type||x.kind);add("finance",x,(kind==="withdraw"||kind==="withdrawal"?"ถอนเงิน ":"ออมเงิน ")+amount.toLocaleString("th-TH")+" บาท",str(x.note))}
 for(const x of array(shared.bills))add("finance",x,"หารค่าใช้จ่าย: "+str(x.title||x.name))
 const foodPayload=parse(payload["lamoon-food-life-v1"]);const foodItems=array(foodPayload).length?array(foodPayload):array(object(foodPayload).entries);for(const x of foodItems)add("life",x,str(x.title),str(x.place))
 return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8)
}
export default function HomeOverview({onOpen}:{onOpen:(section:"daily"|"journal"|"health"|"finance"|"life"|"archive")=>void}){
 const [items,setItems]=useState<Item[]>([])
 const [counts,setCounts]=useState<Record<keyof typeof labels,number>>({daily:0,journal:0,health:0,finance:0,life:0})
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")
 const [updated,setUpdated]=useState("")
 const load=useCallback(async()=>{setLoading(true);setError("");try{const res=await api("/api/state") as Payload;const p=res.payload||{};const shared=object(parse(p["lamoon-daytogether-v1"]));const daily=array(parse(p["lamoon-daily-log-v1"]));const foodPayload=parse(p["lamoon-food-life-v1"]);const food=array(foodPayload).length?array(foodPayload):array(object(foodPayload).entries);const next={daily:daily.length,journal:array(shared.notes).filter(x=>!x.archived).length,health:array(shared.health).length,finance:array(shared.goals).length+array(shared.savings).length+array(shared.bills).length,life:food.length};setCounts(next);setItems(collect(p));setUpdated(res.updated_at||"")}catch(e){setError(e instanceof Error?e.message:"โหลดภาพรวมไม่สำเร็จ")}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const total=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts])
 return <section className="ho-wrap">
  <div className="ho-heading"><div><span className="dt-eyebrow">YOUR LIFE, AT A GLANCE</span><h2>ภาพรวมเรื่องราวของคุณ</h2><p>บันทึกไว้แล้ว {total.toLocaleString("th-TH")} รายการ</p></div><button onClick={()=>void load()} disabled={loading} aria-label="รีเฟรชภาพรวม">↻</button></div>
  {error&&<p className="dl-error" role="alert">{error}</p>}
  <div className="ho-stats">{(Object.keys(labels) as (keyof typeof labels)[]).map(k=><button key={k} onClick={()=>onOpen(k)}><span>{labels[k]}</span><b>{loading?"—":counts[k].toLocaleString("th-TH")}</b><small>เปิดดู →</small></button>)}</div>
  <div className="ho-recent"><div className="ho-recent-head"><div><span className="dt-eyebrow">RECENT MOMENTS</span><h3>เรื่องราวล่าสุด</h3></div><button onClick={()=>onOpen("archive")}>ดูทั้งหมด →</button></div>
   {loading?<p className="ho-muted">กำลังรวบรวมบันทึก…</p>:items.length?<div className="ho-recent-list">{items.slice(0,5).map(x=><article key={x.category+":"+x.id}><span>{x.category}</span><div><b>{x.title}</b>{x.detail&&<small>{x.detail}</small>}</div><time>{dateLabel(x.date)}</time></article>)}</div>:<div className="ho-empty"><span>✳</span><b>ยังไม่มีเรื่องราวที่บันทึกไว้</b><p>เริ่มจากบันทึกวันนี้ แล้วค่อย ๆ เติมเรื่องราวในแต่ละหมวด</p><button onClick={()=>onOpen("daily")}>เริ่มบันทึกวันนี้ →</button></div>}
  </div>
  {updated&&<p className="ho-sync">ข้อมูลจากพื้นที่ส่วนตัว · ซิงก์ล่าสุด {new Date(updated).toLocaleString("th-TH")}</p>}
 </section>
}
