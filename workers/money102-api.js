const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([env.APP_ORIGIN, "https://money102.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, env, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request, env) },
  });
}

async function ensureSchema(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS story_worlds (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,title TEXT NOT NULL,setting_json TEXT NOT NULL CHECK(json_valid(setting_json)),state_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(state_json)),image_settings_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(image_settings_json)),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(id,user_id))").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_story_worlds_user_updated ON story_worlds(user_id,updated_at DESC)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS story_turns (id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('player','narrator')),content TEXT NOT NULL CHECK(length(content)<=12000),metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)),created_at TEXT NOT NULL,FOREIGN KEY(world_id,user_id) REFERENCES story_worlds(id,user_id) ON DELETE CASCADE)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_story_turns_world_created ON story_turns(world_id,user_id,created_at)").run();
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_story_turns_request_id ON story_turns(world_id,user_id,json_extract(metadata_json,'$.requestId')) WHERE role='player' AND json_extract(metadata_json,'$.requestId') IS NOT NULL").run();

  await db.prepare("CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS auth_rate_limits (bucket_key TEXT PRIMARY KEY,window_started_at INTEGER NOT NULL,attempts INTEGER NOT NULL CHECK(attempts>0))").run();
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function randomBytes(size) { return crypto.getRandomValues(new Uint8Array(size)); }
async function sha256(value) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return new Uint8Array(bits);
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}
async function parseBody(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 16_384) return null;
  try {
    const raw = await request.text();
    if (raw.length > 65_536) return null;
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
async function checkAuthRateLimit(db, request, email, now = Date.now()) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const cutoff = now - 15 * 60 * 1000;
  const ipKey = await sha256("auth-ip:" + ip + ":signin");
  const identityKey = await sha256("auth-identity:" + ip + ":" + email + ":signin");
  const consume = async (key, limit) => {
    const row = await db.prepare(
      "INSERT INTO auth_rate_limits(bucket_key,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(bucket_key) DO UPDATE SET attempts=CASE WHEN window_started_at<=? THEN 1 ELSE attempts+1 END,window_started_at=CASE WHEN window_started_at<=? THEN excluded.window_started_at ELSE window_started_at END RETURNING attempts",
    ).bind(key, now, cutoff, cutoff).first();
    return Number(row?.attempts || 0) <= limit;
  };
  const ipAllowed = await consume(ipKey, 30);
  const identityAllowed = await consume(identityKey, 8);
  if (randomBytes(1)[0] === 0) {
    await db.prepare("DELETE FROM auth_rate_limits WHERE window_started_at < ?").bind(now - 24 * 60 * 60 * 1000).run();
  }
  return ipAllowed && identityAllowed;
}

async function issueSession(db, user) {
  const token = toBase64Url(randomBytes(32));
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM app_sessions WHERE expires_at<=?").bind(now).run();
  await db.prepare("INSERT INTO app_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .bind(tokenHash, user.id, now + SESSION_TTL_SECONDS, new Date().toISOString()).run();
  return { token, user };
}
async function getAuthenticatedUser(request, db) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (token.length < 30 || token.length > 200) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("SELECT u.id,u.email FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(tokenHash, now).first();
}

function cleanText(value, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}
function cleanList(value, maxItems = 30, maxText = 160) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, maxItems).map(item => item.trim().slice(0, maxText)).filter(Boolean) : undefined;
}
function cleanValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.slice(0, 80);
  return undefined;
}
function applyStateUpdates(current, updates, characterId) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) return current;
  const next = { ...current };
  const location = cleanText(updates.location, 200);
  const worldTime = cleanText(updates.worldTime, 80);
  if (location !== undefined) next.location = location;
  if (worldTime !== undefined) next.worldTime = worldTime;
  if (Array.isArray(updates.currentSceneCharacterIds)) {
    next.currentSceneCharacterIds = updates.currentSceneCharacterIds.filter(x => typeof x === "string").slice(0, 40);
  }
  if (Array.isArray(updates.sharedEvents)) {
    const existing = Array.isArray(next.sharedEvents) ? next.sharedEvents : [];
    next.sharedEvents = [...new Set([...existing, ...cleanList(updates.sharedEvents, 40, 500)])].slice(-60);
  }
  if (Array.isArray(updates.dossiers)) {
    const existing = Array.isArray(next.dossiers) ? next.dossiers : [];
    const byId = new Map(existing.filter(x => x && typeof x.id === "string").map(x => [x.id, x]));
    for (const item of updates.dossiers.slice(0, 40)) {
      if (!item || typeof item.id !== "string" || typeof item.name !== "string") continue;
      const prior = byId.get(item.id) || {};
      const known = { ...(prior.known || {}) };
      if (item.known && typeof item.known === "object" && !Array.isArray(item.known)) {
        for (const [key, value] of Object.entries(item.known).slice(0, 20)) {
          if (typeof value === "string" && value.trim()) known[key.slice(0, 40)] = value.trim().slice(0, 220);
        }
      }
      byId.set(item.id, {
        ...prior,
        id: item.id.slice(0, 100),
        name: cleanText(item.name, 100) || prior.name,
        role: cleanText(item.role, 100) ?? prior.role,
        rank: cleanText(item.rank, 40) ?? prior.rank,
        guild: cleanText(item.guild, 100) ?? prior.guild,
        relationship: cleanText(item.relationship, 100) ?? prior.relationship,
        observedSkills: cleanList(item.observedSkills, 20, 100) ?? prior.observedSkills,
        known
      });
    }
    next.dossiers = [...byId.values()].slice(-100);
  }
  if (Array.isArray(updates.guilds)) {
    const existing = Array.isArray(next.guilds) ? next.guilds : [];
    const byId = new Map(existing.filter(x => x && typeof x.id === "string").map(x => [x.id, x]));
    for (const item of updates.guilds.slice(0, 30)) {
      if (!item || typeof item.id !== "string" || typeof item.name !== "string") continue;
      const prior = byId.get(item.id) || {};
      byId.set(item.id, {
        ...prior, id: item.id.slice(0, 100), name: cleanText(item.name, 120) || prior.name,
        emblem: cleanText(item.emblem, 20) ?? prior.emblem,
        leader: cleanText(item.leader, 100) ?? prior.leader,
        rank: cleanText(item.rank, 40) ?? prior.rank,
        members: cleanValue(item.members) ?? prior.members,
        funds: cleanText(item.funds, 100) ?? prior.funds,
        notes: cleanText(item.notes, 500) ?? prior.notes
      });
    }
    next.guilds = [...byId.values()].slice(-50);
  }
  if (Array.isArray(updates.characters)) {
    const incoming = updates.characters.find(x => x && x.id === characterId);
    const existing = Array.isArray(next.characters) ? next.characters : [];
    next.characters = existing.map(character => {
      if (!character || character.id !== characterId || !incoming) return character;
      const merged = { ...character };
      for (const key of ["age", "className", "rank", "money"]) {
        const value = cleanText(incoming[key], key === "money" ? 100 : 80);
        if (value !== undefined) merged[key] = value;
      }
      for (const key of ["attributes", "resources"]) {
        if (incoming[key] && typeof incoming[key] === "object" && !Array.isArray(incoming[key])) {
          const values = { ...(character[key] || {}) };
          for (const [name, value] of Object.entries(incoming[key]).slice(0, 20)) {
            const safe = cleanValue(value);
            if (safe !== undefined) values[name.slice(0, 40)] = safe;
          }
          merged[key] = values;
        }
      }
      if (Array.isArray(incoming.titles)) merged.titles = cleanList(incoming.titles, 20, 100);
      if (Array.isArray(incoming.injuries)) merged.injuries = cleanList(incoming.injuries, 30, 160);
      if (Array.isArray(incoming.skills)) merged.skills = incoming.skills.slice(0, 50).filter(x => x && typeof x.name === "string").map(x => ({ name: cleanText(x.name, 100), type: cleanText(x.type, 60), mastery: cleanText(x.mastery, 60), description: cleanText(x.description, 240) }));
      if (Array.isArray(incoming.equipment)) merged.equipment = incoming.equipment.slice(0, 50).filter(x => x && typeof x.name === "string").map(x => ({ name: cleanText(x.name, 100), slot: cleanText(x.slot, 60), description: cleanText(x.description, 240) }));
      if (incoming.guildId === null || typeof incoming.guildId === "string") merged.guildId = incoming.guildId;
      return merged;
    });
  }
  if (updates.activeGuildId === null || typeof updates.activeGuildId === "string") next.activeGuildId = updates.activeGuildId;
  return next;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    try {
      await ensureSchema(env.DB);
      if (url.pathname === "/health" && request.method === "GET") {
        return json(request, env, { ok: true, service: "money102-auth-api", auth: "cloudflare-d1" });
      }

      if (url.pathname.startsWith("/api/story/")) {
        const user = await getAuthenticatedUser(request, env.DB);
        if (!user) return json(request, env, { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[2] === "worlds" && parts.length === 3 && request.method === "GET") {
          const result = await env.DB.prepare("SELECT id,title,setting_json,state_json,image_settings_json,created_at,updated_at FROM story_worlds WHERE user_id=? ORDER BY updated_at DESC").bind(user.id).all();
          return json(request, env, { worlds: result.results || [] });
        }
        if (parts[2] === "worlds" && parts.length === 3 && request.method === "POST") {
          const body = await parseBody(request);
          if (!body || typeof body.title !== "string" || !body.title.trim() || body.title.length > 120 || !body.setting || typeof body.setting !== "object") return json(request, env, { error: "ข้อมูลโลกไม่ถูกต้อง" }, 400);
          const id = toBase64Url(randomBytes(18));
          const now = new Date().toISOString();
          await env.DB.prepare("INSERT INTO story_worlds(id,user_id,title,setting_json,state_json,image_settings_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
            .bind(id,user.id,body.title.trim(),JSON.stringify(body.setting),JSON.stringify(body.state || {}),JSON.stringify(body.imageSettings || {enabled:false,auto:false}),now,now).run();
          const world = await env.DB.prepare("SELECT id,title,setting_json,state_json,image_settings_json,created_at,updated_at FROM story_worlds WHERE id=? AND user_id=?").bind(id,user.id).first();
          return json(request, env, { world }, 201);
        }
        const worldId = parts[3];
        if (parts[2] === "worlds" && worldId && parts.length === 4 && request.method === "GET") {
          const world = await env.DB.prepare("SELECT id,title,setting_json,state_json,image_settings_json,created_at,updated_at FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          return world ? json(request, env, {world}) : json(request, env, {error:"ไม่พบโลกนี้"},404);
        }
        if (parts[2] === "worlds" && worldId && parts.length === 4 && request.method === "PUT") {
          const body = await parseBody(request);
          if (!body) return json(request, env, {error:"ข้อมูลไม่ถูกต้อง"},400);
          const current = await env.DB.prepare("SELECT id FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          if (!current) return json(request, env, {error:"ไม่พบโลกนี้"},404);
          await env.DB.prepare("UPDATE story_worlds SET title=COALESCE(?,title),state_json=COALESCE(?,state_json),image_settings_json=COALESCE(?,image_settings_json),updated_at=? WHERE id=? AND user_id=?")
            .bind(typeof body.title==="string" && body.title.trim() ? body.title.trim().slice(0,120) : null,body.state ? JSON.stringify(body.state) : null,body.imageSettings ? JSON.stringify(body.imageSettings) : null,new Date().toISOString(),worldId,user.id).run();
          const world = await env.DB.prepare("SELECT id,title,setting_json,state_json,image_settings_json,created_at,updated_at FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          return json(request, env, {world});
        }
        if (parts[2] === "worlds" && worldId && parts[4] === "turns" && parts.length === 5 && request.method === "GET") {
          const world = await env.DB.prepare("SELECT id FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          if (!world) return json(request, env, {error:"ไม่พบโลกนี้"},404);
          const limit = Math.min(100,Math.max(1,Number(url.searchParams.get("limit") || 60)));
          const characterId = url.searchParams.get("characterId");
          const result = characterId
            ? await env.DB.prepare("SELECT id,role,content,metadata_json,created_at FROM story_turns WHERE world_id=? AND user_id=? AND json_extract(metadata_json,'$.characterId')=? ORDER BY created_at DESC LIMIT ?").bind(worldId,user.id,characterId,limit).all()
            : await env.DB.prepare("SELECT id,role,content,metadata_json,created_at FROM story_turns WHERE world_id=? AND user_id=? ORDER BY created_at DESC LIMIT ?").bind(worldId,user.id,limit).all();
          return json(request, env, {turns:(result.results || []).reverse()});
        }
        if (parts[2] === "worlds" && worldId && parts[4] === "turns" && parts.length === 5 && request.method === "POST") {
          const body = await parseBody(request);
          const message = typeof body?.message === "string" ? body.message.trim() : "";
          if (!message || message.length > 3000) return json(request, env, {error:"ข้อความต้องมีความยาว 1–3,000 ตัวอักษร"},400);
          const world = await env.DB.prepare("SELECT id,title,setting_json,state_json FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          if (!world) return json(request, env, {error:"ไม่พบโลกนี้"},404);
          let currentState = {};
          try { currentState = JSON.parse(world.state_json || "{}"); } catch {}
          const playerCharacters = Array.isArray(currentState.characters) ? currentState.characters : [];
          const selectedCharacter = playerCharacters.find(character => character && character.id === body.characterId);
          if (!selectedCharacter) return json(request,env,{error:"กรุณาเลือกตัวละครที่มีอยู่ในโลกนี้ก่อนเริ่มเล่น"},400);
          const suppliedRequestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
          // Backward compatibility: cached/older frontends may not send requestId.
          // Generate one server-side so the turn can proceed; current frontends still
          // provide their own stable ID for safe retries.
          const requestId = /^[A-Za-z0-9_-]{16,64}$/.test(suppliedRequestId) ? suppliedRequestId : crypto.randomUUID();
          const prior = await env.DB.prepare("SELECT id,role,content,metadata_json,created_at FROM story_turns WHERE world_id=? AND user_id=? AND role='narrator' AND json_extract(metadata_json,'$.requestId')=? LIMIT 1").bind(worldId,user.id,requestId).first();
          if (prior) {
            let priorState = {};
            let priorMetadata = {};
            try { priorState = JSON.parse(world.state_json || "{}"); } catch {}
            try { priorMetadata = JSON.parse(prior.metadata_json || "{}"); } catch {}
            return json(request,env,{turn:{...prior,metadata:priorMetadata},state:priorState,replayed:true});
          }
          if (!env.AI_API_KEY) return json(request,env,{error:"ยังไม่ได้ตั้งค่า Gemini API Key ใน Cloudflare Worker",code:"AI_NOT_CONFIGURED"},503);
          const recent = await env.DB.prepare("SELECT role,content,metadata_json FROM story_turns WHERE world_id=? AND user_id=? ORDER BY created_at DESC LIMIT 80").bind(worldId,user.id).all();
          const history = (recent.results || []).reverse().filter(row => {
            let metadata = {};
            try { metadata = JSON.parse(row.metadata_json || "{}"); } catch {}
            return metadata.characterId === selectedCharacter.id || metadata.shared === true;
          }).slice(-12).map(row => {
            let metadata = {};
            try { metadata = JSON.parse(row.metadata_json || "{}"); } catch {}
            const who = row.role === "player" ? (metadata.characterName || selectedCharacter.name) : (metadata.speaker || "ผู้บรรยาย");
            return (row.role === "player" ? who + ": " : "ผู้บรรยาย (" + who + "): ") + String(row.content || "").slice(-1200);
          }).join("\n");
          const prompt = [
            "คุณคือ Game Master ของเกมโรลเพลย์ภาษาไทยแบบอิสระ ผู้เล่นเป็นผู้กำหนดการกระทำเอง ห้ามเสนอเมนู A/B/C เว้นแต่ผู้เล่นขอ",
            "โลก: " + world.title,
            "การตั้งค่าโลกและกติกากลางเท่านั้น ไม่ใช่ประวัติเรื่อง: " + world.setting_json,
            "ตัวละครผู้เล่นที่กำลังควบคุม: " + JSON.stringify(selectedCharacter),
            "สถานะโลกที่บันทึกไว้: " + String(world.state_json || "{}").slice(0,10000),
            "เหตุการณ์สาธารณะร่วมของโลก: " + String(currentState.sharedEvents || "[]"),
            "ประวัติล่าสุด: " + (history || "นี่คือการเริ่มเล่นใหม่ ห้ามสร้างเหตุการณ์ก่อนหน้าขึ้นเอง"),
            "การกระทำล่าสุดของผู้เล่น: " + message,
            "ห้ามนำเรื่องราวจากแชทอื่นหรือเหตุการณ์ที่ไม่ได้อยู่ใน state มาเป็นอดีต ห้ามสร้างกิลด์เริ่มต้น ภารกิจเริ่มต้น NPC เริ่มต้น หรือข้อตกลงใด ๆ โดยไม่มีเหตุการณ์รองรับ",
            "ตัวละครผู้เล่นหลายตัวอยู่ในจักรวาลเดียวกัน แต่ละตัวมีตัวตนและสถานะของตนเอง พวกเขาจะพบกันได้เมื่อเวลา สถานที่ และเหตุการณ์สมเหตุสมผล ห้ามบังคับให้เป็นปาร์ตี้ตั้งแต่ต้น",
            "NPC มีเจตจำนงและบุคลิกของตัวเอง ไม่เห็นด้วยกับผู้เล่นได้ โลกเดินต่อได้แม้ผู้เล่นไม่ทำอะไร การกระทำมีผลตามเหตุผล ห้ามควบคุมคำพูด ความคิด หรือการตัดสินใจแทนผู้เล่น",
            "ข้อมูลบุคคลในฉากต้องเปิดเผยเท่าที่ตัวละครผู้เล่นได้เห็น ได้ยิน หรือเรียนรู้แล้วเท่านั้น แยกความสนิทสนมออกจากความรู้ ห้ามเปิดเผยข้อมูลที่ยังไม่รู้",
            "อัปเดตค่าสถานะ เงิน บาดเจ็บ อุปกรณ์ ทักษะ ความสัมพันธ์ กิลด์ และความทรงจำเฉพาะเมื่อมีเหตุการณ์รองรับ ห้ามเพิ่มพลังหรือความสนิทเอง",
            "เขียนภาษาไทยแบบนิยายภาพ มีบทพูด บรรยากาศ และรายละเอียดพอดี อย่าตอบเหมือนแชตบอต",
            "ตอบเป็น JSON object เท่านั้น มี keys: narration, speaker, scene, memory, state_updates. state_updates อาจมี location, worldTime, currentSceneCharacterIds, dossiers, guilds, characters, activeGuildId, sharedEvents; เหตุการณ์สาธารณะที่ตัวละครอื่นอาจรับรู้ได้ให้บันทึกใน sharedEvents ส่วนเหตุการณ์ส่วนตัวห้ามแชร์; dossiers แสดงเฉพาะข้อมูลที่ผู้เล่นตัวนี้รู้แล้ว; characters ต้องคง id เดิม"
          ].join("\n\n");
          const model = env.AI_MODEL || "gemini-3.5-flash-lite";
          const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.AI_API_KEY);
          let aiResponse;
          try {
            aiResponse = await fetch(endpoint,{
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1100,responseMimeType:"application/json"}}),
              signal:AbortSignal.timeout(40000)
            });
          } catch (error) {
            const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
            console.error("Gemini request transport failed",timedOut?"timeout":String(error?.name || "network_error"));
            return json(request,env,{
              error:timedOut?"AI ใช้เวลาตอบนานเกิน 40 วินาที กรุณาลองส่งอีกครั้ง":"เชื่อมต่อ Gemini ไม่สำเร็จ กรุณาลองใหม่",
              code:timedOut?"AI_TIMEOUT":"AI_NETWORK_ERROR"
            },timedOut?504:502);
          }
          if (!aiResponse.ok) {
            const detail = await aiResponse.text();
            console.error("Gemini request failed",aiResponse.status,detail.slice(0,300));
            const status = aiResponse.status;
            const messages = {
              400:"คำขอไปยัง Gemini ไม่ถูกต้อง",
              401:"Gemini API Key ไม่ถูกต้องหรือหมดอายุ",
              403:"Gemini API Key ไม่มีสิทธิ์ใช้โมเดลนี้",
              404:"ไม่พบโมเดล Gemini ที่ตั้งค่าไว้",
              429:"Gemini ใช้โควตาหรือส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง"
            };
            return json(request,env,{
              error:messages[status] || (status>=500?"Gemini ขัดข้องชั่วคราว กรุณาลองใหม่":"Gemini ตอบกลับไม่สำเร็จ"),
              code:status===429?"AI_QUOTA":status===401||status===403?"AI_AUTH_ERROR":status===404?"AI_MODEL_NOT_FOUND":"AI_PROVIDER_ERROR",
              providerStatus:status
            },status===429?429:status===401||status===403?502:status===404?502:status>=500?503:502);
          }
          const aiBody = await aiResponse.json();
          const raw = aiBody?.candidates?.[0]?.content?.parts?.map(part=>part.text || "").join("").trim();
          if (!raw) return json(request,env,{error:"AI ไม่ได้ส่งเนื้อเรื่องกลับมา กรุณาลองอีกครั้ง"},502);
          let parsed;
          try { parsed = JSON.parse(raw.replace(/^\x60{3}(?:json)?/i,"").replace(/\x60{3}$/,"").trim()); } catch { parsed = {narration:raw,speaker:"ผู้บรรยาย",scene:"",memory:"",state_updates:{}}; }
          const narration = typeof parsed.narration==="string" ? parsed.narration.slice(0,10000) : raw.slice(0,10000);
          const speaker = typeof parsed.speaker==="string" ? parsed.speaker.slice(0,100) : "ผู้บรรยาย";
          const metadata = {speaker,scene:typeof parsed.scene==="string"?parsed.scene.slice(0,500):"",memory:typeof parsed.memory==="string"?parsed.memory.trim().slice(0,1500):"",characterId:selectedCharacter.id,characterName:selectedCharacter.name,requestId};
          let state = {};
          try { state = JSON.parse(world.state_json || "{}"); } catch {}
          state = applyStateUpdates(state, parsed.state_updates, selectedCharacter.id);
          if (typeof parsed.memory==="string" && parsed.memory.trim()) {
            const memories = Array.isArray(state.memories) ? state.memories : [];
            state.memories = [...memories, parsed.memory.trim().slice(0,1500)].slice(-40);
          }
          if (metadata.scene) state.last_scene = metadata.scene;
          const now = new Date().toISOString();
          const playerTurn = toBase64Url(randomBytes(18));
          const narratorTurn = toBase64Url(randomBytes(18));
          const narratorTime = new Date(Date.now()+1).toISOString();
          try {
            await env.DB.batch([
              env.DB.prepare("INSERT INTO story_turns(id,world_id,user_id,role,content,metadata_json,created_at) VALUES(?,?,?,'player',?,?,?)").bind(playerTurn,worldId,user.id,message,JSON.stringify({characterId:selectedCharacter.id,characterName:selectedCharacter.name,requestId}),now),
              env.DB.prepare("INSERT INTO story_turns(id,world_id,user_id,role,content,metadata_json,created_at) VALUES(?,?,?,'narrator',?,?,?)").bind(narratorTurn,worldId,user.id,narration,JSON.stringify(metadata),narratorTime),
              env.DB.prepare("UPDATE story_worlds SET state_json=?,updated_at=? WHERE id=? AND user_id=?").bind(JSON.stringify(state),now,worldId,user.id)
            ]);
          } catch (saveError) {
            const committed = await env.DB.prepare("SELECT id,role,content,metadata_json,created_at FROM story_turns WHERE world_id=? AND user_id=? AND role='narrator' AND json_extract(metadata_json,'$.requestId')=? LIMIT 1").bind(worldId,user.id,requestId).first();
            if (committed) {
              const latestWorld = await env.DB.prepare("SELECT state_json FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
              let committedState = {};
              let committedMetadata = {};
              try { committedState = JSON.parse(latestWorld?.state_json || "{}"); } catch {}
              try { committedMetadata = JSON.parse(committed.metadata_json || "{}"); } catch {}
              return json(request,env,{turn:{...committed,metadata:committedMetadata},state:committedState,replayed:true});
            }
            throw saveError;
          }
          return json(request,env,{turn:{id:narratorTurn,role:"narrator",content:narration,metadata,created_at:narratorTime},state});
        }
        return json(request,env,{error:"Not found"},404);
      }
      if (url.pathname === "/api/auth/signup" && request.method === "POST") {
        return json(request, env, { error: "การสมัครสมาชิกถูกปิดใช้งาน กรุณาเข้าสู่ระบบด้วยบัญชีเดิม" }, 403);
      }
      if (url.pathname === "/api/auth/signin" && request.method === "POST") {
        const body = await parseBody(request);
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!email || !password || email.length > 254 || password.length > 128) {
          return json(request, env, { error: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" }, 400);
        }
        if (!await checkAuthRateLimit(env.DB, request, email)) {
          return json(request, env, { error: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" }, 429);
        }
        const row = await env.DB.prepare("SELECT id,email,password_salt,password_hash FROM app_users WHERE email=?").bind(email).first();
        if (!row) return json(request, env, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
        const actualHash = await passwordHash(password, fromBase64Url(row.password_salt));
        if (!constantTimeEqual(actualHash, fromBase64Url(row.password_hash))) {
          return json(request, env, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
        }
        return json(request, env, await issueSession(env.DB, { id: row.id, email: row.email }));
      }
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await getAuthenticatedUser(request, env.DB);
        return user ? json(request, env, { user }) : json(request, env, { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
      }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (authorization.startsWith("Bearer ")) {
          const token = authorization.slice(7).trim();
          if (token.length >= 30 && token.length <= 200) {
            await env.DB.prepare("DELETE FROM app_sessions WHERE token_hash=?").bind(await sha256(token)).run();
          }
        }
        return json(request, env, { ok: true });
      }
      return json(request, env, { error: "Not found" }, 404);
    } catch (error) {
      console.error("money102-auth-api request failed", error);
      return json(request, env, { error: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ภายหลัง" }, 500);
    }
  },
};
