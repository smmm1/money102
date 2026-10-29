const parse = (raw, fallback) => {
  if (typeof raw !== "string") return fallback;
  try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
};
const text = (value, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const satang = value => Math.max(0, Math.round(number(value) * 100));
const dateOf = value => {
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};
const uid = (prefix, value, index) => {
  const source = text(value) || String(index);
  return prefix + index + "-" + source.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
};

/**
 * One-time migration from the previous Money102 storage keys into DayTogether.
 * It only runs when the new DayTogether state key does not exist; legacy keys
 * remain in the snapshot so older records are not destroyed by the migration.
 */
export function migrateLegacyState(defaults, getItem) {
  const current = parse(getItem("lamoon-daytogether-v1"), null);
  if (current && typeof current === "object" && !Array.isArray(current)) {
    return { ...defaults, ...current, notes: Array.isArray(current.notes) ? current.notes.map(note => ({ ...note, version: note && Number.isSafeInteger(note.version) && note.version >= 1 ? note.version : 1 })) : defaults.notes, settings: { ...defaults.settings, ...(current.settings || {}) } };
  }

  const goals = [];
  const goalTarget = number(getItem("lamoon-saving-goal"), 0);
  if (goalTarget > 0) {
    goals.push({
      id: "legacy-savings-goal",
      name: text(getItem("lamoon-saving-goal-title"), "เงินสำรองของฉัน"),
      targetSatang: satang(goalTarget),
      status: "active",
      color: "green"
    });
  }

  const notesRaw = parse(getItem("lamoon-commonplace-notes-v1"), []);
  const notes = Array.isArray(notesRaw) ? notesRaw.filter(item => item && typeof item === "object").map((item, index) => ({
    id: uid("legacy-note-", item.id, index),
    title: text(item.title, "โน้ตเดิม"),
    body: text(item.body),
    kind: "note",
    date: dateOf(item.createdAt || item.updatedAt),
    tags: Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === "string") : [],
    mood: text(item.mood),
    pinned: Boolean(item.pinned),
    archived: false,
    updatedAt: text(item.updatedAt, text(item.createdAt, new Date().toISOString())),
    version: 1
  })) : [];

  const oldHealth = parse(getItem("lamoon-health-dashboard-v1"), {});
  const health = [];
  if (oldHealth && typeof oldHealth === "object" && Array.isArray(oldHealth.records)) {
    for (const [index, record] of oldHealth.records.entries()) {
      if (!record || typeof record !== "object") continue;
      const base = { id: uid("legacy-health-", record.id, index), date: dateOf(record.date), note: text(record.note) };
      if (record.type === "weight" && number(record.weight, -1) >= 0) {
        health.push({ ...base, kind: "weight", value: String(record.weight), extra: "" });
      } else if (record.type === "exercise") {
        const details = [
          text(record.exercise, "ออกกำลังกาย"),
          number(record.duration) > 0 ? number(record.duration) + " นาที" : "",
          number(record.distance) > 0 ? number(record.distance) + " กม." : "",
          number(record.reps) > 0 ? number(record.reps) + " ครั้ง" : "",
          number(record.sets) > 0 ? number(record.sets) + " เซ็ต" : "",
          number(record.steps) > 0 ? number(record.steps) + " ก้าว" : "",
          number(record.calories) > 0 ? number(record.calories) + " kcal" : ""
        ].filter(Boolean).join(" · ");
        health.push({ ...base, kind: "symptom", value: "ออกกำลังกาย", extra: details });
      } else if (record.type === "wellness") {
        if (number(record.water) > 0) health.push({ ...base, id: base.id + "-water", kind: "water", value: String(record.water), extra: "ข้อมูลเดิม" });
        if (number(record.sleep) > 0) health.push({ ...base, id: base.id + "-sleep", kind: "sleep", value: String(record.sleep), extra: "ข้อมูลเดิม" });
        if (base.note && !(number(record.water) > 0 || number(record.sleep) > 0)) health.push({ ...base, kind: "symptom", value: "บันทึกสุขภาพเดิม", extra: "" });
      }
    }
  }

  // Preserve old income/expense entries as dated notes rather than forcing them
  // into savings withdrawals, which could incorrectly create a negative balance.
  const transactions = parse(getItem("lamoon-transactions"), []);
  if (Array.isArray(transactions)) {
    for (const [index, item] of transactions.entries()) {
      if (!item || typeof item !== "object") continue;
      const amount = number(item.amount, -1);
      if (amount < 0) continue;
      notes.push({
        id: uid("legacy-transaction-", item.id, index),
        title: (item.type === "income" ? "รายรับเดิม" : "รายจ่ายเดิม") + (text(item.detail) ? " · " + text(item.detail) : ""),
        body: new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(amount) + " บาท · ย้ายจากบันทึก Money102 เดิม",
        kind: "note",
        date: dateOf(item.date),
        tags: ["ข้อมูลเดิม", "การเงิน"],
        mood: "",
        pinned: false,
        archived: false,
        updatedAt: text(item.createdAt, new Date().toISOString()),
        version: 1
      });
    }
  }

  const oldBills = parse(getItem("money102-split-bill-history-v1"), []);
  const bills = Array.isArray(oldBills) ? oldBills.filter(item => item && typeof item === "object").map((item, index) => {
    const names = Array.isArray(item.people) ? item.people.map((name, i) => text(name).trim() || "ผู้ร่วม " + (i + 1)).slice(0, 50) : [];
    const people = names.length ? names : ["ฉัน", "เพื่อน"];
    const participants = people.map((name, i) => ({ id: uid("legacy-person-" + index + "-", name, i), name, isMe: i === 0 }));
    const amount = satang(number(item.total) + number(item.tip));
    const shares = Array.isArray(item.shares) ? item.shares : [];
    const shareNote = item.mode === "custom" && shares.length ? " · ยอดแบ่งเดิม: " + shares.map((share, i) => people[i] + " " + number(share) + " บาท").join(", ") : "";
    return {
      id: uid("legacy-bill-", item.id, index),
      title: text(item.title, "บิลเดิม"),
      date: dateOf(item.createdAt),
      restaurant: "",
      participants,
      expenses: amount > 0 ? [{ id: "legacy-expense-" + index, title: "ยอดรวมเดิม" + shareNote, amountSatang: amount, payerId: participants[0].id, participantIds: participants.map(person => person.id), allocationMode: "equal" }] : [],
      settlements: [],
      note: "ย้ายจากประวัติหารตังเดิม" + shareNote,
      bbqId: "",
      status: "draft"
    };
  }) : [];

  const oldVisits = parse(getItem("money102-pork-bbq-history-v1"), []);
  const visits = Array.isArray(oldVisits) ? oldVisits.filter(item => item && typeof item === "object").map((item, index) => ({
    id: uid("legacy-visit-", item.id, index),
    restaurant: text(item.shop, "ร้านเดิม"),
    title: text(item.shop, "ร้านเดิม"),
    date: dateOf(item.date || item.createdAt),
    area: text(item.mapLabel),
    friends: "",
    people: 1,
    totalSatang: satang(item.price),
    personalSatang: satang(item.price),
    rating: null,
    menu: "",
    memory: text(item.mapUrl) ? "แผนที่เดิม: " + text(item.mapUrl) : "ย้ายจากประวัติหมูกระทะเดิม",
    billId: ""
  })) : [];

  return {
    ...defaults,
    goals,
    savings: [],
    health,
    notes,
    bills,
    visits,
    settings: { ...defaults.settings }
  };
}
