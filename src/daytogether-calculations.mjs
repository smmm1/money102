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
        const value = Number(String(row.allocations?.[name] ?? "").trim());
        return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN;
      });
      if (values.some((value) => !Number.isSafeInteger(value)) ||
          values.reduce((sum, value) => sum + value, 0) !== amountSatang) { invalidRows++; continue; }
    } else if (row.allocationMode === "percentage") {
      const points = selected.map((name) => {
        const value = Number(String(row.allocations?.[name] ?? "").trim());
        return Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 100) : NaN;
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
