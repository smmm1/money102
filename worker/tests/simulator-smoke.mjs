import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const workerSources = [new URL("../worker.js", import.meta.url), new URL("../../workers/money102-api.js", import.meta.url)]
for (const workerUrl of workerSources) {
const source = await readFile(workerUrl, "utf8")
assert.doesNotThrow(() => new Function(source.replace("export default {", "return {")))

const executable = source
  .slice(0, source.indexOf("export default {"))
  .replaceAll("crypto.randomUUID()", '"smoke-id"')
const engine = new Function(executable + "; return { starterSimulatorState, advanceLifeWorld, applyResidentActivity, moveResidentForActivity };")()

// The scheduled handler must advance and persist a world even when no player is online.
const worker = new Function(source.replace("export default {", "return {"))()
assert.equal(typeof worker.scheduled, "function", "Worker must export a scheduled handler")
const scheduledState = engine.starterSimulatorState()
const staleTimestamp = Date.now() - 60 * 60 * 1000
scheduledState.last_simulated_at = staleTimestamp
const storedRow = {
  user_id: "smoke-user",
  state_json: JSON.stringify(scheduledState),
  updated_at: new Date(staleTimestamp).toISOString(),
}
let savedScheduledState = null
const fakeDb = {
  prepare(sql) {
    const statement = {
      sql,
      params: [],
      bind(...params) { this.params = params; return this },
      async run() {
        if (this.sql.startsWith("INSERT INTO simulator_worlds")) savedScheduledState = JSON.parse(this.params[1])
        return { success: true }
      },
      async all() { return { results: [storedRow] } },
      async first() { return null },
    }
    return statement
  },
}
await worker.scheduled({ scheduledTime: staleTimestamp }, { DB: fakeDb })
assert.ok(savedScheduledState, "scheduled tick should persist the simulated world")
assert.equal(savedScheduledState.minute, 480, "one hour of offline time should advance the in-game clock")
assert.ok(savedScheduledState.last_simulated_at > staleTimestamp, "scheduled tick should update the simulation timestamp")

const state = engine.starterSimulatorState()

assert.equal(state.version, 1)
assert.equal(state.residents.length, 6)
assert.ok(state.residents.some((resident) => resident.id === "ploy"))
const wakeWorld = engine.starterSimulatorState()
wakeWorld.minute = 350
wakeWorld.hour = 5
engine.advanceLifeWorld(wakeWorld, 10)
assert.equal(wakeWorld.hour, 6)
assert.equal(wakeWorld.residents.find((resident) => resident.id === "fah").activity, "wake", "morning routine should transition residents into wake-up")
assert.ok(state.residents.some((resident) => resident.id === "may" && resident.shift.start > resident.shift.end))
assert.ok(state.residents.every((resident) => resident.needs && typeof resident.money === "number"))

const before = state.residents.map((resident) => resident.money)
engine.advanceLifeWorld(state, 6 * 24 * 60)
assert.equal(state.day, 7)
assert.ok(state.events.some((event) => event.text.includes("ค่าอาหารและของใช้")))
engine.advanceLifeWorld(state, 23 * 24 * 60)

assert.equal(state.day, 30)
assert.equal(state.residents.length, 6)
assert.ok(state.events.some((event) => event.text.includes("ค่าเช่าห้อง")))
assert.ok(state.residents.every((resident) => Object.values(resident.needs).every((need) => Number.isFinite(need) && need >= 0 && need <= 100)))
assert.ok(state.residents.every((resident) => Number.isFinite(resident.money) && resident.money >= 0))
assert.ok(state.residents.every((resident) => Number.isFinite(resident.sleepDebt) && resident.sleepDebt >= 0))
assert.ok(state.residents.some((resident, index) => resident.money !== before[index]), "scheduled work should accrue simulated income")

// Starting work must not pay an entire hourly wage immediately; wages accrue on hourly ticks.
const wageWorld = engine.starterSimulatorState()
const wageResident = wageWorld.residents.find((resident) => resident.id === "ploy")
const moneyBeforeWork = wageResident.money
engine.applyResidentActivity(wageResident, "work", wageWorld.minute)
assert.equal(wageResident.money, moneyBeforeWork, "starting a work shift must not grant instant wages")

// Skills persist on the resident and level up deterministically from activities.
engine.applyResidentActivity(wageResident, "study", wageWorld.minute)
assert.equal(wageResident.skills.learning.xp, 10)
for (let i = 0; i < 9; i++) engine.applyResidentActivity(wageResident, "study", wageWorld.minute)
assert.equal(wageResident.skills.learning.xp, 100)
assert.equal(wageResident.skills.learning.level, 2, "100 skill XP should unlock level 2")
const cashBeforeShop = wageResident.money
engine.applyResidentActivity(wageResident, "shop", wageWorld.minute)
assert.equal(wageResident.money, Math.max(0, cashBeforeShop - Math.min(35, cashBeforeShop)), "shopping should spend simulated money")
const healthBeforeExercise = wageResident.health
engine.applyResidentActivity(wageResident, "exercise", wageWorld.minute)
assert.equal(wageResident.health, Math.min(100, healthBeforeExercise + 2), "exercise should improve simulated health")

// A manual order should override the routine for one in-game hour, then let the schedule resume.
const commandWorld = engine.starterSimulatorState()
const commanded = commandWorld.residents.find((resident) => resident.id === "ploy")
commanded.playerCommand = "cook"
commanded.playerCommandUntil = (commandWorld.day - 1) * 1440 + commandWorld.minute + 60
engine.advanceLifeWorld(commandWorld, 30)
assert.equal(commandWorld.minute, 450)
assert.equal(commanded.activity, "cook", "player order should override the normal morning routine")
assert.equal(commanded.playerCommand, "cook")
engine.advanceLifeWorld(commandWorld, 40)
assert.equal(commandWorld.minute, 490)
assert.equal(commanded.playerCommand, undefined, "expired player order should be cleared")
assert.equal(commanded.playerCommandUntil, undefined)
assert.equal(commanded.activity, "commute", "normal resident routine should resume after the command expires")

// Critical needs remain more important than a manual order.
const urgentWorld = engine.starterSimulatorState()
const urgentResident = urgentWorld.residents.find((resident) => resident.id === "ploy")
urgentResident.needs.bladder = 2
urgentResident.playerCommand = "cook"
urgentResident.playerCommandUntil = (urgentWorld.day - 1) * 1440 + urgentWorld.minute + 60
engine.advanceLifeWorld(urgentWorld, 10)
assert.equal(urgentResident.activity, "use_toilet", "urgent bladder need should override the player order")

// An action selected inside a building should route the resident to that entrance.
// Untrusted/out-of-range target coordinates must fall back to a safe activity destination.
const destinationWorld = engine.starterSimulatorState()
const visitor = destinationWorld.residents.find((resident) => resident.id === "ploy")
engine.moveResidentForActivity(visitor, "work", { x: 12.3, y: 20.2 })
assert.equal(visitor.x, 12.3)
assert.equal(visitor.y, 20.2)
engine.moveResidentForActivity(visitor, "work", { x: 120, y: -5 })
assert.ok(visitor.x >= 4 && visitor.x <= 96)
assert.ok(visitor.y >= 5 && visitor.y <= 94)

console.log("Worker syntax, scheduled offline progression, 30-day life simulation, command duration, priority, wages, and interior routing smoke checks passed:", workerUrl.pathname)
}
