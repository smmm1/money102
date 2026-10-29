import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshot, validDayTogetherState } from "../workers/money102-api.js";

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
});
