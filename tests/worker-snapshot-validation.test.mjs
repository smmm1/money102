import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshot, validDayTogetherState, validateDayTogetherSnapshot } from "../workers/money102-api.js";
import worker from "../workers/money102-api.js";

const validState = () => ({
  goals: [{ id: "goal-1", name: "trip", targetSatang: 10000, status: "active", due: "", color: "green" }],
  savings: [{ id: "saving-1", kind: "deposit", amountSatang: 100, date: "2026-01-01", goalId: "goal-1", note: "" }],
  health: [{ id: "health-1", kind: "weight", date: "2026-01-01", value: "70", extra: "", note: "" }],
  notes: [{ id: "note-1", title: "today", body: "text", kind: "note", date: "2026-01-01", tags: [], mood: "", pinned: false, archived: false, updatedAt: "2026-01-01T00:00:00.000Z", version: 1 }],
  bills: [],
  visits: [{ id: "visit-1", restaurant: "BBQ", title: "", date: "2026-01-01", area: "", friends: "", people: 2, totalSatang: null, personalSatang: null, rating: null, menu: "", memory: "", billId: "" }],
  settings: { displayName: "", timezone: "Asia/Bangkok", theme: "system", cards: ["savings"], healthKinds: ["weight"], waterGoal: 2000 }
});

test("accepts a valid DayTogether state snapshot", () => {
  assert.equal(validDayTogetherState(JSON.stringify(validState())), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(validState()) }), true);
});

test("rejects malformed JSON, missing collections, and non-object state", () => {
  assert.equal(validDayTogetherState("{"), false);
  assert.equal(validDayTogetherState("[]"), false);
  const missing = validState();
  delete missing.visits;
  assert.equal(validDayTogetherState(JSON.stringify(missing)), false);
});

test("rejects records without stable IDs and duplicate IDs within a collection", () => {
  const missingId = validState();
  missingId.notes[0].id = "";
  assert.equal(validDayTogetherState(JSON.stringify(missingId)), false);
  const duplicate = validState();
  duplicate.health.push({ id: "health-1", kind: "water" });
  assert.equal(validDayTogetherState(JSON.stringify(duplicate)), false);
});

test("snapshot envelope accepts only namespaced string values and bounded payloads", () => {
  assert.equal(isSnapshot({ other: "{}" }), false);
  assert.equal(isSnapshot({ "lamoon-other": {} }), false);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": "x".repeat(900001) }), false);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(validState()), "lamoon-preferences": "ok" }), true);
  assert.equal(isSnapshot({ "money102-pork-bbq-history-v1": "[]" }), true);
  assert.equal(isSnapshot({ "money102-dashboard-order-v1": ["home"] }), false);
});

test("rejects malformed bill allocations before they can be persisted", () => {
  const state = validState();
  state.bills.push({
    id: "bill-1", title: "Dinner", date: "2026-01-01", restaurant: "BBQ", note: "", bbqId: "",
    status: "draft",
    participants: [{ id: "me", name: "Me", isMe: true }, { id: "friend", name: "Friend", isMe: false }],
    expenses: [{ id: "expense-1", title: "Food", amountSatang: 10000, payerId: "me", participantIds: ["me", "friend"], allocationMode: "fixed", allocations: { me: 3000, friend: 6000 } }],
    settlements: []
  });
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
});
test("accepts valid bill allocation totals and rejects duplicate expense participants", () => {
  const state = validState();
  state.bills.push({
    id: "bill-1", title: "Dinner", date: "2026-01-01", restaurant: "BBQ", note: "", bbqId: "",
    status: "draft",
    participants: [{ id: "me", name: "Me", isMe: true }, { id: "friend", name: "Friend", isMe: false }],
    expenses: [{ id: "expense-1", title: "Food", amountSatang: 10001, payerId: "me", participantIds: ["me", "friend"], allocationMode: "percentage", allocations: { me: 5000, friend: 5000 } }],
    settlements: []
  });
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  state.bills[0].expenses[0].participantIds = ["me", "me"];
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
});
test("rejects snapshots with negative savings balance or invalid health values", () => {
  const state = validState();
  state.savings.push({ id: "saving-2", kind: "withdraw", amountSatang: 500, date: "2026-01-02", goalId: "goal-1", note: "" });
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
  const invalidHealth = validState();
  invalidHealth.health[0].value = "x".repeat(1001);
  assert.equal(validDayTogetherState(JSON.stringify(invalidHealth)), false);
});


test("accepts exercise records so the health module can persist workouts", () => {
  const state = validState();
  state.health.push({ id: "exercise-1", kind: "exercise", date: "2026-01-02", value: "เดินเร็ว 30 นาที", extra: "ระยะทาง 2 กม.", note: "ทดสอบการบันทึก" });
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), true);
});

test("keeps accepting the legacy snapshot shape while validating the rebuilt app shape", () => {
  const legacy = { goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] };
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(legacy) }), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify({ goals: [], savings: [], health: [], notes: [], bills: [], visits: [], settings: {} }) }), false);
});

test("validates the legacy schema directly and rejects malformed legacy snapshots", () => {
  const legacy = { goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] };
  assert.equal(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify(legacy) }), null);
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": "{" }), /ไม่ถูกต้อง/);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": "x".repeat(900001) }), false);
});


test("does not expose internal D1 errors in API responses", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), {
    DB: { prepare() { throw new Error("secret SQL details"); } },
    APP_ORIGIN: "https://money102.onrender.com"
  });
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error, "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ภายหลัง");
  assert.equal("detail" in body, false);
});
