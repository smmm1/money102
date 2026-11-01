import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const health = await readFile(new URL("../src/Health.tsx", import.meta.url), "utf8");
const journal = await readFile(new URL("../src/Journal.tsx", import.meta.url), "utf8");
const state = await readFile(new URL("../src/dayState.ts", import.meta.url), "utf8");

test("Health history can be searched and narrowed without leaving the page", () => {
  assert.match(health, /type="search"/);
  assert.match(health, /ค้นหาประวัติสุขภาพ/);
  assert.match(health, /const filtered = sorted\.filter/);
  assert.match(health, /กรองประเภทข้อมูลสุขภาพ/);
  assert.match(health, /ล้างตัวกรอง/);
});

test("Editing exercise records retains the saved duration for both snapshot formats", () => {
  assert.match(health, /txt\(entry\.extra\)\.match\(\/\(\\d\+\)\\s\*นาที\//);
  assert.match(health, /legacyDuration = txt\(entry\.note\)\.match/);
  assert.match(health, /duration < 1 \|\| duration > 1440/);
  assert.match(health, /form\.note = txt\(entry\.note\)\.slice\(0, legacyDuration\.index\)\.trim\(\)/);
});

test("Health keeps optional details out of the primary entry flow", () => {
  assert.match(health, /<details className="hl-advanced"/);
  assert.match(health, /รายละเอียดเพิ่มเติม \(ไม่บังคับ\)/);
  assert.match(health, /HEALTH_PROFILE_KEY/);
  assert.match(health, /ดัชนีมวลกาย/);
});

test("Journal history is a searchable chronological list with compact entry actions", () => {
  assert.match(journal, /type="search"/);
  assert.match(journal, /ค้นหาหัวข้อ เนื้อหา หรือแท็ก/);
  assert.match(journal, /<div className="jr-list">/);
  assert.match(journal, /jr-entry-actions/);
  assert.match(journal, /setMoodFilter/);
  assert.match(journal, /ล้างตัวกรอง/);
});

test("Journal keeps mood, tags, date, type and pinning as optional editor details", () => {
  assert.match(journal, /<details className="jr-advanced">/);
  assert.match(journal, /ตัวเลือกเพิ่มเติม/);
  assert.match(journal, /jr-kind/);
  assert.match(journal, /jr-pin/);
});

test("Health and Journal continue using the shared authenticated D1 snapshot revision flow", () => {
  assert.match(health, /loadDayState/);
  assert.match(health, /saveDayState/);
  assert.match(journal, /loadDayState/);
  assert.match(journal, /saveDayState/);
  assert.match(state, /expected_updated_at/);
  assert.match(state, /lamoon-daytogether-v1/);
  assert.match(state, /lamoon-health-profile-v1/);
  assert.doesNotMatch(health + journal, /localStorage|sessionStorage|supabase/i);
});
