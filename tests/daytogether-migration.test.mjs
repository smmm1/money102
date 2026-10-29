import test from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyState } from "../src/daytogether-migration.mjs";

const defaults = {
  goals: [], savings: [], health: [], notes: [], bills: [], visits: [],
  settings: { displayName: "", timezone: "Asia/Bangkok", theme: "system", hidden: false, cards: ["savings"], healthKinds: ["weight"], waterGoal: 2000 }
};
function storage(values) { return key => values[key] ?? null; }

test("migrates old Money102 health, notes, money, split and BBQ records", () => {
  const state = migrateLegacyState(defaults, storage({
    "lamoon-saving-goal": "20000",
    "lamoon-saving-goal-title": "เงินสำรอง",
    "lamoon-transactions": JSON.stringify([{ id: "tx-1", type: "expense", amount: 80, detail: "อาหาร", date: "2026-10-20", createdAt: "2026-10-20T10:00:00Z" }]),
    "lamoon-commonplace-notes-v1": JSON.stringify([{ id: "n1", title: "จำไว้", body: "รายละเอียด", createdAt: "2026-10-21T10:00:00Z", tags: ["งาน"] }]),
    "lamoon-health-dashboard-v1": JSON.stringify({ profiles: [], activeProfileId: "", records: [
      { id: "h1", type: "weight", date: "2026-10-21", weight: 80 },
      { id: "h2", type: "exercise", date: "2026-10-22", exercise: "เดิน", duration: 30, steps: 3000 }
    ]}),
    "money102-split-bill-history-v1": JSON.stringify([{ id: "b1", title: "มื้อเย็น", total: 300, tip: 0, people: ["ฉัน", "เพื่อน"], shares: [150, 150], mode: "equal", createdAt: "2026-10-22T10:00:00Z" }]),
    "money102-pork-bbq-history-v1": JSON.stringify([{ id: "v1", shop: "ร้านเดิม", price: 259, date: "2026-10-23", createdAt: "2026-10-23T10:00:00Z" }])
  }));
  assert.equal(state.goals[0].targetSatang, 2000000);
  assert.equal(state.notes.length, 2);
  assert.equal(state.notes.every(note => note.version === 1), true);
  assert.equal(state.notes.some(note => note.tags.includes("การเงิน")), true);
  assert.equal(state.health.length, 2);
  assert.equal(state.bills[0].expenses[0].amountSatang, 30000);
  assert.equal(state.visits[0].restaurant, "ร้านเดิม");
  assert.equal(state.settings.timezone, "Asia/Bangkok");
});

test("prefers an existing DayTogether state and merges settings defaults", () => {
  const current = { notes: [{ id: "new" }], settings: { displayName: "Mark" } };
  const state = migrateLegacyState(defaults, storage({ "lamoon-daytogether-v1": JSON.stringify(current), "lamoon-transactions": "[]" }));
  assert.equal(state.notes[0].id, "new");
  assert.equal(state.settings.displayName, "Mark");
  assert.equal(state.settings.timezone, "Asia/Bangkok");
});

test("ignores malformed legacy values safely", () => {
  const state = migrateLegacyState(defaults, storage({ "lamoon-commonplace-notes-v1": "{", "lamoon-health-dashboard-v1": "[]" }));
  assert.deepEqual(state.notes, []);
  assert.deepEqual(state.health, []);
});
