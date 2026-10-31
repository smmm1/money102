import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { api } from "./CloudAuth"

type EntryType = "general" | "journal" | "health" | "finance" | "food" | "activity"
type Entry = { id:string; type:EntryType; title:string; body:string; date:string; mood:string; tags:string[]; createdAt:string; updatedAt:string }
type StoredState = { payload?:Record<string,string>|null; updated_at?:string|null }
const STORAGE_KEY = "lamoon-daily-log-v1"
const types: {id:EntryType;label:string;icon:string}[] = [
  {id:"general",label:"เรื่องราวทั่วไป",icon:"▤"},{id:"journal",label:"ความรู้สึก",icon:"♡"},
  {id:"health",label:"สุขภาพ",icon:"＋"},{id:"finance",label:"การเงิน",icon:"◫"},
  {id:"food",label:"อาหาร",icon:"☕"},{id:"activity",label:"กิจกรรม",icon:"✳"}
]
const moods = ["", "ดีใจ", "เฉยๆ", "เศร้า"]
const localDate = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-") }
const now = () => new Date().toISOString()
const freshEntry = ():Entry => ({id:crypto.randomUUID(),type:"general",title:"",body:"",date:localDate(),mood:"",tags:[],createdAt:now(),updatedAt:now()})
function safeEntries(raw?:string):Entry[] {
  if(!raw)return []
  try {
    const parsed=JSON.parse(raw)
    if(!Array.isArray(parsed))return []
    return parsed.filter((item):item is Entry => !!item && typeof item.id==="string" && typeof item.title==="string" && typeof item.body==="string" && typeof item.date==="string" && types.some(t=>t.id===item.type) && typeof item.mood==="string" && Array.isArray(item.tags))
  } catch { return [] }
}
function label(type:EntryType){return types.find(t=>t.id===type)?.label||"บันทึก"}
export default function DailyLog(){
 const [entries,setEntries]=useState<Entry[]>([])
 const [revision,setRevision]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState("")
 const [filter,setFilter]=useState<EntryType|"all">("all")
 const [search,setSearch]=useState("")
 const [editor,setEditor]=useState<Entry|null>(null)
 const [confirmDelete,setConfirmDelete]=useState<string|null>(null)
 const [ready,setReady]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true);setError("")
  try{
   const result=await api("/api/state") as StoredState
   setRevision(result.updated_at??null)
   setEntries(safeEntries(result.payload?.[STORAGE_KEY]))
   setReady(true)
  }catch(e){setError(e instanceof Error?e.message:"โหลดบันทึกไม่สำเร็จ")}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const visible=useMemo(()=>entries.filter(e=>(filter==="all"||e.type===filter)&&(!search||[e.title,e.body,e.tags.join(" ")].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt)),[entries,filter,search])
 async function persist(next:Entry[]){
  setSaving(true);setError("")
  try{
   const current=await api("/api/state") as StoredState
   const payload={...(current.payload||{}),[STORAGE_KEY]:JSON.stringify(next)}
   const saved=await api("/api/state",{method:"PUT",body:JSON.stringify({payload,expected_updated_at:current.updated_at??null})}) as {updated_at?:string}
   setRevision(saved.updated_at??null);setEntries(next);setReady(true);setEditor(null);setConfirmDelete(null)
  }catch(e){
   const status=(e as Error & {status?:number}).status
   if(status===409){setError("ข้อมูลมีการเปลี่ยนแปลงจากอีกหน้าต่าง กำลังโหลดข้อมูลล่าสุด");await load()}
   else setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ")
  }finally{setSaving(false)}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!editor||saving)return
  const clean={...editor,title:editor.title.trim(),body:editor.body.trim(),updatedAt:now(),tags:editor.tags.filter(Boolean).slice(0,100)}
  if(!clean.title&&!clean.body){setError("เพิ่มหัวข้อหรือรายละเอียดอย่างน้อยหนึ่งอย่าง");return}
  const exists=entries.some(e=>e.id===clean.id)
  await persist(exists?entries.map(e=>e.id===clean.id?clean:e):[clean,...entries])
 }
 async function remove(id:string){if(saving)return;await persist(entries.filter(e=>e.id!==id))}
 const startNew=()=>{setError("");setEditor(freshEntry())}
 if(loading)return <div className="dl-state"><span className="auth-loading-mark"/><p>กำลังโหลดบันทึกจากพื้นที่ส่วนตัว…</p></div>
 return <section className="dl-wrap">
  <div className="dl-toolbar"><div><span className="dt-eyebrow">YOUR DAILY RECORDS</span><p>{entries.length} รายการที่บันทึกไว้</p></div><button className="dl-primary" onClick={startNew}>＋ เพิ่มบันทึก</button></div>
  <div className="dl-controls"><input aria-label="ค้นหาบันทึก" placeholder="ค้นหาจากหัวข้อหรือรายละเอียด…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="กรองประเภท" value={filter} onChange={e=>setFilter(e.target.value as EntryType|"all")}><option value="all">ทุกประเภท</option>{types.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
  {error&&<p className="dl-error" role="alert">{error}</p>}
  {!ready&&<p className="dl-error">ยังไม่สามารถยืนยันสถานะข้อมูลได้</p>}
  {visible.length===0?<div className="dl-empty"><span>✳</span><b>{entries.length?"ไม่พบบันทึกที่ตรงกัน":"พื้นที่วันนี้ยังว่างอยู่"}</b><p>{entries.length?"ลองเปลี่ยนคำค้นหาหรือตัวกรอง":"เริ่มเก็บเรื่องราวแรกของคุณได้เลย ไม่จำเป็นต้องเขียนยาว"}</p>{!entries.length&&<button onClick={startNew}>เริ่มบันทึกแรก</button>}</div>:
   <div className="dl-list">{visible.map(entry=><article className="dl-entry" key={entry.id}><div className="dl-entry-meta"><span>{label(entry.type)}</span><time>{new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric"}).format(new Date(entry.date+"T12:00:00"))}</time></div><h3>{entry.title||"ไม่มีหัวข้อ"}</h3>{entry.body&&<p>{entry.body}</p>}{entry.mood&&<span className="dl-mood">{entry.mood}</span>}<div className="dl-entry-actions"><button onClick={()=>setEditor({...entry})}>แก้ไข</button><button className="danger" onClick={()=>setConfirmDelete(entry.id)}>ลบ</button></div>{confirmDelete===entry.id&&<div className="dl-delete-confirm"><span>ลบบันทึกนี้ใช่ไหม?</span><button onClick={()=>void remove(entry.id)} disabled={saving}>ยืนยันลบ</button><button onClick={()=>setConfirmDelete(null)}>ยกเลิก</button></div>}</article>)}</div>}
  {editor&&<div className="dl-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditor(null)}}><form className="dl-editor" onSubmit={submit}><button type="button" className="dl-close" onClick={()=>setEditor(null)}>×</button><span className="dt-eyebrow">{entries.some(e=>e.id===editor.id)?"EDIT YOUR RECORD":"A NEW MEMORY"}</span><h2>{entries.some(e=>e.id===editor.id)?"แก้ไขบันทึก":"บันทึกเรื่องราว"}</h2><label>ประเภท</label><div className="dl-type-grid">{types.map(t=><button type="button" key={t.id} className={editor.type===t.id?"selected":""} onClick={()=>setEditor({...editor,type:t.id})}>{t.icon} {t.label}</button>)}</div><label htmlFor="dl-title">หัวข้อ</label><input id="dl-title" maxLength={240} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} placeholder="วันนี้มีอะไรเกิดขึ้นบ้าง"/><label htmlFor="dl-date">วันที่</label><input id="dl-date" type="date" value={editor.date} onChange={e=>setEditor({...editor,date:e.target.value})} required/><label htmlFor="dl-body">รายละเอียด</label><textarea id="dl-body" maxLength={100000} rows={5} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})} placeholder="เขียนเท่าที่อยากเขียน…"/><label>ความรู้สึก</label><div className="dl-moods">{moods.slice(1).map(m=><button type="button" key={m} className={editor.mood===m?"selected":""} onClick={()=>setEditor({...editor,mood:editor.mood===m?"":m})}>{m==="ดีใจ"?"☀":m==="เฉยๆ"?"○":"☁"} {m}</button>)}</div><div className="dl-editor-actions"><button type="button" className="dl-cancel" onClick={()=>setEditor(null)} disabled={saving}>ยกเลิก</button><button type="submit" className="dl-primary" disabled={saving}>{saving?"กำลังบันทึก…":"บันทึกลงพื้นที่ส่วนตัว"}</button></div></form></div>}
 </section>
}
