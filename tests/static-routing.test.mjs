import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/DayTogether.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/daytogether.css", import.meta.url), "utf8");

test("the authenticated app mounts the DayTogether shell", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /import DayTogether from ["']\.\/DayTogether["']/);
  assert.match(app, /<CloudAuth>[\s\S]*<DayTogether\s*\/>[\s\S]*<\/CloudAuth>/);
  assert.match(auth, /children\?: ReactNode/);
  assert.match(auth, /if \(user\) return <>\{children/);
});

test("DayTogether provides the Phase 1 spaces and responsive navigation", () => {
  for (const label of ["ภาพรวม", "บันทึกวันนี้", "บันทึกส่วนตัว", "สุขภาพ", "การเงิน", "อาหารและชีวิต", "คลังบันทึก"]) {
    assert.ok(shell.includes(label), `missing navigation label: ${label}`);
  }
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /\.dt-mobile-nav/);
});

test("authentication keeps the Cloudflare sign-in and session endpoints", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /money102-api\.s2mtha16\.workers\.dev/);
  assert.doesNotMatch(auth, /\/api\/state|localStorage|signup/);
});

const dailyLog = await readFile(new URL("../src/DailyLog.tsx", import.meta.url), "utf8");

test("Daily Log reads and writes the authenticated D1 snapshot without browser persistence", () => {
  assert.match(shell, /import DailyLog from ["']\.\/DailyLog["']/);
  assert.match(shell, /<DailyLog\s*\/>/);
  assert.match(dailyLog, /api\(["']\/api\/state["']\)/);
  assert.match(dailyLog, /expected_updated_at/);
  assert.match(dailyLog, /method:"PUT"/);
  assert.match(dailyLog, /STORAGE_KEY = "lamoon-daily-log-v1"/);
  assert.match(dailyLog, /async function remove\(/);
  assert.match(dailyLog, /setEditor\(\{\.\.\.entry\}\)/);
  assert.doesNotMatch(dailyLog, /localStorage|sessionStorage/);
});

const journal = await readFile(new URL("../src/Journal.tsx", import.meta.url), "utf8");
const health = await readFile(new URL("../src/Health.tsx", import.meta.url), "utf8");
const sharedState = await readFile(new URL("../src/dayState.ts", import.meta.url), "utf8");

test("Journal and Health are mounted as working authenticated modules", () => {
  assert.match(shell, /import Journal from ["']\.\/Journal["']/);
  assert.match(shell, /import Health from ["']\.\/Health["']/);
  assert.match(shell, /active === "journal" && <Journal\s*\/>/);
  assert.match(shell, /active === "health" && <Health\s*\/>/);
  assert.match(journal, /saveDayState/);
  assert.match(journal, /kind:"diary"/);
  assert.match(journal, /mood/);
  assert.match(journal, /pinned/);
  assert.match(health, /saveDayState/);
  assert.match(health, /HEALTH_PROFILE_KEY/);
  assert.match(health, /ดัชนีมวลกาย/);
  assert.match(health, /bloodPressure/);
  assert.match(health, /ออกกำลังกาย/);
  assert.doesNotMatch(journal + health, /localStorage|sessionStorage/);
});

test("Journal and Health preserve the existing D1 snapshot and compare revisions before writes", () => {
  assert.match(sharedState, /lamoon-daytogether-v1/);
  assert.match(sharedState, /expected_updated_at/);
  assert.match(sharedState, /\.\.\.\(current\.payload \|\| \{\}\)/);
  assert.match(sharedState, /lamoon-health-profile-v1/);
});


const finance = await readFile(new URL("../src/Finance.tsx", import.meta.url), "utf8");
test("Finance provides savings goals, deposits/withdrawals and live bill splitting", () => {
  assert.match(shell, /import Finance from ["']\.\/Finance["']/);
  assert.match(shell, /active === "finance" && <Finance\s*\/>/);
  assert.match(finance, /loadDayState/);
  assert.match(finance, /saveDayState/);
  assert.match(finance, /saveDayState/);
  assert.match(sharedState, /expected_updated_at/);
  assert.match(finance, /type: "deposit" \| "withdraw"/);
  assert.match(finance, /goalProgress/);
  assert.match(finance, /fn-live-total/);
  assert.match(finance, /participants/);
  assert.doesNotMatch(finance, /localStorage|sessionStorage/);
});
test("Finance preserves existing goals, savings and bills in the shared D1 snapshot", () => {
  assert.match(finance, /goals:nextGoals,savings:nextSavings,bills:nextSplits/);
  assert.match(finance, /normalizeGoals/);
  assert.match(finance, /normalizeSavings/);
  assert.match(finance, /normalizeSplits/);
  assert.match(finance, /encodeFinance/);
  assert.match(finance, /amountCents/);
  assert.match(finance, /amountSatang/);
  assert.match(finance, /totalCents/);
});
