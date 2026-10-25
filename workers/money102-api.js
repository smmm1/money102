const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100000;
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([env.APP_ORIGIN, "https://money102.onrender.com", "https://money102-web.onrender.com", "https://money102-new-live.onrender.com", "https://money102-staging.onrender.com", "https://money102-command-center-preview.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
  const headers = {"Access-Control-Allow-Methods":"GET, POST, PUT, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Max-Age":"86400","Vary":"Origin"};
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(request, env, value, status = 200) {
  return new Response(JSON.stringify(value), {status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...corsHeaders(request,env)}});
}
async function ensureSchema(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS user_app_data (user_id TEXT NOT NULL,bucket TEXT NOT NULL CHECK(bucket='app_state'),payload TEXT NOT NULL CHECK(json_valid(payload)),updated_at TEXT NOT NULL,PRIMARY KEY(user_id,bucket))").run();
}
async function ensureSimulatorSchema(db) {
 await db.prepare("CREATE TABLE IF NOT EXISTS simulator_worlds (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL CHECK(json_valid(state_json)), updated_at TEXT NOT NULL)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS simulator_memories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, resident_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','model')), content TEXT NOT NULL, created_at TEXT NOT NULL)").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_simulator_memories_user_time ON simulator_memories(user_id,created_at)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS simulator_world_archive (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,state_json TEXT NOT NULL,archived_at TEXT NOT NULL)").run();
}
function starterSimulatorState() {
 const now=Date.now();
 const residents=[
  {id:"ploy",name:"พลอย",role:"พนักงานบัญชี · 27 ปี",age:27,gender:"หญิง",occupation:"พนักงานบัญชี",home:"ห้องเช่า A",rent:3200,mood:"กำลังเตรียมตัวไปทำงาน",x:31,y:27,color:"coral",bio:"พนักงานบัญชีที่เช่าห้องใกล้ตลาด ชอบวางแผนค่าใช้จ่ายและโทรหาแม่หลังเลิกงาน",money:4200,health:88,sleepDebt:8,activity:"relax",activityStartedAt:360,lastMealAt:360,lastSocialAt:0,shift:{start:9,end:17},routine:{6:"bathe",7:"eat",8:"commute",9:"work",10:"work",11:"work",12:"eat",13:"work",14:"work",15:"work",16:"work",17:"commute",18:"eat",19:"relax",20:"use_phone",21:"relax",22:"bathe",23:"sleep",0:"sleep",1:"sleep",2:"sleep",3:"sleep",4:"sleep",5:"sleep"},needs:{hunger:72,energy:72,hygiene:80,social:48,fun:45,bladder:78}},
  {id:"non",name:"นนท์",role:"ไรเดอร์ส่งอาหาร · 30 ปี",age:30,gender:"ชาย",occupation:"ไรเดอร์ส่งอาหาร",home:"ห้องเช่า B",rent:2200,mood:"กำลังเช็กงานส่งอาหาร",x:49,y:56,color:"mint",bio:"ไรเดอร์ที่ทำงานตามช่วงเวลาคนสั่งเยอะและแบ่งเงินส่งกลับบ้านต่างจังหวัด",money:1850,health:82,sleepDebt:15,activity:"relax",activityStartedAt:360,lastMealAt:330,lastSocialAt:0,shift:{start:10,end:14},routine:{7:"bathe",8:"eat",9:"commute",10:"work",11:"work",12:"work",13:"work",14:"eat",15:"relax",16:"work",17:"work",18:"work",19:"eat",20:"relax",21:"use_phone",22:"relax",23:"sleep",0:"sleep",1:"sleep",2:"sleep",3:"sleep",4:"sleep",5:"sleep",6:"sleep"},needs:{hunger:68,energy:65,hygiene:76,social:42,fun:52,bladder:73}},
  {id:"fah",name:"ฟ้า",role:"นักศึกษามหาวิทยาลัย · 22 ปี",age:22,gender:"หญิง",occupation:"นักศึกษา / พนักงานพาร์ตไทม์",home:"หอพักนักศึกษา",rent:3800,mood:"กำลังอ่านหนังสือ",x:76,y:30,color:"blue",bio:"นักศึกษาที่อยู่หอพัก ทำงานพิเศษบางวัน และต้องจัดสมดุลระหว่างเรียนกับค่าใช้จ่าย",money:2650,health:91,sleepDebt:5,activity:"study",activityStartedAt:390,lastMealAt:390,lastSocialAt:0,shift:{start:13,end:17},routine:{6:"wake",7:"bathe",8:"eat",9:"study",10:"study",11:"study",12:"eat",13:"study",14:"study",15:"work",16:"work",17:"commute",18:"eat",19:"study",20:"socialize",21:"use_phone",22:"relax",23:"sleep",0:"sleep",1:"sleep",2:"sleep",3:"sleep",4:"sleep",5:"sleep"},needs:{hunger:76,energy:78,hygiene:83,social:63,fun:61,bladder:76}},
  {id:"somchai",name:"ลุงสมชาย",role:"เจ้าของร้านข้าวแกง · 58 ปี",age:58,gender:"ชาย",occupation:"เจ้าของร้านข้าวแกง",home:"บ้านสวน",rent:0,mood:"กำลังเตรียมอาหาร",x:19,y:38,color:"coral",bio:"เจ้าของร้านข้าวแกงที่รู้จักคนในชุมชนและชอบรดน้ำต้นไม้ช่วงเย็น",money:9800,health:79,sleepDebt:10,activity:"cook",activityStartedAt:390,lastMealAt:300,lastSocialAt:0,shift:{start:5,end:14},routine:{4:"wake",5:"cook",6:"work",7:"work",8:"work",9:"work",10:"work",11:"work",12:"eat",13:"work",14:"clean",15:"relax",16:"relax",17:"exercise",18:"eat",19:"socialize",20:"relax",21:"bathe",22:"sleep",23:"sleep",0:"sleep",1:"sleep",2:"sleep",3:"sleep"},needs:{hunger:63,energy:67,hygiene:70,social:58,fun:48,bladder:72}},
  {id:"may",name:"เมย์",role:"พยาบาลเวรสลับ · 34 ปี",age:34,gender:"หญิง",occupation:"พยาบาลเวรสลับ",home:"บ้านเมย์",rent:0,mood:"พักฟื้นหลังเวร",x:65,y:57,color:"mint",bio:"พยาบาลที่ต้องจัดการเวลานอนตามกะงานและใช้วันหยุดเดินเล่นในสวน",money:7600,health:90,sleepDebt:20,activity:"sleep",activityStartedAt:240,lastMealAt:210,lastSocialAt:0,shift:{start:19,end:7},routine:{6:"commute",7:"eat",8:"relax",9:"sleep",10:"sleep",11:"sleep",12:"sleep",13:"sleep",14:"sleep",15:"relax",16:"bathe",17:"eat",18:"commute",19:"work",20:"work",21:"work",22:"work",23:"work",0:"work",1:"work",2:"work",3:"work",4:"work",5:"work"},needs:{hunger:62,energy:40,hygiene:71,social:39,fun:42,bladder:68}},
  {id:"jay",name:"เจ",role:"ช่างซ่อมมือถือ · 25 ปี",age:25,gender:"ชาย",occupation:"ช่างซ่อมมือถือ",home:"ห้องเช่า C",rent:2800,mood:"กำลังเปิดร้าน",x:69,y:28,color:"blue",bio:"ช่างซ่อมมือถือที่ทำงานในร้านเล็ก ๆ และเล่นเกมกับเพื่อนหลังปิดร้าน",money:5100,health:86,sleepDebt:6,activity:"clean",activityStartedAt:390,lastMealAt:360,lastSocialAt:0,shift:{start:10,end:19},routine:{7:"wake",8:"bathe",9:"eat",10:"work",11:"work",12:"work",13:"eat",14:"work",15:"work",16:"work",17:"work",18:"work",19:"clean",20:"eat",21:"use_phone",22:"socialize",23:"relax",0:"sleep",1:"sleep",2:"sleep",3:"sleep",4:"sleep",5:"sleep",6:"sleep"},needs:{hunger:73,energy:74,hygiene:77,social:52,fun:65,bladder:75}}
 ];
 return {version:1,day:1,hour:7,minute:420,last_simulated_at:now,memoriesCount:0,residents,events:[
  {id:crypto.randomUUID(),text:"เริ่มวันใหม่ในชุมชนริมคลอง — ร้านข้าวแกงกำลังเตรียมเปิดตลาด",time:"DAY 1 · 07:00"},
  {id:crypto.randomUUID(),text:"เพื่อนบ้าน 6 คนเริ่มต้นกิจวัตรของตัวเอง",time:"DAY 1 · 07:00"}
 ]};
}
async function readSimulatorState(db,userId) {
 const row=await db.prepare("SELECT state_json,updated_at FROM simulator_worlds WHERE user_id=?").bind(userId).first();
 if(!row){const fresh=starterSimulatorState();await saveSimulatorState(db,userId,fresh);return fresh;}
 let v;
 try { v=JSON.parse(row.state_json); }
 catch {
  // Preserve malformed legacy data before recovering, rather than silently overwriting it.
  await db.prepare("INSERT INTO simulator_world_archive(id,user_id,state_json,archived_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),userId,row.state_json,new Date().toISOString()).run();
  const fresh=starterSimulatorState();await saveSimulatorState(db,userId,fresh);return fresh;
 }
 if(!v||!Array.isArray(v.residents)||!Array.isArray(v.events)) {
  await db.prepare("INSERT INTO simulator_world_archive(id,user_id,state_json,archived_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),userId,row.state_json,new Date().toISOString()).run();
  const fresh=starterSimulatorState();await saveSimulatorState(db,userId,fresh);return fresh;
 }
 if(v.residents.some(p=>["mira","nori","kai"].includes(p.id)) || v.version!==1) {
  await db.prepare("INSERT INTO simulator_world_archive(id,user_id,state_json,archived_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),userId,row.state_json,new Date().toISOString()).run();
  const fresh=starterSimulatorState();
  await db.prepare("DELETE FROM simulator_memories WHERE user_id=?").bind(userId).run();
  await saveSimulatorState(db,userId,fresh);
  return fresh;
 }
 const last=Number(v.last_simulated_at)||Date.parse(row.updated_at)||Date.now();
 const elapsed=Math.max(0,Math.min(10080,Math.floor((Date.now()-last)/60000)));
 if(elapsed>=10){advanceLifeWorld(v,elapsed);await saveSimulatorState(db,userId,v);}
 return v;
}
async function saveSimulatorState(db,userId,state) {
 state.events=state.events.slice(0,30); const now=new Date().toISOString();
 await db.prepare("INSERT INTO simulator_worlds(user_id,state_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json,updated_at=excluded.updated_at").bind(userId,JSON.stringify(state),now).run();
 return state;
}


function toBase64Url(bytes) { let binary=""; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function fromBase64Url(value) { const base64=value.replace(/-/g,"+").replace(/_/g,"/"); const binary=atob(base64+"=".repeat((4-base64.length%4)%4)); return Uint8Array.from(binary,c=>c.charCodeAt(0)); }
function randomBytes(size) { return crypto.getRandomValues(new Uint8Array(size)); }
async function sha256(value) { return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))); }
async function passwordHash(password,salt) { const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:PASSWORD_ITERATIONS},key,256)); }
function constantTimeEqual(a,b) { if(a.length!==b.length)return false; let diff=0; for(let i=0;i<a.length;i++)diff|=a[i]^b[i]; return diff===0; }
function isSnapshot(value) { if(!value||typeof value!=="object"||Array.isArray(value))return false; const entries=Object.entries(value); return entries.length<=500&&entries.every(([key,item])=>key.length>0&&key.length<=200&&typeof item==="string"); }
async function parseBody(request) { const length=Number(request.headers.get("Content-Length")||0); if(length>1000000)return null; try { const v=await request.json(); return v&&typeof v==="object"&&!Array.isArray(v)?v:null; } catch { return null; } }
async function issueSession(db,user) { const token=toBase64Url(randomBytes(32)); const tokenHash=await sha256(token); const now=Math.floor(Date.now()/1000); await db.prepare("INSERT INTO app_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").bind(tokenHash,user.id,now+SESSION_TTL_SECONDS,new Date().toISOString()).run(); return {token,user}; }
async function getAuthenticatedUser(request,db) { const authorization=request.headers.get("Authorization")||""; if(!authorization.startsWith("Bearer "))return null; const token=authorization.slice(7).trim(); if(token.length<30||token.length>200)return null; const tokenHash=await sha256(token); const now=Math.floor(Date.now()/1000); return await db.prepare("SELECT u.id,u.email FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,now).first(); }
const SIM_ACTIVITIES = {
 wake:{label:"ตื่นนอน",need:"energy",delta:5}, sleep:{label:"เข้านอนพัก",need:"energy",delta:16}, eat:{label:"กินข้าว",need:"hunger",delta:24}, bathe:{label:"อาบน้ำ",need:"hygiene",delta:24},
 work:{label:"ไปทำงาน",need:"fun",delta:-3}, commute:{label:"เดินทาง",need:"energy",delta:-4}, shop:{label:"ซื้อของ",need:"fun",delta:5},
 cook:{label:"ทำอาหาร",need:"hunger",delta:15}, clean:{label:"ทำความสะอาด",need:"hygiene",delta:2}, socialize:{label:"พบปะพูดคุย",need:"social",delta:20},
 relax:{label:"พักผ่อน",need:"energy",delta:7}, exercise:{label:"ออกกำลังกาย",need:"health",delta:2}, study:{label:"เรียน/อ่านหนังสือ",need:"fun",delta:-2},
 use_phone:{label:"ใช้โทรศัพท์",need:"fun",delta:8}, use_toilet:{label:"เข้าห้องน้ำ",need:"bladder",delta:42}, travel:{label:"เดินทาง",need:"energy",delta:-3}, idle:{label:"พักระหว่างกิจกรรม",need:"energy",delta:1}
};
function clampNeed(n){return Math.max(0,Math.min(100,n));}
function applyResidentActivity(p,activity,minute) {
 const a=SIM_ACTIVITIES[activity]; if(!a)return false;
 p.activity=activity;p.activityStartedAt=minute;p.status=activity==="sleep"?"sleeping":activity==="work"?"working":activity==="commute"||activity==="travel"?"travelling":"out";
 if(p.needs&&a.need in p.needs)p.needs[a.need]=clampNeed((p.needs[a.need]||0)+a.delta);
 if(activity==="sleep"){p.needs.energy=clampNeed(p.needs.energy+2);}
 if(activity==="eat"){const cost=p.money>=70?55:25;p.money=Math.max(0,p.money-cost);p.lastMealAt=minute;}
 if(activity==="cook"){p.money=Math.max(0,p.money-18);p.lastMealAt=minute;}
 if(activity==="socialize")p.lastSocialAt=minute;
 if(activity==="shop")p.money=Math.max(0,(p.money||0)-Math.min(35,Math.max(0,p.money||0)));
 if(activity==="exercise"){p.health=clampNeed((p.health||80)+2);p.needs.energy=clampNeed(p.needs.energy-3);}
 // Persistent deterministic skill progression: each meaningful activity grants XP once
 // when the activity starts, with a new level every 100 XP.
 const skillForActivity={work:"career",study:"learning",cook:"cooking",socialize:"social",exercise:"fitness"};
 const skillKey=skillForActivity[activity];
 if(skillKey){
  p.skills=p.skills||{};
  const skill=p.skills[skillKey]||{xp:0,level:1};
  const gains={work:8,study:10,cook:8,socialize:8,exercise:8};
  skill.xp=Math.max(0,Number(skill.xp)||0)+(gains[activity]||5);
  skill.level=Math.floor(skill.xp/100)+1;
  p.skills[skillKey]=skill;
 }
 const moodScore=clampNeed(Object.values(p.needs).reduce((sum,n)=>sum+n,0)/Object.values(p.needs).length*.7+(p.health||80)*.3);p.moodScore=moodScore;p.mood=moodScore>=75?"สบายใจ":moodScore>=55?"ค่อนข้างดี":moodScore>=35?"เหนื่อยล้า":"เครียดและต้องพัก";p.activityLabel=a.label;
 return true;
}
function moveResidentForActivity(p,activity,target=null) {
 const homes={ploy:[31,27],non:[12,69],fah:[39,27],somchai:[12,42],may:[57,44],jay:[66,27]};
 const jobs={ploy:[36,44],non:[82,43],fah:[39,63],somchai:[12,28],may:[59,28],jay:[66,27]};
 const ids=["ploy","non","fah","somchai","may","jay"];
 const home=homes[p.id]||[50,50],job=jobs[p.id]||[50,50];
 let destination=home;
 if(activity==="work")destination=job;
 else if(activity==="eat"||activity==="shop")destination=p.id==="somchai"?[12,28]:[82,43];
 else if(activity==="socialize")destination=[59,63];
 else if(activity==="exercise")destination=[78,83];
 else if(activity==="study")destination=p.id==="fah"?[39,63]:home;
 else if(activity==="commute"||activity==="travel")destination=[45,49];
 else if(activity==="cook")destination=p.id==="somchai"?[12,28]:home;
 else if(activity==="relax"||activity==="sleep"||activity==="bathe"||activity==="clean"||activity==="use_phone"||activity==="use_toilet")destination=home;
 const hasTarget=!!target&&Number.isFinite(target.x)&&Number.isFinite(target.y)&&target.x>=0&&target.x<=100&&target.y>=0&&target.y<=100;
 if(hasTarget)destination=[target.x,target.y];
 // Small deterministic offsets keep residents from occupying the exact same pixel.
 const offset=ids.indexOf(p.id);
 p.x=Math.max(4,Math.min(96,destination[0]+(hasTarget?0:((offset%3)-1)*1.8)));
 p.y=Math.max(5,Math.min(94,destination[1]+(hasTarget?0:(Math.floor(offset/3)-0.5)*2)));
}
function advanceLifeWorld(state,elapsedMinutes) {
 const steps=Math.max(0,Math.min(10080,Math.floor(elapsedMinutes/10)));
 for(let i=0;i<steps;i++){
  state.minute=(state.minute==null?Number(state.hour||7)*60:Number(state.minute))+10;
  if(state.minute>=1440){
   state.minute-=1440;state.day=(state.day||1)+1;
   if(state.day%7===0){
    for(const p of state.residents){if((p.money||0)>150){p.money=Math.max(0,p.money-180);state.events.unshift({id:crypto.randomUUID(),text:p.name+" จ่ายค่าอาหารและของใช้ประจำสัปดาห์ 180 บาท",time:"DAY "+state.day+" · 00:00"});}}
   }
   if(state.day%30===0){
    for(const p of state.residents){if((p.rent||0)>0){const paid=(p.money||0)>=p.rent;p.money=Math.max(0,(p.money||0)-p.rent);state.events.unshift({id:crypto.randomUUID(),text:p.name+(paid?" จ่ายค่าเช่าห้อง "+p.rent+" บาท":" เงินไม่พอจ่ายค่าเช่าห้อง "+p.rent+" บาท"),time:"DAY "+state.day+" · 00:00"});}}
   }
  }
  state.hour=Math.floor(state.minute/60);
  for(const p of state.residents){
   p.needs=p.needs||{hunger:80,energy:80,hygiene:75,social:55,fun:50,bladder:80};
   p.needs.hunger=clampNeed(p.needs.hunger-.16);
   p.needs.energy=clampNeed(p.needs.energy+(p.activity==="sleep"?.85:-.07));
   p.needs.hygiene=clampNeed(p.needs.hygiene-.025);
   p.needs.social=clampNeed(p.needs.social-.018);
   p.needs.fun=clampNeed(p.needs.fun-.015);
   p.needs.bladder=clampNeed(p.needs.bladder-.12);
   if(p.activity==="sleep")p.sleepDebt=Math.max(0,(p.sleepDebt||0)-.7);
   else p.sleepDebt=Math.min(120,(p.sleepDebt||0)+.025);
   if(p.activity==="work" && state.minute%60===0){
    const wage=p.occupation?.includes("ไรเดอร์")?55:p.occupation?.includes("พยาบาล")?48:p.occupation?.includes("ร้าน")?38:p.occupation?.includes("ช่าง")?42:p.occupation?.includes("นักศึกษา")?32:45;
    p.money=(p.money||0)+wage;
   }
   const h=state.hour;let next=p.routine?.[h];
   const absoluteMinute=((Number(state.day)||1)-1)*1440+Number(state.minute ?? h*60);
   // Critical needs take priority; explicit player commands then override ordinary routines for one in-game hour.
   if(p.needs.bladder<15)next="use_toilet";
   else if(p.needs.energy<16||((p.sleepDebt||0)>60&&p.needs.energy<35))next="sleep";
   else if(p.needs.hunger<18)next=(p.money||0)>=25?"eat":"cook";
   else if(p.needs.hygiene<18)next="bathe";
   else if(p.playerCommand && SIM_ACTIVITIES[p.playerCommand] && Number(p.playerCommandUntil)>absoluteMinute)next=p.playerCommand;
   else {
    if(p.playerCommandUntil!=null && Number(p.playerCommandUntil)<=absoluteMinute){delete p.playerCommand;delete p.playerCommandUntil;}
    if(p.shift&&(p.shift.start<=p.shift.end?(h>=p.shift.start&&h<p.shift.end):(h>=p.shift.start||h<p.shift.end)))next="work";
    else if(!next&& (h>=23||h<5))next="sleep";
    else if(!next&&h>=6&&h<9)next="eat";
    else if(!next&&h>=9&&h<17)next=p.shift?"work":"study";
    else if(!next&&h>=17&&h<20)next="shop";
    else if(!next)next="relax";
   }
   if(next && next!==p.activity){
    applyResidentActivity(p,next,state.minute);
    moveResidentForActivity(p,next);
    const action=SIM_ACTIVITIES[next]?.label||next;
    state.events.unshift({id:crypto.randomUUID(),text:p.name+" "+action,time:"DAY "+state.day+" · "+String(state.hour).padStart(2,"0")+":"+String(state.minute%60).padStart(2,"0")});
   }
  }
 }
 state.events=state.events.slice(0,80);state.last_simulated_at=Date.now();return state;
}

export default { async scheduled(controller,env) { try { await ensureSchema(env.DB); await ensureSimulatorSchema(env.DB); const rows=await env.DB.prepare("SELECT user_id,state_json,updated_at FROM simulator_worlds").all(); for(const row of rows.results||[]){ let state; try{state=JSON.parse(row.state_json)}catch{continue;} if(!state||!Array.isArray(state.residents))continue; const last=Number(state.last_simulated_at)||Date.parse(row.updated_at)||controller.scheduledTime; const elapsed=Math.max(0,Math.min(10080,Math.floor((Date.now()-last)/60000))); if(elapsed>=10){advanceLifeWorld(state,elapsed); await saveSimulatorState(env.DB,row.user_id,state);} } } catch(error){console.error("Life simulation scheduled tick failed",error);} }, async fetch(request,env) {
 const url=new URL(request.url); if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(request,env)});
 try { await ensureSchema(env.DB);
  if(url.pathname==="/health"&&request.method==="GET")return json(request,env,{ok:true,service:"money102-cloudflare-api",auth:"cloudflare-d1"});
  if(url.pathname==="/api/auth/signup"&&request.method==="POST") {
   const body=await parseBody(request); const email=typeof body?.email==="string"?body.email.trim().toLowerCase():""; const password=typeof body?.password==="string"?body.password:"";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json(request,env,{error:"กรุณากรอกอีเมลให้ถูกต้อง"},400);
   if(password.length<8||password.length>256)return json(request,env,{error:"รหัสผ่านต้องมีความยาว 8–256 ตัวอักษร"},400);
   if(await env.DB.prepare("SELECT id FROM app_users WHERE email=?").bind(email).first())return json(request,env,{error:"อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ"},409);
   const id=crypto.randomUUID(),salt=randomBytes(16),hash=await passwordHash(password,salt);
   try { await env.DB.prepare("INSERT INTO app_users(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)").bind(id,email,toBase64Url(salt),toBase64Url(hash),new Date().toISOString()).run(); } catch { return json(request,env,{error:"สร้างบัญชีไม่สำเร็จ บัญชีนี้อาจมีอยู่แล้ว"},409); }
   return json(request,env,await issueSession(env.DB,{id,email}),201);
  }
  if(url.pathname==="/api/auth/signin"&&request.method==="POST") {
   const body=await parseBody(request); const email=typeof body?.email==="string"?body.email.trim().toLowerCase():""; const password=typeof body?.password==="string"?body.password:"";
   if(!email||!password)return json(request,env,{error:"กรุณากรอกอีเมลและรหัสผ่าน"},400);
   const row=await env.DB.prepare("SELECT id,email,password_salt,password_hash FROM app_users WHERE email=?").bind(email).first();
   if(!row)return json(request,env,{error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง"},401);
   if(!constantTimeEqual(await passwordHash(password,fromBase64Url(row.password_salt)),fromBase64Url(row.password_hash)))return json(request,env,{error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง"},401);
   return json(request,env,await issueSession(env.DB,{id:row.id,email:row.email}));
  }
  if(url.pathname==="/api/auth/me"&&request.method==="GET") { const user=await getAuthenticatedUser(request,env.DB); return user?json(request,env,{user}):json(request,env,{error:"เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"},401); }
  if(url.pathname==="/api/auth/logout"&&request.method==="POST") { const auth=request.headers.get("Authorization")||""; if(auth.startsWith("Bearer "))await env.DB.prepare("DELETE FROM app_sessions WHERE token_hash=?").bind(await sha256(auth.slice(7).trim())).run(); return json(request,env,{ok:true}); }
    if (url.pathname.startsWith("/api/simulator/")) {
   const user=await getAuthenticatedUser(request,env.DB);
   if(!user)return json(request,env,{error:"Unauthorized"},401);
   await ensureSimulatorSchema(env.DB);
   const state=await readSimulatorState(env.DB,user.id);
   if(url.pathname==="/api/simulator/state"&&request.method==="GET") {
    const count=await env.DB.prepare("SELECT COUNT(*) AS count FROM simulator_memories WHERE user_id=?").bind(user.id).first();
    state.memoriesCount=Number(count?.count||0); return json(request,env,state);
   }
   if(url.pathname==="/api/simulator/action"&&request.method==="POST") {
    const body=await parseBody(request), action=typeof body?.action==="string"?body.action:"", residentId=typeof body?.residentId==="string"?body.residentId:"", target=body?.target&&typeof body.target==="object"?body.target:null;
    if(!["wander","socialize","advance_time",...Object.keys(SIM_ACTIVITIES)].includes(action))return json(request,env,{error:"Unknown simulator action"},400);
    const person=state.residents.find(p=>p.id===residentId)||state.residents[0];
    if(action==="advance_time"){advanceLifeWorld(state,180);}
    else if(action==="wander"){person.x=10+((Number(person.x)+17)%80);person.y=18+((Number(person.y)+13)%65);person.mood="กำลังสำรวจ";state.events.unshift({id:crypto.randomUUID(),text:person.name+" ออกไปสำรวจชุมชน",time:"DAY "+state.day+" · "+String(state.hour).padStart(2,"0")+":00"});}
    else if(action==="socialize"){const minute=Number(state.minute ?? state.hour*60);person.playerCommand="socialize";person.playerCommandUntil=((Number(state.day)||1)-1)*1440+minute+60;moveResidentForActivity(person,"socialize",target);for(const p of state.residents){if(p.id!==person.id){p.relationship=p.relationship||{};p.relationship[person.id]=Math.min(100,(p.relationship[person.id]||35)+1);person.relationship=person.relationship||{};person.relationship[p.id]=Math.min(100,(person.relationship[p.id]||35)+1);}}applyResidentActivity(person,"socialize",minute);state.events.unshift({id:crypto.randomUUID(),text:person.name+" พบปะพูดคุยกับคนในชุมชน",time:"DAY "+state.day+" · "+String(state.hour).padStart(2,"0")+":00"});}
    else {const minute=Number(state.minute ?? state.hour*60);person.playerCommand=action;person.playerCommandUntil=((Number(state.day)||1)-1)*1440+minute+60;applyResidentActivity(person,action,minute);moveResidentForActivity(person,action,target);state.events.unshift({id:crypto.randomUUID(),text:person.name+" "+SIM_ACTIVITIES[action].label,time:"DAY "+state.day+" · "+String(state.hour).padStart(2,"0")+":"+String(minute%60).padStart(2,"0")});}
    state.memoriesCount=0;await saveSimulatorState(env.DB,user.id,state);return json(request,env,{ok:true,state});
   }
   if(url.pathname==="/api/simulator/turn"&&request.method==="POST") return json(request,env,{error:"AI dialogue is disabled. Use player activity commands."},410);
   return json(request,env,{error:"Not found"},404);
  }


  if(url.pathname!=="/api/state"||!["GET","PUT"].includes(request.method))return json(request,env,{error:"Not found"},404);
  const user=await getAuthenticatedUser(request,env.DB); if(!user)return json(request,env,{error:"Unauthorized"},401);
  if(request.method==="GET") { const row=await env.DB.prepare("SELECT payload,updated_at FROM user_app_data WHERE user_id=? AND bucket=?").bind(user.id,"app_state").first(); if(!row)return json(request,env,{payload:null,updated_at:null}); try{return json(request,env,{payload:JSON.parse(row.payload),updated_at:row.updated_at});}catch{return json(request,env,{error:"Stored data is invalid JSON"},500);} }
  const body=await parseBody(request); if(!body||!isSnapshot(body.payload))return json(request,env,{error:"payload ต้องเป็น object ที่มีเฉพาะค่า string ของคีย์ lamoon-* (ไม่เกิน 500 รายการ)"},400);
  const serialized=JSON.stringify(body.payload); if(serialized.length>900000)return json(request,env,{error:"Payload exceeds 900 KB limit"},413);
  const updatedAt=new Date().toISOString(); await env.DB.prepare("INSERT INTO user_app_data(user_id,bucket,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,bucket) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at").bind(user.id,"app_state",serialized,updatedAt).run(); return json(request,env,{ok:true,updated_at:updatedAt});
 } catch (error) { console.error("money102-api request failed", error); return json(request,env,{error:"Cloudflare D1 request failed",detail:error instanceof Error ? error.message : String(error)},500); }
}};
