export function calculateSplit(expenses, participants, settlements = []) {
  const balances = Object.fromEntries(participants.map((p) => [p.id, 0]));
  for (const expense of expenses) {
    const ids = expense.participantIds.filter((id) => id in balances);
    if (!ids.length || !(expense.payerId in balances)) continue;
    const base = Math.floor(expense.amountSatang / ids.length);
    const remainder = expense.amountSatang % ids.length;
    ids.forEach((participantId, index) => { balances[participantId] -= base + (index < remainder ? 1 : 0); });
    balances[expense.payerId] += expense.amountSatang;
  }
  for (const settlement of settlements) {
    if (!(settlement.fromId in balances) || !(settlement.toId in balances)) continue;
    balances[settlement.fromId] += settlement.amountSatang;
    balances[settlement.toId] -= settlement.amountSatang;
  }
  const creditors = participants.map((p) => ({ id: p.id, amount: balances[p.id] || 0 })).filter((p) => p.amount > 0).sort((a,b) => b.amount-a.amount);
  const debtors = participants.map((p) => ({ id: p.id, amount: -(balances[p.id] || 0) })).filter((p) => p.amount > 0).sort((a,b) => b.amount-a.amount);
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amountSatang = Math.min(debtors[i].amount, creditors[j].amount);
    if (amountSatang > 0) transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amountSatang });
    debtors[i].amount -= amountSatang; creditors[j].amount -= amountSatang;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return { balances, transfers };
}
