import test from "node:test"
import assert from "node:assert/strict"
import { calculateNetBalances, distributeCents, parseMoneyCents, safeCsvCell, sleepDurationHours, suggestSettlements } from "../src/domain/money.mjs"

test("parses decimal currency into integer cents", () => {
  assert.equal(parseMoneyCents("1000"), 100000)
  assert.equal(parseMoneyCents("12.3"), 1230)
  assert.equal(parseMoneyCents("0.01"), 1)
  assert.equal(parseMoneyCents("-1"), null)
  assert.equal(parseMoneyCents("1.234"), null)
})

test("distributes 1,000 baht across three participants without losing satang", () => {
  const shares = distributeCents(100000, ["a", "b", "c"])
  assert.deepEqual(shares, [33334, 33333, 33333])
  assert.equal(shares.reduce((a, b) => a + b, 0), 100000)
})

test("rejects invalid split inputs", () => {
  assert.throws(() => distributeCents(-1, ["a"]))
  assert.throws(() => distributeCents(100, []))
})

test("settlement recommendations balance to zero", () => {
  const participants = [
    { id: "a", paidCents: 100000, shareCents: 33334 },
    { id: "b", paidCents: 0, shareCents: 33333 },
    { id: "c", paidCents: 0, shareCents: 33333 },
  ]
  const transfers = suggestSettlements(participants)
  assert.equal(transfers.reduce((sum, t) => sum + t.amountCents, 0), 66666)
  const balances = calculateNetBalances(participants, transfers)
  assert.deepEqual([...balances.values()], [0, 0, 0])
})

test("partial settlement updates balances in the correct direction", () => {
  const participants = [
    { id: "a", paidCents: 10000, shareCents: 5000 },
    { id: "b", paidCents: 0, shareCents: 5000 },
  ]
  const balances = calculateNetBalances(participants, [{ fromId: "b", toId: "a", amountCents: 1200 }])
  assert.equal(balances.get("a"), 3800)
  assert.equal(balances.get("b"), -3800)
})

test("sleep duration supports crossing midnight", () => {
  assert.equal(sleepDurationHours("23:00", "07:30"), 8.5)
  assert.equal(sleepDurationHours("22:00", "22:00"), 24)
  assert.equal(sleepDurationHours("bad", "07:00"), null)
})

test("CSV cells protect common spreadsheet formula prefixes", () => {
  assert.equal(safeCsvCell("=1+1"), "'=1+1")
  assert.equal(safeCsvCell("normal text"), "normal text")
})


import { isSnapshot, validateDayTogetherSnapshot } from "../workers/money102-api.js";

const validSnapshotState = () => ({ goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] });

test("snapshot API accepts a valid empty DayTogether state", () => {
  const snapshot = { "lamoon-daytogether-v1": JSON.stringify(validSnapshotState()) };
  assert.equal(isSnapshot(snapshot), true);
  assert.equal(validateDayTogetherSnapshot(snapshot), null);
});

test("snapshot API rejects oversized or non-namespaced values", () => {
  assert.equal(isSnapshot([]), false);
  assert.equal(isSnapshot({ "other-key": "{}" }), false);
  assert.equal(isSnapshot({ "lamoon-key": {} }), false);
  assert.equal(isSnapshot({ "lamoon-key": "x".repeat(900001) }), false);
});

test("snapshot API rejects invalid data and over-withdrawal", () => {
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": "{" }), /ไม่ถูกต้อง/);
  const state = validSnapshotState();
  state.savings = [
    { id: "s1", type: "deposit", amountCents: 1000, date: "2026-10-01", goalId: "" },
    { id: "s2", type: "withdrawal", amountCents: 1200, date: "2026-10-02", goalId: "" }
  ];
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), /ยอดถอนรวม/);
});
