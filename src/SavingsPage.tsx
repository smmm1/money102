import { useEffect, useState, type FormEvent, type ReactNode } from "react"

type Transaction = {
  id: string
  type: "income" | "expense"
  amount: number
  detail: string
  date: string
  createdAt: number
}

function MoneyIcon({
  name,
  className = "h-5 w-5",
}: {
  name: "arrow" | "plus" | "wallet" | "target" | "calendar" | "close"
  className?: string
}) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2V6.5Z" />
        <path d="M4 8h17M16 12h5v4h-5a2 2 0 1 1 0-4Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="m14 10 6-6M16 4h4v4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

const formatMoney = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
})

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function TransactionModal({
  onClose,
  onSave,
  initialDate = dateKey(),
  compact = false,
}: {
  onClose: () => void
  onSave: (transaction: Omit<Transaction, "id" | "createdAt">) => void
  initialDate?: string
  compact?: boolean
}) {
  const [type, setType] = useState<Transaction["type"]>("income")
  const [amount, setAmount] = useState("")
  const [detail, setDetail] = useState("")
  const [date, setDate] = useState(initialDate)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose()
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0 || !detail.trim()) return
    onSave({ type, amount: parsedAmount, detail: detail.trim(), date })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-[#172019]/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-title"
        className={`w-full rounded-t-[32px] bg-[#FCFAF3] p-5 shadow-2xl sm:rounded-[28px] sm:p-6 ${compact ? "sm:max-w-[430px]" : "sm:max-w-[560px] sm:p-8"}`}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#E2734B]">
              รายการใหม่
            </p>
            <h2
              id="transaction-title"
              className="text-2xl font-semibold tracking-[-0.04em] text-[#263329]"
            >
              บันทึกเงิน
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#F0ECE1] text-[#70736D] hover:bg-[#E7E1D4]"
            aria-label="ปิด"
          >
            <MoneyIcon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {(["income", "expense"] as const).map((option) => {
              const active = type === option
              const income = option === "income"
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={`rounded-[20px] border p-4 text-left transition-all ${
                    active
                      ? income
                        ? "border-[#73987B] bg-[#DCEBDF]"
                        : "border-[#D27B62] bg-[#F8DDD4]"
                      : "border-[#E2DED2] bg-white/60 hover:border-[#C9C5BA]"
                  }`}
                >
                  <span
                    className={`mb-3 grid h-9 w-9 place-items-center rounded-full text-lg ${
                      active
                        ? income
                          ? "bg-[#73987B] text-white"
                          : "bg-[#D27B62] text-white"
                        : "bg-[#F0EDE5] text-[#747871]"
                    }`}
                  >
                    {income ? "+" : "−"}
                  </span>
                  <span className="block font-semibold text-[#263329]">
                    {income ? "รายรับ" : "รายจ่าย"}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#858880]">
                    {income ? "เงินที่ได้รับเข้ามา" : "เงินที่จ่ายออกไป"}
                  </span>
                </button>
              )
            })}
          </div>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-[#4C554D]">
              จำนวนเงิน
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-[#858880]">
                ฿
              </span>
              <input
                autoFocus
                required
                min="1"
                step="0.01"
                inputMode="decimal"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="h-14 w-full rounded-2xl border border-[#DEDACF] bg-white pl-10 pr-4 text-xl font-semibold outline-none transition focus:border-[#829685] focus:ring-4 focus:ring-[#829685]/10"
              />
            </div>
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-[#4C554D]">
              รายละเอียด
            </span>
            <input
              required
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder={
                type === "income"
                  ? "เช่น เงินเดือน, ขายสินค้า"
                  : "เช่น ค่าอาหาร, ค่าเดินทาง"
              }
              className="h-14 w-full rounded-2xl border border-[#DEDACF] bg-white px-4 outline-none transition focus:border-[#829685] focus:ring-4 focus:ring-[#829685]/10"
            />
          </label>

          <label className="mb-7 block">
            <span className="mb-2 block text-sm font-medium text-[#4C554D]">
              วันที่
            </span>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-14 w-full rounded-2xl border border-[#DEDACF] bg-white px-4 outline-none transition focus:border-[#829685] focus:ring-4 focus:ring-[#829685]/10"
            />
          </label>

          <button
            type="submit"
            className="h-14 w-full rounded-full bg-[#263329] font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            บันทึกรายการ
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SavingsPage({ onBack }: { onBack: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lamoon-transactions") || "[]")
    } catch {
      return []
    }
  })
  const [goal, setGoal] = useState(
    () => Number(localStorage.getItem("lamoon-saving-goal")) || 20000,
  )
  const [goalDraft, setGoalDraft] = useState(String(goal))
  const [goalTitle, setGoalTitle] = useState(() => localStorage.getItem("lamoon-saving-goal-title") || "เป้าหมายการออม")
  const [goalTitleDraft, setGoalTitleDraft] = useState(goalTitle)
  const [editingGoal, setEditingGoal] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [quickDate, setQuickDate] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState("")
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const balance = income - expense
  const goalProgress = Math.max(0, Math.min((balance / goal) * 100, 100))

  const saveTransaction = (
    transaction: Omit<Transaction, "id" | "createdAt">,
  ) => {
    const updated = [
      ...transactions,
      { ...transaction, id: crypto.randomUUID(), createdAt: Date.now() },
    ]
    setTransactions(updated)
    localStorage.setItem("lamoon-transactions", JSON.stringify(updated))
    setModalOpen(false)
    setSelectedDate(transaction.date)
    const savedDate = new Date(`${transaction.date}T12:00:00`)
    setCalendarMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1))
  }

  const saveGoal = (event: FormEvent) => {
    event.preventDefault()
    const nextGoal = Number(goalDraft)
    const nextTitle = goalTitleDraft.trim()
    if (nextGoal > 0 && nextTitle) {
      setGoal(nextGoal)
      setGoalTitle(nextTitle)
      localStorage.setItem("lamoon-saving-goal", String(nextGoal))
      localStorage.setItem("lamoon-saving-goal-title", nextTitle)
      setEditingGoal(false)
    }
  }

  const exportCsv = () => {
    const rows = [["วันที่", "ประเภท", "รายละเอียด", "จำนวนเงิน"], ...filteredHistory.map((item) => [item.date, item.type === "income" ? "รายรับ" : "รายจ่าย", item.detail, String(item.amount)])]
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `ประวัติออมเงิน-${dateKey()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const year = calendarMonth.getFullYear()
  const month = calendarMonth.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const recordedDates = new Set(
    transactions.map((transaction) => transaction.date),
  )
  const history = [...transactions]
    .filter((transaction) => !selectedDate || transaction.date === selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const filteredHistory = [...transactions]
    .filter((transaction) => {
      const query = historySearch.trim().toLocaleLowerCase()
      return !query || [transaction.date, transaction.detail, transaction.type === "income" ? "รายรับ" : "รายจ่าย", String(transaction.amount)].some((value) => value.toLocaleLowerCase().includes(query))
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const groupedHistory = history.reduce<Record<string, Transaction[]>>(
    (groups, transaction) => {
      ;(groups[transaction.date] ||= []).push(transaction)
      return groups
    },
    {},
  )

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-7 md:px-8 md:pt-12">
      <div className="mb-7">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6F736C] hover:text-[#263329]"
        >
          <MoneyIcon name="arrow" className="h-4 w-4 rotate-180" />
          กลับหน้าหลัก
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[36px] bg-[#F4C96B] p-7 md:p-10">
        <span className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-black/10" />
        <div className="relative mb-8 flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-black/55">
              ยอดคงเหลือ
            </p>
            <h1 className="inline-block rounded-[18px] border border-white/45 bg-black/[0.06] px-4 py-2 text-4xl font-extrabold tracking-[-0.055em] text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] md:px-5 md:py-2.5 md:text-6xl">
              {formatMoney.format(balance)}
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#FFE6A9]">
              <MoneyIcon name="wallet" className="h-6 w-6" />
            </span>
            <button onClick={() => setHistoryOpen(true)} className="rounded-full border border-[#263329]/20 bg-white/70 px-4 py-2 text-sm font-medium text-[#263329] transition hover:bg-white">
              ดูประวัติทั้งหมด
            </button>
          </div>
        </div>
        <div className="relative grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/50 bg-white/65 p-4 shadow-[0_3px_8px_rgba(0,0,0,0.12)] md:p-5">
            <p className="text-sm font-semibold text-[#487453] md:text-base">รายรับทั้งหมด</p>
            <p className="mt-1 inline-block rounded-[12px] border border-white/45 bg-[#263329] px-3 py-1.5 text-xl font-bold tracking-[-0.035em] text-white shadow-[0_3px_8px_rgba(0,0,0,0.22)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] md:text-2xl">{formatMoney.format(income)}</p>
          </div>
          <div className="rounded-[20px] border border-white/50 bg-white/65 p-4 shadow-[0_3px_8px_rgba(0,0,0,0.12)] md:p-5">
            <p className="text-sm font-semibold text-[#B4533B] md:text-base">รายจ่ายทั้งหมด</p>
            <p className="mt-1 inline-block rounded-[12px] border border-white/45 bg-[#263329] px-3 py-1.5 text-xl font-bold tracking-[-0.035em] text-white shadow-[0_3px_8px_rgba(0,0,0,0.22)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] md:text-2xl">{formatMoney.format(expense)}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[30px] border border-[#E1DDCF] bg-white/60 p-6 md:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F4C96B]/40 text-[#71591B]">
              <MoneyIcon name="target" />
            </span>
            <div>
              <p className="text-sm text-[#858880]">{goalTitle}</p>
              <p className="mt-0.5 text-xl font-semibold tracking-[-0.03em] text-[#263329]">
                {formatMoney.format(goal)}
              </p>
            </div>
          </div>
          <button onClick={() => { setGoalTitleDraft(goalTitle); setGoalDraft(String(goal)); setEditingGoal(true) }} className="rounded-full border border-[#DCD7CA] bg-white/70 px-4 py-2 text-xs font-medium text-[#626760] transition hover:bg-[#F7F0D9]">แก้ไขเป้าหมาย</button>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-[#EAE6DB]">
          <div
            className="goal-progress h-full rounded-full bg-gradient-to-r from-[#E4A83A] to-[#7CA082]"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-[#858880]">
          <span>ออมแล้ว {formatMoney.format(Math.max(balance, 0))}</span>
          <span>{Math.round(goalProgress)}% ของเป้าหมาย</span>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[30px] border border-[#E1DDCF] bg-white/60 p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#E2734B]">ปฏิทินบันทึก</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#263329]">
                {new Intl.DateTimeFormat("th-TH", {
                  month: "long",
                  year: "numeric",
                }).format(calendarMonth)}
              </h2>
            </div>
            <div className="flex gap-2">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  aria-label={direction < 0 ? "เดือนก่อนหน้า" : "เดือนถัดไป"}
                  onClick={() =>
                    setCalendarMonth(new Date(year, month + direction, 1))
                  }
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#DFDBCF] text-[#6E726B] hover:bg-[#F2EEE4]"
                >
                  <MoneyIcon
                    name="arrow"
                    className={`h-4 w-4 ${direction < 0 ? "rotate-180" : ""}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-[#989A93]">
            {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
              <span key={day} className="py-2">
                {day}
              </span>
            ))}
            {calendarCells.map((day, index) => {
              const fullDate = day
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : ""
              const hasRecord = recordedDates.has(fullDate)
              const active = selectedDate === fullDate
              return day ? (
                <button
                  key={fullDate}
                  onClick={() => { setSelectedDate(fullDate); setQuickDate(fullDate) }}
                  className={`relative mx-auto my-1 grid h-9 w-9 place-items-center rounded-full text-sm ${
                    active
                      ? "bg-[#263329] text-white"
                      : "text-[#485048] hover:bg-[#F1EEE5]"
                  }`}
                >
                  {day}
                  {hasRecord && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        active ? "bg-[#F4C96B]" : "bg-[#E2734B]"
                      }`}
                    />
                  )}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              )
            })}
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-[#E7E2D7] pt-4 text-xs text-[#858880]">
            <span className="h-2 w-2 rounded-full bg-[#E2734B]" />
            วันที่มีการบันทึกรายการ
          </div>
        </div>

        <div className="rounded-[30px] border border-[#E1DDCF] bg-white/60 p-5 md:p-7">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#E2734B]">
                ตรวจสอบย้อนหลัง
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#263329]">
                {selectedDate ? "รายการในวันที่เลือก" : "ประวัติทั้งหมด"}
              </h2>
            </div>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs font-medium text-[#777B74] underline underline-offset-4"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>

          {Object.keys(groupedHistory).length ? (
            <div className="max-h-[430px] space-y-7 overflow-y-auto pr-1">
              {Object.entries(groupedHistory).map(([date, items]) => (
                <div key={date}>
                  <div className="mb-3 flex items-center gap-3">
                    <p className="shrink-0 text-xs font-semibold text-[#6B7069]">
                      {new Intl.DateTimeFormat("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(`${date}T12:00:00`))}
                    </p>
                    <span className="h-px flex-1 bg-[#E4E0D5]" />
                  </div>
                  <div className="space-y-2">
                    {items.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-4"
                      >
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-medium ${
                            transaction.type === "income"
                              ? "bg-[#DCEBDF] text-[#487453]"
                              : "bg-[#F8DDD4] text-[#B4533B]"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "−"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#3D463E]">
                            {transaction.detail}
                          </p>
                          <p className="mt-0.5 text-xs text-[#969890]">
                            {transaction.type === "income" ? "รายรับ" : "รายจ่าย"}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            transaction.type === "income"
                              ? "text-[#487453]"
                              : "text-[#B4533B]"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "−"}
                          {formatMoney.format(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div>
                <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#F0EDE4] text-[#898C85]">
                  <MoneyIcon name="calendar" className="h-6 w-6" />
                </span>
                <p className="font-medium text-[#4D554E]">
                  {selectedDate ? "วันนี้ยังไม่มีรายการ" : "ยังไม่มีประวัติการบันทึก"}
                </p>
                <p className="mt-1 text-sm text-[#92958D]">
                  กด “บันทึกเงิน” เพื่อเพิ่มรายการแรก
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {editingGoal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#172019]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setEditingGoal(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="goal-edit-title" className="w-full max-w-[390px] rounded-[26px] border border-[#E1DDCF] bg-[#FCFAF3] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B18A2E]">เป้าหมายการออม</p><h2 id="goal-edit-title" className="mt-1 text-xl font-semibold text-[#263329]">แก้ไขเป้าหมาย</h2></div>
              <button type="button" onClick={() => setEditingGoal(false)} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full bg-[#F0ECE1] text-[#70736D]"><MoneyIcon name="close" className="h-4 w-4" /></button>
            </div>
            <form onSubmit={saveGoal} className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-[#4C554D]">ชื่อเป้าหมาย</span><input autoFocus required maxLength={60} value={goalTitleDraft} onChange={(event) => setGoalTitleDraft(event.target.value)} className="h-12 w-full rounded-2xl border border-[#DEDACF] bg-white px-4 text-sm outline-none focus:border-[#B79A50] focus:ring-4 focus:ring-[#F4C96B]/20" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-[#4C554D]">ยอดเงินที่ต้องการ</span><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#858880]">฿</span><input required type="number" min="1" step="1" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="h-12 w-full rounded-2xl border border-[#DEDACF] bg-white pl-9 pr-4 text-base font-semibold outline-none focus:border-[#B79A50] focus:ring-4 focus:ring-[#F4C96B]/20" /></div></label>
              <div className="flex gap-2 pt-1"><button type="button" onClick={() => setEditingGoal(false)} className="h-11 flex-1 rounded-full border border-[#DEDACF] bg-white text-sm text-[#626760]">ยกเลิก</button><button type="submit" className="h-11 flex-1 rounded-full bg-[#263329] text-sm font-medium text-white hover:bg-[#334437]">บันทึกเป้าหมาย</button></div>
            </form>
          </section>
        </div>
      )}
      {modalOpen && (
        <TransactionModal
          onClose={() => setModalOpen(false)}
          onSave={saveTransaction}
        />
      )}
      {quickDate && (
        <TransactionModal
          compact
          initialDate={quickDate}
          onClose={() => setQuickDate(null)}
          onSave={(transaction) => { saveTransaction(transaction); setQuickDate(null) }}
        />
      )}
      {historyOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#172019]/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setHistoryOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="history-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[#DEDACF] bg-[#FCFAF3] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2D7] p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E2734B]">ออมเงิน</p>
                <h2 id="history-title" className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#263329]">ประวัติการเงินทั้งหมด</h2>
              </div>
              <button onClick={() => setHistoryOpen(false)} aria-label="ปิดประวัติ" className="grid h-10 w-10 place-items-center rounded-full bg-[#F0ECE1] text-[#70736D] hover:bg-[#E7E1D4]"><MoneyIcon name="close" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-5 sm:px-6">
              <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="ค้นหาวันที่ รายละเอียด ประเภท หรือจำนวนเงิน..." className="h-11 min-w-[220px] flex-1 rounded-full border border-[#DEDACF] bg-white px-4 text-sm outline-none focus:border-[#829685]" />
              <button onClick={exportCsv} className="h-11 rounded-full bg-[#263329] px-5 text-sm font-medium text-white transition hover:bg-[#334437]">ดาวน์โหลด CSV</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 pb-5 sm:px-6">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[#F0ECE1] text-xs text-[#6F736C]">
                  <tr><th className="border-b border-[#DEDACF] px-4 py-3 font-semibold">วันที่</th><th className="border-b border-[#DEDACF] px-4 py-3 font-semibold">ประเภท</th><th className="border-b border-[#DEDACF] px-4 py-3 font-semibold">รายละเอียด</th><th className="border-b border-[#DEDACF] px-4 py-3 text-right font-semibold">จำนวนเงิน</th></tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="border-b border-[#E7E2D7] hover:bg-[#F5F2E9]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#6F736C]">{item.date}</td>
                      <td className={`whitespace-nowrap px-4 py-3 font-medium ${item.type === "income" ? "text-[#487453]" : "text-[#B4533B]"}`}>{item.type === "income" ? "รายรับ" : "รายจ่าย"}</td>
                      <td className="px-4 py-3 text-[#263329]">{item.detail}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#263329]">{item.type === "income" ? "+" : "−"}{formatMoney.format(item.amount)}</td>
                    </tr>
                  ))}
                  {!filteredHistory.length && <tr><td colSpan={4} className="px-4 py-12 text-center text-[#858880]">ไม่พบรายการที่ตรงกับคำค้น</td></tr>}
                </tbody>
                <tfoot className="sticky bottom-0 bg-[#F0ECE1]"><tr><td colSpan={3} className="px-4 py-3 text-sm font-semibold text-[#263329]">รวม {filteredHistory.length} รายการ</td><td className="px-4 py-3 text-right text-xs text-[#6F736C]">รายรับ {formatMoney.format(filteredHistory.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0))} · รายจ่าย {formatMoney.format(filteredHistory.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0))}</td></tr></tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
      <button
        onClick={() => setModalOpen(true)}
        aria-label="บันทึกเงิน"
        title="บันทึกเงิน"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#263329] text-white shadow-[0_14px_35px_rgba(38,51,41,0.3)] transition-all hover:-translate-y-1 hover:scale-105 hover:bg-[#334437] md:bottom-9 md:right-9 md:h-[72px] md:w-[72px]"
      >
        <MoneyIcon name="plus" className="h-6 w-6 md:h-8 md:w-8" />
      </button>
    </main>
  )
}
