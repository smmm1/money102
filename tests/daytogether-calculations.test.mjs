import test from "node:test";
import assert from "node:assert/strict";
import { calculateSplit, calculateSleepDuration, calculateExpenseResponsibility, summarizeBbqPersonalCosts } from "../src/daytogether-calculations.mjs";

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

test("sleep duration correctly crosses midnight and advances the wake date", () => {
  assert.deepEqual(calculateSleepDuration("2026-10-28T23:30", "2026-10-28T07:00"), {
    durationHours: 7.5,
    normalizedEnd: "2026-10-29T07:00",
  });
  assert.equal(calculateSleepDuration("invalid", "2026-10-29T07:00"), null);
  assert.equal(calculateSleepDuration("2026-02-31T23:00", "2026-03-01T07:00"), null);
  assert.equal(calculateSleepDuration("2026-10-29T23:00", "2026-10-28T07:00"), null);
  assert.equal(calculateSleepDuration("2026-10-28T23:30", "2026-10-29T07:00")?.durationHours, 7.5);
  assert.equal(calculateSleepDuration("2026-10-28T07:00", "2026-10-28T06:00")?.durationHours, 23);
});

test("percentage allocations stay exact for large safe-integer satang amounts", () => {
  const amountSatang = 9007199254740000;
  const aShare = Number((BigInt(amountSatang) * 3333n) / 10000n);
  const bShare = amountSatang - aShare;
  const result = calculateSplit([{
    amountSatang,
    payerId: "a",
    participantIds: ["a", "b"],
    allocationMode: "percentage",
    allocations: { a: 3333, b: 6667 },
  }], people);
  assert.deepEqual(plain(result.balances), { a: bShare, b: -bShare, c: 0 });
  assert.equal(Object.values(result.balances).reduce((sum, value) => sum + value, 0), 0);
});

test("rejects unknown allocation modes instead of silently splitting equally", () => {
  const invalid = {
    amountSatang: 10000,
    payerId: "a",
    participantIds: ["a", "b"],
    allocationMode: "mystery",
  };
  assert.deepEqual(plain(calculateSplit([invalid], people).balances), { a: 0, b: 0, c: 0 });
});


test("live bill preview divides equally and preserves every satang", async () => {
  const { calculateDraftSplitPreview } = await import("../src/daytogether-calculations.mjs");
  const result = calculateDraftSplitPreview([
    { title: "อาหาร", amount: "10.01", allocationMode: "equal", participantNames: null },
  ], ["ฉัน", "บี", "ซี"]);
  assert.deepEqual(plain(result.shares), { "ฉัน": 334, "บี": 334, "ซี": 333 });
  assert.equal(result.invalidRows, 0);
  assert.equal(Object.values(result.shares).reduce((sum, value) => sum + value, 0), 1001);
});

test("live bill preview excludes invalid fixed/percentage allocations and reports them", async () => {
  const { calculateDraftSplitPreview } = await import("../src/daytogether-calculations.mjs");
  const result = calculateDraftSplitPreview([
    { title: "อาหาร", amount: "100", allocationMode: "fixed", participantNames: ["ฉัน", "บี"], allocations: { "ฉัน": "40", "บี": "50" } },
    { title: "เครื่องดื่ม", amount: "90", allocationMode: "percentage", participantNames: ["ฉัน", "บี"], allocations: { "ฉัน": "30", "บี": "60" } },
    { title: "ขนม", amount: "30", allocationMode: "percentage", participantNames: ["ฉัน", "บี"], allocations: { "ฉัน": "25", "บี": "75" } },
  ], ["ฉัน", "บี"]);
  assert.deepEqual(plain(result.shares), { "ฉัน": 750, "บี": 2250 });
  assert.equal(result.invalidRows, 2);
});

test("live bill preview handles participant subsets and incomplete rows safely", async () => {
  const { calculateDraftSplitPreview } = await import("../src/daytogether-calculations.mjs");
  const result = calculateDraftSplitPreview([
    { title: "แชร์เฉพาะสองคน", amount: "12.00", allocationMode: "equal", participantNames: ["บี", "ซี"] },
    { title: "ยังไม่กรอกสัดส่วน", amount: "15.00", allocationMode: "fixed", participantNames: ["ฉัน", "บี"], allocations: { "ฉัน": "15", "บี": "" } },
    { title: "", amount: "", allocationMode: "equal", participantNames: null },
    { title: "ยอดติดลบ", amount: "-2", allocationMode: "equal", participantNames: null },
  ], ["ฉัน", "บี", "ซี"]);
  assert.deepEqual(plain(result.shares), { "ฉัน": 0, "บี": 600, "ซี": 600 });
  assert.equal(result.invalidRows, 2);
});


test("BBQ personal-cost summary keeps unknown values separate from zero", () => {
  assert.deepEqual(summarizeBbqPersonalCosts([
    { personalSatang: 1250 }, { personalSatang: null }, { personalSatang: 0 }, {},
  ]), { totalSatang: 1250, knownCount: 2, unknownCount: 2, averageSatang: 625, complete: false });
  assert.deepEqual(summarizeBbqPersonalCosts([{ personalSatang: null }, {}]), {
    totalSatang: null, knownCount: 0, unknownCount: 2, averageSatang: null, complete: false,
  });
  assert.deepEqual(summarizeBbqPersonalCosts([]), {
    totalSatang: null, knownCount: 0, unknownCount: 0, averageSatang: null, complete: true,
  });
});

test("personal responsibility uses exact integer arithmetic for percentage allocations", () => {
  const amountSatang = 9007199254740000;
  const firstShare = Number((BigInt(amountSatang) * 3333n) / 10000n);
  const secondShare = amountSatang - firstShare;
  const expense = {
    amountSatang, payerId: "a", participantIds: ["a", "b"], allocationMode: "percentage",
    allocations: { a: 3333, b: 6667 },
  };
  assert.equal(calculateExpenseResponsibility([expense], "a"), firstShare);
  assert.equal(calculateExpenseResponsibility([expense], "b"), secondShare);
  assert.equal(calculateExpenseResponsibility([expense], "c"), 0);
});

test("personal responsibility refuses to report a total when an allocation is invalid", () => {
  assert.equal(calculateExpenseResponsibility([{
    amountSatang: 10001, payerId: "a", participantIds: ["a", "b"], allocationMode: "percentage",
    allocations: { a: 3333, b: 6666 },
  }], "a"), null);
});
