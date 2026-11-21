const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([env.APP_ORIGIN, "https://money102.onrender.com", "https://nexus-story-world-preview.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
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
    if (raw.length > 16_384) return null;
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
          const result = await env.DB.prepare("SELECT id,role,content,metadata_json,created_at FROM story_turns WHERE world_id=? AND user_id=? ORDER BY created_at DESC LIMIT ?").bind(worldId,user.id,limit).all();
          return json(request, env, {turns:(result.results || []).reverse()});
        }
        if (parts[2] === "worlds" && worldId && parts[4] === "turns" && parts.length === 5 && request.method === "POST") {
          const body = await parseBody(request);
          const message = typeof body?.message === "string" ? body.message.trim() : "";
          if (!message || message.length > 3000) return json(request, env, {error:"ข้อความต้องมีความยาว 1–3,000 ตัวอักษร"},400);
          const world = await env.DB.prepare("SELECT id,title,setting_json,state_json FROM story_worlds WHERE id=? AND user_id=?").bind(worldId,user.id).first();
          if (!world) return json(request, env, {error:"ไม่พบโลกนี้"},404);
          if (!env.AI_API_KEY) return json(request,env,{error:"ยังไม่ได้ตั้งค่า Gemini API Key ใน Cloudflare Worker",code:"AI_NOT_CONFIGURED"},503);
          const recent = await env.DB.prepare("SELECT role,content FROM story_turns WHERE world_id=? AND user_id=? ORDER BY created_at DESC LIMIT 18").bind(worldId,user.id).all();
          const history = (recent.results || []).reverse().map(row => (row.role==="player" ? "ผู้เล่น: " : "ผู้บรรยาย: ") + row.content).join("\n");
          const prompt = [
            "คุณคือ Game Master ของเกมโรลเพลย์ภาษาไทยแบบอิสระ ผู้เล่นเป็นผู้กำหนดการกระทำเอง ห้ามเสนอเมนู A/B/C เว้นแต่ผู้เล่นขอ",
            "โลก: " + world.title,
            "การตั้งค่าโลก: " + world.setting_json,
            "สถานะโลกที่บันทึกไว้: " + world.state_json,
            "ประวัติล่าสุด: " + (history || "นี่คือการเริ่มเล่น"),
            "การกระทำล่าสุดของผู้เล่น: " + message,
            "กติกา: NPC มีเจตจำนงและบุคลิกของตัวเอง ไม่เห็นด้วยกับผู้เล่นได้ การกระทำมีผลตามเหตุผล ห้ามควบคุมคำพูดหรือการตัดสินใจแทนผู้เล่น รักษาความต่อเนื่องของชื่อ ความสัมพันธ์ อุปกรณ์ เงิน และเหตุการณ์ ห้ามยกระดับพลังหรือความสนิทโดยไม่มีเหตุการณ์รองรับ",
            "เขียนภาษาไทยแบบนิยายภาพ มีบทพูด บรรยากาศ และรายละเอียดพอดี อย่าตอบเหมือนแชตบอต",
            "ตอบเป็น JSON object เท่านั้น มี keys: narration (string), speaker (string), scene (string), memory (string), state_updates (object). narration เป็นเนื้อเรื่อง; speaker เป็นชื่อผู้พูดหรือผู้บรรยาย; scene เป็นคำอธิบายฉาก; memory เป็นข้อเท็จจริงใหม่; state_updates เป็นข้อมูลสถานะที่เปลี่ยนไป"
          ].join("\n\n");
          const model = env.AI_MODEL || "gemini-2.5-flash";
          const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.AI_API_KEY);
          const aiResponse = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.9,maxOutputTokens:1400,responseMimeType:"application/json"}})});
          if (!aiResponse.ok) {
            const detail = await aiResponse.text();
            console.error("Gemini request failed",aiResponse.status,detail.slice(0,500));
            return json(request,env,{error:aiResponse.status===429?"Gemini ใช้โควตาฟรีครบชั่วคราว ลองใหม่ภายหลัง":"Gemini ตอบกลับไม่สำเร็จ กรุณาตรวจสอบ API Key และโมเดล",code:aiResponse.status===429?"AI_QUOTA":"AI_PROVIDER_ERROR"},aiResponse.status===429?429:502);
          }
          const aiBody = await aiResponse.json();
          const raw = aiBody?.candidates?.[0]?.content?.parts?.map(part=>part.text || "").join("").trim();
          if (!raw) return json(request,env,{error:"AI ไม่ได้ส่งเนื้อเรื่องกลับมา กรุณาลองอีกครั้ง"},502);
          let parsed;
          try { parsed = JSON.parse(raw.replace(/^\x60{3}(?:json)?/i,"").replace(/\x60{3}$/,"").trim()); } catch { parsed = {narration:raw,speaker:"ผู้บรรยาย",scene:"",memory:"",state_updates:{}}; }
          const narration = typeof parsed.narration==="string" ? parsed.narration.slice(0,10000) : raw.slice(0,10000);
          const speaker = typeof parsed.speaker==="string" ? parsed.speaker.slice(0,100) : "ผู้บรรยาย";
          const metadata = {speaker,scene:typeof parsed.scene==="string"?parsed.scene.slice(0,500):"",memory:typeof parsed.memory==="string"?parsed.memory.slice(0,1500):""};
          let state = {};
          try { state = JSON.parse(world.state_json || "{}"); } catch {}
          if (parsed.state_updates && typeof parsed.state_updates==="object" && !Array.isArray(parsed.state_updates)) state = {...state,...parsed.state_updates};
          const now = new Date().toISOString();
          const playerTurn = toBase64Url(randomBytes(18));
          const narratorTurn = toBase64Url(randomBytes(18));
          const narratorTime = new Date(Date.now()+1).toISOString();
          await env.DB.batch([
            env.DB.prepare("INSERT INTO story_turns(id,world_id,user_id,role,content,metadata_json,created_at) VALUES(?,?,?,'player',?,'{}',?)").bind(playerTurn,worldId,user.id,message,now),
            env.DB.prepare("INSERT INTO story_turns(id,world_id,user_id,role,content,metadata_json,created_at) VALUES(?,?,?,'narrator',?,?,?)").bind(narratorTurn,worldId,user.id,narration,JSON.stringify(metadata),narratorTime),
            env.DB.prepare("UPDATE story_worlds SET state_json=?,updated_at=? WHERE id=? AND user_id=?").bind(JSON.stringify(state),now,worldId,user.id)
          ]);
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
