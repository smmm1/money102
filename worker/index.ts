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
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  APP_ORIGIN: string;
}
type Snapshot = Record<string, string>;

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([
    env.APP_ORIGIN,
    "https://money102-staging.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean));
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin",
  };
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request: Request, env: Env, value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) },
  });
}

async function getAuthenticatedUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  // Keep the existing Supabase Auth identity; only application data moves to D1.
  // Validate the access token against Supabase Auth rather than trusting a client-supplied user ID.
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown };
  return typeof user.id === "string" ? user.id : null;
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 500 && entries.every(([key, item]) =>
    key.startsWith("lamoon-") && typeof item === "string"
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true, service: "money102-cloudflare-api" });
    }
    if (url.pathname !== "/api/state" || !["GET", "PUT"].includes(request.method)) {
      return json(request, env, { error: "Not found" }, 404);
    }

    let userId: string | null;
    try {
      userId = await getAuthenticatedUserId(request, env);
    } catch {
      return json(request, env, { error: "Authentication provider unavailable" }, 502);
    }
    if (!userId) return json(request, env, { error: "Unauthorized" }, 401);

    if (request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT payload, updated_at FROM user_app_data WHERE user_id = ? AND bucket = ?"
      ).bind(userId, "app_state").first<{ payload: string; updated_at: string }>();
      if (!row) return json(request, env, { payload: null, updated_at: null });
      try {
        return json(request, env, { payload: JSON.parse(row.payload), updated_at: row.updated_at });
      } catch {
        return json(request, env, { error: "Stored data is invalid JSON; no data was changed" }, 500);
      }
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 900_000) return json(request, env, { error: "Payload exceeds 900 KB limit" }, 413);
    let body: { payload?: unknown };
    try {
      body = await request.json() as { payload?: unknown };
    } catch {
      return json(request, env, { error: "Request body must be valid JSON" }, 400);
    }
    if (!isSnapshot(body.payload)) {
      return json(request, env, { error: "payload must be an object containing only lamoon-* string values (max 500 keys)" }, 400);
    }
    const serialized = JSON.stringify(body.payload);
    if (serialized.length > 900_000) return json(request, env, { error: "Payload exceeds 900 KB limit" }, 413);

    const updatedAt = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO user_app_data (user_id, bucket, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, bucket) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
    ).bind(userId, "app_state", serialized, updatedAt).run();
    return json(request, env, { ok: true, updated_at: updatedAt });
  },
};
