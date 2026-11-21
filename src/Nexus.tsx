import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import "./nexus.css"

type User = { id: string; email: string }
type Turn = { id: string; role: "player" | "narrator"; content: string; metadata?: Record<string, unknown>; created_at: string }
type Character = {
  id: string; name: string; age?: string; className?: string; rank?: string; titles?: string[];
  attributes?: Record<string, number | string>; resources?: Record<string, number | string>;
  skills?: Array<{name:string;type?:string;mastery?:string;description?:string}>;
  equipment?: Array<{name:string;slot?:string;description?:string}>;
  money?: number | string; injuries?: string[]; guildId?: string | null;
}
type Dossier = { id:string; name:string; known?:Record<string,string>; role?:string; rank?:string; guild?:string; observedSkills?:string[]; relationship?:string }
type Guild = { id:string; name:string; emblem?:string; leader?:string; rank?:string; members?:number; funds?:string; notes?:string }
type WorldState = { characters?:Character[]; activeCharacterId?:string; location?:string; worldTime?:string; currentSceneCharacterIds?:string[]; dossiers?:Dossier[]; guilds?:Guild[]; activeGuildId?:string|null; memories?:string[]; [key:string]:unknown }
type World = { id:string; title:string; setting_json:string; state_json:string; image_settings_json:string; updated_at:string }
const API = ((import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) || "https://money102-api.s2mtha16.workers.dev").replace(/\/$/, "")
const TOKEN_KEY = "money102_auth_token"
const WORLD_SETTING = {
  universe: "โลกแฟนตาซีฮันเตอร์ร่วมสมัย แนวคิดคล้าย Solo Leveling แต่เป็นเส้นเรื่องอิสระ",
  era: "ยุคเดียวกับบรรยากาศต้นฉบับ โดยไม่มีตัวละคร Sung Jin-Woo",
  geography: ["เกาหลีใต้", "ประเทศไทย", "ประเทศและพื้นที่อื่นตามเหตุการณ์"],
  worldSystems: ["เกตและดันเจียน", "มานาและมอนสเตอร์", "ฮันเตอร์แรงก์ E, D, C, B, A, S และระดับ National-level", "สมาคมฮันเตอร์", "กิลด์และระบบเศรษฐกิจ"],
  rules: [
    "โลกและเส้นเรื่องเป็นอิสระ ไม่จำเป็นต้องเดินตามเหตุการณ์ต้นฉบับ",
    "NPC ทุกคนมีบุคลิก เป้าหมาย ความกลัว ความทะเยอทะยาน และตัดสินใจเองได้",
    "โลกเดินหน้าต่อแม้ผู้เล่นไม่ทำอะไร และ NPC สามารถไม่เห็นด้วยกับผู้เล่น",
    "ผู้เล่นกำหนดคำพูด ความคิด และการกระทำของตัวเองเท่านั้น ผู้บรรยายห้ามตัดสินใจแทน",
    "เล่นแบบพิมพ์อิสระ ไม่บังคับตัวเลือก A/B/C",
    "การต่อสู้มีโอกาสแพ้ บาดเจ็บ หรือเสียชีวิตตามเหตุและผล",
    "เงิน อุปกรณ์ ชื่อเสียง สัญญา ความสัมพันธ์ และการตัดสินใจมีผลต่อเนื่อง",
    "ห้ามกำหนดพลัง กิลด์ ตัวละคร ภารกิจ หรือเหตุการณ์เริ่มต้นแทนผู้เล่น"
  ]
}
async function api(path:string, init:RequestInit={}) {
  const headers=new Headers(init.headers); const token=window.sessionStorage.getItem(TOKEN_KEY)||""
  if(token) headers.set("Authorization","Bearer "+token)
  if(init.body) headers.set("Content-Type","application/json")
  const response=await fetch(API+path,{...init,headers,cache:"no-store"})
  const body=await response.json().catch(()=>({})) as Record<string,any>
  if(!response.ok){const error=new Error(body.error||"Request failed ("+response.status+")");Object.assign(error,{status:response.status,code:body.code});throw error}
  return body
}
const id=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2)
const parse=(value:string,fallback:any)=>{try{return JSON.parse(value)}catch{return fallback}}
const labels:Record<string,string>={strength:"พละกำลัง",agility:"ความคล่องตัว",vitality:"ความทนทาน",intelligence:"สติปัญญา",mana:"มานา",perception:"การรับรู้"}
export default function Nexus({user,onSignOut}:{user:User;onSignOut:()=>void}) {
  const [worlds,setWorlds]=useState<World[]>([]),[world,setWorld]=useState<World|null>(null),[state,setState]=useState<WorldState>({})
  const [turns,setTurns]=useState<Turn[]>([]),[draft,setDraft]=useState(""),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState("")
  const [createOpen,setCreateOpen]=useState(false),[characterOpen,setCharacterOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[sidebarOpen,setSidebarOpen]=useState(false)
  const [storyTitle,setStoryTitle]=useState(""),[characterName,setCharacterName]=useState(""),[characterAge,setCharacterAge]=useState(""),[characterClass,setCharacterClass]=useState("")
  const [imageEnabled,setImageEnabled]=useState(false),[imageAuto,setImageAuto]=useState(false)
  const transcript=useRef<HTMLDivElement>(null),composer=useRef<HTMLTextAreaElement>(null)
  const characters=state.characters||[]
  const activeCharacter=characters.find(c=>c.id===state.activeCharacterId)||characters[0]
  const currentSceneIds=state.currentSceneCharacterIds||[]
  const sceneDossiers=(state.dossiers||[]).filter(d=>currentSceneIds.includes(d.id))
  const activeGuild=(state.guilds||[]).find(g=>g.id===(activeCharacter?.guildId||state.activeGuildId))
  const latestScene=[...turns].reverse().find(t=>t.role==="narrator"&&typeof t.metadata?.scene==="string")?.metadata?.scene as string|undefined

  const loadWorlds=useCallback(async(selectedId?:string)=>{
    setLoading(true);setError("")
    try{
      const result=await api("/api/story/worlds");const list=(result.worlds||[]) as World[];setWorlds(list)
      if(!list.length){setWorld(null);setTurns([]);setState({});return}
      const chosen=list.find(w=>w.id===selectedId)||list.find(w=>w.id===world?.id)||list[0]
      const detail=await api("/api/story/worlds/"+chosen.id);const selected=detail.world as World
      setWorld(selected);const nextState=parse(selected.state_json,{}) as WorldState;setState(nextState)
      const img=parse(selected.image_settings_json,'{"enabled":false,"auto":false}')
      setImageEnabled(Boolean(img.enabled));setImageAuto(Boolean(img.auto))
      const history=await api("/api/story/worlds/"+chosen.id+"/turns?limit=100")
      setTurns((history.turns||[]).map((t:any)=>({...t,metadata:parse(t.metadata_json||"{}",{})})))
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setLoading(false)}
  },[world?.id])
  useEffect(()=>{void loadWorlds()},[])
  useEffect(()=>{if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight},[turns,sending])
  async function persistState(next:WorldState){
    if(!world)return
    setState(next)
    await api("/api/story/worlds/"+world.id,{method:"PUT",body:JSON.stringify({state:next})})
  }
  async function createWorld(event:FormEvent){
    event.preventDefault();if(!storyTitle.trim()||!characterName.trim())return
    setLoading(true);setError("")
    try{
      const created=await api("/api/story/worlds",{method:"POST",body:JSON.stringify({title:storyTitle.trim(),setting:WORLD_SETTING,state:{characters:[],dossiers:[],guilds:[],memories:[],currentSceneCharacterIds:[]},imageSettings:{enabled:false,auto:false}})})
      const w=created.world as World
      const character:Character={id:id(),name:characterName.trim(),age:characterAge.trim()||"ยังไม่ระบุ",className:characterClass.trim()||"ยังไม่ระบุ",rank:"ยังไม่ผ่านการประเมิน",titles:[],attributes:{strength:"ยังไม่ประเมิน",agility:"ยังไม่ประเมิน",vitality:"ยังไม่ประเมิน",intelligence:"ยังไม่ประเมิน",mana:"ยังไม่ประเมิน",perception:"ยังไม่ประเมิน"},resources:{hp:"ยังไม่ประเมิน",mp:"ยังไม่ประเมิน",stamina:"ยังไม่ประเมิน"},skills:[],equipment:[],money:"ยังไม่ระบุ",injuries:[],guildId:null}
      const next={characters:[character],activeCharacterId:character.id,dossiers:[],guilds:[],memories:[],currentSceneCharacterIds:[]}
      await api("/api/story/worlds/"+w.id,{method:"PUT",body:JSON.stringify({state:next})})
      setStoryTitle("");setCharacterName("");setCharacterAge("");setCharacterClass("");setCreateOpen(false)
      await loadWorlds(w.id)
    }catch(e){setError(e instanceof Error?e.message:String(e));setLoading(false)}
  }
  async function addCharacter(event:FormEvent){
    event.preventDefault();if(!world||!characterName.trim())return
    const character:Character={id:id(),name:characterName.trim(),age:characterAge.trim()||"ยังไม่ระบุ",className:characterClass.trim()||"ยังไม่ระบุ",rank:"ยังไม่ผ่านการประเมิน",titles:[],attributes:{strength:"ยังไม่ประเมิน",agility:"ยังไม่ประเมิน",vitality:"ยังไม่ประเมิน",intelligence:"ยังไม่ประเมิน",mana:"ยังไม่ประเมิน",perception:"ยังไม่ประเมิน"},resources:{hp:"ยังไม่ประเมิน",mp:"ยังไม่ประเมิน",stamina:"ยังไม่ประเมิน"},skills:[],equipment:[],money:"ยังไม่ระบุ",injuries:[],guildId:null}
    try{const next={...state,characters:[...characters,character],activeCharacterId:character.id};await persistState(next);setCharacterOpen(false);setCharacterName("");setCharacterAge("");setCharacterClass("")}
    catch(e){setError(e instanceof Error?e.message:String(e))}
  }
  async function switchCharacter(characterId:string){
    try{await persistState({...state,activeCharacterId:characterId});setTurns([]);const h=await api("/api/story/worlds/"+world?.id+"/turns?limit=100");setTurns((h.turns||[]).map((t:any)=>({...t,metadata:parse(t.metadata_json||"{}",{})})))}
    catch(e){setError(e instanceof Error?e.message:String(e))}
  }
  async function send(event?:FormEvent){
    event?.preventDefault();const message=draft.trim()
    if(!message||sending||!world||!activeCharacter)return
    setDraft("");setSending(true);setError("")
    try{
      const result=await api("/api/story/worlds/"+world.id+"/turns",{method:"POST",body:JSON.stringify({message,characterId:activeCharacter.id})})
      setTurns(old=>[...old,{id:id(),role:"player",content:message,created_at:new Date().toISOString(),metadata:{characterId:activeCharacter.id}},result.turn])
      if(result.state){setState(result.state as WorldState)}
      setWorlds(old=>old.map(w=>w.id===world.id?{...w,updated_at:new Date().toISOString()}:w))
    }catch(e){setDraft(message);setError(e instanceof Error?e.message:String(e))}
    finally{setSending(false);composer.current?.focus()}
  }
  async function saveImages(enabled:boolean,auto:boolean){
    setImageEnabled(enabled);setImageAuto(auto)
    try{await api("/api/story/worlds/"+world?.id,{method:"PUT",body:JSON.stringify({imageSettings:{enabled,auto}})})}
    catch(e){setError(e instanceof Error?e.message:String(e))}
  }
  const attr=activeCharacter?.attributes||{},resources=activeCharacter?.resources||{}
  return <main className="nexus-app">
    <header className="nx-topbar">
      <button className="nx-brand" onClick={()=>setSidebarOpen(v=>!v)}><span className="nx-logo">N</span><span><b>NEXUS</b><small>HUNTER CHRONICLES</small></span></button>
      <div className="nx-world-select"><span className="nx-live"/> <select aria-label="เลือกเรื่องราว" value={world?.id||""} onChange={e=>void loadWorlds(e.target.value)}>{worlds.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
      <div className="nx-top-actions"><button className="nx-quiet" onClick={()=>setCreateOpen(true)}>＋ เรื่องใหม่</button><button className="nx-quiet" onClick={()=>setSettingsOpen(true)}>ตั้งค่า</button><button className="nx-logout" onClick={onSignOut}>ออกจากระบบ</button></div>
    </header>
    {!world&&!loading?<section className="nx-welcome"><div className="nx-overline">A WORLD OF YOUR OWN</div><h1>ทุกเรื่องราวเริ่มจากการสร้างตัวละคร</h1><p>สร้างเส้นเรื่องใหม่ในจักรวาลฮันเตอร์เดียวกัน หรือสร้างตัวละครเพิ่มเพื่อให้มีเส้นทางและมุมมองของตัวเอง</p><button className="nx-primary" onClick={()=>setCreateOpen(true)}>＋ สร้างเรื่องราวแรก</button></section>:<div className="nx-layout">
      <aside className={"nx-left "+(sidebarOpen?"open":"")}>
        <div className="nx-section-head">ตัวละครของฉัน <button onClick={()=>setCharacterOpen(true)}>＋ เพิ่ม</button></div>
        {characters.map(c=><button key={c.id} className={"nx-character "+(c.id===activeCharacter?.id?"selected":"")} onClick={()=>void switchCharacter(c.id)}><span className="nx-avatar">{c.name.slice(0,1)}</span><span><b>{c.name}</b><small>{c.className||"ยังไม่ระบุคลาส"} · {c.rank||"ไม่ทราบแรงก์"}</small></span><i>{c.id===activeCharacter?.id?"●":""}</i></button>)}
        <div className="nx-left-note">ตัวละครในโลกเดียวกันอาจพบกันได้เมื่อสถานที่ เวลา และเหตุการณ์สอดคล้องกัน</div>
        <div className="nx-account"><span>บันทึกบน Cloudflare D1</span><small>{user.email}</small></div>
      </aside>
      <section className="nx-story">
        <div className="nx-scene">
          <div className="nx-scene-art"><span className="nx-gate-ring"/><span className="nx-cityline"/></div>
          <div className="nx-scene-copy"><div className="nx-overline">CURRENT SCENE · {world?.title}</div><h1>{state.location||"โลกยังรอการเริ่มต้น"}</h1><p>{latestScene||"ยังไม่มีเหตุการณ์เกิดขึ้น คุณเป็นผู้กำหนดจุดเริ่มต้นของเรื่องนี้"}</p><div className="nx-scene-meta"><span>เวลาในเรื่อง {String(state.worldTime||"ยังไม่เริ่ม")}</span><span>{currentSceneIds.length} ตัวละครในฉาก</span></div></div>
        </div>
        <div className="nx-log-head"><div><span className="nx-overline">STORY LOG</span><h2>{activeCharacter?activeCharacter.name+" · มุมมองตัวละคร":"เรื่องราว"}</h2></div><button onClick={()=>void loadWorlds(world?.id)}>↻ รีเฟรช</button></div>
        <div className="nx-transcript" ref={transcript}>
          {loading?<div className="nx-empty">กำลังโหลดความทรงจำ…</div>:!activeCharacter?<div className="nx-empty">เพิ่มตัวละครเพื่อเริ่มเล่น</div>:turns.length===0?<div className="nx-empty nx-opening"><span>NO STORY EVENTS YET</span><h3>โลกยังไม่เริ่มเคลื่อนไหว</h3><p>ไม่มีภารกิจหรือกิลด์ถูกกำหนดไว้ล่วงหน้า เริ่มต้นด้วยการบอกว่าตัวละครของคุณอยู่ที่ไหน กำลังทำอะไร หรืออยากเริ่มต้นชีวิตฮันเตอร์อย่างไร</p></div>:turns.map(t=>t.role==="player"?<div className="nx-player-turn" key={t.id}><small>{String(t.metadata?.characterName||activeCharacter.name)} · PLAYER</small><p>{t.content}</p></div>:<article className="nx-narrator" key={t.id}><span>✦</span><div><small>{String(t.metadata?.speaker||"ผู้บรรยาย")}</small><p>{t.content}</p>{typeof t.metadata?.memory==="string"&&t.metadata.memory&&<em>บันทึก: {String(t.metadata.memory)}</em>}</div></article>)}
          {sending&&<div className="nx-narrator"><span>✦</span><div><small>โลกกำลังตอบสนอง</small><p>…</p></div></div>}
        </div>
        <form className="nx-composer" onSubmit={send}><div><span>YOUR ACTION</span><small>พิมพ์อิสระ · ผู้บรรยายไม่ตัดสินใจแทนคุณ</small></div><textarea ref={composer} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="พิมพ์การกระทำ คำพูด หรือความคิดของตัวละคร…" rows={3} maxLength={3000}/><footer><small>{draft.length}/3,000</small><button className="nx-primary" disabled={!draft.trim()||sending||!activeCharacter}>{sending?"กำลังดำเนินเรื่อง…":"ส่งการกระทำ ↗"}</button></footer></form>
        {error&&<div className="nx-error" role="alert">{error}{(error as string).includes("API Key")&&<small>ต้องตั้งค่า AI_API_KEY ใน Cloudflare Worker ก่อนจึงจะเริ่มเล่นด้วย AI ได้</small>}</div>}
      </section>
      <aside className="nx-right">
        <section className="nx-panel"><div className="nx-panel-title">PLAYER STATUS <span>LIVE</span></div>{activeCharacter?<><div className="nx-profile"><span className="nx-avatar large">{activeCharacter.name.slice(0,1)}</span><div><b>{activeCharacter.name}</b><small>{activeCharacter.age||"อายุไม่ทราบ"} · {activeCharacter.className||"ไม่ระบุคลาส"}</small></div></div><div className="nx-rankline"><span>แรงก์</span><b>{activeCharacter.rank||"ยังไม่ทราบ"}</b></div><div className="nx-stat-grid">{Object.entries(labels).map(([key,label])=><div key={key}><span>{label}</span><b>{String(attr[key]??"—")}</b></div>)}</div><div className="nx-resource-list">{Object.entries({hp:"HP",mp:"MP",stamina:"STA"}).map(([key,label])=><div key={key}><span>{label}</span><b>{String(resources[key]??"—")}</b></div>)}</div><div className="nx-subhead">ทักษะและความชำนาญ</div>{(activeCharacter.skills||[]).length?(activeCharacter.skills||[]).map((s,i)=><div className="nx-detail-row" key={i}><b>{s.name}</b><small>{s.type||"ไม่ระบุ"} · {s.mastery||"ยังไม่ทราบ"}</small></div>):<p className="nx-unknown">ยังไม่มีทักษะที่ยืนยัน</p>}<div className="nx-subhead">เงินและทรัพย์สิน</div><div className="nx-rankline"><span>เงินคงเหลือ</span><b>{String(activeCharacter.money??"ยังไม่ทราบ")}</b></div><div className="nx-subhead">อุปกรณ์</div>{(activeCharacter.equipment||[]).length?(activeCharacter.equipment||[]).map((x,i)=><div className="nx-detail-row" key={i}><b>{x.name}</b><small>{x.slot||"ไม่ระบุช่อง"}</small></div>):<p className="nx-unknown">ยังไม่มีข้อมูลอุปกรณ์</p>}{(activeCharacter.injuries||[]).length>0&&<div className="nx-injury">อาการบาดเจ็บ: {(activeCharacter.injuries||[]).join(" · ")}</div>}</>:<p className="nx-unknown">เลือกตัวละครเพื่อดูสถานะ</p>}</section>
        <section className="nx-panel"><div className="nx-panel-title">คนที่อยู่ในฉาก <span>{sceneDossiers.length}</span></div>{sceneDossiers.length?sceneDossiers.map(d=><div className="nx-dossier" key={d.id}><b>{d.name}</b>{d.role&&<small>{d.role}</small>}{d.rank&&<span>แรงก์ {d.rank}</span>}{d.guild&&<span>สังกัด {d.guild}</span>}{d.relationship&&<span>ความสัมพันธ์ {d.relationship}</span>}{d.known&&Object.entries(d.known).map(([k,v])=><span key={k}>{k}: {v}</span>)}{d.observedSkills?.length?<span>ทักษะที่พบ: {d.observedSkills.join(", ")}</span>:null}</div>):<p className="nx-unknown">ยังไม่มีบุคคลที่ตัวละครพบหรือรู้จักในฉากนี้</p>}</section>
        {activeGuild&&<section className="nx-panel"><div className="nx-panel-title">GUILD <span>ACTIVE</span></div><div className="nx-guild"><b>{activeGuild.emblem||"◇"} {activeGuild.name}</b><small>หัวหน้ากิลด์: {activeGuild.leader||"ยังไม่ทราบ"}</small><small>สมาชิก: {activeGuild.members??"ยังไม่ทราบ"}</small><small>กองทุน: {activeGuild.funds||"ยังไม่ทราบ"}</small>{activeGuild.notes&&<p>{activeGuild.notes}</p>}</div></section>}
        <section className="nx-panel nx-world-meta"><div className="nx-panel-title">WORLD STATUS</div><div className="nx-meta-row"><span>สถานที่</span><b>{String(state.location||"ยังไม่ระบุ")}</b></div><div className="nx-meta-row"><span>เวลา</span><b>{String(state.worldTime||"ยังไม่เริ่ม")}</b></div><div className="nx-meta-row"><span>ความทรงจำ</span><b>{(state.memories||[]).length} รายการ</b></div></section>
      </aside>
    </div>}
    {createOpen&&<div className="nx-modal-backdrop" onClick={()=>setCreateOpen(false)}><form className="nx-modal" onSubmit={createWorld} onClick={e=>e.stopPropagation()}><header><div><span className="nx-overline">NEW STORYLINE</span><h2>สร้างเส้นเรื่องใหม่</h2></div><button type="button" onClick={()=>setCreateOpen(false)}>×</button></header><label>ชื่อเรื่อง<input value={storyTitle} onChange={e=>setStoryTitle(e.target.value)} placeholder="ตั้งชื่อเส้นเรื่อง" maxLength={120} required/></label><div className="nx-modal-divider">ตัวละครเริ่มต้น</div><label>ชื่อตัวละคร<input value={characterName} onChange={e=>setCharacterName(e.target.value)} placeholder="ชื่อที่ต้องการใช้" required/></label><div className="nx-two-fields"><label>อายุ<input value={characterAge} onChange={e=>setCharacterAge(e.target.value)} placeholder="ไม่ระบุก็ได้"/></label><label>คลาส / อาชีพ<input value={characterClass} onChange={e=>setCharacterClass(e.target.value)} placeholder="ยังไม่ทราบก็ได้"/></label></div><p className="nx-modal-note">ใช้กติกาโลกฮันเตอร์ร่วมกัน แต่ไม่มีเนื้อเรื่อง กิลด์ NPC หรือภารกิจที่ถูกสร้างไว้ก่อน</p><button className="nx-primary" type="submit" disabled={!storyTitle.trim()||!characterName.trim()}>สร้างโลกและตัวละคร</button></form></div>}
    {characterOpen&&<div className="nx-modal-backdrop" onClick={()=>setCharacterOpen(false)}><form className="nx-modal" onSubmit={addCharacter} onClick={e=>e.stopPropagation()}><header><div><span className="nx-overline">NEW CHARACTER</span><h2>เพิ่มตัวละครในโลกนี้</h2></div><button type="button" onClick={()=>setCharacterOpen(false)}>×</button></header><label>ชื่อตัวละคร<input value={characterName} onChange={e=>setCharacterName(e.target.value)} required/></label><div className="nx-two-fields"><label>อายุ<input value={characterAge} onChange={e=>setCharacterAge(e.target.value)} placeholder="ไม่ระบุ"/></label><label>คลาส / อาชีพ<input value={characterClass} onChange={e=>setCharacterClass(e.target.value)} placeholder="ยังไม่ทราบ"/></label></div><p className="nx-modal-note">ตัวละครใหม่นี้อยู่ในโลกเดียวกัน แต่มีสถานะและมุมมองแยกจากตัวละครอื่น</p><button className="nx-primary" type="submit">เพิ่มตัวละคร</button></form></div>}
    {settingsOpen&&<div className="nx-modal-backdrop" onClick={()=>setSettingsOpen(false)}><section className="nx-modal" onClick={e=>e.stopPropagation()}><header><div><span className="nx-overline">WORLD SETTINGS</span><h2>ตั้งค่าโลก</h2></div><button onClick={()=>setSettingsOpen(false)}>×</button></header><p>โลกฮันเตอร์ร่วมสมัย มีเกต ดันเจียน มอนสเตอร์ มานา สมาคมฮันเตอร์ และกิลด์ โดยไม่มีการกำหนดเนื้อเรื่องล่วงหน้า</p><label className="nx-setting-toggle"><span><b>เปิดใช้ภาพ AI</b><small>เป็นเพียงการบันทึกความต้องการ ยังไม่เชื่อมระบบสร้างภาพ</small></span><input type="checkbox" checked={imageEnabled} onChange={e=>void saveImages(e.target.checked,e.target.checked?imageAuto:false)}/></label><label className="nx-setting-toggle"><span><b>สร้างภาพอัตโนมัติ</b><small>ใช้ได้เมื่อเปิดภาพ AI</small></span><input type="checkbox" checked={imageAuto} disabled={!imageEnabled} onChange={e=>void saveImages(imageEnabled,e.target.checked)}/></label><p className="nx-modal-note">การเล่นข้อความไม่ขึ้นกับโควตาภาพ AI แต่ต้องตั้งค่า AI_API_KEY สำหรับระบบผู้บรรยายก่อน</p><button className="nx-primary" onClick={()=>setSettingsOpen(false)}>ปิด</button></section></div>}
  </main>
}
