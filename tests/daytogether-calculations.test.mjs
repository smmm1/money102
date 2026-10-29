import test from "node:test";
import assert from "node:assert/strict";
import { calculateSplit, calculateSleepDuration, calculateExpenseResponsibility, summarizeBbqPersonalCosts, buildDailyTrend, formatDateInTimezone, calculateBillAdjustmentSummary, calculateBillSplit, calculateDraftBillSplitPreview } from "../src/daytogether-calculations.mjs";

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


test("personal share permits a payer who is not participating in that expense", () => {
  assert.equal(calculateExpenseResponsibility([{
    amountSatang: 1000, payerId: "c", participantIds: ["a", "b"], allocationMode: "equal",
  }], "a"), 500);
  assert.equal(calculateExpenseResponsibility([{
    amountSatang: 1000, payerId: "c", payers: [
      { participantId: "c", amountSatang: 600 }, { participantId: "d", amountSatang: 400 },
    ], participantIds: ["a", "b"], allocationMode: "equal",
  }], "b"), 500);
});


test("health trends preserve missing calendar days as gaps", () => {
  assert.deepEqual(buildDailyTrend([
    { date: "2026-10-27", value: "70" },
    { date: "2026-10-29", value: "69.5" },
  ], "2026-10-27", "2026-10-30"), [
    { date: "2026-10-27", value: 70 },
    { date: "2026-10-28", value: null },
    { date: "2026-10-29", value: 69.5 },
    { date: "2026-10-30", value: null },
  ]);
});

test("water trend sums multiple entries on a day and keeps other days empty", () => {
  assert.deepEqual(buildDailyTrend([
    { date: "2026-10-28T08:00", value: "250" },
    { date: "2026-10-28T12:00", value: "500" },
    { date: "2026-10-30", value: "300" },
  ], "2026-10-28", "2026-10-30", "sum"), [
    { date: "2026-10-28", value: 750 },
    { date: "2026-10-29", value: null },
    { date: "2026-10-30", value: 300 },
  ]);
});

test("health trend helper rejects invalid date ranges and ignores invalid values", () => {
  assert.deepEqual(buildDailyTrend([], "2026-02-30", "2026-03-01"), []);
  assert.deepEqual(buildDailyTrend([], "2026-03-02", "2026-03-01"), []);
  assert.deepEqual(buildDailyTrend([
    { date: "2026-03-01", value: "not-a-number" },
    { date: "2026-03-02", value: "" },
  ], "2026-03-01", "2026-03-02"), [
    { date: "2026-03-01", value: null },
    { date: "2026-03-02", value: null },
  ]);
});


test("timezone date labels preserve date-only values in every selected timezone", () => {
  const expected = formatDateInTimezone("2026-01-01", "UTC");
  assert.equal(formatDateInTimezone("2026-01-01", "Asia/Bangkok"), expected);
  assert.equal(formatDateInTimezone("2026-01-01", "Asia/Tokyo"), expected);
  assert.equal(formatDateInTimezone("2026-01-01", "America/Los_Angeles"), expected);
  assert.notEqual(expected, "ไม่ระบุวันที่");
});

test("timezone date labels preserve the calendar day of local wall-clock datetime values", () => {
  const expected = formatDateInTimezone("2026-01-01T00:30", "UTC");
  assert.equal(formatDateInTimezone("2026-01-01T00:30", "America/Los_Angeles"), expected);
});

test("timezone date labels convert ISO instants into the selected timezone", () => {
  const instant = "2026-01-01T01:30:00.000Z";
  assert.notEqual(formatDateInTimezone(instant, "UTC"), formatDateInTimezone(instant, "America/Los_Angeles"));
  assert.equal(formatDateInTimezone(instant, "America/Los_Angeles"), formatDateInTimezone("2025-12-31", "UTC"));
});

test("invalid timezone labels return a safe fallback instead of throwing", () => {
  assert.equal(formatDateInTimezone("invalid"), "ไม่ระบุวันที่");
  assert.equal(formatDateInTimezone("2026-02-31", "UTC"), "ไม่ระบุวันที่");
  assert.equal(formatDateInTimezone("2026-01-01T12:00:00.000Z", "Not/A_Timezone"),
    formatDateInTimezone("2026-01-01T12:00:00.000Z", "Asia/Bangkok"));
});


test("bill adjustments calculate service, tax-on-service, then discount in satang", () => {
  const result = calculateBillAdjustmentSummary(100000, {
    serviceBasisPoints: 1000,
    taxBasisPoints: 700,
    discountSatang: 5000,
  });
  assert.equal(result.valid, true);
  assert.equal(result.serviceSatang, 10000);
  assert.equal(result.taxSatang, 7700);
  assert.equal(result.preDiscountSatang, 117700);
  assert.equal(result.totalSatang, 112700);
});

test("included fees are not added again and discounts cannot make a bill negative", () => {
  const included = calculateBillAdjustmentSummary(10000, {
    serviceBasisPoints: 1000, taxBasisPoints: 700,
    serviceIncluded: true, taxIncluded: true, discountSatang: 0,
  });
  assert.equal(included.totalSatang, 10000);
  const invalid = calculateBillAdjustmentSummary(10000, { discountSatang: 10001 });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.error, "discount-exceeds-total");
});

test("adjusted bill shares and multi-payer contributions sum to the final total", () => {
  const participants = [
    { id: "a", name: "A", isMe: true },
    { id: "b", name: "B", isMe: false },
  ];
  const expenses = [
    { id: "e1", title: "Food", amountSatang: 30000, payerId: "a", participantIds: ["a", "b"], allocationMode: "fixed", allocations: { a: 10000, b: 20000 } },
    { id: "e2", title: "Drinks", amountSatang: 70000, payerId: "a", payers: [{ participantId: "a", amountSatang: 20000 }, { participantId: "b", amountSatang: 50000 }], participantIds: ["a", "b"], allocationMode: "fixed", allocations: { a: 20000, b: 50000 } },
  ];
  const result = calculateBillSplit(expenses, participants, [], {
    serviceBasisPoints: 1000, taxBasisPoints: 700, discountSatang: 5000,
  });
  assert.equal(result.valid, true);
  assert.equal(result.baseTotalSatang, 100000);
  assert.equal(result.totalSatang, 112700);
  assert.equal(result.adjustedExpenses.reduce((sum, expense) => sum + expense.amountSatang, 0), 112700);
  assert.equal(result.adjustedExpenses.reduce((sum, expense) => sum + expense.allocations.a, 0), 33810);
  assert.equal(result.adjustedExpenses.reduce((sum, expense) => sum + expense.allocations.b, 0), 78890);
  assert.equal(Object.values(result.balances).reduce((sum, balance) => sum + balance, 0), 0);
  assert.deepEqual(result.transfers, [{ fromId: "b", toId: "a", amountSatang: 22540 }]);
  const settled = calculateBillSplit(expenses, participants, [
    { id: "s1", fromId: "b", toId: "a", amountSatang: 22540, date: "2026-10-29", note: "" },
  ], { serviceBasisPoints: 1000, taxBasisPoints: 700, discountSatang: 5000 });
  assert.equal(settled.transfers.length, 0);
  assert.equal(Object.values(settled.balances).every(balance => balance === 0), true);
});


test("adjusted live draft preview sums exactly to the adjusted bill total", () => {
  const preview = calculateDraftBillSplitPreview([
    { key: "draft-1", title: "อาหาร", amount: "1000.00", payerName: "ฉัน", multiplePayers: false, payerAmounts: {}, participantNames: null, allocationMode: "equal", allocations: {} },
  ], ["ฉัน", "B"], { serviceBasisPoints: 1000, taxBasisPoints: 700, discountSatang: 5000 });
  assert.equal(preview.invalidRows, 0);
  assert.equal(preview.baseTotalSatang, 100000);
  assert.equal(preview.totalSatang, 112700);
  assert.equal(preview.shares["ฉัน"] + preview.shares.B, 112700);
  assert.equal(preview.shares["ฉัน"], 56350);
  assert.equal(preview.shares.B, 56350);
});

test("adjusted live draft preview excludes incomplete multi-payer rows", () => {
  const preview = calculateDraftBillSplitPreview([
    { key: "draft-1", title: "อาหาร", amount: "100.00", payerName: "ฉัน", multiplePayers: true, payerAmounts: { "ฉัน": "30.00", B: "" }, participantNames: null, allocationMode: "equal", allocations: {} },
  ], ["ฉัน", "B"], { discountSatang: 0 });
  assert.equal(preview.invalidRows, 1);
  assert.equal(preview.baseTotalSatang, 0);
  assert.equal(preview.totalSatang, 0);
});


test("draft money and percentage parsing avoid binary floating-point rounding", () => {
  const row = (amount, mode = "equal", allocations = {}) => ({
    key: "decimal", title: "ของกิน", amount, payerName: "ฉัน",
    multiplePayers: false, payerAmounts: {}, participantNames: null,
    allocationMode: mode, allocations,
  });
  const valid = calculateDraftBillSplitPreview([row("0.29")], ["ฉัน", "บี"]);
  assert.equal(valid.invalidRows, 0);
  assert.equal(valid.baseTotalSatang, 29);
  assert.equal(valid.shares["ฉัน"] + valid.shares["บี"], 29);

  const overPrecision = calculateDraftBillSplitPreview([row("1.005")], ["ฉัน", "บี"]);
  assert.equal(overPrecision.invalidRows, 1);
  assert.equal(overPrecision.baseTotalSatang, 0);

  const percentages = calculateDraftBillSplitPreview([
    row("0.03", "percentage", { "ฉัน": "33.33", "บี": "66.67" }),
  ], ["ฉัน", "บี"]);
  assert.equal(percentages.invalidRows, 0);
  assert.equal(percentages.baseTotalSatang, 3);
  assert.equal(percentages.shares["ฉัน"] + percentages.shares["บี"], 3);

  const invalidPercent = calculateDraftBillSplitPreview([
    row("1.00", "percentage", { "ฉัน": "33.335", "บี": "66.665" }),
  ], ["ฉัน", "บี"]);
  assert.equal(invalidPercent.invalidRows, 1);
  assert.equal(invalidPercent.baseTotalSatang, 0);

  const invalidFixed = calculateDraftBillSplitPreview([
    row("1.00", "fixed", { "ฉัน": "0.505", "บี": "0.495" }),
  ], ["ฉัน", "บี"]);
  assert.equal(invalidFixed.invalidRows, 1);
  assert.equal(invalidFixed.baseTotalSatang, 0);
});


test("exact user input parsers preserve satang and percentage basis points", async () => {
  const { parseMoneyToSatang, parsePercentageBasisPoints } = await import("../src/daytogether-calculations.mjs");
  assert.equal(parseMoneyToSatang("0.29"), 29);
  assert.equal(parseMoneyToSatang("1.005"), null);
  assert.equal(parseMoneyToSatang("-1.00"), null);
  assert.equal(parseMoneyToSatang("90071992547409.92"), null);
  assert.equal(parsePercentageBasisPoints("1.25"), 125);
  assert.equal(parsePercentageBasisPoints("100"), 10000);
  assert.equal(parsePercentageBasisPoints("100.01"), null);
  assert.equal(parsePercentageBasisPoints("1.005"), null);
});
