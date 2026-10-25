export type SimulatorPortalId = "money" | "notes" | "health" | "split" | "pork"

export type SimulatorPortal = {
  id: SimulatorPortalId
  name: string
  label: string
  description: string
  symbol: string
  tone: "gold" | "lavender" | "rose" | "blue" | "green"
}

export const SIMULATOR_PORTALS: SimulatorPortal[] = [
  { id: "money", name: "บ้านการเงิน", label: "FINANCE HOUSE", description: "รายรับ รายจ่าย และเป้าหมายออมเงิน", symbol: "฿", tone: "gold" },
  { id: "notes", name: "คาเฟ่บันทึก", label: "MEMORY CAFE", description: "เปิดสมุดโน้ตและความคิดของคุณ", symbol: "✎", tone: "lavender" },
  { id: "health", name: "สวนสุขภาพ", label: "WELLNESS GARDEN", description: "บันทึกน้ำหนัก การออกกำลัง และสุขภาพ", symbol: "♡", tone: "rose" },
  { id: "split", name: "ตลาดหารบิล", label: "SPLIT MARKET", description: "คำนวณและจัดการบิลที่แชร์กัน", symbol: "÷", tone: "blue" },
  { id: "pork", name: "ลานหมูกระทะ", label: "PORK BBQ YARD", description: "บันทึกร้านและประวัติหมูกระทะ", symbol: "♨", tone: "green" },
]

export type SimulatorPortalSnapshot = {
  balance: number
  income: number
  expense: number
  transactionCount: number
  notesCount: number
  healthRecordCount: number
  latestWeight: number | null
  savingsGoal: number
}

export function formatWorldClock(hour: number) {
  return String(Math.max(0, Math.min(23, Math.floor(hour)))).padStart(2, "0") + ":00"
}

export function formatPortalCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

export function worldPhase(hour: number) {
  if (hour >= 5 && hour < 11) return "เช้า · เมืองกำลังตื่น"
  if (hour >= 11 && hour < 16) return "กลางวัน · ผู้คนออกมาทำกิจกรรม"
  if (hour >= 16 && hour < 20) return "เย็น · เมืองเริ่มคึกคัก"
  return "กลางคืน · เมืองพักผ่อน"
}
