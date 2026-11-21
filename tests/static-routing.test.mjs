import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const nexus = await readFile(new URL("../src/Nexus.tsx", import.meta.url), "utf8");
const worker = await readFile(new URL("../workers/money102-api.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../workers/migrations/0004_nexus_story_world.sql", import.meta.url), "utf8");
const fallback = await readFile(new URL("../public/404.html", import.meta.url), "utf8");

test("the app keeps the existing private authentication shell", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /return <CloudAuth \/>/);
});

test("the owner login, session validation, and sign-out remain intact", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /if \(user\) return <Nexus/);
  assert.match(auth, /Money102/);
  assert.doesNotMatch(auth, /\/api\/auth\/signup/);
});

test("NEXUS restores the hunter guild roleplay setting and free-form input", () => {
  assert.match(nexus, /Blue Dragon Guild/);
  assert.match(nexus, /ภารกิจแรงก์ B/);
  assert.match(nexus, /สมาชิกธรรมดา/);
  assert.match(nexus, /ไม่รับเงินเดือน/);
  assert.match(nexus, /textarea/);
  assert.match(nexus, /ไม่มีตัวเลือกบังคับ/);
  assert.match(nexus, /เปิดใช้ภาพ AI/);
});

test("story API authenticates users and stores world state and turns in D1", () => {
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/story\/"\)/);
  assert.match(worker, /getAuthenticatedUser\(request, env\.DB\)/);
  assert.match(worker, /story_worlds/);
  assert.match(worker, /story_turns/);
  assert.match(worker, /AI_API_KEY/);
  assert.match(worker, /generativelanguage\.googleapis\.com/);
  assert.match(migration, /REFERENCES app_users\(id\)/);
  assert.match(migration, /FOREIGN KEY\(world_id,user_id\)/);
});

test("the static fallback still returns unknown paths to the single-page app", () => {
  assert.match(fallback, /window\.location\.replace\(["']\/["']\)/);
});
