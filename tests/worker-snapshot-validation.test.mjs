import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshot, validDayTogetherState } from "../workers/money102-api.js";

const validState = () => ({
  goals: [{ id: "goal-1", name: "trip" }],
  savings: [{ id: "saving-1", amountSatang: 100 }],
  health: [{ id: "health-1", kind: "weight" }],
  notes: [{ id: "note-1", title: "today" }],
  bills: [{ id: "bill-1", title: "dinner" }],
  visits: [{ id: "visit-1", restaurant: "BBQ" }],
  settings: { timezone: "Asia/Bangkok" }
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
