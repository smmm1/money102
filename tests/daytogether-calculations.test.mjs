import test from "node:test";
import assert from "node:assert/strict";
import { calculateSplit } from "../src/daytogether-calculations.mjs";

const plain = (balances) => Object.fromEntries(Object.entries(balances));

const people = [
  { id: "a", name: "ฉัน", isMe: true },
  { id: "b", name: "บี", isMe: false },
  { id: "c", name: "ซี", isMe: false },
];

test("splits 1,000 baht evenly among three people without losing satang", () => {
  const { balances, transfers } = calculateSplit([
    { amountSatang: 100000, payerId: "a", participantIds: ["a", "b", "c"] },
  ], people);
  assert.equal(Object.values(balances).reduce((sum, value) => sum + value, 0), 0);
  assert.deepEqual(plain(balances), { a: 66666, b: -33333, c: -33333 });
  assert.equal(transfers.reduce((sum, item) => sum + item.amountSatang, 0), 66666);
});

test("only charges participants selected for an expense", () => {
  const { balances } = calculateSplit([
    { amountSatang: 9000, payerId: "a", participantIds: ["a", "b"] },
  ], people);
  assert.deepEqual(plain(balances), { a: 4500, b: -4500, c: 0 });
});

test("validates fixed allocations and percentage totals", () => {
  const validFixed = { amountSatang: 10001, payerId: "a", participantIds: ["a", "b"], allocationMode: "fixed", allocations: { a: 5000, b: 5001 } };
  const invalidFixed = { ...validFixed, allocations: { a: 5000, b: 5000 } };
  const validPercent = { amountSatang: 10001, payerId: "a", participantIds: ["a", "b"], allocationMode: "percentage", allocations: { a: 3333, b: 6667 } };
  const invalidPercent = { ...validPercent, allocations: { a: 3333, b: 6666 } };
  assert.deepEqual(plain(calculateSplit([validFixed], people).balances), { a: 5001, b: -5001, c: 0 });
  assert.deepEqual(plain(calculateSplit([invalidFixed], people).balances), { a: 0, b: 0, c: 0 });
  const percentage = calculateSplit([validPercent], people);
  assert.equal(Object.values(percentage.balances).reduce((sum, value) => sum + value, 0), 0);
  assert.deepEqual(plain(calculateSplit([invalidPercent], people).balances), { a: 0, b: 0, c: 0 });
});

test("settlements reduce balances and overpayments are ignored", () => {
  const expense = [{ amountSatang: 10000, payerId: "a", participantIds: ["a", "b"] }];
  const result = calculateSplit(expense, people, [{ amountSatang: 2500, fromId: "b", toId: "a" }]);
  assert.deepEqual(plain(result.balances), { a: 2500, b: -2500, c: 0 });
  const invalid = calculateSplit(expense, people, [{ amountSatang: 50000, fromId: "b", toId: "a" }]);
  assert.deepEqual(plain(invalid.balances), { a: 5000, b: -5000, c: 0 });
});

test("rejects duplicate participant IDs from being charged twice", () => {
  const { balances } = calculateSplit([
    { amountSatang: 101, payerId: "a", participantIds: ["a", "a", "b", "b"] },
  ], people);
  assert.deepEqual(plain(balances), { a: 50, b: -50, c: 0 });
});

test("supports multiple payers and requires their amounts to equal the expense", () => {
  const valid = {
    amountSatang: 10000,
    payerId: "a",
    payers: [{ participantId: "a", amountSatang: 6000 }, { participantId: "b", amountSatang: 4000 }],
    participantIds: ["a", "b", "c"],
  };
  assert.deepEqual(plain(calculateSplit([valid], people).balances), { a: 2666, b: 667, c: -3333 });
  const invalid = { ...valid, payers: [{ participantId: "a", amountSatang: 6000 }, { participantId: "b", amountSatang: 3000 }] };
  assert.deepEqual(plain(calculateSplit([invalid], people).balances), { a: 0, b: 0, c: 0 });
});
