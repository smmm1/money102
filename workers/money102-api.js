const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([env.APP_ORIGIN, "https://money102.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
