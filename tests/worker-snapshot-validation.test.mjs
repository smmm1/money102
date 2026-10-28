import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshot, validateDayTogetherSnapshot } from "../workers/money102-api.js";

const validState = () => ({ goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] });

test("accepts a valid empty DayTogether snapshot", () => {
  const snapshot = { "lamoon-daytogether-v1": JSON.stringify(validState()) };
  assert.equal(isSnapshot(snapshot), true);
  assert.equal(validateDayTogetherSnapshot(snapshot), null);
});

test("rejects malformed snapshot envelopes and oversized entries", () => {
  assert.equal(isSnapshot([]), false);
  assert.equal(isSnapshot({ "other-key": "{}" }), false);
  assert.equal(isSnapshot({ "lamoon-key": {} }), false);
  assert.equal(isSnapshot({ "lamoon-key": "x".repeat(900001) }), false);
});

test("rejects malformed JSON and missing collections", () => {
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": "{" }), /ไม่ถูกต้อง/);
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify({ goals: [] }) }), /ไม่ถูกต้อง/);
});

test("rejects savings withdrawals that exceed recorded deposits", () => {
  const state = validState();
  state.savings = [
    { id: "s1", type: "deposit", amountCents: 1000, date: "2026-10-01", goalId: "" },
    { id: "s2", type: "withdrawal", amountCents: 1200, date: "2026-10-02", goalId: "" }
  ];
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), /ยอดถอนรวม/);
});

test("rejects notes without version metadata", () => {
  const state = validState();
  state.notes = [{ id: "n1", title: "test", body: "body", kind: "note", tags: [] }];
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), /โน้ต/);
});
