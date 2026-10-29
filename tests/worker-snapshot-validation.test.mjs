import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshot, validDayTogetherState, validateDayTogetherSnapshot } from "../workers/money102-api.js";
import worker from "../workers/money102-api.js";

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
  assert.equal(isSnapshot({ "money102-pork-bbq-history-v1": "[]" }), true);
  assert.equal(isSnapshot({ "money102-dashboard-order-v1": ["home"] }), false);
});

test("rejects malformed bill allocations before they can be persisted", () => {
  const state = validState();
  state.bills.push({
    id: "bill-1", title: "Dinner", date: "2026-01-01", restaurant: "BBQ", note: "", bbqId: "",
    status: "draft",
    participants: [{ id: "me", name: "Me", isMe: true }, { id: "friend", name: "Friend", isMe: false }],
    expenses: [{ id: "expense-1", title: "Food", amountSatang: 10000, payerId: "me", participantIds: ["me", "friend"], allocationMode: "fixed", allocations: { me: 3000, friend: 6000 } }],
    settlements: []
  });
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
});
test("accepts valid bill allocation totals and rejects duplicate expense participants", () => {
  const state = validState();
  state.bills.push({
    id: "bill-1", title: "Dinner", date: "2026-01-01", restaurant: "BBQ", note: "", bbqId: "",
    status: "draft",
    participants: [{ id: "me", name: "Me", isMe: true }, { id: "friend", name: "Friend", isMe: false }],
    expenses: [{ id: "expense-1", title: "Food", amountSatang: 10001, payerId: "me", participantIds: ["me", "friend"], allocationMode: "percentage", allocations: { me: 5000, friend: 5000 } }],
    settlements: []
  });
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  state.bills[0].expenses[0].participantIds = ["me", "me"];
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
});
test("rejects snapshots with negative savings balance or invalid health values", () => {
  const state = validState();
  state.savings.push({ id: "saving-2", kind: "withdraw", amountSatang: 500, date: "2026-01-02", goalId: "goal-1", note: "" });
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
  const invalidHealth = validState();
  invalidHealth.health[0].value = "x".repeat(1001);
  assert.equal(validDayTogetherState(JSON.stringify(invalidHealth)), false);
});


test("accepts exercise records so the health module can persist workouts", () => {
  const state = validState();
  state.health.push({ id: "exercise-1", kind: "exercise", date: "2026-01-02", value: "เดินเร็ว 30 นาที", extra: "ระยะทาง 2 กม.", note: "ทดสอบการบันทึก" });
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), true);
});

test("keeps accepting the legacy snapshot shape while validating the rebuilt app shape", () => {
  const legacy = { goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] };
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(legacy) }), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify({ goals: [], savings: [], health: [], notes: [], bills: [], visits: [], settings: {} }) }), false);
});

test("validates the legacy schema directly and rejects malformed legacy snapshots", () => {
  const legacy = { goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] };
  assert.equal(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": JSON.stringify(legacy) }), null);
  assert.match(validateDayTogetherSnapshot({ "lamoon-daytogether-v1": "{" }), /ไม่ถูกต้อง/);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": "x".repeat(900001) }), false);
});


test("does not expose internal D1 errors in API responses", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), {
    DB: { prepare() { throw new Error("secret SQL details"); } },
    APP_ORIGIN: "https://money102.onrender.com"
  });
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error, "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ภายหลัง");
  assert.equal("detail" in body, false);
});


test("account deletion removes sessions, saved state, and the user only after authentication", async () => {
  const batched = [];
  const db = {
    prepare(sql) {
      return {
        sql,
        bind(...args) { this.args = args; return this; },
        async run() { return { success: true }; },
        async first() { return sql.includes("JOIN app_users") ? { id: "user-1", email: "user@example.com" } : null; }
      };
    },
    async batch(statements) { batched.push(...statements); return statements.map(() => ({ success: true })); }
  };
  const response = await worker.fetch(new Request("https://api.example.test/api/auth/account", {
    method: "DELETE", headers: { Authorization: "Bearer " + "t".repeat(40) }
  }), { DB: db, APP_ORIGIN: "https://money102.onrender.com" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(batched.length, 3);
  assert.deepEqual(batched.map(statement => statement.sql), [
    "DELETE FROM app_sessions WHERE user_id=?",
    "DELETE FROM user_app_data WHERE user_id=?",
    "DELETE FROM app_users WHERE id=?"
  ]);
  assert.ok(batched.every(statement => statement.args[0] === "user-1"));
});

test("account deletion requires an authenticated session", async () => {
  const db = {
    prepare(sql) { return { bind() { return this; }, async run() { return { success: true }; }, async first() { return null; } }; },
    async batch() { throw new Error("must not delete unauthenticated data"); }
  };
  const response = await worker.fetch(new Request("https://api.example.test/api/auth/account", { method: "DELETE" }), { DB: db });
  assert.equal(response.status, 401);
});


test("password change requires authentication and enforces password length", async () => {
  const db = {
    prepare(sql) { return { bind() { return this; }, async run() { return { success: true }; }, async first() { return sql.includes("JOIN app_users") ? { id: "user-1", email: "user@example.com" } : null; } }; },
    async batch() { throw new Error("must not change password"); }
  };
  const unauthenticated = await worker.fetch(new Request("https://api.example.test/api/auth/password", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: "old-password", newPassword: "short" })
  }), { DB: db });
  assert.equal(unauthenticated.status, 401);
  const weakPassword = await worker.fetch(new Request("https://api.example.test/api/auth/password", {
    method: "POST", headers: { Authorization: "Bearer " + "t".repeat(40), "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "old-password", newPassword: "short" })
  }), { DB: db });
  assert.equal(weakPassword.status, 400);
});

test("password change updates the password hash and invalidates other sessions", async () => {
  const { webcrypto } = await import("node:crypto");
  const salt = new Uint8Array(16).fill(7);
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("old-password"), "PBKDF2", false, ["deriveBits"]);
  const hash = new Uint8Array(await webcrypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
  const encode = bytes => Buffer.from(bytes).toString("base64url");
  const batched = [];
  const db = {
    prepare(sql) {
      return {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
        async run() { return { success: true }; },
        async first() {
          if (sql.includes("JOIN app_users")) return { id: "user-1", email: "user@example.com" };
          if (sql.includes("SELECT password_salt,password_hash")) return { password_salt: encode(salt), password_hash: encode(hash) };
          return null;
        }
      };
    },
    async batch(statements) { batched.push(...statements); return statements.map(() => ({ success: true })); }
  };
  const response = await worker.fetch(new Request("https://api.example.test/api/auth/password", {
    method: "POST",
    headers: { Authorization: "Bearer " + "t".repeat(40), "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password-123" })
  }), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(batched.length, 2);
  assert.match(batched[0].sql, /^UPDATE app_users SET password_salt=\?,password_hash=\? WHERE id=\?$/);
  assert.equal(batched[0].args[2], "user-1");
  assert.equal(batched[1].sql, "DELETE FROM app_sessions WHERE user_id=? AND token_hash<>?");
  assert.equal(batched[1].args[0], "user-1");
  assert.equal(batched[1].args[1].length, 43);
  assert.notEqual(batched[0].args[1], encode(hash));
});


test("state snapshot writes reject stale revisions instead of overwriting another tab", async () => {
  let revision = "2026-10-29T00:00:00.000Z";
  let storedPayload = JSON.stringify({ "lamoon-daytogether-v1": JSON.stringify(validState()) });
  const db = {
    prepare(sql) {
      const statement = {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes("JOIN app_users")) return { id: "user-1", email: "user@example.com" };
          if (sql.includes("SELECT payload,updated_at FROM user_app_data")) return { payload: storedPayload, updated_at: revision };
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO user_app_data") && sql.includes("WHERE user_app_data.updated_at = ?")) {
            const [, , payload, updatedAt, expected] = this.args;
            if (revision !== expected) return { meta: { changes: 0 } };
            storedPayload = payload;
            revision = updatedAt;
            return { meta: { changes: 1 } };
          }
          if (sql.includes("INSERT INTO user_app_data")) {
            const [, , payload, updatedAt] = this.args;
            storedPayload = payload;
            revision = updatedAt;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
      };
      return statement;
    }
  };
  const write = async (expectedRevision, state) => worker.fetch(new Request("https://api.example.test/api/state", {
    method: "PUT",
    headers: { Authorization: "Bearer " + "t".repeat(40), "Content-Type": "application/json" },
    body: JSON.stringify({ payload: { "lamoon-daytogether-v1": JSON.stringify(state) }, expected_updated_at: expectedRevision })
  }), { DB: db });
  const stateOne = { ...validState(), settings: { ...validState().settings, displayName: "A" } };
  const stateTwo = { ...validState(), settings: { ...validState().settings, displayName: "B" } };
  const initialRevision = revision;
  const success = await write(initialRevision, stateOne);
  assert.equal(success.status, 200);
  const body = await success.json();
  assert.ok(body.updated_at > initialRevision);
  const latestPayload = storedPayload;
  const stale = await write(initialRevision, stateTwo);
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).conflict, true);
  assert.equal(storedPayload, latestPayload);
});

test("state endpoint preserves legacy unconditional writes while clients roll forward", async () => {
  let storedPayload = "";
  const db = {
    prepare(sql) {
      const statement = { sql, args: [], bind(...args) { this.args = args; return this; },
        async first() { return sql.includes("JOIN app_users") ? { id: "user-1", email: "user@example.com" } : null; },
        async run() {
          if (sql.includes("INSERT INTO user_app_data")) { storedPayload = this.args[2]; return { meta: { changes: 1 } }; }
          return { meta: { changes: 0 } };
        } };
      return statement;
    }
  };
  const response = await worker.fetch(new Request("https://api.example.test/api/state", {
    method: "PUT", headers: { Authorization: "Bearer " + "t".repeat(40), "Content-Type": "application/json" },
    body: JSON.stringify({ payload: { "lamoon-daytogether-v1": JSON.stringify(validState()) } })
  }), { DB: db });
  assert.equal(response.status, 200);
  assert.ok(storedPayload.includes("lamoon-daytogether-v1"));
});


test("accepts a split bill for a group that does not include the current user", () => {
  const state = validState();
  state.bills.push({
    id: "bill-no-me", title: "Dinner for friends", date: "2026-10-29", restaurant: "", note: "", bbqId: "",
    status: "draft",
    participants: [
      { id: "friend-a", name: "เพื่อน A", isMe: false },
      { id: "friend-b", name: "เพื่อน B", isMe: false },
    ],
    expenses: [{
      id: "expense-no-me", title: "ค่าอาหาร", amountSatang: 10000, payerId: "friend-a",
      participantIds: ["friend-a", "friend-b"], allocationMode: "equal",
    }],
    settlements: [],
  });
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  assert.equal(isSnapshot({ "lamoon-daytogether-v1": JSON.stringify(state) }), true);
});


test("CORS preflight allows authenticated account deletion from the web app", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/api/auth/account", {
    method: "OPTIONS",
    headers: {
      Origin: "https://money102.onrender.com",
      "Access-Control-Request-Method": "DELETE",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  }), { DB: {}, APP_ORIGIN: "https://money102.onrender.com" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://money102.onrender.com");
  assert.ok(response.headers.get("Access-Control-Allow-Methods")?.split(",").map(value => value.trim()).includes("DELETE"));
});


test("validates bill adjustment rates and rejects discounts above the adjusted total", () => {
  const state = validState();
  const bill = {
    id: "bill-adjustment", title: "Dinner", date: "2026-10-29", restaurant: "", note: "", bbqId: "", status: "draft",
    participants: [
      { id: "me", name: "ฉัน", isMe: true },
      { id: "friend", name: "เพื่อน", isMe: false },
    ],
    expenses: [{ id: "food", title: "อาหาร", amountSatang: 10000, payerId: "me", participantIds: ["me", "friend"], allocationMode: "equal" }],
    settlements: [],
    adjustments: { serviceBasisPoints: 1000, taxBasisPoints: 700, serviceIncluded: false, taxIncluded: false, discountSatang: 500 },
  };
  state.bills.push(bill);
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
  bill.adjustments.discountSatang = 20000;
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
  bill.adjustments.discountSatang = 0;
  bill.adjustments.taxBasisPoints = 10001;
  assert.equal(validDayTogetherState(JSON.stringify(state)), false);
});


test("server validates typed health values and rejects impossible calendar dates", () => {
  const invalidCases = [
    state => { state.health[0].value = "500.1"; },
    state => { state.health[0] = { ...state.health[0], kind: "pressure", value: "301/80" }; },
    state => { state.health[0] = { ...state.health[0], kind: "pressure", value: "120/80", extra: "ชีพจร 999 ครั้ง/นาที" }; },
    state => { state.health[0] = { ...state.health[0], kind: "water", value: "20001" }; },
    state => { state.health[0] = { ...state.health[0], kind: "water", value: "250.5" }; },
    state => { state.health[0] = { ...state.health[0], kind: "sleep", value: "24.1" }; },
    state => { state.health[0] = { ...state.health[0], kind: "symptom", value: "   " }; },
    state => { state.savings[0].date = "2026-02-30"; },
    state => { state.notes[0].date = "2026-13-01"; },
    state => { state.health[0].date = "2026-01-01T25:00"; },
  ];
  for (const mutate of invalidCases) {
    const state = validState();
    mutate(state);
    assert.equal(validDayTogetherState(JSON.stringify(state)), false);
  }
});

test("server accepts valid typed health entries and local measurement times", () => {
  const state = validState();
  state.health = [
    { id: "weight-1", kind: "weight", date: "2026-01-01T08:30", value: "70.5", extra: "", note: "" },
    { id: "pressure-1", kind: "pressure", date: "2026-01-01T08:35", value: "120/80", extra: "ชีพจร 72 ครั้ง/นาที", note: "" },
    { id: "sleep-1", kind: "sleep", date: "2026-01-01T07:00", value: "7.5", extra: "เข้านอน 2025-12-31 23:30 · ตื่น 2026-01-01 07:00", note: "" },
    { id: "water-1", kind: "water", date: "2026-01-01T09:00", value: "250", extra: "", note: "" },
    { id: "symptom-1", kind: "symptom", date: "2026-01-01T09:15", value: "ปวดหัว", extra: "ระดับความรู้สึก: 3/5", note: "" },
  ];
  assert.equal(validDayTogetherState(JSON.stringify(state)), true);
});
