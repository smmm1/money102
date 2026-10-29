export function calculateSplit(expenses = [], participants = [], settlements = []) {
  const balances = Object.create(null);
  for (const participant of participants) {
    if (participant && typeof participant.id === "string" && participant.id && !Object.hasOwn(balances, participant.id)) balances[participant.id] = 0;
  }
  const ids = Object.keys(balances);
  const hasId = (id) => typeof id === "string" && Object.hasOwn(balances, id);
  for (const expense of expenses) {
    if (!expense || !Number.isSafeInteger(expense.amountSatang) || expense.amountSatang <= 0 || !hasId(expense.payerId) || !Array.isArray(expense.participantIds)) continue;
    const assigned = [...new Set(expense.participantIds)].filter(hasId);
    if (!assigned.length) continue;
    if (expense.allocationMode && !["equal", "fixed", "percentage"].includes(expense.allocationMode)) continue;
    let shares;
    if (expense.allocationMode === "fixed") {
      const values = assigned.map((id) => expense.allocations?.[id]);
      if (values.some((value) => !Number.isSafeInteger(value) || value < 0) || values.reduce((sum, value) => sum + value, 0) !== expense.amountSatang) continue;
      shares = values;
    } else if (expense.allocationMode === "percentage") {
      const points = assigned.map((id) => expense.allocations?.[id]);
      if (points.some((value) => !Number.isSafeInteger(value) || value < 0 || value > 10000) || points.reduce((sum, value) => sum + value, 0) !== 10000) continue;
      shares = points.map((value) => Number((BigInt(expense.amountSatang) * BigInt(value)) / 10000n));
      let remainder = expense.amountSatang - shares.reduce((sum, value) => sum + value, 0);
      for (let index = 0; remainder > 0; index = (index + 1) % shares.length, remainder--) shares[index]++;
    } else {
      const base = Math.floor(expense.amountSatang / assigned.length);
      const remainder = expense.amountSatang % assigned.length;
      shares = assigned.map((_, index) => base + (index < remainder ? 1 : 0));
    }
    let payers;
    if (Array.isArray(expense.payers)) {
      payers = expense.payers;
      if (!payers.length || payers.some(payer => !payer || !hasId(payer.participantId) || !Number.isSafeInteger(payer.amountSatang) || payer.amountSatang < 0) ||
          new Set(payers.map(payer => payer.participantId)).size !== payers.length ||
          payers.reduce((sum, payer) => sum + payer.amountSatang, 0) !== expense.amountSatang) continue;
    }
    assigned.forEach((id, index) => { balances[id] -= shares[index]; });
    if (payers) payers.forEach(payer => { balances[payer.participantId] += payer.amountSatang; });
    else balances[expense.payerId] += expense.amountSatang;
  }
  for (const settlement of settlements) {
    if (!settlement || !Number.isSafeInteger(settlement.amountSatang) || settlement.amountSatang <= 0 || !hasId(settlement.fromId) || !hasId(settlement.toId) || settlement.fromId === settlement.toId) continue;
    const outstandingFrom = -balances[settlement.fromId];
    const outstandingTo = balances[settlement.toId];
    // A settlement must move money from a current debtor to a current creditor,
    // and must not exceed either outstanding balance.
    if (outstandingFrom <= 0 || outstandingTo <= 0 || settlement.amountSatang > outstandingFrom || settlement.amountSatang > outstandingTo) continue;
    balances[settlement.fromId] += settlement.amountSatang;
    balances[settlement.toId] -= settlement.amountSatang;
  }
  const creditors = ids.map((id) => ({ id, amount: balances[id] })).filter((x) => x.amount > 0).sort((a,b) => b.amount-a.amount || a.id.localeCompare(b.id));
  const debtors = ids.map((id) => ({ id, amount: -balances[id] })).filter((x) => x.amount > 0).sort((a,b) => b.amount-a.amount || a.id.localeCompare(b.id));
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amountSatang = Math.min(debtors[i].amount, creditors[j].amount);
    if (amountSatang > 0) transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amountSatang });
    debtors[i].amount -= amountSatang;
    creditors[j].amount -= amountSatang;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return { balances, transfers };
}

export function calculateSleepDuration(start, end) {
  const parseLocal = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
    const [date, time] = value.split("T");
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (month < 1 || month > 12 || hour > 23 || minute > 59) return NaN;
    const calendar = new Date(Date.UTC(year, month - 1, day));
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return NaN;
    return Date.UTC(year, month - 1, day, hour, minute);
  };
  const startMs = parseLocal(start);
  let endMs = parseLocal(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs <= startMs) {
    if (String(start).slice(0, 10) !== String(end).slice(0, 10)) return null;
    endMs += 24 * 60 * 60 * 1000;
  }
  const durationHours = (endMs - startMs) / (60 * 60 * 1000);
  if (durationHours <= 0 || durationHours > 24) return null;
  return { durationHours, normalizedEnd: new Date(endMs).toISOString().slice(0, 16) };
}


/**
 * Builds a calendar-complete daily series. Missing days remain null so charts
 * can show gaps instead of implying that a measurement was taken.
 */
export function buildDailyTrend(entries = [], startDate, endDate, aggregate = "last") {
  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate || !["last", "sum"].includes(aggregate)) return [];
  const values = new Map();
  for (const entry of entries) {
    const date = typeof entry?.date === "string" ? entry.date.slice(0, 10) : "";
    const value = typeof entry?.value === "number" ? entry.value : Number(entry?.value);
    if (!validDate(date) || date < startDate || date > endDate || !Number.isFinite(value) || entry?.value === "") continue;
    values.set(date, aggregate === "sum" ? (values.get(date) ?? 0) + value : value);
  }
  const result = [];
  const end = Date.parse(endDate + "T00:00:00.000Z");
  for (let cursor = Date.parse(startDate + "T00:00:00.000Z"); cursor <= end; cursor += 86400000) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    result.push({ date, value: values.has(date) ? values.get(date) : null });
  }
  return result;
}

/**
 * Live, non-persistent preview for the bill editor. Invalid allocation rows are
 * excluded from per-person shares and counted so the UI can explain the gap.
 */
export function calculateDraftSplitPreview(rows = [], participantNames = []) {
  const names = [...new Set(participantNames.filter((name) => typeof name === "string" && name.trim()))];
  const shares = Object.fromEntries(names.map((name) => [name, 0]));
  let invalidRows = 0;
  for (const row of rows) {
    const amountText = String(row?.amount ?? "").trim();
    if (!String(row?.title ?? "").trim() && !amountText) continue;
    const amount = Number(amountText);
    const amountSatang = Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
    if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) { invalidRows++; continue; }
    const selected = [...new Set((row.participantNames == null ? names : row.participantNames)
      .filter((name) => names.includes(name)))];
    if (!selected.length) { invalidRows++; continue; }
    let values;
    if (row.allocationMode === "fixed") {
      values = selected.map((name) => {
        const raw = String(row.allocations?.[name] ?? "").trim();
        const value = Number(raw);
        return raw !== "" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN;
      });
      if (values.some((value) => !Number.isSafeInteger(value)) ||
          values.reduce((sum, value) => sum + value, 0) !== amountSatang) { invalidRows++; continue; }
    } else if (row.allocationMode === "percentage") {
      const points = selected.map((name) => {
        const raw = String(row.allocations?.[name] ?? "").trim();
        const value = Number(raw);
        return raw !== "" && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 100) : NaN;
      });
      if (points.some((value) => !Number.isSafeInteger(value)) ||
          points.reduce((sum, value) => sum + value, 0) !== 10000) { invalidRows++; continue; }
      values = points.map((value) => Number((BigInt(amountSatang) * BigInt(value)) / 10000n));
      let remainder = amountSatang - values.reduce((sum, value) => sum + value, 0);
      for (let index = 0; remainder > 0; index = (index + 1) % values.length, remainder--) values[index]++;
    } else {
      const base = Math.floor(amountSatang / selected.length);
      const remainder = amountSatang % selected.length;
      values = selected.map((_, index) => base + (index < remainder ? 1 : 0));
    }
    selected.forEach((name, index) => { shares[name] += values[index]; });
  }
  return { shares, invalidRows };
}


/**
 * Returns the exact personal share of a participant across an expense list.
 * A null result means the stored allocation is incomplete or invalid, so the
 * caller must not present a partial total as if it were authoritative.
 */
export function calculateExpenseResponsibility(expenses = [], participantId) {
  if (typeof participantId !== "string" || !participantId) return null;
  let total = 0;
  for (const expense of expenses) {
    if (!expense || !Number.isSafeInteger(expense.amountSatang) || expense.amountSatang <= 0 ||
        typeof expense.payerId !== "string" || !Array.isArray(expense.participantIds)) return null;
    const ids = [...new Set(expense.participantIds.filter((id) => typeof id === "string" && id))];
    if (!ids.length) return null;
    if (Array.isArray(expense.payers)) {
      const payers = expense.payers;
      if (!payers.length ||
          payers.some((payer) => !payer || typeof payer.participantId !== "string" || !payer.participantId ||
            !Number.isSafeInteger(payer.amountSatang) || payer.amountSatang <= 0) ||
          new Set(payers.map((payer) => payer.participantId)).size !== payers.length ||
          payers.reduce((sum, payer) => sum + BigInt(payer.amountSatang), 0n) !== BigInt(expense.amountSatang)) return null;
    }
    const participantIndex = ids.indexOf(participantId);
    if (participantIndex < 0) continue;
    let share = 0;
    if (expense.allocationMode === "fixed") {
      const values = ids.map((id) => expense.allocations?.[id]);
      if (values.some((value) => !Number.isSafeInteger(value) || value < 0) ||
          values.reduce((sum, value) => sum + BigInt(value), 0n) !== BigInt(expense.amountSatang)) return null;
      share = values[participantIndex];
    } else if (expense.allocationMode === "percentage") {
      const points = ids.map((id) => expense.allocations?.[id]);
      if (points.some((value) => !Number.isSafeInteger(value) || value < 0 || value > 10000) ||
          points.reduce((sum, value) => sum + value, 0) !== 10000) return null;
      const shares = points.map((value) => Number((BigInt(expense.amountSatang) * BigInt(value)) / 10000n));
      const remainder = expense.amountSatang - shares.reduce((sum, value) => sum + value, 0);
      for (let index = 0; index < remainder; index++) shares[index % shares.length]++;
      share = shares[participantIndex];
    } else if (expense.allocationMode === undefined || expense.allocationMode === "equal") {
      const base = Math.floor(expense.amountSatang / ids.length);
      const remainder = expense.amountSatang % ids.length;
      share = base + (participantIndex < remainder ? 1 : 0);
    } else {
      return null;
    }
    if (!Number.isSafeInteger(total + share)) return null;
    total += share;
  }
  return total;
}

/** Summarizes known personal costs without treating missing values as zero. */
export function summarizeBbqPersonalCosts(visits = []) {
  const rows = Array.isArray(visits) ? visits : [];
  const known = rows.filter((visit) => Number.isSafeInteger(visit?.personalSatang) && visit.personalSatang >= 0);
  const totalSatang = known.reduce((sum, visit) => sum + visit.personalSatang, 0);
  if (!Number.isSafeInteger(totalSatang)) {
    return { totalSatang: null, knownCount: known.length, unknownCount: rows.length - known.length, averageSatang: null, complete: false };
  }
  const unknownCount = rows.length - known.length;
  return {
    totalSatang: known.length ? totalSatang : null,
    knownCount: known.length,
    unknownCount,
    averageSatang: known.length ? Math.round(totalSatang / known.length) : null,
    complete: unknownCount === 0,
  };
}


/**
 * Formats a date label using the user's selected timezone.
 * Date-only values and local wall-clock datetimes keep their written calendar
 * day; ISO instants are converted into the selected timezone.
 */
export function formatDateInTimezone(value, timezone = "Asia/Bangkok") {
  if (typeof value !== "string" || !value.trim()) return "ไม่ระบุวันที่";
  const input = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const localDateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.exec(input);
  const format = (date, zone) => new Intl.DateTimeFormat("th-TH", {
    timeZone: zone, day: "numeric", month: "short", year: "numeric",
  }).format(date);
  const validCalendarDate = (match) => {
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (dateOnlyMatch || localDateTimeMatch) {
    const match = dateOnlyMatch || localDateTimeMatch;
    if (!validCalendarDate(match)) return "ไม่ระบุวันที่";
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    return format(date, "UTC");
  }
  const instant = new Date(input);
  if (!Number.isFinite(instant.getTime())) return "ไม่ระบุวันที่";
  try {
    return format(instant, timezone);
  } catch {
    return format(instant, "Asia/Bangkok");
  }
}


function apportionSatang(totalSatang, ids, weights) {
  if (!Number.isSafeInteger(totalSatang) || totalSatang < 0 || ids.length !== weights.length) return null;
  if (totalSatang === 0) return ids.map(() => 0);
  const normalized = weights.map(value => Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : -1n);
  if (normalized.some(value => value < 0n)) return null;
  const weightTotal = normalized.reduce((sum, value) => sum + value, 0n);
  if (weightTotal <= 0n) return null;
  const amount = BigInt(totalSatang);
  const shares = normalized.map(weight => Number((amount * weight) / weightTotal));
  const remainders = normalized.map(weight => (amount * weight) % weightTotal);
  let remaining = totalSatang - shares.reduce((sum, value) => sum + value, 0);
  const order = ids.map((_, index) => index).sort((a, b) =>
    remainders[a] === remainders[b] ? a - b : (remainders[a] > remainders[b] ? -1 : 1)
  );
  for (let index = 0; remaining > 0; index++, remaining--) shares[order[index]]++;
  return shares;
}

function roundedBasisPointAmount(amountSatang, basisPoints) {
  return Number((BigInt(amountSatang) * BigInt(basisPoints) + 5000n) / 10000n);
}

/**
 * Calculates the final bill, service fee, tax, discount, personal shares,
 * actual contributions, settlements and transfer plan in integer satang.
 * Fees are paid by adjustmentPayerId; a bill-level discount reduces both
 * responsibility and contribution proportionally so all net balances sum to 0.
 */
export function calculateAdjustedSplit(expenses = [], participants = [], settlements = [], adjustments = {}) {
  const fail = (error) => ({
    valid: false, error, subtotalSatang: null, serviceFeeSatang: null, taxSatang: null,
    discountSatang: null, totalSatang: null, responsibilityByParticipant: {}, paidByParticipant: {},
    balances: {}, transfers: [],
  });
  if (!Array.isArray(participants) || participants.length < 2 || !Array.isArray(expenses) || expenses.length === 0 || !Array.isArray(settlements)) {
    return fail("บิลต้องมีผู้ร่วมอย่างน้อยสองคนและมีรายการค่าใช้จ่าย");
  }
  const ids = participants.map(person => person?.id);
  if (ids.some(id => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) return fail("รายชื่อผู้ร่วมบิลมีรหัสซ้ำหรือไม่ถูกต้อง");
  const hasId = id => ids.includes(id);
  const baseShares = Object.fromEntries(ids.map(id => [id, 0]));
  const basePaid = Object.fromEntries(ids.map(id => [id, 0]));
  let subtotalSatang = 0;
  for (const expense of expenses) {
    if (!expense || typeof expense.title !== "string" || !expense.title.trim() ||
      !Number.isSafeInteger(expense.amountSatang) || expense.amountSatang <= 0 ||
      !Array.isArray(expense.participantIds) || !expense.participantIds.length) return fail("รายการค่าใช้จ่ายมีข้อมูลไม่ถูกต้อง");
    const assigned = [...expense.participantIds];
    if (new Set(assigned).size !== assigned.length || assigned.some(id => !hasId(id))) return fail("รายชื่อผู้ร่วมรับผิดชอบมีข้อมูลซ้ำหรือไม่ถูกต้อง");
    let shares;
    if (expense.allocationMode === "fixed") {
      shares = assigned.map(id => expense.allocations?.[id]);
      if (shares.some(value => !Number.isSafeInteger(value) || value < 0) ||
        shares.reduce((sum, value) => sum + BigInt(value), 0n) !== BigInt(expense.amountSatang)) return fail("ยอดแบ่งที่กำหนดเองต้องรวมเท่ากับยอดรายการ");
    } else if (expense.allocationMode === "percentage") {
      const points = assigned.map(id => expense.allocations?.[id]);
      if (points.some(value => !Number.isSafeInteger(value) || value < 0 || value > 10000) ||
        points.reduce((sum, value) => sum + value, 0) !== 10000) return fail("เปอร์เซ็นต์ของผู้ร่วมรายการต้องรวมกันเท่ากับ 100%");
      shares = apportionSatang(expense.amountSatang, assigned, points);
    } else if (expense.allocationMode === undefined || expense.allocationMode === "equal") {
      shares = apportionSatang(expense.amountSatang, assigned, assigned.map(() => 1));
    } else return fail("วิธีแบ่งค่าใช้จ่ายไม่ถูกต้อง");
    if (!shares) return fail("คำนวณส่วนแบ่งค่าใช้จ่ายไม่สำเร็จ");
    assigned.forEach((id, index) => {
      const next = baseShares[id] + shares[index];
      if (!Number.isSafeInteger(next)) throw new RangeError("bill share exceeds safe integer");
      baseShares[id] = next;
    });
    if (Array.isArray(expense.payers)) {
      const payers = expense.payers;
      if (!payers.length || payers.some(payer => !payer || !hasId(payer.participantId) ||
        !Number.isSafeInteger(payer.amountSatang) || payer.amountSatang < 0) ||
        new Set(payers.map(payer => payer.participantId)).size !== payers.length ||
        payers.reduce((sum, payer) => sum + BigInt(payer.amountSatang), 0n) !== BigInt(expense.amountSatang)) {
        return fail("ยอดที่ผู้จ่ายแต่ละคนออกต้องรวมเท่ากับยอดรายการ");
      }
      for (const payer of payers) {
        const next = basePaid[payer.participantId] + payer.amountSatang;
        if (!Number.isSafeInteger(next)) return fail("ยอดที่จ่ายรวมเกินช่วงที่รองรับ");
        basePaid[payer.participantId] = next;
      }
    } else {
      if (!hasId(expense.payerId)) return fail("ไม่พบผู้จ่ายเงินของรายการ");
      const next = basePaid[expense.payerId] + expense.amountSatang;
      if (!Number.isSafeInteger(next)) return fail("ยอดที่จ่ายรวมเกินช่วงที่รองรับ");
      basePaid[expense.payerId] = next;
    }
    subtotalSatang += expense.amountSatang;
    if (!Number.isSafeInteger(subtotalSatang)) return fail("ยอดรวมเกินช่วงที่รองรับ");
  }
  if (subtotalSatang <= 0) return fail("ยอดรวมต้องมากกว่า 0");
  const serviceFeeRateBps = adjustments?.serviceFeeRateBps ?? 0;
  const taxRateBps = adjustments?.taxRateBps ?? 0;
  const serviceFeeIncluded = adjustments?.serviceFeeIncluded ?? false;
  const taxIncluded = adjustments?.taxIncluded ?? false;
  const discountSatang = adjustments?.discountSatang ?? 0;
  if (![serviceFeeRateBps, taxRateBps].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 10000) ||
    typeof serviceFeeIncluded !== "boolean" || typeof taxIncluded !== "boolean" ||
    !Number.isSafeInteger(discountSatang) || discountSatang < 0) return fail("ค่าบริการ ภาษี หรือส่วนลดมีรูปแบบไม่ถูกต้อง");
  const serviceFeeSatang = serviceFeeIncluded ? 0 : roundedBasisPointAmount(subtotalSatang, serviceFeeRateBps);
  const afterService = subtotalSatang + serviceFeeSatang;
  if (!Number.isSafeInteger(afterService)) return fail("ยอดรวมค่าบริการเกินช่วงที่รองรับ");
  const taxSatang = taxIncluded ? 0 : roundedBasisPointAmount(afterService, taxRateBps);
  const beforeDiscount = afterService + taxSatang;
  if (!Number.isSafeInteger(beforeDiscount)) return fail("ยอดรวมภาษีเกินช่วงที่รองรับ");
  if (discountSatang > beforeDiscount) return fail("ส่วนลดต้องไม่มากกว่ายอดรวมก่อนหักส่วนลด");
  const adjustmentPayerId = adjustments?.adjustmentPayerId || ids[0];
  if ((serviceFeeSatang > 0 || taxSatang > 0) && !hasId(adjustmentPayerId)) return fail("เลือกผู้ที่จ่ายค่าบริการและภาษี");
  const serviceShares = apportionSatang(serviceFeeSatang, ids, ids.map(id => baseShares[id]));
  if (!serviceShares) return fail("กระจายค่าบริการตามส่วนรับผิดชอบไม่สำเร็จ");
  const sharesAfterService = Object.fromEntries(ids.map((id, index) => [id, baseShares[id] + serviceShares[index]]));
  const taxShares = apportionSatang(taxSatang, ids, ids.map(id => sharesAfterService[id]));
  if (!taxShares) return fail("กระจายภาษีตามส่วนรับผิดชอบไม่สำเร็จ");
  const grossShares = Object.fromEntries(ids.map((id, index) => [id, sharesAfterService[id] + taxShares[index]]));
  const paidBeforeDiscount = { ...basePaid };
  if (serviceFeeSatang + taxSatang > 0) {
    if (!hasId(adjustmentPayerId)) return fail("เลือกผู้ที่จ่ายค่าบริการและภาษี");
    const paid = paidBeforeDiscount[adjustmentPayerId] + serviceFeeSatang + taxSatang;
    if (!Number.isSafeInteger(paid)) return fail("ยอดที่จ่ายรวมเกินช่วงที่รองรับ");
    paidBeforeDiscount[adjustmentPayerId] = paid;
  }
  const discountShares = apportionSatang(discountSatang, ids, ids.map(id => grossShares[id]));
  if (!discountShares) return fail("กระจายส่วนลดตามสัดส่วนไม่สำเร็จ");
  const paidWeights = ids.map(id => paidBeforeDiscount[id]);
  const discountPaid = apportionSatang(discountSatang, ids, paidWeights);
  if (!discountPaid) return fail("กระจายส่วนลดให้ผู้จ่ายไม่สำเร็จ");
  const responsibilityByParticipant = Object.fromEntries(ids.map((id, index) => [id, grossShares[id] - discountShares[index]]));
  const paidByParticipant = Object.fromEntries(ids.map((id, index) => [id, paidBeforeDiscount[id] - discountPaid[index]]));
  const totalSatang = beforeDiscount - discountSatang;
  if (Object.values(responsibilityByParticipant).reduce((sum, value) => sum + BigInt(value), 0n) !== BigInt(totalSatang) ||
    Object.values(paidByParticipant).reduce((sum, value) => sum + BigInt(value), 0n) !== BigInt(totalSatang)) return fail("ยอดส่วนรับผิดชอบและยอดที่จ่ายรวมกันไม่ตรงกับยอดสุทธิ");
  const balances = Object.fromEntries(ids.map(id => [id, paidByParticipant[id] - responsibilityByParticipant[id]]));
  for (const settlement of settlements) {
    if (!settlement || !Number.isSafeInteger(settlement.amountSatang) || settlement.amountSatang <= 0 ||
      !hasId(settlement.fromId) || !hasId(settlement.toId) || settlement.fromId === settlement.toId) return fail("รายการชำระบิลไม่ถูกต้อง");
    const from = balances[settlement.fromId], to = balances[settlement.toId];
    if (from >= 0 || to <= 0 || settlement.amountSatang > -from || settlement.amountSatang > to) return fail("รายการชำระเกินยอดที่ต้องเคลียร์");
    balances[settlement.fromId] += settlement.amountSatang;
    balances[settlement.toId] -= settlement.amountSatang;
  }
  const creditors = ids.map(id => ({ id, amount: balances[id] })).filter(person => person.amount > 0).sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const debtors = ids.map(id => ({ id, amount: -balances[id] })).filter(person => person.amount > 0).sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amountSatang: amount });
    debtors[i].amount -= amount; creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  if (Object.values(balances).reduce((sum, value) => sum + BigInt(value), 0n) !== 0n) return fail("ยอดสุทธิของผู้ร่วมบิลไม่รวมเป็นศูนย์");
  return {
    valid: true, error: null, subtotalSatang, serviceFeeSatang, taxSatang, discountSatang, totalSatang,
    serviceFeeRateBps, taxRateBps, serviceFeeIncluded, taxIncluded,
    responsibilityByParticipant, paidByParticipant, balances, transfers,
  };
}
