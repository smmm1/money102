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
}: {
  onClose: () => void
  onSave: (transaction: Omit<Transaction, "id" | "createdAt">) => void
}) {
  const [type, setType] = useState<Transaction["type"]>("income")
  const [amount, setAmount] = useState("")
  const [detail, setDetail] = useState("")
  const [date, setDate] = useState(dateKey())

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
        className="w-full rounded-t-[32px] bg-[#FCFAF3] p-6 shadow-2xl sm:max-w-[560px] sm:rounded-[32px] sm:p-8"
      >
        <div className="mb-7 flex items-start justify-between">
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
  const [editingGoal, setEditingGoal] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
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

  const saveGoal = () => {
    const nextGoal = Number(goalDraft)
    if (nextGoal > 0) {
      setGoal(nextGoal)
      localStorage.setItem("lamoon-saving-goal", String(nextGoal))
      setEditingGoal(false)
    }
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
        <div className="relative mb-10 flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-black/45">
              ภาพรวมการเงิน
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] text-[#263329] md:text-6xl">
              เงินของฉัน
            </h1>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#FFE6A9]">
            <MoneyIcon name="wallet" className="h-6 w-6" />
          </span>
        </div>
        <div className="relative grid gap-3 md:grid-cols-3">
          {[
            { label: "ยอดคงเหลือ", value: balance, tone: "text-[#263329]" },
            { label: "รายรับทั้งหมด", value: income, tone: "text-[#487453]" },
            { label: "รายจ่ายทั้งหมด", value: expense, tone: "text-[#B4533B]" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] bg-white/55 p-5 backdrop-blur"
            >
              <p className="text-xs font-medium text-black/50">{item.label}</p>
              <p
                className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${item.tone}`}
              >
                {formatMoney.format(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[30px] border border-[#E1DDCF] bg-white/60 p-6 md:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F4C96B]/40 text-[#71591B]">
              <MoneyIcon name="target" />
            </span>
            <div>
              <p className="text-sm text-[#858880]">เป้าหมายการออม</p>
              <p className="mt-0.5 text-xl font-semibold tracking-[-0.03em] text-[#263329]">
                {formatMoney.format(goal)}
              </p>
            </div>
          </div>
          {editingGoal ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="number"
                min="1"
                value={goalDraft}
                onChange={(event) => setGoalDraft(event.target.value)}
                className="h-10 w-36 rounded-full border border-[#DAD5C7] bg-white px-4 text-sm outline-none focus:border-[#829685]"
              />
              <button
                onClick={saveGoal}
                className="h-10 rounded-full bg-[#263329] px-4 text-sm text-white"
              >
                บันทึก
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="rounded-full border border-[#DCD7CA] px-4 py-2 text-xs font-medium text-[#626760] hover:bg-[#F4F1E8]"
            >
              แก้ไขเป้าหมาย
            </button>
          )}
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
                  onClick={() => setSelectedDate(active ? null : fullDate)}
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

      {modalOpen && (
        <TransactionModal
          onClose={() => setModalOpen(false)}
          onSave={saveTransaction}
        />
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
