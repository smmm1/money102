import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const world = await readFile(new URL("../src/LifeWorld.tsx", import.meta.url), "utf8");
const engine = await readFile(new URL("../src/lifeSimulation.ts", import.meta.url), "utf8");
const history = await readFile(new URL("../src/thaiHistory.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/life-simulation.css", import.meta.url), "utf8");
const story = await readFile(new URL("../src/LifeStoryExperience.tsx", import.meta.url), "utf8");

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
  assert.ok(story.includes("life-story-source") && story.includes("life-story-context") && story.includes("event.sourceTitle"));
});

test("each simulated year produces a personal or historical event with branching risk-aware choices", () => {
  for (const feature of ["advanceLife", "resolveLifeChoice", "failureOutcome", "chance", "successEffects", "failureEffects", "stage", "eraLabel", "makePersonalEvent"]) {
    assert.ok(engine.includes(feature), "missing simulation system: " + feature);
  }
  assert.ok(story.includes("life-story-chance") && story.includes("event.choices.map") && story.includes("estimateChoiceChance(life, choice)"));
});

test("personal events react to the character's actual life conditions", () => {
  for (const feature of ["adaptiveEvents", "รายรับไม่พอกับภาระที่มี", "ภาระหลายด้านเริ่มทับซ้อน", "สุขภาพเริ่มจำกัดทางเลือก", "โอกาสใหม่ที่ยังไม่แน่นอน", "คนใกล้ตัวเริ่มห่างกัน"]) {
    assert.ok(engine.includes(feature), "missing adaptive simulation path: " + feature);
  }
  assert.ok(engine.includes("life.timeline.slice(0,8)"));
  assert.ok(engine.includes("weight:2"));
  assert.ok(engine.includes("householdDebt > 30000"));
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
  assert.match(story, /estimateChoiceChance\(life, choice\)/);
});

test("life scene reflects story milestones for family, pets, vehicles and household help", async () => {
  const scene = await readFile(new URL("../src/LifeScene.tsx", import.meta.url), "utf8");
  for (const feature of ["householdScene", "children", "pets", "housekeeper", "vehicle", "life-scene-frame"]) {
    assert.ok(scene.includes(feature), "missing visual scene feature: " + feature);
  }
  for (const feature of ["sceneMilestoneEvent", "adopt-cat", "adopt-dog", "start-family", "buy-car", "buy-motorcycle", "hire-housekeeper", "sceneDecisions"]) {
    assert.ok(engine.includes(feature), "missing story-driven scene milestone: " + feature);
  }
  assert.ok(story.includes('import LifeScene from "./LifeScene"') && story.includes("<LifeScene life={life} />"));
  assert.ok(styles.includes(".life-scene-frame") && styles.includes(".life-scene-legend"));
  assert.ok(scene.includes("life.parentAlive") && scene.includes("life.parentAges") && scene.includes("lifeStageForAge(parentAge)"), "living parents must remain visible and age with the player");
  for (const feature of ["lifeStageForAge", "childAges", "partnerAge", "advanceHouseholdAges", "age<=2", "age<=12", "age<=19", "age<65"]) {
    assert.ok(engine.includes(feature), "missing age progression rule: " + feature);
  }
  assert.equal((scene.match(/return <g transform=\{transform\}><g className=\{className\}/g) || []).length, 2, "sprite positioning must remain outside the animated group");
  for (const feature of ["life-scene-character--infant", "life-scene-activity--play", "life-scene-activity--read", "life-scene-pet-tail", "life-scene-sun"]) {
    assert.ok(scene.includes(feature) || styles.includes(feature), "missing age-aware scene animation: " + feature);
  }
  for (const feature of ["@keyframes life-scene-sleep", "@keyframes life-scene-play", "@keyframes life-scene-read", "@keyframes life-scene-walk", "@keyframes life-scene-rest", "@keyframes life-scene-work", "@keyframes life-scene-tail", "prefers-reduced-motion:reduce"]) {
    assert.ok(styles.includes(feature), "missing accessible scene motion rule: " + feature);
  }
});


test("household members create recurring costs that flow through the cash ledger", async () => {
  const economy = await readFile(new URL("../src/lifeEconomy.ts", import.meta.url), "utf8");
  const simulation = await readFile(new URL("../src/lifeSimulation.ts", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/LifeEconomyPanel.tsx", import.meta.url), "utf8");
  const story = await readFile(new URL("../src/LifeStoryExperience.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/life-simulation.css", import.meta.url), "utf8");
  for (const feature of ["householdCostMonthly", "householdCostBreakdown", "ค่าใช้จ่ายสมาชิกและทรัพย์สินในบ้าน", "หนี้ฉุกเฉินจากเงินสดไม่พอจ่าย", "const shortfall = Math.max(0, -rawCash)"]) {
    assert.ok(economy.includes(feature), "missing recurring cost accounting: " + feature);
  }
  for (const feature of ["estimateHouseholdCostMonthly", "childAges", "scene.pets.length", "scene.housekeeper", "scene.vehicle", "householdCostBreakdown,householdCostMonthly:Object.values(householdCostBreakdown)", "pathway===\"โรงเรียนเอกชน\"?0.22", "pathway===\"สายอาชีพ\"?0.18", "pet-care-followup-", "retryableMilestone", "กำลังเตรียมเงินดูแล", "parentAges", "parentLifespans", "parentAlive", "parent-loss-", "parent-care-", "parent-checkup-", "parent-family-plan-"]) {
    assert.ok(simulation.includes(feature), "missing household cost driver: " + feature);
  }
  assert.ok(panel.includes("totalMonthlyExpenses") && panel.includes("ประมาณการในเกม") && panel.includes("householdCostLabels") && panel.includes("householdCostBreakdown"));
  assert.ok(styles.includes(".life-economy-household-costs") && styles.includes("grid-template-columns:repeat(2"));
  assert.ok(story.includes("householdCostMonthly"), "story summary must include recurring household costs");
  for (const feature of ['economy.cash+principal', 'economy.debt+principal', 'kind:"debt"', 'ชำระคืนเงินต้นจากการปรับโครงสร้างหนี้', 'economy.debt:householdDebt', 'wealthDelta=effects.wealth', 'stats.wealth=economy.cash', 'householdDebt,economy,householdScene', 'householdDebt:economy.debt', 'Math.max(0,Math.min(5000,householdDebt,economy.cash))']) {
    assert.ok(simulation.includes(feature) || simulation.includes(feature.replace("economy.debt:householdDebt","debt:householdDebt")), "missing debt-to-cash ledger integration: " + feature);
  }
  assert.ok(story.includes("parentAlive") && story.includes("ถึงแก่กรรม"), "story cast must distinguish living and deceased parents");
});

test("loan drawdowns are recorded as debt rather than earned income", async () => {
  const economy = await readFile(new URL("../src/lifeEconomy.ts", import.meta.url), "utf8");
  const start = economy.indexOf("export function borrowMoney(");
  const end = economy.indexOf("\nexport function netWorth(", start);
  assert.ok(start >= 0 && end > start, "borrowMoney implementation must exist");
  const borrowMoney = economy.slice(start, end);
  assert.match(borrowMoney, /kind: "debt"/);
  assert.doesNotMatch(borrowMoney, /kind: "income"/);
  assert.match(economy, /kind: "debt", label: "ดอกเบี้ยทบเข้ายอดหนี้", amount: interest/);
  assert.match(borrowMoney, /!Number\.isFinite\(annualRate\)/, "NaN and infinite interest rates must be rejected");
});


test("household economy functions preserve cash, debt and interest arithmetic", async () => {
  const source = await readFile(new URL("../src/lifeEconomy.ts", import.meta.url), "utf8");
  const javascript = ts.transpile(source, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  const moduleUrl = "data:text/javascript;base64," + Buffer.from(javascript).toString("base64");
  const { createLifeEconomy, simulateEconomyMonth, borrowMoney, repayDebt } = await import(moduleUrl);

  const withDebt = createLifeEconomy(10000, 0, 0, 1200);
  const afterInterest = simulateEconomyMonth(withDebt, 1, 123);
  assert.equal(afterInterest.cash, 10000);
  assert.equal(afterInterest.debt, 1212);
  assert.equal(afterInterest.ledger[0].kind, "debt");
  assert.equal(afterInterest.ledger[0].label, "ดอกเบี้ยทบเข้ายอดหนี้");

  const shortfall = simulateEconomyMonth(createLifeEconomy(0, 100, 150), 1, 456);
  assert.equal(shortfall.cash, 0);
  assert.equal(shortfall.debt, 50.86);
  assert.ok(shortfall.ledger.some(entry => entry.kind === "debt" && entry.label === "หนี้ฉุกเฉินจากเงินสดไม่พอจ่าย" && entry.amount > 0));

  const loan = borrowMoney(createLifeEconomy(5000, 10000, 0), 1000, 0.12);
  assert.equal(loan.ok, true);
  assert.equal(loan.economy.cash, 6000);
  assert.equal(loan.economy.debt, 1000);
  assert.equal(loan.economy.ledger[0].kind, "debt");
  assert.equal(borrowMoney(createLifeEconomy(5000, 10000, 0), 1000, Number.NaN).ok, false);

  const repayment = repayDebt(loan.economy, 400);
  assert.equal(repayment.ok, true);
  assert.equal(repayment.economy.cash, 5600);
  assert.equal(repayment.economy.debt, 600);
  assert.equal(repayment.economy.ledger[0].kind, "debt");
});
