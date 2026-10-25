interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(query: string): D1Statement;
}
interface Env {
  DB: D1Database;
  APP_ORIGIN?: string;
}
type Snapshot = Record<string, string>;
type UserRow = { id: string; email: string };

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([
    env.APP_ORIGIN,
    "https://money102.onrender.com",
    "https://money102-staging.onrender.com",
    "https://money102-command-center-preview.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean));
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request: Request, env: Env, value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request, env) },
  });
}

async function ensureSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS user_app_data (
    user_id TEXT NOT NULL,
    bucket TEXT NOT NULL CHECK (bucket = 'app_state'),
    payload TEXT NOT NULL CHECK (json_valid(payload)),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, bucket)
  )`).run();
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomBytes(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

async function sha256(value: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function passwordHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 500 && entries.every(([key, item]) => key.startsWith("lamoon-") && typeof item === "string");
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 1_000_000) return null;
  try {
    const value = await request.json() as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function issueSession(db: D1Database, user: UserRow) {
  const token = toBase64Url(randomBytes(32));
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("INSERT INTO app_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, user.id, now + SESSION_TTL_SECONDS, new Date().toISOString()).run();
  return { token, user };
}

async function getAuthenticatedUser(request: Request, db: D1Database): Promise<UserRow | null> {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (token.length < 30 || token.length > 200) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(`SELECT u.id, u.email FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash, now).first<UserRow>();
  return row || null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    try {
      await ensureSchema(env.DB);
      if (url.pathname === "/health" && request.method === "GET") {
        return json(request, env, { ok: true, service: "money102-cloudflare-api", auth: "cloudflare-d1" });
      }

      if (url.pathname === "/api/auth/signup" && request.method === "POST") {
        const body = await parseBody(request);
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
          return json(request, env, { error: "กรุณากรอกอีเมลให้ถูกต้อง" }, 400);
        }
        if (password.length < 8 || password.length > 256) {
          return json(request, env, { error: "รหัสผ่านต้องมีความยาว 8–256 ตัวอักษร" }, 400);
        }
        const existing = await env.DB.prepare("SELECT id FROM app_users WHERE email = ?").bind(email).first<{ id: string }>();
        if (existing) return json(request, env, { error: "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ" }, 409);
        const id = crypto.randomUUID();
        const salt = randomBytes(16);
        const hash = await passwordHash(password, salt);
        try {
          await env.DB.prepare("INSERT INTO app_users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(id, email, toBase64Url(salt), toBase64Url(hash), new Date().toISOString()).run();
        } catch {
          return json(request, env, { error: "สร้างบัญชีไม่สำเร็จ บัญชีนี้อาจมีอยู่แล้ว" }, 409);
        }
        const session = await issueSession(env.DB, { id, email });
        return json(request, env, session, 201);
      }

      if (url.pathname === "/api/auth/signin" && request.method === "POST") {
        const body = await parseBody(request);
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!email || !password) return json(request, env, { error: "กรุณากรอกอีเมลและรหัสผ่าน" }, 400);
        const row = await env.DB.prepare("SELECT id, email, password_salt, password_hash FROM app_users WHERE email = ?")
          .bind(email).first<{ id: string; email: string; password_salt: string; password_hash: string }>();
        if (!row) return json(request, env, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
        const actual = await passwordHash(password, fromBase64Url(row.password_salt));
        if (!constantTimeEqual(actual, fromBase64Url(row.password_hash))) {
          return json(request, env, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
        }
        const session = await issueSession(env.DB, { id: row.id, email: row.email });
        return json(request, env, session);
      }

      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await getAuthenticatedUser(request, env.DB);
        if (!user) return json(request, env, { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
        return json(request, env, { user });
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (authorization.startsWith("Bearer ")) {
          await env.DB.prepare("DELETE FROM app_sessions WHERE token_hash = ?").bind(await sha256(authorization.slice(7).trim())).run();
        }
        return json(request, env, { ok: true });
      }

      if (url.pathname !== "/api/state" || !["GET", "PUT"].includes(request.method)) {
        return json(request, env, { error: "Not found" }, 404);
      }
      const user = await getAuthenticatedUser(request, env.DB);
      if (!user) return json(request, env, { error: "Unauthorized" }, 401);

      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT payload, updated_at FROM user_app_data WHERE user_id = ? AND bucket = ?")
          .bind(user.id, "app_state").first<{ payload: string; updated_at: string }>();
        if (!row) return json(request, env, { payload: null, updated_at: null });
        try {
          return json(request, env, { payload: JSON.parse(row.payload), updated_at: row.updated_at });
        } catch {
          return json(request, env, { error: "Stored data is invalid JSON" }, 500);
        }
      }

      const body = await parseBody(request);
      if (!body || !isSnapshot(body.payload)) {
        return json(request, env, { error: "payload ต้องเป็น object ที่มีเฉพาะค่า string ของคีย์ lamoon-* (ไม่เกิน 500 รายการ)" }, 400);
      }
      const serialized = JSON.stringify(body.payload);
      if (serialized.length > 900_000) return json(request, env, { error: "Payload exceeds 900 KB limit" }, 413);
      const updatedAt = new Date().toISOString();
      await env.DB.prepare("INSERT INTO user_app_data (user_id, bucket, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, bucket) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
        .bind(user.id, "app_state", serialized, updatedAt).run();
      return json(request, env, { ok: true, updated_at: updatedAt });
    } catch (error) {
      console.error("money102-api-staging request failed", error);
      return json(request, env, { error: "Cloudflare D1 request failed" }, 500);
    }
  },
};
