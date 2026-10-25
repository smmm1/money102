import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("../worker.js", import.meta.url), "utf8")
assert.doesNotThrow(() => new Function(source.replace("export default {", "return {")))

const executable = source
  .slice(0, source.indexOf("export default {"))
  .replaceAll("crypto.randomUUID()", '"smoke-id"')
const engine = new Function(executable + "; return { starterSimulatorState, advanceLifeWorld };")()
const state = engine.starterSimulatorState()

assert.equal(state.version, 1)
assert.equal(state.residents.length, 6)
assert.ok(state.residents.some((resident) => resident.id === "ploy"))
assert.ok(state.residents.some((resident) => resident.id === "may" && resident.shift.start > resident.shift.end))
assert.ok(state.residents.every((resident) => resident.needs && typeof resident.money === "number"))

const before = state.residents.map((resident) => resident.money)
engine.advanceLifeWorld(state, 29 * 24 * 60)

assert.equal(state.day, 30)
assert.equal(state.residents.length, 6)
assert.ok(state.events.some((event) => event.text.includes("ค่าเช่าห้อง")))
assert.ok(state.events.some((event) => event.text.includes("ค่าอาหารและของใช้")))
assert.ok(state.residents.every((resident) => Object.values(resident.needs).every((need) => Number.isFinite(need) && need >= 0 && need <= 100)))
assert.ok(state.residents.every((resident) => Number.isFinite(resident.money) && resident.money >= 0))
assert.ok(state.residents.every((resident) => Number.isFinite(resident.sleepDebt) && resident.sleepDebt >= 0))
assert.ok(state.residents.some((resident, index) => resident.money !== before[index]), "scheduled work should accrue simulated income")

console.log("Worker syntax and deterministic 30-day simulation smoke checks passed.")
