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
  assert.ok(app.includes('import CloudAuth from "./CloudAuth"'));
  assert.ok(app.includes('import LifeWorld from "./LifeWorld"'));
  assert.ok(app.includes("<CloudAuth>") && app.includes("<LifeWorld />") && app.includes("</CloudAuth>"));
  assert.ok(auth.includes("children?: ReactNode"));
  assert.ok(auth.includes("/api/auth/signin") && auth.includes("/api/auth/me") && auth.includes("/api/auth/logout"));
  assert.ok(!auth.includes("signup"));
});

test("new lives are Thailand-only and randomize a birth year, province and household profile", () => {
  for (const feature of ["createLife", "yearFrom", "yearTo", "THAI_PROVINCES", "householdProfiles", "parents", "siblings", "province", "bornYear"]) {
    assert.ok(engine.includes(feature), "missing Thai life foundation: " + feature);
  }
  assert.ok(engine.includes('country:"ประเทศไทย"'));
  assert.ok(engine.includes("1930") && engine.includes("2025"));
  assert.ok(!engine.includes("pickWeighted") && !engine.includes("lifeExpectancy") && !engine.includes("อินเดีย") && !engine.includes("บราซิล"));
  assert.ok(world.includes("สุ่มปีเกิดและเริ่มชีวิต"));
  assert.ok(world.includes("life-year-from") && world.includes("life-year-to"));
});

test("historical events are tied to documented Thai years and traceable sources", () => {
  for (const year of ["1932", "1941", "1957", "1973", "1976", "1992", "1997", "2004", "2006", "2010", "2011", "2014", "2020"]) {
    assert.ok(history.includes("year: " + year), "missing historical event year " + year);
  }
  for (const source of ["loc.gov", "history.state.gov", "cambridge.org", "jstor.org", "amnesty.org", "bot.or.th", "un.or.th", "worldbank.org", "who.int", "hrw.org"]) {
    assert.ok(history.includes(source), "missing source: " + source);
  }
  assert.ok(engine.includes("eventForYear") && engine.includes("sourceUrl"));
  assert.equal((history.match(/name: "/g) || []).length, 77, "the province dataset must contain all 77 provinces including Bangkok");
  assert.ok(world.includes("มีแหล่งอ้างอิง") && world.includes("life-event-context") && world.includes("life-source"));
});

test("each simulated year produces a personal or historical event with branching risk-aware choices", () => {
  for (const feature of ["advanceLife", "resolveLifeChoice", "failureOutcome", "chance", "successEffects", "failureEffects", "stage", "eraLabel", "makePersonalEvent"]) {
    assert.ok(engine.includes(feature), "missing simulation system: " + feature);
  }
  assert.ok(world.includes("โอกาสสำเร็จเริ่มต้น") && world.includes("pendingEvent.choices.map"));
});

test("personal events react to the character's actual life conditions", () => {
  for (const feature of ["adaptiveEvents", "รายรับไม่พอกับภาระที่มี", "ภาระหลายด้านเริ่มทับซ้อน", "สุขภาพเริ่มจำกัดทางเลือก", "โอกาสใหม่ที่ยังไม่แน่นอน", "คนใกล้ตัวเริ่มห่างกัน"]) {
    assert.ok(engine.includes(feature), "missing adaptive simulation path: " + feature);
  }
  assert.ok(engine.includes("life.timeline.slice(0,8)"));
  assert.ok(engine.includes("weight:2"));
  assert.ok(engine.includes("householdDebt > 35000"));
});

test("life records persist to the authenticated D1 snapshot without browser local storage", () => {
  assert.ok(world.includes('LIFE_KEY = "lamoon-life-sim-v1"'));
  assert.ok(world.includes('api("/api/state")'));
  assert.ok(world.includes('method: "PUT"'));
  assert.ok(world.includes("expected_updated_at"));
  assert.ok(world.includes("...(current.payload ?? {})"));
  assert.ok(world.includes("attempt < 2"));
  assert.ok(!world.includes("localStorage") && !world.includes("sessionStorage"));
});

test("Thai life simulation layout supports mobile and desktop and shows sources", () => {
  assert.ok(styles.includes("@media(max-width:800px)") && styles.includes("@media(max-width:440px)"));
  assert.ok(styles.includes(".life-nav") && styles.includes(".life-stat-grid") && styles.includes(".life-modal"));
  assert.ok(styles.includes(".life-source") && styles.includes(".life-year-range"));
});


test("life simulation has additional stage-specific situations and state-adjusted choice odds", () => {
  assert.match(engine, /additionalPersonalEvents/);
  assert.match(engine, /รายได้ไม่แน่นอนระหว่างเปลี่ยนงาน/);
  assert.match(engine, /ค่าครองชีพและค่าเช่าสูงขึ้น/);
  assert.match(engine, /ภาระดูแลคนสองรุ่น/);
  assert.match(engine, /estimateChoiceChance/);
  assert.match(engine, /life\.stats\.stress>=70/);
  assert.match(engine, /life\.householdDebt>30000/);
  assert.match(world, /estimateChoiceChance\(activeLife, choice\)/);
});

test("life scene reflects story milestones for family, pets, vehicles and household help", () => {
  const scene = await readFile(new URL("../src/LifeScene.tsx", import.meta.url), "utf8");
  for (const feature of ["householdScene", "children", "pets", "housekeeper", "vehicle", "life-scene-frame"]) {
    assert.ok(scene.includes(feature), "missing visual scene feature: " + feature);
  }
  for (const feature of ["sceneMilestoneEvent", "adopt-cat", "adopt-dog", "start-family", "buy-car", "buy-motorcycle", "hire-housekeeper", "sceneDecisions"]) {
    assert.ok(engine.includes(feature), "missing story-driven scene milestone: " + feature);
  }
  assert.ok(world.includes('import LifeScene from "./LifeScene"') && world.includes("<LifeScene life={activeLife} />"));
  assert.ok(styles.includes(".life-scene-frame") && styles.includes(".life-scene-legend"));
});
