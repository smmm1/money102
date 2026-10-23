import { useEffect, useState, type ReactNode } from "react"
import SavingsPage from "./SavingsPage"
import NotesPage from "./NotesPage"
import WorkspaceEditor from "./WorkspaceEditor"
import CloudAuth, { AccountMenu } from "./CloudAuth"

type Page = "home" | "saving" | "health" | "notes"

const pageTitles: Record<Page, string> = {
  home: "หน้าหลัก",
  saving: "ออมเงิน",
  health: "สุขภาพ",
  notes: "โน้ต",
}

function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: "arrow" | "bank" | "heart" | "note" | "sparkle" | "plus" | "check" | "home"
  className?: string
}) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bank: (
      <>
        <path d="M4 10h16" />
        <path d="M5.5 10v7M9.8 10v7M14.2 10v7M18.5 10v7M3 20h18" />
        <path d="m12 3 9 4H3l9-4Z" />
      </>
    ),
    heart: (
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    note: (
      <>
        <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.2 3.4L16.5 8l-3.3 1.4L12 13l-1.2-3.6L7.5 8l3.3-1.6L12 3Z" />
        <path d="m18.5 14 .7 2.1 2.1.9-2.1.9-.7 2.1-.8-2.1-2-.9 2-.9.8-2.1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
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

function Logo() {
  return (
    <button
      className="group flex items-center gap-3"
      onClick={() => navigate("home")}
      aria-label="กลับหน้าหลัก"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#263329] text-[#F9F7EF] transition-transform group-hover:-rotate-3">
        <Icon name="sparkle" className="h-5 w-5" />
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.04em] text-[#263329]">
        ละมุน
      </span>
    </button>
  )
}

function navigate(page: Page) {
  window.location.hash = page === "home" ? "" : page
}

function Header({ current, onOpenSearch }: { current: Page; onOpenSearch: () => void }) {
  return (
    <header data-workspace-id="site-header" className="sticky top-0 z-30 mx-auto flex w-full max-w-[1180px] items-center justify-between border-b border-[#E2DED1]/70 bg-[#FCFBF7]/85 px-5 py-3 backdrop-blur-xl md:px-8 md:py-4">
      <Logo />
      <nav data-workspace-id="desktop-nav" aria-label="เมนูหลัก" className="hidden items-center gap-1 rounded-full border border-[#E2DED1] bg-white/70 p-1.5 backdrop-blur md:flex">
        {(Object.keys(pageTitles) as Page[]).map((page) => (
          <button
            key={page}
            data-workspace-id={`desktop-nav-${page}`}
            onClick={() => navigate(page)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              current === page
                ? page === "saving" ? "bg-[#52785B] text-white" : page === "health" ? "bg-[#B96E69] text-white" : page === "notes" ? "bg-[#B68A43] text-white" : "bg-[#263329] text-white"
                : "text-[#6D716B] hover:bg-white hover:text-[#263329]"
            }`}
          >
            {pageTitles[page]}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button onClick={onOpenSearch} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E2DED1] bg-white/75 px-3 text-sm text-[#6D716B] transition hover:border-[#C9C4B5] hover:bg-white" aria-label="ค้นหาและไปยังหน้า (Ctrl/⌘ K)">
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
          <span className="hidden lg:inline">ค้นหา</span><kbd className="hidden rounded-md bg-[#F3F0E7] px-1.5 py-0.5 text-[10px] text-[#858880] lg:inline">⌘ K</kbd>
        </button>
        <AccountMenu />
      </div>
    </header>
  )
}

const sections = [
  {
    id: "saving" as const,
    eyebrow: "เป้าหมายการเงิน",
    title: "ออมเงิน",
    description: "วางแผนเล็ก ๆ เพื่อเป้าหมายที่ใหญ่ขึ้น",
    icon: "bank" as const,
    color: "bg-[#E6F0E7]",
    iconBg: "bg-[#D5E4D6]",
  },
  {
    id: "health" as const,
    eyebrow: "ดูแลตัวเอง",
    title: "สุขภาพ",
    description: "ติดตามน้ำหนักและการเคลื่อนไหวของคุณ",
    icon: "heart" as const,
    color: "bg-[#F8E5E3]",
    iconBg: "bg-[#F0CECB]",
  },
  {
    id: "notes" as const,
    eyebrow: "พื้นที่ความคิด",
    title: "โน้ต",
    description: "เก็บไอเดีย ความทรงจำ และเรื่องสำคัญ",
    icon: "note" as const,
    color: "bg-[#F8EED7]",
    iconBg: "bg-[#F0DCA9]",
  },
]

type HomeSnapshot = {
  income: number
  expense: number
  monthIncome: number
  monthExpense: number
  goal: number
  goalStartBalance: number
  healthWeight: number | null
  todayExerciseCount: number
  todayWellness: boolean
  notesCount: number
  pinnedCount: number
  lastNoteTitle: string
}

const EMPTY_HOME_SNAPSHOT: HomeSnapshot = {
  income: 0,
  expense: 0,
  monthIncome: 0,
  monthExpense: 0,
  goal: 20000,
  goalStartBalance: 0,
  healthWeight: null,
  todayExerciseCount: 0,
  todayWellness: false,
  notesCount: 0,
  pinnedCount: 0,
  lastNoteTitle: "",
}

function readHomeSnapshot(): HomeSnapshot {
  const snapshot = { ...EMPTY_HOME_SNAPSHOT }
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const monthPrefix = today.slice(0, 7)

  try {
    const transactions = JSON.parse(localStorage.getItem("lamoon-transactions") || "[]") as {
      type: "income" | "expense"; amount: number; date?: string
    }[]
    snapshot.income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0)
    snapshot.expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0)
    snapshot.monthIncome = transactions.filter((item) => item.date?.startsWith(monthPrefix) && item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0)
    snapshot.monthExpense = transactions.filter((item) => item.date?.startsWith(monthPrefix) && item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0)
    snapshot.goal = Number(localStorage.getItem("lamoon-saving-goal")) || 20000
    snapshot.goalStartBalance = Number(localStorage.getItem("lamoon-saving-goal-start-balance")) || 0
  } catch {}

  try {
    const health = JSON.parse(localStorage.getItem("lamoon-health-dashboard-v1") || "null") as {
      profiles?: { id: string; name: string; height: number; age: number }[]
      activeProfileId?: string
      records?: { profileId: string; date: string; type: string; weight?: number; exercise?: string }[]
    } | null
    if (health) {
      const profile = health.profiles?.find((item) => item.id === health.activeProfileId) || health.profiles?.[0]
      const records = (health.records || []).filter((item) => !profile || item.profileId === profile.id).sort((a, b) => b.date.localeCompare(a.date))
      const latestWeight = records.find((item) => item.type === "weight" && typeof item.weight === "number")
      snapshot.healthWeight = latestWeight?.weight ?? null
      snapshot.todayExerciseCount = records.filter((item) => item.type === "exercise" && item.date === today).length
      snapshot.todayWellness = records.some((item) => item.type === "wellness" && item.date === today)
    }
  } catch {}

  try {
    const notes = JSON.parse(localStorage.getItem("lamoon-commonplace-notes-v1") || "[]") as {
      title?: string; pinned?: boolean; updatedAt?: string
    }[]
    snapshot.notesCount = notes.length
    snapshot.pinnedCount = notes.filter((item) => item.pinned).length
    snapshot.lastNoteTitle = [...notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0]?.title || ""
  } catch {}

  return snapshot
}

type HomeSectionId = (typeof sections)[number]["id"]
type HomeLayout = { order: HomeSectionId[]; hidden: HomeSectionId[] }
const DEFAULT_HOME_LAYOUT: HomeLayout = {
  order: sections.map((section) => section.id),
  hidden: [],
}

function readHomeLayout(): HomeLayout {
  try {
    const saved = JSON.parse(localStorage.getItem("lamoon-home-layout-v1") || "null") as Partial<HomeLayout> | null
    if (saved) {
      const validIds = sections.map((section) => section.id)
      const order = Array.isArray(saved.order)
        ? [...saved.order.filter((id): id is HomeSectionId => validIds.includes(id as HomeSectionId)), ...validIds.filter((id) => !saved.order!.includes(id))]
        : [...validIds]
      const hidden = Array.isArray(saved.hidden)
        ? saved.hidden.filter((id): id is HomeSectionId => validIds.includes(id as HomeSectionId))
        : []
      return { order, hidden }
    }
  } catch {}
  return { order: [...DEFAULT_HOME_LAYOUT.order], hidden: [] }
}

function Home() {
  const [now, setNow] = useState(() => new Date())
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(readHomeSnapshot)
  const [layout, setLayout] = useState<HomeLayout>(readHomeLayout)
  const [customizing, setCustomizing] = useState(false)
  const visibleSections = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id) => sections.find((section) => section.id === id)!)
  const moveSection = (id: HomeSectionId, direction: -1 | 1) => {
    setLayout((current) => {
      const order = [...current.order]
      const index = order.indexOf(id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= order.length) return current
      ;[order[index], order[next]] = [order[next], order[index]]
      return { ...current, order }
    })
  }
  const toggleSection = (id: HomeSectionId, checked: boolean) => {
    setLayout((current) => ({
      ...current,
      hidden: checked ? current.hidden.filter((item) => item !== id) : [...current.hidden, id],
    }))
  }
  const today = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now)
  const money = (amount: number) => new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(amount)
  const monthNet = snapshot.monthIncome - snapshot.monthExpense
  const currentBalance = snapshot.income - snapshot.expense
  const goalProgress = Math.max(0, currentBalance - snapshot.goalStartBalance)
  const savingPercent = Math.max(0, Math.min(Math.round((goalProgress / snapshot.goal) * 100), 100))

  useEffect(() => {
    localStorage.setItem("lamoon-home-layout-v1", JSON.stringify(layout))
  }, [layout])

  useEffect(() => {
    const refresh = () => {
      setSnapshot(readHomeSnapshot())
      setNow(new Date())
    }
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("lamoon-")) refresh()
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    const clock = window.setInterval(() => setNow(new Date()), 60_000)
    refresh()
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
      window.clearInterval(clock)
    }
  }, [])

  const cardDetails: Record<(typeof sections)[number]["id"], string> = {
    saving: snapshot.income + snapshot.expense > 0
      ? `เดือนนี้รับเข้า ${money(snapshot.monthIncome)} · จ่ายออก ${money(snapshot.monthExpense)}`
      : "ยังไม่มีรายการเงินของเดือนนี้",
    health: snapshot.healthWeight !== null
      ? `น้ำหนักล่าสุด ${snapshot.healthWeight} กก. · วันนี้ออกกำลัง ${snapshot.todayExerciseCount} ครั้ง`
      : snapshot.todayExerciseCount > 0
        ? `วันนี้ออกกำลัง ${snapshot.todayExerciseCount} ครั้ง`
        : "ยังไม่มีข้อมูลสุขภาพ",
    notes: snapshot.notesCount > 0
      ? `${snapshot.notesCount} โน้ต · ปักหมุด ${snapshot.pinnedCount} รายการ`
      : "สมุดยังว่าง เริ่มเก็บความคิดได้เลย",
  }

  return (
    <main>
      <section className="mx-auto max-w-[1180px] px-5 pb-10 pt-8 md:px-8 md:pb-16 md:pt-16">
        <div data-workspace-id="home-welcome" className="mb-12 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[#70746E]">
              <span className="h-2 w-2 rounded-full bg-[#E8885C]" />
              {today}
            </div>
            <h1 className="text-[clamp(2.8rem,7vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-[#263329]">
              ยินดี
              <br />
              <span className="font-light italic text-[#52785B]">ต้อนรับ</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#777C73]">
              ภาพรวมจากข้อมูลที่คุณบันทึกไว้ อัปเดตเมื่อกลับมาใช้งานหรือมีการเปลี่ยนแปลงข้อมูล
            </p>
          </div>
          <div data-workspace-id="home-snapshot" className="rounded-[30px] border border-[#DED9CA] bg-white/60 p-6 shadow-[0_18px_60px_rgba(48,52,43,0.06)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#96988F]">ภาพรวมของคุณ</p>
                <p className="mt-1 text-lg font-semibold text-[#263329]">ข้อมูลล่าสุด</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#E6F0E7] text-[#52785B]">
                <Icon name="sparkle" className="h-5 w-5" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#F5F2E9] px-3 py-3.5">
                <p className="font-semibold text-[#263329]">{snapshot.goal > 0 && (snapshot.income + snapshot.expense > 0 || snapshot.goalStartBalance > 0) ? `${savingPercent}%` : "—"}</p>
                <p className="mt-0.5 text-xs text-[#83857D]">เป้าเงินเดือนนี้</p>
              </div>
              <div className="rounded-2xl bg-[#F5F2E9] px-3 py-3.5">
                <p className="font-semibold text-[#263329]">{snapshot.healthWeight !== null ? `${snapshot.healthWeight}` : "—"}</p>
                <p className="mt-0.5 text-xs text-[#83857D]">น้ำหนักล่าสุด กก.</p>
              </div>
              <div className="rounded-2xl bg-[#F5F2E9] px-3 py-3.5">
                <p className="font-semibold text-[#263329]">{snapshot.notesCount}</p>
                <p className="mt-0.5 text-xs text-[#83857D]">โน้ตทั้งหมด</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[#858880]">ยอดคงเหลือทั้งหมด {money(currentBalance)} · สุทธิเดือนนี้ {money(monthNet)}</p>
          </div>
        </div>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#52785B]">พื้นที่ของคุณ</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#263329] md:text-3xl">
              เลือกสิ่งที่อยากจัดการ
            </h2>
            <p className="mt-1 text-xs text-[#868980]">เลือกการ์ดที่อยากเห็น และจัดลำดับได้ตามใจ</p>
          </div>
          <button
            onClick={() => setCustomizing((open) => !open)}
            aria-expanded={customizing}
            className="shrink-0 rounded-full border border-[#DEDACF] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#354337] shadow-sm transition hover:bg-white"
          >
            ⚙ ปรับแต่งหน้า
          </button>
        </div>

        {customizing && (
          <section aria-label="ปรับแต่งหน้า Home" className="mb-5 rounded-[26px] border border-[#DEDACF] bg-white/85 p-5 shadow-[0_12px_40px_rgba(48,52,43,0.05)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#263329]">จัดหน้า Home ของคุณ</h3>
                <p className="mt-1 text-sm text-[#7D8178]">การตั้งค่านี้บันทึกไว้ในเบราว์เซอร์เครื่องนี้</p>
              </div>
              <button
                onClick={() => setLayout({ order: [...DEFAULT_HOME_LAYOUT.order], hidden: [] })}
                className="rounded-full border border-[#DEDACF] px-3 py-2 text-xs font-medium text-[#6D716B] hover:bg-[#F5F2E9]"
              >
                คืนค่าเริ่มต้น
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {layout.order.map((id, index) => {
                const section = sections.find((item) => item.id === id)!
                const isVisible = !layout.hidden.includes(id)
                return (
                  <div key={id} className="flex items-center gap-3 rounded-2xl bg-[#F7F5EE] p-3">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(event) => toggleSection(id, event.target.checked)}
                      aria-label={`แสดงการ์ด${section.title}`}
                      className="h-4 w-4 accent-[#52785B]"
                    />
                    <span className={`${section.iconBg} grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#263329]`}>
                      <Icon name={section.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#263329]">{section.title}</p>
                      <p className="text-xs text-[#888B83]">{isVisible ? "แสดงบนหน้าหลัก" : "ซ่อนจากหน้าหลัก"}</p>
                    </div>
                    <button
                      onClick={() => moveSection(id, -1)}
                      disabled={index === 0}
                      aria-label={`เลื่อน${section.title}ขึ้น`}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[#DEDACF] bg-white text-[#4B554C] disabled:opacity-30"
                    >↑</button>
                    <button
                      onClick={() => moveSection(id, 1)}
                      disabled={index === layout.order.length - 1}
                      aria-label={`เลื่อน${section.title}ลง`}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[#DEDACF] bg-white text-[#4B554C] disabled:opacity-30"
                    >↓</button>
                  </div>
                )
              })}
            </div>
            {visibleSections.length === 0 && <p className="mt-3 text-sm text-[#A85D58]">ซ่อนการ์ดทั้งหมดอยู่ — เลือกอย่างน้อยหนึ่งการ์ดเพื่อแสดงบนหน้าหลัก</p>}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setCustomizing(false)} className="rounded-full bg-[#263329] px-5 py-2.5 text-sm font-medium text-white">เสร็จแล้ว</button>
            </div>
          </section>
        )}

        {visibleSections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section, index) => (
            <button
              key={section.id}
              data-workspace-id={`home-card-${section.id}`}
              onClick={() => navigate(section.id)}
              className={`${section.color} card-rise group relative min-h-[320px] overflow-hidden rounded-[32px] p-6 text-left md:p-7`}
            >
              <span className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-black/10" />
              <span className="absolute -right-1 top-10 h-24 w-24 rounded-full border border-black/10" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className={`${section.iconBg} grid h-14 w-14 place-items-center rounded-[20px] text-[#263329]`}>
                    <Icon name={section.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-medium text-black/45">0{index + 1}</span>
                </div>
                <div className="mt-16">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">{section.eyebrow}</p>
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <h3 className="text-4xl font-semibold tracking-[-0.05em] text-[#263329]">{section.title}</h3>
                      <p className="mt-2 max-w-[230px] text-sm leading-6 text-[#3F493F]/75">{section.description}</p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#263329] text-white transition-transform duration-300 group-hover:-rotate-45">
                      <Icon name="arrow" className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-6 border-t border-black/10 pt-4 text-xs font-medium text-black/55">{cardDetails[section.id]}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#D8D3C6] bg-white/45 px-6 py-14 text-center">
            <p className="font-medium text-[#263329]">หน้าหลักยังว่างอยู่</p>
            <p className="mt-2 text-sm text-[#858980]">กด “ปรับแต่งหน้า” แล้วเลือกการ์ดที่อยากแสดง</p>
            <button onClick={() => setCustomizing(true)} className="mt-4 rounded-full bg-[#263329] px-5 py-2.5 text-sm text-white">เลือกการ์ด</button>
          </div>
        )}
      </section>
    </main>
  )
}


function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#263329 ${value * 3.6}deg, rgba(38,51,41,.12) 0deg)`,
      }}
    >
      <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-[#FCFBF7] text-center">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.05em] text-[#263329]">
            {value}%
          </p>
          <p className="text-xs text-[#85887F]">{label}</p>
        </div>
      </div>
    </div>
  )
}


function HealthDashboard() {
  type Profile = { id: string; name: string; height: number; age: number }
  type HealthRecord = { id: string; profileId: string; date: string; type: "weight" | "exercise" | "wellness"; weight?: number; distance?: number; duration?: number; reps?: number; sets?: number; exercise?: string; water?: number; sleep?: number; note?: string }
  type HealthData = { profiles: Profile[]; activeProfileId: string; records: HealthRecord[] }
  const storageKey = "lamoon-health-dashboard-v1"
  const today = new Date().toISOString().slice(0, 10)
  const [data, setData] = useState<HealthData>(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as HealthData | null; if (saved && saved.profiles && saved.profiles.length) return saved } catch {}
    return { profiles: [{ id: "profile-default", name: "ฉัน", height: 163, age: 26 }], activeProfileId: "profile-default", records: [] }
  })
  const [tab, setTab] = useState<"overview" | "records" | "profiles">("overview")
  const [showAdd, setShowAdd] = useState(false)
  const [kind, setKind] = useState<"weight" | "exercise" | "wellness">("weight")
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [filter, setFilter] = useState("all")
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState("")
  const [exercise, setExercise] = useState("เดิน")
  const [distance, setDistance] = useState("")
  const [duration, setDuration] = useState("")
  const [reps, setReps] = useState("")
  const [sets, setSets] = useState("3")
  const [water, setWater] = useState("6")
  const [sleep, setSleep] = useState("8")
  const [note, setNote] = useState("")
  const [profileName, setProfileName] = useState("")
  const [height, setHeight] = useState("163")
  const [age, setAge] = useState("26")
  const [profileWeight, setProfileWeight] = useState("")
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(data)) }, [data])
  const profile = data.profiles.find((p) => p.id === data.activeProfileId) || data.profiles[0]
  const records = data.records.filter((r) => r.profileId === profile.id).sort((a, b) => b.date.localeCompare(a.date))
  const weights = records.filter((r) => r.type === "weight" && typeof r.weight === "number").sort((a, b) => a.date.localeCompare(b.date))
  const latest = weights.length ? weights[weights.length - 1].weight as number : null
  const first = weights.length ? weights[0].weight as number : null
  const bmi = latest && profile.height ? latest / Math.pow(profile.height / 100, 2) : null
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - period + 1)
  const chart = weights.filter((r) => new Date(r.date + "T12:00:00") >= cutoff)
  const minWeight = chart.length ? Math.min(...chart.map((r) => r.weight || 0)) : 0
  const maxWeight = chart.length ? Math.max(...chart.map((r) => r.weight || 0)) : 0
  const points = chart.map((r, i) => ({ ...r, x: chart.length < 2 ? 150 : 12 + i * (276 / (chart.length - 1)), y: 112 - (((r.weight || 0) - minWeight + 1) / Math.max(2, maxWeight - minWeight + 2)) * 88 }))
  const workouts = records.filter((r) => r.type === "exercise")
  const km = workouts.reduce((s, r) => s + (r.distance || 0), 0)
  const minutes = workouts.reduce((s, r) => s + (r.duration || 0), 0)
  const todayWellness = records.find((r) => r.type === "wellness" && r.date === today)
  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(n)
  const field = "mt-1.5 h-11 w-full rounded-2xl border border-[#DEDACF] bg-white px-3.5 text-sm text-[#263329] outline-none focus:border-[#B5A77E]"
  function saveRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const r: HealthRecord = { id: crypto.randomUUID(), profileId: profile.id, date, type: kind, note: note.trim() || undefined }
    if (kind === "weight") { if (!weight || Number(weight) <= 0) return; r.weight = Number(weight) }
    if (kind === "exercise") { r.exercise = exercise; r.distance = Number(distance) || 0; r.duration = Number(duration) || 0; r.reps = Number(reps) || 0; r.sets = Number(sets) || 0 }
    if (kind === "wellness") { r.water = Number(water) || 0; r.sleep = Number(sleep) || 0 }
    setData((old) => ({ ...old, records: [...old.records, r] })); setShowAdd(false); setWeight(""); setDistance(""); setDuration(""); setReps(""); setNote("")
  }
  function addProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!profileName.trim()) return
    const p = { id: crypto.randomUUID(), name: profileName.trim(), height: Number(height) || 163, age: Number(age) || 0 }
    const initialWeight = Number(profileWeight)
    const initialRecord: HealthRecord | null = profileWeight.trim() && initialWeight > 0
      ? { id: crypto.randomUUID(), profileId: p.id, date: today, type: "weight", weight: initialWeight, note: "น้ำหนักเริ่มต้นจากโปรไฟล์" }
      : null
    setData((old) => ({ ...old, profiles: [...old.profiles, p], activeProfileId: p.id, records: initialRecord ? [...old.records, initialRecord] : old.records })); setProfileName(""); setProfileWeight(""); setTab("overview")
  }
  function removeRecord(id: string) { if (window.confirm("ลบบันทึกนี้ใช่ไหม?")) setData((old) => ({ ...old, records: old.records.filter((r) => r.id !== id) })) }
  const visibleRecords = records.filter((r) => filter === "all" || r.type === filter)
  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-5 md:px-8 md:pt-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B96E69]">ดูแลตัวเอง · HEALTH</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#263329] md:text-4xl">สุขภาพ</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#858880]">เก็บทุกความคืบหน้าไว้ในที่เดียว ค่อย ๆ ดีขึ้นในแบบของเรา</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="เลือกโปรไฟล์" value={profile.id} onChange={(e) => setData((old) => ({ ...old, activeProfileId: e.target.value }))} className="h-10 max-w-[180px] rounded-full border border-[#DEDACF] bg-white/80 px-4 text-sm text-[#263329]">{data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={() => { setShowAdd(true); setKind("weight") }} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#263329] px-5 text-sm font-medium text-white hover:bg-[#3B4A3E]"><Icon name="plus" className="h-4 w-4" /> บันทึกข้อมูล</button>
        </div>
      </header>
      <div className="mb-5 flex gap-1 rounded-full border border-[#E1DDCF] bg-white/55 p-1.5 sm:w-fit">{([{id:"overview",label:"ภาพรวม"},{id:"records",label:"ประวัติและปฏิทิน"},{id:"profiles",label:"โปรไฟล์"}] as const).map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={"rounded-full px-4 py-2 text-sm " + (tab === t.id ? "bg-[#263329] text-white" : "text-[#747970] hover:bg-[#F1EEE5]")}>{t.label}</button>)}</div>
      {tab === "overview" && <>
        <section data-workspace-id="health-metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{label:"น้ำหนักล่าสุด",value:latest == null ? "—" : fmt(latest),unit:"กก.",hint:weights.length ? "อัปเดต " + weights[weights.length-1].date : "เริ่มบันทึกน้ำหนักครั้งแรก",tone:"bg-[#F8E5E3] text-[#A85D58]"},{label:"ดัชนีมวลกาย (BMI)",value:bmi == null ? "—" : fmt(bmi),unit:"",hint:bmi == null ? "ต้องมีส่วนสูงและน้ำหนัก" : bmi < 18.5 ? "ต่ำกว่าเกณฑ์ทั่วไป" : bmi < 25 ? "อยู่ในช่วงเกณฑ์ทั่วไป" : "สูงกว่าเกณฑ์ทั่วไป",tone:"bg-[#F6E7BE] text-[#8A6A20]"},{label:"ระยะทางที่บันทึก",value:fmt(km),unit:"กม.",hint:"รวมจากประวัติการออกกำลังกาย",tone:"bg-[#DCEBDF] text-[#487453]"},{label:"เวลาออกกำลังกาย",value:fmt(minutes),unit:"นาที",hint:"รวมทุกครั้งที่บันทึก",tone:"bg-[#E4DFF3] text-[#655A91]"}].map((s) => <div key={s.label} className="rounded-[26px] border border-[#E1DDCF] bg-white/65 p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7E837B]">{s.label}</span><span className={"grid h-9 w-9 place-items-center rounded-xl text-xs font-semibold " + s.tone}>{s.unit || "↗"}</span></div><p className="mt-4 text-3xl font-semibold tracking-tight text-[#263329]">{s.value} <span className="text-sm font-normal text-[#8A8D85]">{s.unit && s.label === "น้ำหนักล่าสุด" ? s.unit : ""}</span></p><p className="mt-1 text-xs text-[#93968F]">{s.hint}</p></div>)}
        </section>
        <section data-workspace-id="health-entry-panels" className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#B96E69]">แนวโน้ม</p><h2 className="mt-1 text-xl font-semibold text-[#263329]">กราฟน้ำหนัก</h2><p className="mt-1 text-xs text-[#90938B]">แสดงวันที่มีการบันทึกเท่านั้น</p></div><div className="flex rounded-full bg-[#F2EFE6] p-1">{([7,30,90] as const).map((d) => <button key={d} onClick={() => setPeriod(d)} className={"rounded-full px-3 py-1.5 text-xs " + (period === d ? "bg-white font-semibold text-[#263329] shadow-sm" : "text-[#777B73]")}>{d} วัน</button>)}</div></div>
          {points.length ? <><svg viewBox="0 0 300 132" role="img" aria-label="กราฟแนวโน้มน้ำหนัก" className="mt-5 h-[180px] w-full overflow-visible"><line x1="8" y1="112" x2="292" y2="112" stroke="#E7E2D7" strokeDasharray="3 4"/><line x1="8" y1="68" x2="292" y2="68" stroke="#E7E2D7" strokeDasharray="3 4"/><line x1="8" y1="24" x2="292" y2="24" stroke="#E7E2D7" strokeDasharray="3 4"/>{points.length > 1 && <polyline points={points.map((p) => p.x + "," + p.y).join(" ")} fill="none" stroke="#B85B48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}{points.map((p) => <g key={p.id}><circle cx={p.x} cy={p.y} r="4" fill="#FCFAF3" stroke="#B85B48" strokeWidth="2"/><title>{p.date}: {p.weight} กก.</title></g>)}</svg><div className="flex justify-between text-xs text-[#92958D]"><span>{points[0].date}</span><span>{points[points.length-1].date}</span></div><div className="mt-4 rounded-2xl bg-[#F6F2E9] p-3.5 text-sm text-[#626960]">เปลี่ยนแปลงในช่วงนี้: <strong className="text-[#263329]">{fmt((points[points.length-1].weight || 0) - (points[0].weight || 0))} กก.</strong></div></> : <div className="grid min-h-[200px] place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#F8E5E3] text-[#A85D58]"><Icon name="heart" className="h-5 w-5"/></span><p className="mt-3 text-sm font-medium text-[#4A534A]">ยังไม่มีกราฟน้ำหนัก</p><p className="mt-1 text-xs text-[#8A8D85]">เพิ่มบันทึกน้ำหนักเพื่อดูแนวโน้ม</p><button onClick={() => {setShowAdd(true);setKind("weight")}} className="mt-3 text-sm font-semibold text-[#B96E69]">+ บันทึกน้ำหนัก</button></div></div>}
          </div>
          <div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">วันนี้ · {today}</p><h2 className="mt-1 text-xl font-semibold text-[#263329]">ดูแลตัวเอง</h2>{[{label:"น้ำดื่ม",value:todayWellness?.water,unit:"แก้ว",goal:8,color:"bg-[#8EB9D4]"},{label:"การนอน",value:todayWellness?.sleep,unit:"ชม.",goal:8,color:"bg-[#A99AD5]"}].map((s) => <div key={s.label} className="mt-4 rounded-2xl bg-[#F5F2E9] p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#485048]">{s.label}</span><span className="text-sm font-semibold text-[#263329]">{s.value == null ? "—" : fmt(s.value)} <span className="text-xs font-normal text-[#898D84]">{s.unit}</span></span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E1D6]"><div className={"h-full rounded-full " + s.color} style={{width: Math.min(100,((s.value || 0)/s.goal)*100) + "%"}}/></div><p className="mt-2 text-xs text-[#8D9088]">เป้าหมายอ้างอิง {s.goal} {s.unit}</p></div>)}<button onClick={() => {setShowAdd(true);setKind("wellness")}} className="mt-4 h-11 w-full rounded-full border border-[#DEDACF] bg-white text-sm font-medium text-[#4C554D] hover:bg-[#F5F2E9]">บันทึกน้ำดื่มและการนอน</button><div className="mt-5 border-t border-[#E7E2D7] pt-4"><p className="text-xs font-semibold text-[#7F847B]">กิจกรรมล่าสุด</p>{workouts.slice(0,2).length ? workouts.slice(0,2).map((r) => <div key={r.id} className="mt-3 flex justify-between gap-3 text-sm"><span>{r.exercise}</span><span className="text-xs text-[#8A8D85]">{r.date}</span></div>) : <p className="mt-2 text-sm text-[#92958D]">ยังไม่มีบันทึกกิจกรรม</p>}</div></div>
        </section>
        <section data-workspace-id="health-history" className="mt-4 rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#B96E69]">บันทึกล่าสุด</p><h2 className="mt-1 text-xl font-semibold text-[#263329]">ประวัติสุขภาพ</h2></div><button onClick={() => setTab("records")} className="text-sm font-semibold text-[#B96E69]">ดูทั้งหมด →</button></div>{records.slice(0,4).length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{records.slice(0,4).map((r) => <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#B96E69]">{r.type === "weight" ? "kg" : r.type === "exercise" ? "↗" : "♡"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#3D463E]">{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise : "น้ำดื่มและการนอน"}</p><p className="mt-0.5 text-xs text-[#969890]">{r.date}</p></div><button onClick={() => removeRecord(r.id)} className="text-xs text-[#A85D58]">ลบ</button></div>)}</div> : <p className="mt-5 rounded-2xl bg-[#F5F2E9] p-6 text-center text-sm text-[#92958D]">ยังไม่มีข้อมูล ลองเพิ่มบันทึกแรกของคุณ</p>}</section>
      </>}
      {tab === "records" && <section data-workspace-id="health-progress" className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">ตรวจสอบย้อนหลัง</p><h2 className="mt-1 text-xl font-semibold text-[#263329]">ประวัติและสถิติ</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#F5F2E9] p-4"><p className="text-xs text-[#858880]">จำนวนบันทึก</p><p className="mt-1 text-2xl font-semibold">{records.length}</p></div><div className="rounded-2xl bg-[#F5F2E9] p-4"><p className="text-xs text-[#858880]">วันที่มีกิจกรรม</p><p className="mt-1 text-2xl font-semibold">{new Set(workouts.map((r) => r.date)).size}</p></div></div><label className="mt-5 block text-sm font-medium text-[#4C554D]">กรองประเภท<select value={filter} onChange={(e) => setFilter(e.target.value)} className={field}><option value="all">ทั้งหมด</option><option value="weight">น้ำหนัก</option><option value="exercise">ออกกำลังกาย</option><option value="wellness">น้ำดื่มและการนอน</option></select></label><div className="mt-5 rounded-2xl bg-[#F5F2E9] p-4"><p className="text-sm font-semibold">สรุปการเคลื่อนไหว</p><p className="mt-2 text-sm text-[#73786F]">ระยะทางรวม <strong className="text-[#263329]">{fmt(km)} กม.</strong></p><p className="mt-1 text-sm text-[#73786F]">เวลาออกกำลังกาย <strong className="text-[#263329]">{fmt(minutes)} นาที</strong></p><p className="mt-1 text-sm text-[#73786F]">น้ำหนักเปลี่ยนจากบันทึกแรก <strong className="text-[#263329]">{first != null && latest != null ? fmt(latest-first) + " กก." : "—"}</strong></p></div></div><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><h2 className="text-xl font-semibold text-[#263329]">ปฏิทินประจำเดือน</h2><div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-[#858880]">{["อา","จ","อ","พ","พฤ","ศ","ส"].map((d) => <span key={d} className="py-2">{d}</span>)}{Array.from({length:new Date(new Date().getFullYear(),new Date().getMonth(),1).getDay()},(_,i)=><span key={"blank"+i}/>)}{Array.from({length:new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()},(_,i)=>{const day=i+1;const key=today.slice(0,7)+"-"+String(day).padStart(2,"0");const has=records.some((r)=>r.date===key);return <div key={key} title={has?"มีบันทึก":""} className={"mx-auto grid h-8 w-8 place-items-center rounded-full text-xs "+(key===today?"bg-[#263329] text-white":has?"bg-[#F8E5E3] font-semibold text-[#A85D58]":"text-[#6E746B]")}>{day}</div>})}</div><div className="mt-5 border-t border-[#E7E2D7] pt-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">รายการบันทึก</span><span className="text-xs text-[#92958D]">{visibleRecords.length} รายการ</span></div><div className="max-h-[460px] space-y-2 overflow-y-auto">{visibleRecords.map((r)=><div key={r.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-3.5"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#3D463E]">{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise + " · " + (r.duration || 0) + " นาที" + (r.distance ? " · " + r.distance + " กม." : "") + (r.reps ? " · " + r.reps + " ครั้ง × " + (r.sets || 1) + " เซต" : "") : "น้ำ " + (r.water || 0) + " แก้ว · นอน " + (r.sleep || 0) + " ชม."}</p><p className="mt-1 text-xs text-[#92958D]">{r.date}{r.note ? " · " + r.note : ""}</p></div><button onClick={() => removeRecord(r.id)} className="text-xs text-[#A85D58]">ลบ</button></div>)}{!visibleRecords.length && <p className="py-10 text-center text-sm text-[#92958D]">ยังไม่มีบันทึกประเภทนี้</p>}</div></div></div></section>}
      {tab === "profiles" && <section data-workspace-id="health-calendar" className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">แยกข้อมูลแต่ละคน</p><h2 className="mt-1 text-xl font-semibold text-[#263329]">โปรไฟล์สุขภาพ</h2><p className="mt-2 text-sm leading-6 text-[#858880]">ประวัติ น้ำหนัก และกิจกรรมจะแยกตามโปรไฟล์</p><form onSubmit={addProfile} className="mt-5 space-y-3"><label className="block text-sm font-medium">ชื่อโปรไฟล์<input required value={profileName} onChange={(e)=>setProfileName(e.target.value)} placeholder="เช่น ฉัน, พ่อ, แม่" className={field}/></label><label className="block text-sm font-medium">น้ำหนักเริ่มต้น (กก.)<input type="number" min="1" max="500" step="0.1" value={profileWeight} onChange={(e)=>setProfileWeight(e.target.value)} placeholder="เช่น 65.5" className={field}/><span className="mt-1 block text-xs font-normal text-[#858880]">กรอกเพื่อแสดงน้ำหนักล่าสุดและคำนวณ BMI ได้ทันที</span></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">ส่วนสูง (ซม.)<input type="number" min="50" max="250" value={height} onChange={(e)=>setHeight(e.target.value)} className={field}/></label><label className="block text-sm font-medium">อายุ<input type="number" min="1" max="120" value={age} onChange={(e)=>setAge(e.target.value)} className={field}/></label></div><button type="submit" className="h-11 w-full rounded-full bg-[#263329] text-sm font-medium text-white">+ สร้างโปรไฟล์</button></form></div><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><h2 className="text-xl font-semibold text-[#263329]">โปรไฟล์ที่มี</h2><div className="mt-4 space-y-3">{data.profiles.map((p)=><div key={p.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#F8E5E3] text-[#A85D58]"><Icon name="heart" className="h-5 w-5"/></span><div className="min-w-0 flex-1"><p className="font-semibold">{p.name}{p.id===profile.id?" · ใช้งานอยู่":""}</p><p className="mt-1 text-xs text-[#858880]">ส่วนสูง {p.height} ซม. · อายุ {p.age || "—"} ปี · {data.records.filter((r)=>r.profileId===p.id).length} บันทึก</p></div><button onClick={()=>setData((old)=>({...old,activeProfileId:p.id}))} className="rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs">เลือก</button>{data.profiles.length>1&&<button onClick={()=>{if(window.confirm("ลบโปรไฟล์ "+p.name+" พร้อมประวัติของโปรไฟล์นี้หรือไม่?")){setData((old)=>{const profiles=old.profiles.filter((x)=>x.id!==p.id);return {...old,profiles,activeProfileId:old.activeProfileId===p.id?profiles[0].id:old.activeProfileId,records:old.records.filter((r)=>r.profileId!==p.id)}})}}} className="text-xs text-[#A85D58]">ลบ</button>}</div>)}</div></div></section>}
      {showAdd && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#172019]/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e)=>e.target===e.currentTarget&&setShowAdd(false)}><section role="dialog" aria-modal="true" aria-labelledby="health-add-title" className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] border border-[#DEDACF] bg-[#FCFAF3] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B96E69]">บันทึกสุขภาพ</p><h2 id="health-add-title" className="mt-1 text-2xl font-semibold text-[#263329]">เพิ่มข้อมูลใหม่</h2><p className="mt-1 text-sm text-[#858880]">โปรไฟล์: {profile.name}</p></div><button onClick={()=>setShowAdd(false)} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full bg-[#F0ECE1]">×</button></div><div className="mt-5 grid grid-cols-3 rounded-full bg-[#F0ECE1] p-1">{([{id:"weight",label:"น้ำหนัก"},{id:"exercise",label:"ออกกำลัง"},{id:"wellness",label:"น้ำ/นอน"}] as const).map((t)=><button key={t.id} onClick={()=>setKind(t.id)} className={"rounded-full px-2 py-2 text-xs sm:text-sm "+(kind===t.id?"bg-white font-semibold text-[#263329] shadow-sm":"text-[#777B73]")}>{t.label}</button>)}</div><form onSubmit={saveRecord} className="mt-5 space-y-4"><label className="block text-sm font-medium">วันที่<input type="date" required value={date} onChange={(e)=>setDate(e.target.value)} className={field}/></label>{kind==="weight"&&<label className="block text-sm font-medium">น้ำหนัก (กก.)<input autoFocus required type="number" min="1" max="500" step="0.1" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder="เช่น 75.5" className={field}/></label>}{kind==="exercise"&&<><label className="block text-sm font-medium">กิจกรรม<select value={exercise} onChange={(e)=>setExercise(e.target.value)} className={field}>{["เดิน","วิ่ง","ปั่นจักรยาน","วิดพื้น","สควอต","ยกน้ำหนัก","ยืดเหยียด","อื่น ๆ"].map((x)=><option key={x}>{x}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">ระยะทาง (กม.)<input type="number" min="0" step="0.1" value={distance} onChange={(e)=>setDistance(e.target.value)} className={field}/></label><label className="block text-sm font-medium">เวลา (นาที)<input type="number" min="0" value={duration} onChange={(e)=>setDuration(e.target.value)} className={field}/></label><label className="block text-sm font-medium">จำนวนครั้ง<input type="number" min="0" value={reps} onChange={(e)=>setReps(e.target.value)} className={field}/></label><label className="block text-sm font-medium">จำนวนเซต<input type="number" min="0" value={sets} onChange={(e)=>setSets(e.target.value)} className={field}/></label></div></>}{kind==="wellness"&&<div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">น้ำดื่ม (แก้ว)<input type="number" min="0" max="100" value={water} onChange={(e)=>setWater(e.target.value)} className={field}/></label><label className="block text-sm font-medium">เวลานอน (ชั่วโมง)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={(e)=>setSleep(e.target.value)} className={field}/></label></div>}<label className="block text-sm font-medium">บันทึกเพิ่มเติม (ไม่บังคับ)<textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={3} className="mt-1.5 w-full rounded-2xl border border-[#DEDACF] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#B5A77E]"/></label><div className="flex gap-2 pt-1"><button type="button" onClick={()=>setShowAdd(false)} className="h-11 flex-1 rounded-full border border-[#DEDACF] bg-white text-sm">ยกเลิก</button><button type="submit" className="h-11 flex-1 rounded-full bg-[#263329] text-sm font-medium text-white">บันทึกข้อมูล</button></div></form></section></div>}
    </main>
  )
}

function DetailPage({ page }: { page: Exclude<Page, "home"> }) {
  const section = sections.find((item) => item.id === page)!
  const content = {
    saving: {
      heading: "ทุกก้าวเล็ก ๆ พาเราเข้าใกล้เป้าหมาย",
      stat: "฿6,800",
      statLabel: "ออมแล้วในเดือนนี้",
      list: ["เงินสำรองฉุกเฉิน", "ทริปญี่ปุ่น", "คอมพิวเตอร์เครื่องใหม่"],
    },
    health: {
      heading: "ร่างกายที่ดี เริ่มจากความสม่ำเสมอ",
      stat: "5,840",
      statLabel: "ก้าวเดินวันนี้",
      list: ["ดื่มน้ำ 6–8 แก้ว", "เดินให้ครบ 8,000 ก้าว", "เข้านอนก่อน 23:00 น."],
    },
    notes: {
      heading: "จดไว้ แล้วค่อยกลับมาต่อยอด",
      stat: "12",
      statLabel: "โน้ตทั้งหมด",
      list: ["ไอเดียโปรเจกต์ใหม่", "รายการซื้อของเข้าบ้าน", "สิ่งที่อยากทำเดือนนี้"],
    },
  }[page]

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-7 md:px-8 md:pt-12">
      <button
        onClick={() => navigate("home")}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#6F736C] transition-colors hover:text-[#263329]"
      >
        <Icon name="arrow" className="h-4 w-4 rotate-180" />
        กลับหน้าหลัก
      </button>
      <section
        className={`${section.color} relative overflow-hidden rounded-[36px] p-7 md:p-12`}
      >
        <span className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-black/10" />
        <div className="relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <span
              className={`${section.iconBg} mb-8 grid h-16 w-16 place-items-center rounded-[22px]`}
            >
              <Icon name={section.icon} className="h-7 w-7" />
            </span>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-black/45">
              {section.eyebrow}
            </p>
            <h1 className="text-5xl font-semibold tracking-[-0.06em] text-[#263329] md:text-7xl">
              {section.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#3F493F]/70">
              {content.heading}
            </p>
          </div>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#263329] px-5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            <Icon name="plus" className="h-4 w-4" />
            เพิ่มรายการใหม่
          </button>
        </div>
      </section>

      <section data-workspace-id="detail-page-content" className="mt-5 grid gap-5 md:grid-cols-[0.85fr_1.3fr]">
        <div className="flex min-h-[290px] flex-col items-center justify-center rounded-[30px] border border-[#E1DDCF] bg-white/55 p-7">
          <ProgressRing
            value={page === "saving" ? 68 : page === "health" ? 73 : 80}
            label="ความคืบหน้า"
          />
          <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-[#263329]">
            {content.stat}
          </p>
          <p className="mt-1 text-sm text-[#878A82]">{content.statLabel}</p>
        </div>
        <div className="rounded-[30px] border border-[#E1DDCF] bg-white/55 p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#263329]">
              รายการล่าสุด
            </h2>
            <button className="text-sm font-medium text-[#52785B]">
              ดูทั้งหมด
            </button>
          </div>
          <div className="space-y-3">
            {content.list.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl bg-[#F4F1E8] p-4 transition-transform hover:translate-x-1"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    index === 0
                      ? "bg-[#263329] text-white"
                      : "bg-white text-[#8C8E87]"
                  }`}
                >
                  <Icon
                    name={index === 0 ? "check" : "note"}
                    className="h-4 w-4"
                  />
                </span>
                <span className="flex-1 text-sm font-medium text-[#3D463E]">
                  {item}
                </span>
                <span className="text-xs text-[#999B94]">
                  {index === 0 ? "วันนี้" : `${index + 1} วันก่อน`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function QuickSwitcher({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (page: Page) => void }) {
  const [query, setQuery] = useState("")
  useEffect(() => { if (open) setQuery("") }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  const options: { page: Page; label: string; description: string; icon: string }[] = [
    { page: "home", label: "หน้าหลัก", description: "ภาพรวมพื้นที่ส่วนตัว", icon: "⌂" },
    { page: "saving", label: "ออมเงิน", description: "รายรับ รายจ่าย และเป้าหมาย", icon: "↗" },
    { page: "health", label: "สุขภาพ", description: "น้ำหนักและกิจกรรม", icon: "♡" },
    { page: "notes", label: "สมุดสะสมความคิด", description: "โน้ต อารมณ์ และไอเดีย", icon: "✳" },
  ]
  const filtered = options.filter((option) => (option.label + " " + option.description).toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="fixed inset-0 z-[100] grid items-start justify-center bg-[#172019]/35 px-3 pt-[12vh] backdrop-blur-sm sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="ค้นหาและเปลี่ยนหน้า" className="w-full max-w-lg overflow-hidden rounded-[26px] border border-[#E1DDCF] bg-[#FCFBF7] shadow-[0_28px_100px_rgba(25,35,27,0.25)]">
        <div className="flex items-center gap-3 border-b border-[#EAE6DB] px-5">
          <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8C9187]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหน้าหรือสิ่งที่ต้องการ…" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-[#263329] outline-none placeholder:text-[#A2A49C]" />
          <kbd className="rounded-md border border-[#E1DDCF] px-2 py-1 text-[10px] text-[#858880]">ESC</kbd>
        </div>
        <div className="p-2">
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A9D94]">ไปยังพื้นที่</p>
          {filtered.map((option) => <button key={option.page} onClick={() => { onNavigate(option.page); onClose() }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F2F0E7] focus-visible:bg-[#F2F0E7]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg text-[#52785B] shadow-sm">{option.icon}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#263329]">{option.label}</span><span className="mt-0.5 block text-xs text-[#858880]">{option.description}</span></span>
            <span className="text-[#A2A49C]">↵</span>
          </button>)}
          {!filtered.length && <p className="px-3 py-8 text-center text-sm text-[#858880]">ไม่พบหน้าที่ตรงกับคำค้น</p>}
        </div>
        <div className="border-t border-[#EAE6DB] px-5 py-3 text-[11px] text-[#96998F]">กด Ctrl/⌘ K เพื่อเปิดได้ทุกเมื่อ · Esc เพื่อปิด</div>
      </section>
    </div>
  )
}

function AppContent() {
  const getPage = (): Page => {
    const hash = window.location.hash.replace("#", "") as Page
    return ["saving", "health", "notes"].includes(hash) ? hash : "home"
  }
  const [page, setPage] = useState<Page>(getPage)
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = () => setSearchOpen(true)

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (event.key === "Escape") setSearchOpen(false)
    }
    window.addEventListener("keydown", onShortcut)
    return () => window.removeEventListener("keydown", onShortcut)
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setPage(getPage())
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header current={page} onOpenSearch={openSearch} />
      <nav data-workspace-id="mobile-nav" aria-label="เมนูมือถือ" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[22px] border border-[#E2DED1] bg-[#FCFBF7]/95 p-1.5 shadow-[0_12px_38px_rgba(38,51,41,0.14)] backdrop-blur-xl md:hidden">
        {(["home", "saving", "health", "notes"] as Page[]).map((item) => (
          <button key={item} data-workspace-id={`mobile-nav-${item}`} onClick={() => navigate(item)} aria-current={page === item ? "page" : undefined} className={"flex min-w-0 flex-col items-center gap-1 rounded-[16px] px-1 py-2 text-[10px] font-medium transition " + (page === item ? "bg-[#263329] text-white shadow-sm" : "text-[#72786F] hover:bg-white")}>
            <span className="text-base leading-5">{item === "home" ? "⌂" : item === "saving" ? "↗" : item === "health" ? "♡" : "✳"}</span>
            <span>{pageTitles[item]}</span>
          </button>
        ))}
      </nav>
      {page === "home" ? (
        <Home />
      ) : page === "saving" ? (
        <SavingsPage onBack={() => navigate("home")} />
      ) : page === "health" ? (
        <HealthDashboard />
      ) : page === "notes" ? (
        <NotesPage onBack={() => navigate("home")} />
      ) : (
        <DetailPage page={page} />
      )}
      <QuickSwitcher open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} />
      <WorkspaceEditor />
      <footer data-workspace-id="site-footer" className="mx-auto flex max-w-[1180px] items-center justify-between border-t border-[#DEDACD] px-5 py-7 text-xs text-[#8D9088] md:px-8">
        <span>ละมุน — พื้นที่เล็ก ๆ เพื่อชีวิตที่เป็นระเบียบ</span>
        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-1.5 hover:text-[#263329]"
        >
          <Icon name="home" className="h-3.5 w-3.5" />
          หน้าหลัก
        </button>
      </footer>
    </div>
  )
}


export default function App() {
  return <CloudAuth><AppContent /></CloudAuth>
}
