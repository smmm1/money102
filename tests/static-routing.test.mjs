import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const worker = await readFile(new URL("../workers/money102-api.js", import.meta.url), "utf8");
const fallback = await readFile(new URL("../public/404.html", import.meta.url), "utf8");

test("the application entry point mounts only the private login shell", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /return <CloudAuth \/>/);
  assert.doesNotMatch(app, /DayTogether|Savings|Health|SplitBill/);
});

test("the login shell keeps sign-in, session validation, and sign-out", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /เข้าสู่ระบบ/);
  assert.match(auth, /ออกจากระบบ/);
  assert.doesNotMatch(auth, /\/api\/state|\/api\/auth\/signup/);
});

test("the Worker exposes only the private authentication API", () => {
  assert.match(worker, /\/api\/auth\/signin/);
  assert.match(worker, /\/api\/auth\/me/);
  assert.match(worker, /\/api\/auth\/logout/);
  assert.match(worker, /checkAuthRateLimit/);
  assert.match(worker, /auth_rate_limits/);
  assert.doesNotMatch(worker, /DayTogether|\/api\/state|\/api\/simulator|auth\/account|auth\/password|user_app_data|GEMINI|SUPABASE/);
});

test("the static fallback returns unknown paths to the single-page login", () => {
  assert.match(fallback, /window\.location\.replace\(["']\/["']\)/);
  assert.doesNotMatch(fallback, /DayTogether|__route=/);
});
