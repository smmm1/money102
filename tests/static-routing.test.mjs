import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const world = await readFile(new URL("../src/LifeWorld.tsx", import.meta.url), "utf8");
const engine = await readFile(new URL("../src/lifeSimulation.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/life-simulation.css", import.meta.url), "utf8");

test("the authenticated app mounts the new life simulation instead of the old personal dashboard", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /import LifeWorld from ["']\.\/LifeWorld["']/);
  assert.match(app, /<CloudAuth>[\s\S]*<LifeWorld\s*\/>[\s\S]*<\/CloudAuth>/);
  assert.doesNotMatch(app, /DayTogether/);
  assert.match(auth, /children\?: ReactNode/);
  assert.match(auth, /if \(user\) return <AuthContext\.Provider value=\{\{ user, signOut \}\}>/);
});

test("life simulation provides multiple lives, a branching timeline and a year-by-year journey", () => {
  for (const feature of ["createLife", "advanceLife", "resolveLifeChoice", "validateLifeRecord", "expectedLifespan", "pendingEvent", "timeline"]) {
    assert.ok(engine.includes(feature), `missing life simulation feature: ${feature}`);
  }
  for (const label of ["ประเทศไทย", "ญี่ปุ่น", "อินเดีย", "บราซิล", "เยอรมนี", "ไนจีเรีย"]) {
    assert.ok(engine.includes(label), `missing randomized origin: ${label}`);
  }
  assert.match(world, /เริ่มต้นชีวิตใหม่/);
  assert.match(world, /เรื่องราวชีวิต/);
  assert.match(world, /สถานะชีวิต/);
  assert.match(world, /ใช้ชีวิตต่อ/);
  assert.match(world, /pendingEvent\.choices\.map/);
});

test("life records persist to the authenticated D1 snapshot without browser local storage", () => {
  assert.match(world, /LIFE_KEY = "lamoon-life-sim-v1"/);
  assert.match(world, /api\(["']\/api\/state["']\)/);
  assert.match(world, /method: "PUT"/);
  assert.match(world, /expected_updated_at/);
  assert.match(world, /\.\.\.\(current\.payload \?\? \{\}\)/);
  assert.match(world, /attempt < 2/);
  assert.doesNotMatch(world, /localStorage|sessionStorage/);
});

test("the existing Cloudflare sign-in and session endpoints remain in place", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /money102-api\.s2mtha16\.workers\.dev/);
  assert.doesNotMatch(auth, /localStorage|signup/);
});

test("life simulation layout adapts to mobile and desktop screens", () => {
  assert.match(styles, /@media\(max-width:800px\)/);
  assert.match(styles, /@media\(max-width:440px\)/);
  assert.match(styles, /\.life-nav/);
  assert.match(styles, /\.life-stat-grid/);
  assert.match(styles, /\.life-modal/);
});
