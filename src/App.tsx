import { useEffect, useState, type ReactNode } from "react"
import SavingsPage from "./SavingsPage"
import NotesPage from "./NotesPage"
import CloudAuth, { AccountMenu } from "./CloudAuth"
import WorkspaceEditor from "./WorkspaceEditor"

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
      <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#141513] text-[#F9F7EF] transition-transform group-hover:-rotate-3">
        <Icon name="sparkle" className="h-5 w-5" />
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.04em] text-[#141513]">
        Mll
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
                ? page === "saving" ? "bg-[#3E6B4B] text-white" : page === "health" ? "bg-[#B96E69] text-white" : page === "notes" ? "bg-[#B68A43] text-white" : "bg-[#141513] text-white"
                : "text-[#6D716B] hover:bg-white hover:text-[#141513]"
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
        {window.self === window.top && <a href="/back.html" title="จัดหน้าเว็บ" className="grid h-10 w-10 place-items-center rounded-full border border-[#E2DED1] bg-white/80 text-[#141513] shadow-sm transition hover:border-[#C9C4B5] hover:bg-white" aria-label="เปิดระบบจัดหน้าเว็บ"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg></a>}
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
    color: "bg-[#E2F2E7]",
    iconBg: "bg-[#CDE8D5]",
  },
  {
    id: "health" as const,
    eyebrow: "ดูแลตัวเอง",
    title: "สุขภาพ",
    description: "ติดตามน้ำหนักและการเคลื่อนไหวของคุณ",
    icon: "heart" as const,
    color: "bg-[#FCE4DE]",
    iconBg: "bg-[#F8CEC4]",
  },
  {
    id: "notes" as const,
    eyebrow: "พื้นที่ความคิด",
    title: "โน้ต",
    description: "เก็บไอเดีย ความทรงจำ และเรื่องสำคัญ",
    icon: "note" as const,
    color: "bg-[#FBF1C9]",
    iconBg: "bg-[#F5E39D]",
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

function Home() {
  const [now, setNow] = useState(() => new Date())
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(readHomeSnapshot)
  const today = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" }).format(now)
  const money = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount)
  const balance = snapshot.income - snapshot.expense
  const net = snapshot.monthIncome - snapshot.monthExpense
  const progress = Math.max(0, Math.min(Math.round((Math.max(0, balance - snapshot.goalStartBalance) / snapshot.goal) * 100), 100))
  useEffect(() => {
    const refresh = () => { setSnapshot(readHomeSnapshot()); setNow(new Date()) }
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.startsWith("lamoon-")) refresh() }
    window.addEventListener("storage", onStorage); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh)
    const clock = window.setInterval(() => setNow(new Date()), 60000); refresh()
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.clearInterval(clock) }
  }, [])
  const cards = [
    { id: "saving" as const, no: "01", eyebrow: "MONEY", title: "ออมเงิน", desc: "จัดการรายรับ รายจ่าย และเป้าหมายทางการเงิน", status: snapshot.income + snapshot.expense ? "ยอดคงเหลือ " + money(balance) : "เริ่มบันทึกรายการแรก", icon: "bank" as const, bg: "#E4F2E7", accent: "#477653" },
    { id: "health" as const, no: "02", eyebrow: "WELLBEING", title: "สุขภาพ", desc: "ติดตามน้ำหนัก การออกกำลัง และความสม่ำเสมอ", status: snapshot.healthWeight !== null ? "น้ำหนักล่าสุด " + snapshot.healthWeight + " กก." : "เริ่มบันทึกสุขภาพ", icon: "heart" as const, bg: "#FCE4DE", accent: "#C65E4E" },
    { id: "notes" as const, no: "03", eyebrow: "THOUGHTS", title: "โน้ต", desc: "เก็บไอเดีย ความทรงจำ และเรื่องที่อยากจำ", status: snapshot.notesCount + " รายการ · ปักหมุด " + snapshot.pinnedCount, icon: "note" as const, bg: "#FBF1C9", accent: "#92730B" },
  ]
  return <main className="mll-home">
    <section className="mx-auto max-w-[1240px] px-5 pb-12 pt-7 md:px-8 md:pt-10 lg:pt-12">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-semibold tracking-[.12em] text-[#686B62]"><span className="h-2 w-2 rounded-full bg-[#7BC596]" />{today} <span className="text-[#B6B3A8]">/</span> YOUR PRIVATE SPACE</p><span className="rounded-full border border-[#DCD7C9] bg-white/60 px-3 py-1.5 text-xs text-[#686B62]">Mll · พื้นที่ส่วนตัว</span></div>
      <div data-workspace-id="home-welcome" className="grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative flex min-h-[330px] flex-col justify-between overflow-hidden rounded-[30px] bg-[#141513] p-7 text-[#F3F0E7] sm:p-10 lg:min-h-[405px] lg:p-12">
          <span className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" /><span className="pointer-events-none absolute right-3 top-20 h-36 w-36 rounded-full border border-white/10" />
          <div className="relative"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#7BC596]">MAKE ROOM FOR WHAT MATTERS</p><h1 className="mt-7 text-[clamp(2.8rem,6vw,5.2rem)] font-medium leading-[.98] tracking-[-.065em]">ชีวิตที่เป็น<br /><span className="font-light italic text-[#7BC596]">แบบของคุณ</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-white/60">จัดการเงิน ดูแลตัวเอง และเก็บความคิดสำคัญไว้ในพื้นที่เดียวที่เรียบง่าย</p></div>
          <div className="relative mt-8 flex items-center justify-between gap-3 border-t border-white/15 pt-5"><span className="text-xs text-white/50">หนึ่งพื้นที่ สำหรับทุกเรื่องที่สำคัญ</span><button onClick={() => navigate("saving")} className="inline-flex items-center gap-2 rounded-full bg-[#F3F0E7] px-4 py-2.5 text-sm font-semibold text-[#141513] hover:bg-[#7BC596]">เริ่มต้น <Icon name="arrow" className="h-4 w-4" /></button></div>
        </section>
        <section data-workspace-id="home-snapshot" className="flex flex-col rounded-[30px] border border-[#DED9CA] bg-[#FCFBF7] p-6 sm:p-8 lg:p-9">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#7A7D73]">YOUR OVERVIEW</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[#141513]">ภาพรวมของคุณ</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E4F2E7] text-[#315A3D]"><Icon name="sparkle" className="h-5 w-5" /></span></div>
          <div className="mt-7 rounded-[22px] bg-[#F3F0E7] p-5"><p className="text-xs text-[#74776D]">ยอดคงเหลือทั้งหมด</p><p className="mt-2 break-words text-[clamp(1.7rem,3vw,2.5rem)] font-semibold tracking-[-.055em] text-[#141513]">{money(balance)}</p><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#DED9CA] pt-3 text-xs"><span className="text-[#74776D]">สุทธิเดือนนี้</span><span className={net >= 0 ? "font-semibold text-[#315A3D]" : "font-semibold text-[#B94E3D]"}>{net >= 0 ? "+" : "−"}{money(Math.abs(net))}</span></div></div>
          <div className="mt-4 grid flex-1 grid-cols-3 gap-2">{[{ label: "GOAL", value: snapshot.goal > 0 && (snapshot.income + snapshot.expense > 0 || snapshot.goalStartBalance > 0) ? progress + "%" : "—", sub: "ความคืบหน้า" }, { label: "HEALTH", value: snapshot.healthWeight ?? "—", sub: "น้ำหนัก · กก." }, { label: "NOTES", value: snapshot.notesCount, sub: "บันทึกทั้งหมด" }].map(item => <div key={item.label} className="rounded-2xl border border-[#E6E1D5] p-3"><span className="block text-[10px] tracking-wide text-[#777A71]">{item.label}</span><strong className="mt-2 block text-xl font-semibold text-[#141513]">{item.value}</strong><span className="mt-1 block text-[10px] text-[#777A71]">{item.sub}</span></div>)}</div>
        </section>
      </div>
      <div className="mb-5 mt-14 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#55745B]">YOUR WORKSPACE</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[#141513] md:text-4xl">ทุกอย่างที่สำคัญ</h2></div><p className="max-w-sm text-sm leading-6 text-[#777A71]">สามพื้นที่หลัก ออกแบบให้ใช้งานง่ายและต่อเนื่องกัน</p></div>
      <div className="grid gap-4 md:grid-cols-3">{cards.map(card => <button key={card.id} data-workspace-id={`home-card-${card.id}`} onClick={() => navigate(card.id)} className="group overflow-hidden rounded-[26px] border border-[#E0DCCE] bg-[#FCFBF7] text-left transition duration-300 hover:-translate-y-1 hover:border-[#B8B5A8] hover:shadow-[0_18px_48px_rgba(20,21,19,.08)]">
        <div className="relative flex min-h-[138px] items-start justify-between overflow-hidden p-5 sm:p-6" style={{ backgroundColor: card.bg }}><span className="absolute -right-8 -top-10 h-36 w-36 rounded-full border border-[#141513]/10 transition-transform duration-500 group-hover:scale-110" /><span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-[#141513]"><Icon name={card.icon} className="h-5 w-5" /></span><span className="relative rounded-full border border-[#141513]/10 px-3 py-1 text-[10px] font-semibold tracking-[.14em] text-[#141513]/65">{card.no} / 03</span></div>
        <div className="p-5 sm:p-6"><p className="text-[10px] font-semibold tracking-[.18em]" style={{ color: card.accent }}>{card.eyebrow}</p><div className="mt-2 flex items-center justify-between gap-3"><h3 className="text-2xl font-semibold tracking-[-.04em] text-[#141513]">{card.title}</h3><span className="grid h-9 w-9 place-items-center rounded-full bg-[#141513] text-white transition-transform duration-300 group-hover:-rotate-45"><Icon name="arrow" className="h-4 w-4" /></span></div><p className="mt-3 min-h-[48px] text-sm leading-6 text-[#74776D]">{card.desc}</p><div className="mt-5 border-t border-[#E9E4D9] pt-4 text-xs font-medium text-[#4F534A]">{card.status}</div></div>
      </button>)}</div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#DED9CA] bg-white/55 px-5 py-4 text-xs text-[#777A71]"><span>พื้นที่ที่ออกแบบมาให้เบาสบาย ใช้ได้ทุกวัน</span><span className="font-semibold tracking-[.12em] text-[#141513]">Mll <span className="font-normal text-[#A7A69B]">/ MAKE ROOM FOR WHAT MATTERS</span></span></div>
    </section>
  </main>
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#141513 ${value * 3.6}deg, rgba(38,51,41,.12) 0deg)`,
      }}
    >
      <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-[#FCFBF7] text-center">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.05em] text-[#141513]">
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
  const field = "mt-1.5 h-11 w-full rounded-2xl border border-[#DEDACF] bg-white px-3.5 text-sm text-[#141513] outline-none focus:border-[#B5A77E]"
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
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#141513] md:text-4xl">สุขภาพ</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#858880]">เก็บทุกความคืบหน้าไว้ในที่เดียว ค่อย ๆ ดีขึ้นในแบบของเรา</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="เลือกโปรไฟล์" value={profile.id} onChange={(e) => setData((old) => ({ ...old, activeProfileId: e.target.value }))} className="h-10 max-w-[180px] rounded-full border border-[#DEDACF] bg-white/80 px-4 text-sm text-[#141513]">{data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={() => { setShowAdd(true); setKind("weight") }} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#141513] px-5 text-sm font-medium text-white hover:bg-[#3B4A3E]"><Icon name="plus" className="h-4 w-4" /> บันทึกข้อมูล</button>
        </div>
      </header>
      <div className="mb-5 flex gap-1 rounded-full border border-[#E1DDCF] bg-white/55 p-1.5 sm:w-fit">{([{id:"overview",label:"ภาพรวม"},{id:"records",label:"ประวัติและปฏิทิน"},{id:"profiles",label:"โปรไฟล์"}] as const).map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={"rounded-full px-4 py-2 text-sm " + (tab === t.id ? "bg-[#141513] text-white" : "text-[#747970] hover:bg-[#F1EEE5]")}>{t.label}</button>)}</div>
      {tab === "overview" && <>
        <section data-workspace-id="health-metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{label:"น้ำหนักล่าสุด",value:latest == null ? "—" : fmt(latest),unit:"กก.",hint:weights.length ? "อัปเดต " + weights[weights.length-1].date : "เริ่มบันทึกน้ำหนักครั้งแรก",tone:"bg-[#FCE4DE] text-[#A85D58]"},{label:"ดัชนีมวลกาย (BMI)",value:bmi == null ? "—" : fmt(bmi),unit:"",hint:bmi == null ? "ต้องมีส่วนสูงและน้ำหนัก" : bmi < 18.5 ? "ต่ำกว่าเกณฑ์ทั่วไป" : bmi < 25 ? "อยู่ในช่วงเกณฑ์ทั่วไป" : "สูงกว่าเกณฑ์ทั่วไป",tone:"bg-[#F6E7BE] text-[#8A6A20]"},{label:"ระยะทางที่บันทึก",value:fmt(km),unit:"กม.",hint:"รวมจากประวัติการออกกำลังกาย",tone:"bg-[#DCEBDF] text-[#487453]"},{label:"เวลาออกกำลังกาย",value:fmt(minutes),unit:"นาที",hint:"รวมทุกครั้งที่บันทึก",tone:"bg-[#E4DFF3] text-[#655A91]"}].map((s) => <div key={s.label} className="rounded-[26px] border border-[#E1DDCF] bg-white/65 p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#7E837B]">{s.label}</span><span className={"grid h-9 w-9 place-items-center rounded-xl text-xs font-semibold " + s.tone}>{s.unit || "↗"}</span></div><p className="mt-4 text-3xl font-semibold tracking-tight text-[#141513]">{s.value} <span className="text-sm font-normal text-[#8A8D85]">{s.unit && s.label === "น้ำหนักล่าสุด" ? s.unit : ""}</span></p><p className="mt-1 text-xs text-[#93968F]">{s.hint}</p></div>)}
        </section>
        <section data-workspace-id="health-entry-panels" className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#B96E69]">แนวโน้ม</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">กราฟน้ำหนัก</h2><p className="mt-1 text-xs text-[#90938B]">แสดงวันที่มีการบันทึกเท่านั้น</p></div><div className="flex rounded-full bg-[#F2EFE6] p-1">{([7,30,90] as const).map((d) => <button key={d} onClick={() => setPeriod(d)} className={"rounded-full px-3 py-1.5 text-xs " + (period === d ? "bg-white font-semibold text-[#141513] shadow-sm" : "text-[#777B73]")}>{d} วัน</button>)}</div></div>
          {points.length ? <><svg viewBox="0 0 300 132" role="img" aria-label="กราฟแนวโน้มน้ำหนัก" className="mt-5 h-[180px] w-full overflow-visible"><line x1="8" y1="112" x2="292" y2="112" stroke="#E7E2D7" strokeDasharray="3 4"/><line x1="8" y1="68" x2="292" y2="68" stroke="#E7E2D7" strokeDasharray="3 4"/><line x1="8" y1="24" x2="292" y2="24" stroke="#E7E2D7" strokeDasharray="3 4"/>{points.length > 1 && <polyline points={points.map((p) => p.x + "," + p.y).join(" ")} fill="none" stroke="#B85B48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}{points.map((p) => <g key={p.id}><circle cx={p.x} cy={p.y} r="4" fill="#FCFAF3" stroke="#B85B48" strokeWidth="2"/><title>{p.date}: {p.weight} กก.</title></g>)}</svg><div className="flex justify-between text-xs text-[#92958D]"><span>{points[0].date}</span><span>{points[points.length-1].date}</span></div><div className="mt-4 rounded-2xl bg-[#F6F2E9] p-3.5 text-sm text-[#626960]">เปลี่ยนแปลงในช่วงนี้: <strong className="text-[#141513]">{fmt((points[points.length-1].weight || 0) - (points[0].weight || 0))} กก.</strong></div></> : <div className="grid min-h-[200px] place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FCE4DE] text-[#A85D58]"><Icon name="heart" className="h-5 w-5"/></span><p className="mt-3 text-sm font-medium text-[#4A534A]">ยังไม่มีกราฟน้ำหนัก</p><p className="mt-1 text-xs text-[#8A8D85]">เพิ่มบันทึกน้ำหนักเพื่อดูแนวโน้ม</p><button onClick={() => {setShowAdd(true);setKind("weight")}} className="mt-3 text-sm font-semibold text-[#B96E69]">+ บันทึกน้ำหนัก</button></div></div>}
          </div>
          <div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">วันนี้ · {today}</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">ดูแลตัวเอง</h2>{[{label:"น้ำดื่ม",value:todayWellness?.water,unit:"แก้ว",goal:8,color:"bg-[#8EB9D4]"},{label:"การนอน",value:todayWellness?.sleep,unit:"ชม.",goal:8,color:"bg-[#A99AD5]"}].map((s) => <div key={s.label} className="mt-4 rounded-2xl bg-[#F5F2E9] p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#485048]">{s.label}</span><span className="text-sm font-semibold text-[#141513]">{s.value == null ? "—" : fmt(s.value)} <span className="text-xs font-normal text-[#898D84]">{s.unit}</span></span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E1D6]"><div className={"h-full rounded-full " + s.color} style={{width: Math.min(100,((s.value || 0)/s.goal)*100) + "%"}}/></div><p className="mt-2 text-xs text-[#8D9088]">เป้าหมายอ้างอิง {s.goal} {s.unit}</p></div>)}<button onClick={() => {setShowAdd(true);setKind("wellness")}} className="mt-4 h-11 w-full rounded-full border border-[#DEDACF] bg-white text-sm font-medium text-[#4C554D] hover:bg-[#F5F2E9]">บันทึกน้ำดื่มและการนอน</button><div className="mt-5 border-t border-[#E7E2D7] pt-4"><p className="text-xs font-semibold text-[#7F847B]">กิจกรรมล่าสุด</p>{workouts.slice(0,2).length ? workouts.slice(0,2).map((r) => <div key={r.id} className="mt-3 flex justify-between gap-3 text-sm"><span>{r.exercise}</span><span className="text-xs text-[#8A8D85]">{r.date}</span></div>) : <p className="mt-2 text-sm text-[#92958D]">ยังไม่มีบันทึกกิจกรรม</p>}</div></div>
        </section>
        <section data-workspace-id="health-history" className="mt-4 rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#B96E69]">บันทึกล่าสุด</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">ประวัติสุขภาพ</h2></div><button onClick={() => setTab("records")} className="text-sm font-semibold text-[#B96E69]">ดูทั้งหมด →</button></div>{records.slice(0,4).length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{records.slice(0,4).map((r) => <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#B96E69]">{r.type === "weight" ? "kg" : r.type === "exercise" ? "↗" : "♡"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#3D463E]">{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise : "น้ำดื่มและการนอน"}</p><p className="mt-0.5 text-xs text-[#969890]">{r.date}</p></div><button onClick={() => removeRecord(r.id)} className="text-xs text-[#A85D58]">ลบ</button></div>)}</div> : <p className="mt-5 rounded-2xl bg-[#F5F2E9] p-6 text-center text-sm text-[#92958D]">ยังไม่มีข้อมูล ลองเพิ่มบันทึกแรกของคุณ</p>}</section>
      </>}
      {tab === "records" && <section data-workspace-id="health-progress" className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">ตรวจสอบย้อนหลัง</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">ประวัติและสถิติ</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#F5F2E9] p-4"><p className="text-xs text-[#858880]">จำนวนบันทึก</p><p className="mt-1 text-2xl font-semibold">{records.length}</p></div><div className="rounded-2xl bg-[#F5F2E9] p-4"><p className="text-xs text-[#858880]">วันที่มีกิจกรรม</p><p className="mt-1 text-2xl font-semibold">{new Set(workouts.map((r) => r.date)).size}</p></div></div><label className="mt-5 block text-sm font-medium text-[#4C554D]">กรองประเภท<select value={filter} onChange={(e) => setFilter(e.target.value)} className={field}><option value="all">ทั้งหมด</option><option value="weight">น้ำหนัก</option><option value="exercise">ออกกำลังกาย</option><option value="wellness">น้ำดื่มและการนอน</option></select></label><div className="mt-5 rounded-2xl bg-[#F5F2E9] p-4"><p className="text-sm font-semibold">สรุปการเคลื่อนไหว</p><p className="mt-2 text-sm text-[#73786F]">ระยะทางรวม <strong className="text-[#141513]">{fmt(km)} กม.</strong></p><p className="mt-1 text-sm text-[#73786F]">เวลาออกกำลังกาย <strong className="text-[#141513]">{fmt(minutes)} นาที</strong></p><p className="mt-1 text-sm text-[#73786F]">น้ำหนักเปลี่ยนจากบันทึกแรก <strong className="text-[#141513]">{first != null && latest != null ? fmt(latest-first) + " กก." : "—"}</strong></p></div></div><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><h2 className="text-xl font-semibold text-[#141513]">ปฏิทินประจำเดือน</h2><div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-[#858880]">{["อา","จ","อ","พ","พฤ","ศ","ส"].map((d) => <span key={d} className="py-2">{d}</span>)}{Array.from({length:new Date(new Date().getFullYear(),new Date().getMonth(),1).getDay()},(_,i)=><span key={"blank"+i}/>)}{Array.from({length:new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()},(_,i)=>{const day=i+1;const key=today.slice(0,7)+"-"+String(day).padStart(2,"0");const has=records.some((r)=>r.date===key);return <div key={key} title={has?"มีบันทึก":""} className={"mx-auto grid h-8 w-8 place-items-center rounded-full text-xs "+(key===today?"bg-[#141513] text-white":has?"bg-[#FCE4DE] font-semibold text-[#A85D58]":"text-[#6E746B]")}>{day}</div>})}</div><div className="mt-5 border-t border-[#E7E2D7] pt-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">รายการบันทึก</span><span className="text-xs text-[#92958D]">{visibleRecords.length} รายการ</span></div><div className="max-h-[460px] space-y-2 overflow-y-auto">{visibleRecords.map((r)=><div key={r.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-3.5"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#3D463E]">{r.type === "weight" ? "น้ำหนัก " + r.weight + " กก." : r.type === "exercise" ? r.exercise + " · " + (r.duration || 0) + " นาที" + (r.distance ? " · " + r.distance + " กม." : "") + (r.reps ? " · " + r.reps + " ครั้ง × " + (r.sets || 1) + " เซต" : "") : "น้ำ " + (r.water || 0) + " แก้ว · นอน " + (r.sleep || 0) + " ชม."}</p><p className="mt-1 text-xs text-[#92958D]">{r.date}{r.note ? " · " + r.note : ""}</p></div><button onClick={() => removeRecord(r.id)} className="text-xs text-[#A85D58]">ลบ</button></div>)}{!visibleRecords.length && <p className="py-10 text-center text-sm text-[#92958D]">ยังไม่มีบันทึกประเภทนี้</p>}</div></div></div></section>}
      {tab === "profiles" && <section data-workspace-id="health-calendar" className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><p className="text-xs font-semibold text-[#B96E69]">แยกข้อมูลแต่ละคน</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">โปรไฟล์สุขภาพ</h2><p className="mt-2 text-sm leading-6 text-[#858880]">ประวัติ น้ำหนัก และกิจกรรมจะแยกตามโปรไฟล์</p><form onSubmit={addProfile} className="mt-5 space-y-3"><label className="block text-sm font-medium">ชื่อโปรไฟล์<input required value={profileName} onChange={(e)=>setProfileName(e.target.value)} placeholder="เช่น ฉัน, พ่อ, แม่" className={field}/></label><label className="block text-sm font-medium">น้ำหนักเริ่มต้น (กก.)<input type="number" min="1" max="500" step="0.1" value={profileWeight} onChange={(e)=>setProfileWeight(e.target.value)} placeholder="เช่น 65.5" className={field}/><span className="mt-1 block text-xs font-normal text-[#858880]">กรอกเพื่อแสดงน้ำหนักล่าสุดและคำนวณ BMI ได้ทันที</span></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">ส่วนสูง (ซม.)<input type="number" min="50" max="250" value={height} onChange={(e)=>setHeight(e.target.value)} className={field}/></label><label className="block text-sm font-medium">อายุ<input type="number" min="1" max="120" value={age} onChange={(e)=>setAge(e.target.value)} className={field}/></label></div><button type="submit" className="h-11 w-full rounded-full bg-[#141513] text-sm font-medium text-white">+ สร้างโปรไฟล์</button></form></div><div className="rounded-[28px] border border-[#E1DDCF] bg-white/65 p-5 md:p-7"><h2 className="text-xl font-semibold text-[#141513]">โปรไฟล์ที่มี</h2><div className="mt-4 space-y-3">{data.profiles.map((p)=><div key={p.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9] p-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#FCE4DE] text-[#A85D58]"><Icon name="heart" className="h-5 w-5"/></span><div className="min-w-0 flex-1"><p className="font-semibold">{p.name}{p.id===profile.id?" · ใช้งานอยู่":""}</p><p className="mt-1 text-xs text-[#858880]">ส่วนสูง {p.height} ซม. · อายุ {p.age || "—"} ปี · {data.records.filter((r)=>r.profileId===p.id).length} บันทึก</p></div><button onClick={()=>setData((old)=>({...old,activeProfileId:p.id}))} className="rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs">เลือก</button>{data.profiles.length>1&&<button onClick={()=>{if(window.confirm("ลบโปรไฟล์ "+p.name+" พร้อมประวัติของโปรไฟล์นี้หรือไม่?")){setData((old)=>{const profiles=old.profiles.filter((x)=>x.id!==p.id);return {...old,profiles,activeProfileId:old.activeProfileId===p.id?profiles[0].id:old.activeProfileId,records:old.records.filter((r)=>r.profileId!==p.id)}})}}} className="text-xs text-[#A85D58]">ลบ</button>}</div>)}</div></div></section>}
      {showAdd && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#172019]/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e)=>e.target===e.currentTarget&&setShowAdd(false)}><section role="dialog" aria-modal="true" aria-labelledby="health-add-title" className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] border border-[#DEDACF] bg-[#FCFAF3] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B96E69]">บันทึกสุขภาพ</p><h2 id="health-add-title" className="mt-1 text-2xl font-semibold text-[#141513]">เพิ่มข้อมูลใหม่</h2><p className="mt-1 text-sm text-[#858880]">โปรไฟล์: {profile.name}</p></div><button onClick={()=>setShowAdd(false)} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full bg-[#F0ECE1]">×</button></div><div className="mt-5 grid grid-cols-3 rounded-full bg-[#F0ECE1] p-1">{([{id:"weight",label:"น้ำหนัก"},{id:"exercise",label:"ออกกำลัง"},{id:"wellness",label:"น้ำ/นอน"}] as const).map((t)=><button key={t.id} onClick={()=>setKind(t.id)} className={"rounded-full px-2 py-2 text-xs sm:text-sm "+(kind===t.id?"bg-white font-semibold text-[#141513] shadow-sm":"text-[#777B73]")}>{t.label}</button>)}</div><form onSubmit={saveRecord} className="mt-5 space-y-4"><label className="block text-sm font-medium">วันที่<input type="date" required value={date} onChange={(e)=>setDate(e.target.value)} className={field}/></label>{kind==="weight"&&<label className="block text-sm font-medium">น้ำหนัก (กก.)<input autoFocus required type="number" min="1" max="500" step="0.1" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder="เช่น 75.5" className={field}/></label>}{kind==="exercise"&&<><label className="block text-sm font-medium">กิจกรรม<select value={exercise} onChange={(e)=>setExercise(e.target.value)} className={field}>{["เดิน","วิ่ง","ปั่นจักรยาน","วิดพื้น","สควอต","ยกน้ำหนัก","ยืดเหยียด","อื่น ๆ"].map((x)=><option key={x}>{x}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">ระยะทาง (กม.)<input type="number" min="0" step="0.1" value={distance} onChange={(e)=>setDistance(e.target.value)} className={field}/></label><label className="block text-sm font-medium">เวลา (นาที)<input type="number" min="0" value={duration} onChange={(e)=>setDuration(e.target.value)} className={field}/></label><label className="block text-sm font-medium">จำนวนครั้ง<input type="number" min="0" value={reps} onChange={(e)=>setReps(e.target.value)} className={field}/></label><label className="block text-sm font-medium">จำนวนเซต<input type="number" min="0" value={sets} onChange={(e)=>setSets(e.target.value)} className={field}/></label></div></>}{kind==="wellness"&&<div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">น้ำดื่ม (แก้ว)<input type="number" min="0" max="100" value={water} onChange={(e)=>setWater(e.target.value)} className={field}/></label><label className="block text-sm font-medium">เวลานอน (ชั่วโมง)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={(e)=>setSleep(e.target.value)} className={field}/></label></div>}<label className="block text-sm font-medium">บันทึกเพิ่มเติม (ไม่บังคับ)<textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={3} className="mt-1.5 w-full rounded-2xl border border-[#DEDACF] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#B5A77E]"/></label><div className="flex gap-2 pt-1"><button type="button" onClick={()=>setShowAdd(false)} className="h-11 flex-1 rounded-full border border-[#DEDACF] bg-white text-sm">ยกเลิก</button><button type="submit" className="h-11 flex-1 rounded-full bg-[#141513] text-sm font-medium text-white">บันทึกข้อมูล</button></div></form></section></div>}
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
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหน้าหรือสิ่งที่ต้องการ…" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-[#141513] outline-none placeholder:text-[#A2A49C]" />
          <kbd className="rounded-md border border-[#E1DDCF] px-2 py-1 text-[10px] text-[#858880]">ESC</kbd>
        </div>
        <div className="p-2">
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A9D94]">ไปยังพื้นที่</p>
          {filtered.map((option) => <button key={option.page} onClick={() => { onNavigate(option.page); onClose() }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F2F0E7] focus-visible:bg-[#F2F0E7]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg text-[#3E6B4B] shadow-sm">{option.icon}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#141513]">{option.label}</span><span className="mt-0.5 block text-xs text-[#858880]">{option.description}</span></span>
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
          <button key={item} data-workspace-id={`mobile-nav-${item}`} onClick={() => navigate(item)} aria-current={page === item ? "page" : undefined} className={"flex min-w-0 flex-col items-center gap-1 rounded-[16px] px-1 py-2 text-[10px] font-medium transition " + (page === item ? "bg-[#141513] text-white shadow-sm" : "text-[#72786F] hover:bg-white")}>
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
      ) : null}
      <QuickSwitcher open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} />
      <WorkspaceEditor />
      <footer data-workspace-id="site-footer" className="mx-auto flex max-w-[1180px] items-center justify-between border-t border-[#DEDACD] px-5 py-7 text-xs text-[#8D9088] md:px-8">
        <span>Mll — พื้นที่ส่วนตัวสำหรับจัดการชีวิตในแบบของคุณ</span>
        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-1.5 hover:text-[#141513]"
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
