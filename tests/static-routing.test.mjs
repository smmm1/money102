import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const nexus = await readFile(new URL("../src/Nexus.tsx", import.meta.url), "utf8");
const worker = await readFile(new URL("../workers/money102-api.js", import.meta.url), "utf8");
const fallback = await readFile(new URL("../public/404.html", import.meta.url), "utf8");

test("the application entry point mounts the private login shell", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /return <CloudAuth \/>/);
  assert.doesNotMatch(app, /DayTogether|Savings|Health|SplitBill/);
});

test("the login shell preserves authentication and mounts NEXUS after sign-in", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /import Nexus from ["']\.\/Nexus["']/);
  assert.match(auth, /<Nexus user=\{user\}/);
  assert.match(auth, /เข้าสู่ระบบ/);
  assert.doesNotMatch(auth, /\/api\/state|\/api\/auth\/signup/);
  assert.match(nexus, /onSignOut/);
});

test("the Worker exposes authenticated D1 story routes alongside existing auth", () => {
  assert.match(worker, /\/api\/auth\/signin/);
  assert.match(worker, /\/api\/auth\/me/);
  assert.match(worker, /\/api\/auth\/logout/);
  assert.match(worker, /\/api\/story\//);
  assert.match(worker, /applyStateUpdates\(state, parsed\.state_updates, selectedCharacter\.id\)/);
  assert.match(worker, /json_extract\(metadata_json/);
  assert.match(worker, /metadata\.characterId === selectedCharacter\.id/);
  assert.match(worker, /getAuthenticatedUser\(request, env\.DB\)/);
  assert.match(worker, /checkAuthRateLimit/);
  assert.match(worker, /auth_rate_limits/);
  assert.doesNotMatch(worker, /DayTogether|\/api\/state|\/api\/simulator|auth\/account|auth\/password|user_app_data|SUPABASE/);
});

test("NEXUS starts with world rules only and does not seed a previous roleplay", () => {
  assert.match(nexus, /WORLD_SETTING/);
  assert.match(nexus, /ตัวละครเริ่มต้น/);
  assert.match(nexus, /currentSceneCharacterIds/);
  assert.match(nexus, /dossiers/);
  assert.doesNotMatch(nexus, /Blue Dragon|ภารกิจแรงก์ B|สมาชิกธรรมดา|ไม่รับเงินเดือน|Kim Taegwon/);
});

test("the static fallback returns unknown paths to the single-page login", () => {
  assert.match(fallback, /window\.location\.replace\(["']\/["']\)/);
  assert.doesNotMatch(fallback, /DayTogether|__route=/);
});
