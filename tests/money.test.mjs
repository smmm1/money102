import test from "node:test"
import assert from "node:assert/strict"
import { calculateBillShares, calculateNetBalances, distributeCents, parseMoneyCents, safeCsvCell, sleepDurationHours, suggestSettlements } from "../src/domain/money.mjs"

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

test("fixed bill shares must sum exactly to the total", () => {
  assert.deepEqual(calculateBillShares(10001, ["A", "B", "C"], "fixed", { A:"50", B:"25", C:"25.01" }), [5000, 2500, 2501])
  assert.throws(() => calculateBillShares(10000, ["A", "B"], "fixed", { A:"20", B:"20" }), /add up/)
})
test("percentage bill shares sum to 100 and distribute rounding without losing cents", () => {
  const shares = calculateBillShares(10001, ["A", "B", "C"], "percentage", { A:"33.34", B:"33.33", C:"33.33" })
  assert.deepEqual(shares, [3335, 3333, 3333])
  assert.equal(shares.reduce((sum, value) => sum + value, 0), 10001)
  assert.throws(() => calculateBillShares(10000, ["A", "B"], "percentage", { A:"40", B:"40" }), /add up/)
})
test("bill allocation rejects duplicate participants and unsafe totals", () => {
  assert.throws(() => calculateBillShares(10000, ["A", "a"], "equal"), /unique/)
  assert.throws(() => calculateBillShares(Number.MAX_SAFE_INTEGER + 1, ["A", "B"], "equal"), /safe integer/)
})
