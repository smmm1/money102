import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const world = await readFile(new URL("../src/LifeWorld.tsx", import.meta.url), "utf8");
const engine = await readFile(new URL("../src/lifeSimulation.ts", import.meta.url), "utf8");
const history = await readFile(new URL("../src/thaiHistory.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/life-simulation.css", import.meta.url), "utf8");

test("the authenticated app mounts the life simulation and preserves the existing login", () => {
  assert.match(app, /import CloudAuth from ["\']\\.\\/CloudAuth["\']/);
  assert.match(app, /import LifeWorld from ["\']\\.\\/LifeWorld["\']/);
  assert.match(app, /<CloudAuth>[\\s\\S]*<LifeWorld\\s*\\/>[\\s\\S]*<\\/CloudAuth>/);
  assert.doesNotMatch(app, /DayTogether/);
  assert.match(auth, /children\\?: ReactNode/);
  assert.match(auth, /if \\(user\\) return <AuthContext\\.Provider value=\\{\\{ user, signOut \\}\\}>/);
});

test("new lives are Thailand-only and randomize a birth year, province and household profile", () => {
  for (const feature of ["createLife", "yearFrom", "yearTo", "THAI_PROVINCES", "householdProfiles", "parents", "siblings", "province", "bornYear"]) assert.ok(engine.includes(feature), "missing Thai life foundation: " + feature);
  assert.match(engine, /country:"ประเทศไทย"/);
  assert.match(engine, /Math\\.max\\(1930/);
  assert.match(engine, /Math\\.min\\(2025/);
  assert.doesNotMatch(engine, /pickWeighted|lifeExpectancy|อินเดีย|บราซิล/);
  assert.match(world, /สุ่มปีเกิดและเริ่มชีวิต/);
  assert.match(world, /life-year-from/);
  assert.match(world, /life-year-to/);
});

test("historical events are tied to documented Thai years and traceable sources", () => {
  for (const year of ["1932", "1941", "1973", "1976", "1992", "1997", "2004", "2011", "2020"]) assert.ok(history.includes("year: " + year), "missing historical event year " + year);
  for (const source of ["loc.gov", "history.state.gov", "cambridge.org", "jstor.org", "amnesty.org", "bot.or.th", "un.or.th", "worldbank.org", "who.int"]) assert.ok(history.includes(source), "missing source: " + source);
  assert.match(engine, /eventForYear/);
  assert.match(engine, /sourceUrl/);
  assert.match(world, /มีแหล่งอ้างอิง/);
  assert.match(world, /life-event-context/);
  assert.match(world, /life-source/);
});

test("each simulated year produces a personal or historical event with branching risk-aware choices", () => {
  for (const feature of ["advanceLife", "resolveLifeChoice", "failureOutcome", "chance", "successEffects", "failureEffects", "stage", "eraLabel", "makePersonalEvent"]) assert.ok(engine.includes(feature), "missing simulation system: " + feature);
  assert.match(engine, /Math\\.random\\(\\)\\*100<chance/);
  assert.match(world, /โอกาสสำเร็จเริ่มต้น/);
  assert.match(world, /pendingEvent\\.choices\\.map/);
});

test("life records persist to the authenticated D1 snapshot without browser local storage", () => {
  assert.match(world, /LIFE_KEY = "lamoon-life-sim-v1"/);
  assert.match(world, /api\\(["\']\\/api\\/state["\']\\)/);
  assert.match(world, /method: "PUT"/);
  assert.match(world, /expected_updated_at/);
  assert.match(world, /\\.\\.\\.\\(current\\.payload \\?\\? \\{\\}\\)/);
  assert.match(world, /attempt < 2/);
  assert.doesNotMatch(world, /localStorage|sessionStorage/);
});

test("the existing Cloudflare sign-in and session endpoints remain in place", () => {
  assert.match(auth, /\\/api\\/auth\\/signin/);
  assert.match(auth, /\\/api\\/auth\\/me/);
  assert.match(auth, /\\/api\\/auth\\/logout/);
  assert.match(auth, /money102-api\\.s2mtha16\\.workers\\.dev/);
  assert.doesNotMatch(auth, /localStorage|signup/);
});

test("Thai life simulation layout supports mobile and desktop and shows sources", () => {
  assert.match(styles, /@media\\(max-width:800px\\)/);
  assert.match(styles, /@media\\(max-width:440px\\)/);
  assert.match(styles, /\\.life-nav/);
  assert.match(styles, /\\.life-stat-grid/);
  assert.match(styles, /\\.life-modal/);
  assert.match(styles, /\\.life-source/);
  assert.match(styles, /\\.life-year-range/);
});
