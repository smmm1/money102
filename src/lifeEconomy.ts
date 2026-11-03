/**
 * Life-simulation household economy.
 * All amounts are nominal THB in the simulated year; market returns are fictional game
 * outcomes, not forecasts or investment advice. Prices and risk are deliberately noisy.
 */
export type AssetKind = "thai-stock" | "crypto"
export type MarketAsset = {
  id: string
  name: string
  kind: AssetKind
  price: number
  volatility: number
  history: number[]
}
export type Holding = { assetId: string; units: number; averageCost: number }
export type MoneyLedgerEntry = {
  year: number
  month: number
  kind: "income" | "expense" | "lottery" | "buy" | "sell" | "market"
  label: string
  amount: number
}
export type LifeEconomy = {
  cash: number
  monthlyIncome: number
  monthlyExpenses: number
  debt: number
  debtRate: number
  creditAccess: number
  financialKnowledge: number
  emergencyFundTarget: number
  holdings: Holding[]
  assets: MarketAsset[]
  ledger: MoneyLedgerEntry[]
  lastSimulatedMonth: number
  lotteryTickets: number
  totalLotterySpent: number
  totalLotteryWon: number
}
export type EconomyActionResult = { economy: LifeEconomy; ok: boolean; message: string }

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const roundBaht = (n: number) => Math.round(n * 100) / 100
const seeded = (seed: number) => {
  let x = seed | 0
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  return (x >>> 0) / 4294967296
}
const pushLedger = (e: LifeEconomy, entry: MoneyLedgerEntry): LifeEconomy => ({
  ...e, ledger: [entry, ...e.ledger].slice(0, 240)
})

export function createLifeEconomy(startingCash: number, monthlyIncome: number, monthlyExpenses: number, debt = 0): LifeEconomy {
  const assets: MarketAsset[] = [
    { id: "SET50", name: "กองทุนดัชนีหุ้นไทย (SET50)", kind: "thai-stock", price: 1000, volatility: 0.035, history: [1000] },
    { id: "BANK", name: "หุ้นธนาคารสมมติ", kind: "thai-stock", price: 100, volatility: 0.055, history: [100] },
    { id: "ENERGY", name: "หุ้นพลังงานสมมติ", kind: "thai-stock", price: 50, volatility: 0.075, history: [50] },
    { id: "BTC", name: "Bitcoin (จำลอง)", kind: "crypto", price: 1000000, volatility: 0.16, history: [1000000] },
    { id: "ETH", name: "Ethereum (จำลอง)", kind: "crypto", price: 60000, volatility: 0.19, history: [60000] }
  ]
  return {
    cash: roundBaht(Math.max(0, startingCash)), monthlyIncome: Math.max(0, monthlyIncome),
    monthlyExpenses: Math.max(0, monthlyExpenses), debt: Math.max(0, debt), debtRate: debt > 0 ? 0.12 : 0,
    creditAccess: 25, financialKnowledge: 10, emergencyFundTarget: Math.max(0, monthlyExpenses * 6),
    holdings: [], assets, ledger: [], lastSimulatedMonth: 0, lotteryTickets: 0,
    totalLotterySpent: 0, totalLotteryWon: 0
  }
}

/** Simulate one household month, with wage instability and inflation pressure. */
export function simulateEconomyMonth(input: LifeEconomy, absoluteMonth: number, seed: number): LifeEconomy {
  if (absoluteMonth <= input.lastSimulatedMonth) return input
  const r = seeded(seed + absoluteMonth * 7919)
  const wageFactor = r < 0.025 ? 0.55 : r < 0.12 ? 0.82 : r > 0.985 ? 1.12 : 1
  const income = roundBaht(input.monthlyIncome * wageFactor)
  const inflation = 0.001 + seeded(seed + absoluteMonth * 104729) * 0.004
  const expenses = roundBaht(input.monthlyExpenses * (1 + inflation))
  let next: LifeEconomy = { ...input, cash: input.cash + income - expenses, monthlyExpenses: expenses, lastSimulatedMonth: absoluteMonth }
  next = pushLedger(next, { year: Math.floor((absoluteMonth - 1) / 12), month: ((absoluteMonth - 1) % 12) + 1, kind: "income", label: wageFactor < 0.8 ? "รายได้ลดลง/งานสะดุด" : "รายได้ประจำ", amount: income })
  next = pushLedger(next, { year: Math.floor((absoluteMonth - 1) / 12), month: ((absoluteMonth - 1) % 12) + 1, kind: "expense", label: "ค่าครองชีพ", amount: -expenses })
  if (next.debt > 0) {
    const interest = roundBaht(next.debt * next.debtRate / 12)
    next.debt = roundBaht(next.debt + interest)
    next = pushLedger(next, { year: Math.floor((absoluteMonth - 1) / 12), month: ((absoluteMonth - 1) % 12) + 1, kind: "expense", label: "ดอกเบี้ยหนี้", amount: -interest })
  }
  return next
}

export function buyAsset(input: LifeEconomy, assetId: string, amount: number): EconomyActionResult {
  const asset = input.assets.find(a => a.id === assetId)
  if (!asset || !Number.isFinite(amount) || amount <= 0) return { economy: input, ok: false, message: "ไม่พบสินทรัพย์หรือจำนวนเงินไม่ถูกต้อง" }
  if (amount > input.cash) return { economy: input, ok: false, message: "เงินสดไม่พอ อย่าลงทุนด้วยเงินที่ต้องใช้จ่ายจำเป็น" }
  const units = amount / asset.price
  const old = input.holdings.find(h => h.assetId === assetId)
  const holdings = old
    ? input.holdings.map(h => h.assetId === assetId ? { ...h, units: h.units + units, averageCost: ((h.units * h.averageCost) + amount) / (h.units + units) } : h)
    : [...input.holdings, { assetId, units, averageCost: asset.price }]
  const economy = pushLedger({ ...input, cash: roundBaht(input.cash - amount), holdings, financialKnowledge: clamp(input.financialKnowledge + 1, 0, 100) }, { year: 0, month: 0, kind: "buy", label: `ซื้อ ${asset.name}`, amount: -amount })
  return { economy, ok: true, message: `ซื้อสำเร็จ ${units.toFixed(6)} หน่วย · ราคาตลาดจำลอง ${roundBaht(asset.price).toLocaleString("th-TH")} บาท` }
}

export function sellAsset(input: LifeEconomy, assetId: string, units: number): EconomyActionResult {
  const asset = input.assets.find(a => a.id === assetId)
  const holding = input.holdings.find(h => h.assetId === assetId)
  if (!asset || !holding || !Number.isFinite(units) || units <= 0 || units > holding.units) return { economy: input, ok: false, message: "จำนวนหน่วยที่ขายไม่ถูกต้อง" }
  const proceeds = roundBaht(units * asset.price)
  const holdings = input.holdings.map(h => h.assetId === assetId ? { ...h, units: h.units - units } : h).filter(h => h.units > 0.00000001)
  const economy = pushLedger({ ...input, cash: input.cash + proceeds, holdings }, { year: 0, month: 0, kind: "sell", label: `ขาย ${asset.name}`, amount: proceeds })
  return { economy, ok: true, message: `ขายสำเร็จ ได้รับเงิน ${proceeds.toLocaleString("th-TH")} บาท` }
}

/** Monthly market move: broad economic cycle plus asset-specific shocks. */
export function moveMarkets(input: LifeEconomy, absoluteMonth: number, seed: number): LifeEconomy {
  const cycle = Math.sin(absoluteMonth / 31) * 0.006 + Math.sin(absoluteMonth / 7) * 0.002
  const assets = input.assets.map((asset, index) => {
    const shock = (seeded(seed + absoluteMonth * 3571 + index * 97) - 0.5) * asset.volatility * 2
    const drawdown = seeded(seed + absoluteMonth * 6151 + index * 313) < (asset.kind === "crypto" ? 0.018 : 0.006)
      ? asset.volatility * (asset.kind === "crypto" ? 2.4 : 1.4) : 0
    const drift = asset.kind === "crypto" ? 0.001 : 0.0005
    const nextPrice = Math.max(asset.price * 0.08, asset.price * (1 + drift + cycle + shock - drawdown))
    return { ...asset, price: roundBaht(nextPrice), history: [...asset.history, roundBaht(nextPrice)].slice(-36) }
  })
  return { ...input, assets }
}

export function buyLotteryTickets(input: LifeEconomy, count: number, ticketPrice = 80): EconomyActionResult {
  const n = Math.floor(count)
  const cost = n * ticketPrice
  if (n < 1 || n > 20) return { economy: input, ok: false, message: "ซื้อได้ครั้งละ 1–20 ใบในเกม" }
  if (cost > input.cash) return { economy: input, ok: false, message: "เงินสดไม่พอสำหรับซื้อลอตเตอรี่" }
  const economy = pushLedger({ ...input, cash: input.cash - cost, lotteryTickets: input.lotteryTickets + n, totalLotterySpent: input.totalLotterySpent + cost }, { year: 0, month: 0, kind: "lottery", label: `ซื้อลอตเตอรี่ ${n} ใบ`, amount: -cost })
  return { economy, ok: true, message: `ซื้อลอตเตอรี่ ${n} ใบ ใช้เงิน ${cost.toLocaleString("th-TH")} บาท` }
}

/** Draw each ticket against the six-digit first prize and smaller prize classes. */
export function drawLottery(input: LifeEconomy, seed: number): EconomyActionResult {
  if (input.lotteryTickets <= 0) return { economy: input, ok: false, message: "ยังไม่มีสลากสำหรับงวดนี้" }
  let winnings = 0
  const n = input.lotteryTickets
  for (let i = 0; i < n; i++) {
    const r = seeded(seed + i * 65537)
    if (r < 1 / 1000000) winnings += 6000000
    else if (r < 1 / 1000000 + 2 / 100000) winnings += 100000
    else if (r < 1 / 1000000 + 2 / 100000 + 1 / 10000) winnings += 40000
    else if (r < 1 / 1000000 + 2 / 100000 + 1 / 10000 + 1 / 1000) winnings += 4000
    else if (r < 1 / 1000000 + 2 / 100000 + 1 / 10000 + 1 / 1000 + 1 / 100) winnings += 2000
    else if (r < 1 / 1000000 + 2 / 100000 + 1 / 10000 + 1 / 1000 + 1 / 100 + 1 / 100) winnings += 2000
  }
  winnings = roundBaht(winnings)
  const tickets = input.lotteryTickets
  const economy = pushLedger({ ...input, cash: input.cash + winnings, lotteryTickets: 0, totalLotteryWon: input.totalLotteryWon + winnings }, { year: 0, month: 0, kind: "lottery", label: `ผลสลาก ${tickets} ใบ`, amount: winnings })
  return { economy, ok: true, message: winnings > 0 ? `ถูกรางวัลรวม ${winnings.toLocaleString("th-TH")} บาท` : "งวดนี้ไม่ถูกรางวัล เงินที่ซื้อสลากถือเป็นค่าใช้จ่ายที่เสียไป" }
}

export function repayDebt(input: LifeEconomy, amount: number): EconomyActionResult {
  const payment = roundBaht(amount)
  if (!Number.isFinite(payment) || payment <= 0 || payment > input.cash || input.debt <= 0) return { economy: input, ok: false, message: "ยอดชำระไม่ถูกต้องหรือเงินสดไม่พอ" }
  const paid = Math.min(payment, input.debt)
  return { economy: pushLedger({ ...input, cash: input.cash - paid, debt: roundBaht(input.debt - paid) }, { year: 0, month: 0, kind: "expense", label: "ชำระหนี้", amount: -paid }), ok: true, message: `ชำระหนี้ ${paid.toLocaleString("th-TH")} บาท` }
}

export function borrowMoney(input: LifeEconomy, amount: number, annualRate: number): EconomyActionResult {
  const principal = roundBaht(amount)
  if (!Number.isFinite(principal) || principal <= 0 || principal > 1000000 || annualRate < 0.03 || annualRate > 0.36) return { economy: input, ok: false, message: "วงเงินหรืออัตราดอกเบี้ยอยู่นอกเงื่อนไขเกม" }
  const maxBorrow = Math.max(0, input.monthlyIncome * (input.creditAccess / 100) * 18 - input.debt)
  if (principal > maxBorrow) return { economy: input, ok: false, message: "รายได้และประวัติการเงินยังไม่รองรับวงเงินนี้" }
  const economy = pushLedger({ ...input, cash: input.cash + principal, debt: input.debt + principal, debtRate: annualRate, creditAccess: clamp(input.creditAccess + 1, 0, 100) }, { year: 0, month: 0, kind: "income", label: `กู้เงิน อัตราดอกเบี้ย ${(annualRate * 100).toFixed(1)}% ต่อปี`, amount: principal })
  return { economy, ok: true, message: `ได้รับเงินกู้ ${principal.toLocaleString("th-TH")} บาท · มีภาระดอกเบี้ยต่อเนื่อง` }
}

export function netWorth(input: LifeEconomy): number {
  const assetsValue = input.holdings.reduce((sum, holding) => {
    const asset = input.assets.find(a => a.id === holding.assetId)
    return sum + (asset?.price ?? 0) * holding.units
  }, 0)
  return roundBaht(input.cash + assetsValue - input.debt)
}

export function financialChoices(input: LifeEconomy): Array<{ id: string; label: string; description: string; enabled: boolean; reason?: string }> {
  return [
    { id: "save", label: "เก็บเงินสำรอง", description: "กันเงินไว้รับมือเจ็บป่วย ตกงาน หรือเหตุฉุกเฉิน", enabled: input.cash > 0 },
    { id: "lottery", label: "ซื้อลอตเตอรี่", description: "ลุ้นรางวัล แต่โอกาสเสียเงินสูงกว่าถูกรางวัลใหญ่", enabled: input.cash >= 80 },
    { id: "stocks", label: "ลงทุนหุ้นไทย", description: "ราคาผันผวน มีความเสี่ยงขาดทุนและไม่รับประกันผลตอบแทน", enabled: input.cash >= 100 },
    { id: "crypto", label: "ซื้อคริปโต", description: "ผันผวนสูงมาก อาจสูญเสียเงินลงทุนส่วนใหญ่", enabled: input.cash >= 100 },
    { id: "trading", label: "เทรดระยะสั้น", description: "ซื้อขายบ่อย มีต้นทุนและความเสี่ยงจากการจับจังหวะตลาด", enabled: input.cash >= 1000 },
    { id: "debt", label: "กู้เงิน/จัดการหนี้", description: "เพิ่มสภาพคล่องวันนี้ แต่สร้างดอกเบี้ยและภาระในอนาคต", enabled: input.creditAccess > 0 }
  ]
}
