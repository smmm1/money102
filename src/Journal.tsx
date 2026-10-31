import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { emptyDayState, loadDayState, saveDayState, localDate, uid, type LoadedState } from "./dayState"

type Note = { id:string; title:string; body:string; kind:"note"|"diary"; date:string; mood:string; tags:string[]; pinned:boolean; archived:boolean; updatedAt:string; version:number; createdAt?:string }
const moods = ["ดีใจ","เฉยๆ","เศร้า"]
const emptyNote = ():Note => ({id:uid(),title:"",body:"",kind:"diary",date:localDate(),mood:"",tags:[],pinned:false,archived:false,updatedAt:new Date().toISOString(),version:1})
function normalizeNotes(raw:Record<string,unknown>[]):Note[] {
 return raw.filter(x=>x&&typeof x.id==="string").map(x=>({...x, title:typeof x.title==="string"?x.title:"",body:typeof x.body==="string"?x.body:"",kind:x.kind==="note"?"note":"diary",date:typeof x.date==="string"?x.date:localDate(),mood:typeof x.mood==="string"?x.mood:"",tags:Array.isArray(x.tags)?x.tags.filter((t):t is string=>typeof t==="string"):[],pinned:Boolean(x.pinned),archived:Boolean(x.archived),updatedAt:typeof x.updatedAt==="string"?x.updatedAt:new Date().toISOString(),version:Number.isSafeInteger(x.version)?Number(x.version):1})) as Note[]
}
export default function Journal(){
 const loadedRef=useRef<LoadedState|null>(null)
 const [notes,setNotes]=useState<Note[]>([])
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState("")
 const [search,setSearch]=useState("")
 const [moodFilter,setMoodFilter]=useState("all")
 const [editor,setEditor]=useState<Note|null>(null)
 const [deleteId,setDeleteId]=useState<string|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setError("")
  try{const loaded=await loadDayState();loadedRef.current=loaded;setNotes(normalizeNotes(loaded.state.notes))}
  catch(e){setError(e instanceof Error?e.message:"โหลดบันทึกส่วนตัวไม่สำเร็จ")}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const visible=useMemo(()=>notes.filter(n=>!n.archived&&(moodFilter==="all"||n.mood===moodFilter)&&(!search||[n.title,n.body,n.tags.join(" ")].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase()))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt)),[notes,search,moodFilter])
 async function persist(next:Note[]){
  if(!loadedRef.current||saving)return
  setSaving(true);setError("")
  try{const state={...loadedRef.current.state,notes:next};const revision=await saveDayState(loadedRef.current,state);loadedRef.current={...loadedRef.current,state,revision};setNotes(next);setEditor(null);setDeleteId(null)}
  catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");if((e as {status?:number}).status===409)await load()}
  finally{setSaving(false)}
 }
 function submit(e:FormEvent){e.preventDefault();if(!editor||saving)return;const clean={...editor,title:editor.title.trim(),body:editor.body.trim(),tags:[...new Set(editor.tags.map(t=>t.trim()).filter(Boolean))].slice(0,100),updatedAt:new Date().toISOString(),version:notes.find(n=>n.id===editor.id)?(notes.find(n=>n.id===editor.id)?.version||1)+1:1};if(!clean.title&&!clean.body){setError("เขียนหัวข้อหรือเนื้อหาอย่างน้อยหนึ่งอย่าง");return}void persist(notes.some(n=>n.id===clean.id)?notes.map(n=>n.id===clean.id?clean:n):[clean,...notes])}
 if(loading)return <div className="dl-state"><span className="auth-loading-mark"/><p>กำลังเปิดพื้นที่บันทึกส่วนตัว…</p></div>
 return <section className="jr-wrap">
  <div className="jr-toolbar"><div><span className="dt-eyebrow">A PLACE FOR YOUR THOUGHTS</span><p>{notes.filter(n=>!n.archived).length} เรื่องราวที่เก็บไว้</p></div><button className="dl-primary" onClick={()=>{setError("");setEditor(emptyNote())}}>＋ เขียนบันทึก</button></div>
  <div className="dl-controls"><input aria-label="ค้นหาไดอารี่" placeholder="ค้นหาความคิดหรือความทรงจำ…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="กรองอารมณ์" value={moodFilter} onChange={e=>setMoodFilter(e.target.value)}><option value="all">ทุกความรู้สึก</option>{moods.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
  {error&&<p className="dl-error" role="alert">{error}</p>}
  {visible.length===0?<div className="dl-empty"><span>♡</span><b>{notes.length?"ไม่พบเรื่องราวที่ตรงกัน":"พื้นที่เล็ก ๆ สำหรับความคิดของคุณ"}</b><p>จะเขียนเรื่องดี ๆ หรือเรื่องที่ยังค้างอยู่ในใจก็ได้</p><button onClick={()=>setEditor(emptyNote())}>เขียนบันทึกแรก</button></div>:
   <div className="jr-grid">{visible.map(n=><article className="jr-card" key={n.id}><div className="jr-meta"><time>{new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric"}).format(new Date(n.date+"T12:00:00"))}</time><span>{n.mood||"บันทึกส่วนตัว"}</span></div>{n.pinned&&<small className="jr-pinned">ปักหมุด</small>}<h3>{n.title||"ไม่มีหัวข้อ"}</h3><p>{n.body||"ไม่มีรายละเอียด"}</p>{n.tags.length>0&&<div className="jr-tags">{n.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>}<div className="dl-entry-actions"><button onClick={()=>setEditor({...n})}>แก้ไข</button><button onClick={()=>void persist(notes.map(x=>x.id===n.id?{...x,pinned:!x.pinned}:x))}>{n.pinned?"เลิกปักหมุด":"ปักหมุด"}</button><button className="danger" onClick={()=>setDeleteId(n.id)}>ลบ</button></div>{deleteId===n.id&&<div className="dl-delete-confirm"><span>ลบเรื่องราวนี้ใช่ไหม?</span><button onClick={()=>void persist(notes.filter(x=>x.id!==n.id))} disabled={saving}>ยืนยันลบ</button><button onClick={()=>setDeleteId(null)}>ยกเลิก</button></div>}</article>)}</div>}
  {editor&&<div className="dl-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditor(null)}}><form className="dl-editor" onSubmit={submit}><button type="button" className="dl-close" onClick={()=>setEditor(null)}>×</button><span className="dt-eyebrow">PERSONAL JOURNAL</span><h2>{notes.some(n=>n.id===editor.id)?"แก้ไขเรื่องราว":"เขียนสิ่งที่อยู่ในใจ"}</h2><label htmlFor="jr-title">หัวข้อ</label><input id="jr-title" maxLength={240} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} placeholder="วันนี้อยากจดจำอะไร…"/><label htmlFor="jr-date">วันที่</label><input id="jr-date" type="date" required value={editor.date} onChange={e=>setEditor({...editor,date:e.target.value})}/><label>ความรู้สึกในวันนี้</label><div className="dl-moods">{moods.map(m=><button type="button" key={m} className={editor.mood===m?"selected":""} onClick={()=>setEditor({...editor,mood:editor.mood===m?"":m})}>{m==="ดีใจ"?"☀":m==="เฉยๆ"?"○":"☁"} {m}</button>)}</div><label htmlFor="jr-body">บันทึกของคุณ</label><textarea id="jr-body" rows={7} maxLength={100000} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})} placeholder="ไม่ต้องเรียบเรียงให้สวยงาม เขียนตามที่รู้สึกได้เลย…"/><label htmlFor="jr-tags">แท็ก (คั่นด้วยเครื่องหมายจุลภาค)</label><input id="jr-tags" value={editor.tags.join(", ")} onChange={e=>setEditor({...editor,tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} placeholder="งาน, ครอบครัว, ความคิด"/><div className="jr-pin-toggle"><input id="jr-pin" type="checkbox" checked={editor.pinned} onChange={e=>setEditor({...editor,pinned:e.target.checked})}/><label htmlFor="jr-pin">ปักหมุดเรื่องนี้ไว้ด้านบน</label></div><div className="dl-editor-actions"><button type="button" className="dl-cancel" onClick={()=>setEditor(null)} disabled={saving}>ยกเลิก</button><button type="submit" className="dl-primary" disabled={saving}>{saving?"กำลังบันทึก…":"เก็บไว้ในบันทึกส่วนตัว"}</button></div></form></div>}
 </section>
}
