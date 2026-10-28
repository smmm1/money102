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
    const base = Math.floor(expense.amountSatang / assigned.length);
    const remainder = expense.amountSatang % assigned.length;
    assigned.forEach((id, index) => { balances[id] -= base + (index < remainder ? 1 : 0); });
    balances[expense.payerId] += expense.amountSatang;
  }
  for (const settlement of settlements) {
    if (!settlement || !Number.isSafeInteger(settlement.amountSatang) || settlement.amountSatang <= 0 || !hasId(settlement.fromId) || !hasId(settlement.toId) || settlement.fromId === settlement.toId) continue;
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
