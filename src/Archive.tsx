import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "./CloudAuth"

type Category = "daily"|"journal"|"health"|"finance"|"life"
type Item = {id:string;category:Category;categoryLabel:string;title:string;body:string;date:string;detail:string;searchText:string}
type StateResponse = {payload?:Record<string,string>|null;updated_at?:string|null}
const DAILY_KEY="lamoon-daily-log-v1", FOOD_KEY="lamoon-food-life-v1"
const labels:Record<Category,string>={daily:"บันทึกประจำวัน",journal:"ไดอารี่",health:"สุขภาพ",finance:"การเงิน",life:"อาหารและชีวิต"}
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
const parse=(raw?:string):unknown=>{try{return JSON.parse(raw||"{}")}catch{return {}}}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}
const arr=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.filter((x):x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x)):[]
const txt=(v:unknown)=>typeof v==="string"?v:""
const dateOf=(v:unknown)=>{const s=txt(v);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):""}
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0}
const money=(v:number)=>new Intl.NumberFormat("th-TH",{maximumFractionDigits:2}).format(v)
const dateLabel=(s:string)=>s?new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric"}).format(new Date(s+"T12:00:00")):"ไม่ระบุวันที่"
function buildItems(payload:Record<string,string>):Item[]{
 const out:Item[]=[]
 const add=(category:Category,x:Record<string,unknown>,title:string,body:string,date:unknown,detail:string,extra:string[]=[])=>
  out.push({id:txt(x.id)||category+"-"+out.length,category,categoryLabel:labels[category],title:title||"ไม่มีหัวข้อ",body, date:dateOf(date),detail,searchText:[title,body,detail,...extra].join(" ").toLocaleLowerCase()})
 const daily=arr(parse(payload[DAILY_KEY]))
 for(const x of daily){const tags=Array.isArray(x.tags)?x.tags.map(txt).join(" "):"";add("daily",x,txt(x.title),txt(x.body),x.date,[txt(x.type),txt(x.mood),tags].filter(Boolean).join(" · "),[tags])}
 const state=obj(parse(payload["lamoon-daytogether-v1"]))
 for(const x of arr(state.notes)){add("journal",x,txt(x.title),txt(x.body),x.date,[txt(x.mood),Array.isArray(x.tags)?x.tags.map(txt).join(" "):"",x.pinned?"ปักหมุด":"",x.archived?"เก็บเข้าคลัง":"บันทึก"].filter(Boolean).join(" · "))}
 for(const x of arr(state.health)){
  const kind=txt(x.kind),title=kind==="weight"?"น้ำหนัก "+txt(x.value)+" กก.":kind==="bloodPressure"?"ความดัน "+txt(x.systolic)+"/"+txt(x.diastolic):kind==="pressure"?"ความดัน "+txt(x.value):kind==="water"?"ดื่มน้ำ "+txt(x.value)+" มล.":kind==="sleep"?"การนอน":kind==="symptom"?"อาการ: "+txt(x.title||x.value):"ออกกำลังกาย: "+txt(x.title||x.value)
  const body=[txt(x.note),txt(x.extra),txt(x.bedtime),txt(x.wakeTime)].filter(Boolean).join(" · ")
  add("health",x,title,body,x.date,kind)
 }
 for(const x of arr(state.goals)){add("finance",x,"เป้าหมายออมเงิน: "+txt(x.title||x.name),"เป้าหมาย "+money(num(x.target??x.amount??(num(x.targetSatang)/100)))+" บาท",x.createdAt||x.date,"เป้าหมายการออม")}
 for(const x of arr(state.savings)){const amount=num(x.amount??((num(x.amountCents??x.amountSatang)/100)||x.value));add("finance",x,(x.type==="withdraw"||x.type==="withdrawal"||x.kind==="withdraw"?"ถอนเงิน ":"ออมเงิน ")+money(amount)+" บาท",txt(x.note),x.date,txt(x.goalId))}
 for(const x of arr(state.bills)){const total=num(x.amount??((num(x.totalCents??x.totalSatang)/100)||x.total)) || arr(x.expenses).reduce((s,e)=>s+num(e.amountSatang)/100,0);const names=arr(x.participants).map(p=>txt(p.name)).filter(Boolean).join(", ");add("finance",x,"หารค่าใช้จ่าย: "+txt(x.title||x.name),money(total)+" บาท"+(names?" · "+names:""),x.date,txt(x.note))}
 const foodPayload=parse(payload[FOOD_KEY]);const foodItems=arr(obj(foodPayload).entries).concat(arr(foodPayload));
 for(const x of foodItems){const cost=x.cost===null||x.cost===undefined?"":" · "+money(num(x.cost))+" บาท";add("life",x,txt(x.title),txt(x.note),x.date,[txt(x.place),txt(x.mood),cost,Array.isArray(x.tags)?x.tags.map(txt).join(" "):""].filter(Boolean).join(" · "))}
 return out.sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,"th"))
}
const pad=(n:number)=>String(n).padStart(2,"0")
export default function Archive(){
 const [items,setItems]=useState<Item[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")
 const [query,setQuery]=useState("")
 const [category,setCategory]=useState<"all"|Category>("all")
 const [from,setFrom]=useState("")
 const [to,setTo]=useState("")
 const [month,setMonth]=useState(()=>localDate().slice(0,7))
 const [selectedDate,setSelectedDate]=useState("")
 const [view,setView]=useState<"list"|"calendar">("list")
 const [lastUpdated,setLastUpdated]=useState("")
 const load=useCallback(async()=>{setLoading(true);setError("");try{const result=await api("/api/state") as StateResponse;setItems(buildItems(result.payload||{}));setLastUpdated(result.updated_at||"")}catch(e){setError(e instanceof Error?e.message:"โหลดคลังบันทึกไม่สำเร็จ")}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const filtered=useMemo(()=>items.filter(x=>(category==="all"||x.category===category)&&(!from||x.date>=from)&&(!to||x.date<=to)&&(!selectedDate||x.date===selectedDate)&&(!query.trim()||x.searchText.includes(query.trim().toLocaleLowerCase()))),[items,category,from,to,selectedDate,query])
 const counts=useMemo(()=>{const result={all:items.length} as Record<"all"|Category,number>;for(const k of Object.keys(labels) as Category[])result[k]=items.filter(x=>x.category===k).length;return result},[items])
 const monthDates=useMemo(()=>{const [y,m]=month.split("-").map(Number);const first=new Date(y,m-1,1);const start=(first.getDay()+6)%7;const days=new Date(y,m,0).getDate();return [...Array(start).fill(0),...Array.from({length:days},(_,i)=>i+1)]},[month])
 const dateCounts=useMemo(()=>{const map:Record<string,number>={};for(const x of items)if(x.date?.startsWith(month))map[x.date]=(map[x.date]||0)+1;return map},[items,month])
 function shiftMonth(delta:number){const [y,m]=month.split("-").map(Number);const d=new Date(y,m-1+delta,1);setMonth(d.getFullYear()+"-"+pad(d.getMonth()+1));setSelectedDate("")}
 function exportCsv(){const rows=[["วันที่","หมวดหมู่","หัวข้อ","รายละเอียด","ข้อมูลเพิ่มเติม"],...filtered.map(x=>[x.date,x.categoryLabel,x.title,x.body,x.detail])];const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="daytogether-archive-"+localDate()+".csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
 if(loading)return <div className="dl-state"><span className="auth-loading-mark"/><p>กำลังรวบรวมเรื่องราวจากทุกหมวด…</p></div>
 return <section className="ar-wrap">
  <div className="ar-toolbar"><div><span className="dt-eyebrow">YOUR LIFE, ALL IN ONE PLACE</span><p>ค้นหาและย้อนดูบันทึกจากทุกพื้นที่ของคุณ</p></div><div className="ar-tools"><button className="dl-cancel" onClick={()=>void load()}>↻ รีเฟรช</button><button className="dl-primary" onClick={exportCsv} disabled={!filtered.length}>↓ ส่งออก CSV</button></div></div>
  {error&&<p className="dl-error" role="alert">{error}</p>}
  <div className="ar-summary"><article><span>ทั้งหมด</span><b>{counts.all}</b></article>{(Object.keys(labels) as Category[]).map(k=><article key={k}><span>{labels[k]}</span><b>{counts[k]||0}</b></article>)}</div>
  <div className="ar-search"><input aria-label="ค้นหาทุกบันทึก" placeholder="ค้นหาชื่อ เรื่องราว สถานที่ หรือแท็ก…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="เลือกหมวดหมู่" value={category} onChange={e=>setCategory(e.target.value as "all"|Category)}><option value="all">ทุกหมวดหมู่</option>{(Object.keys(labels) as Category[]).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></div>
  <div className="ar-date-filters"><label>ตั้งแต่ <input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>ถึง <input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><button onClick={()=>{setFrom("");setTo("");setSelectedDate("");setQuery("");setCategory("all")}}>ล้างตัวกรอง</button></div>
  <div className="ar-view-tabs"><button className={view==="list"?"active":""} onClick={()=>setView("list")}>รายการทั้งหมด</button><button className={view==="calendar"?"active":""} onClick={()=>setView("calendar")}>ปฏิทิน</button><span>{filtered.length} รายการ</span></div>
  {view==="calendar"&&<section className="ar-calendar"><div className="ar-calendar-head"><button onClick={()=>shiftMonth(-1)} aria-label="เดือนก่อน">‹</button><b>{new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric"}).format(new Date(month+"-01T12:00:00"))}</b><button onClick={()=>shiftMonth(1)} aria-label="เดือนถัดไป">›</button></div><div className="ar-calendar-grid">{["จ","อ","พ","พฤ","ศ","ส","อา"].map((d,i)=><span className="ar-weekday" key={i}>{d}</span>)}{monthDates.map((day,i)=>{const date=day?month+"-"+pad(day):"";const count=dateCounts[date]||0;return <button key={i} disabled={!day} className={(selectedDate===date?"selected ":"")+(count?"has-items":"")} onClick={()=>setSelectedDate(selectedDate===date?"":date)}><b>{day||""}</b>{count>0&&<i>{count}</i>}</button>})}</div><p>{selectedDate?"กำลังแสดงวันที่ "+dateLabel(selectedDate):"เลือกวันที่มีจุดบันทึกเพื่อดูเรื่องราวในวันนั้น"}</p></section>}
  {filtered.length?<div className="ar-list">{filtered.map(x=><article className="ar-item" key={x.category+":"+x.id}><div className="ar-item-date"><b>{x.date?new Date(x.date+"T12:00:00").getDate():"—"}</b><small>{x.date?new Intl.DateTimeFormat("th-TH",{month:"short"}).format(new Date(x.date+"T12:00:00")):"ไม่ระบุ"}</small></div><div className="ar-item-content"><div className="ar-item-meta"><span className={"ar-chip "+x.category}>{x.categoryLabel}</span><time>{dateLabel(x.date)}</time></div><h3>{x.title}</h3>{x.body&&<p>{x.body}</p>}{x.detail&&<small>{x.detail}</small>}</div></article>)}</div>:<div className="dl-empty"><span>⌕</span><b>ยังไม่พบบันทึก</b><p>{items.length?"ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง":"เมื่อคุณเริ่มบันทึกเรื่องราว รายการจะมาปรากฏที่นี่"}</p></div>}
  <div className="ar-footnote">ข้อมูลในคลังนี้เป็นมุมมองรวมแบบอ่านอย่างเดียว ไม่แก้ไขหรือลบข้อมูลต้นทาง · {lastUpdated?"ซิงก์ล่าสุด "+new Date(lastUpdated).toLocaleString("th-TH"):""}</div>
 </section>
}
