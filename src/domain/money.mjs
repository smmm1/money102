export function parseMoneyCents(input) {
  const value = String(input ?? "").trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null
  const [whole, fraction = ""] = value.split(".")
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2))
  return Number.isSafeInteger(cents) ? cents : null
}

export function distributeCents(totalCents, participantIds) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) throw new RangeError("totalCents must be a non-negative integer")
  if (!Array.isArray(participantIds) || participantIds.length === 0) throw new RangeError("at least one participant is required")
  const each = Math.floor(totalCents / participantIds.length)
  const remainder = totalCents % participantIds.length
  return participantIds.map((_, index) => each + (index < remainder ? 1 : 0))
}

export function calculateNetBalances(participants, settlements = []) {
  const balances = new Map(participants.map(p => [p.id, p.paidCents - p.shareCents]))
  for (const settlement of settlements) {
    if (!balances.has(settlement.fromId) || !balances.has(settlement.toId)) continue
    balances.set(settlement.fromId, balances.get(settlement.fromId) + settlement.amountCents)
    balances.set(settlement.toId, balances.get(settlement.toId) - settlement.amountCents)
  }
  return balances
}

export function suggestSettlements(participants, settlements = []) {
  const balances = calculateNetBalances(participants, settlements)
  const debtors = participants.map(p => ({ id: p.id, amount: -(balances.get(p.id) || 0) })).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount)
  const creditors = participants.map(p => ({ id: p.id, amount: balances.get(p.id) || 0 })).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount)
  const result = []
  let ci = 0
  for (const debtor of debtors) {
    let remaining = debtor.amount
    while (remaining > 0 && ci < creditors.length) {
      const creditor = creditors[ci]
      const amountCents = Math.min(remaining, creditor.amount)
      if (amountCents > 0) result.push({ fromId: debtor.id, toId: creditor.id, amountCents })
      remaining -= amountCents
      creditor.amount -= amountCents
      if (creditor.amount === 0) ci += 1
    }
  }
  return result
}

export function sleepDurationHours(bedtime, wakeTime) {
  if (!/^\d{2}:\d{2}$/.test(bedtime || "") || !/^\d{2}:\d{2}$/.test(wakeTime || "")) return null
  const [bh, bm] = bedtime.split(":").map(Number)
  const [wh, wm] = wakeTime.split(":").map(Number)
  if (bh > 23 || wh > 23 || bm > 59 || wm > 59) return null
  let minutes = wh * 60 + wm - (bh * 60 + bm)
  if (minutes <= 0) minutes += 1440
  return minutes / 60
}

export function safeCsvCell(value) {
  const text = String(value ?? "")
  return /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text
}

export function calculateBillShares(totalCents, participantNames, mode = "equal", allocationValues = {}) {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new RangeError("totalCents must be a positive safe integer")
  if (!Array.isArray(participantNames) || participantNames.length < 2 || participantNames.some(name => typeof name !== "string" || !name.trim())) throw new RangeError("at least two named participants are required")
  if (new Set(participantNames.map(name => name.trim().toLocaleLowerCase())).size !== participantNames.length) throw new RangeError("participant names must be unique")
  if (mode === "equal") return distributeCents(totalCents, participantNames)
  if (mode === "fixed") {
    const shares = participantNames.map(name => parseMoneyCents(allocationValues[name]))
    if (shares.some(value => value === null) || shares.some(value => value < 0) || shares.reduce((sum, value) => sum + value, 0) !== totalCents) throw new RangeError("fixed shares must add up to the bill total")
    return shares
  }
  if (mode === "percentage") {
    const basisPoints = participantNames.map(name => {
      const value = String(allocationValues[name] ?? "").trim()
      if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null
      const percent = Number(value)
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null
      return Math.round(percent * 100)
    })
    if (basisPoints.some(value => value === null) || basisPoints.reduce((sum, value) => sum + value, 0) !== 10000) throw new RangeError("percentages must add up to 100")
    const shares = basisPoints.map(value => Number((BigInt(totalCents) * BigInt(value)) / 10000n))
    let remainder = totalCents - shares.reduce((sum, value) => sum + value, 0)
    for (let index = 0; remainder > 0; index = (index + 1) % shares.length, remainder--) shares[index]++
    return shares
  }
  throw new RangeError("unknown allocation mode")
}
