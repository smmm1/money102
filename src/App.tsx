import { useEffect, useState, type FormEvent, type ReactNode } from "react"
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
    <div className="mll-global-header">
      <div className="mll-announcement"><span className="mll-announcement-dot" /> พื้นที่ส่วนตัวของคุณ · เงิน สุขภาพ และความคิด <span className="mll-announcement-tail">ออกแบบให้ใช้ชีวิตได้ชัดขึ้น</span></div>
      <header data-workspace-id="site-header" className="mll-nav-shell">
        <Logo />
        <nav data-workspace-id="desktop-nav" aria-label="เมนูหลัก" className="mll-editorial-nav hidden md:flex">
          {(Object.keys(pageTitles) as Page[]).map((page) => (
            <button key={page} data-workspace-id={`desktop-nav-${page}`} onClick={() => navigate(page)} aria-current={current === page ? "page" : undefined} className={current === page ? "is-active" : ""}>
              <span>{page === "home" ? "00" : page === "saving" ? "01" : page === "health" ? "02" : "03"}</span>{pageTitles[page]}
            </button>
          ))}
        </nav>
        <div className="mll-nav-actions">
          <button onClick={onOpenSearch} className="mll-search-trigger" aria-label="ค้นหาและไปยังหน้า (Ctrl/⌘ K)"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><span className="hidden lg:inline">ค้นหา</span><kbd>⌘ K</kbd></button>
          {window.self === window.top && <a href="/back.html" title="จัดหน้าเว็บ" className="mll-builder-trigger" aria-label="เปิดระบบจัดหน้าเว็บ"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg></a>}
          <AccountMenu />
        </div>
      </header>
    </div>
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
  const [audience, setAudience] = useState<"today" | "future">("today")
  const [prompt, setPrompt] = useState("")
  const [demoMode, setDemoMode] = useState<"money" | "life">("money")
  const today = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" }).format(now)
  const money = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount)
  const balance = snapshot.income - snapshot.expense
  const progress = Math.max(0, Math.min(Math.round((Math.max(0, balance - snapshot.goalStartBalance) / snapshot.goal) * 100), 100))
  useEffect(() => {
    const refresh = () => { setSnapshot(readHomeSnapshot()); setNow(new Date()) }
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.startsWith("lamoon-")) refresh() }
    window.addEventListener("storage", onStorage); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh)
    const clock = window.setInterval(() => setNow(new Date()), 60000); refresh()
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.clearInterval(clock) }
  }, [])
  const cards = demoMode === "money" ? [
    { tag: "MONEY", color: "lavender", title: "ฉันใช้เงินไปกับอะไรเยอะที่สุด?", text: "มองหารูปแบบการใช้เงินของตัวเอง", page: "saving" as Page },
    { tag: "GOALS", color: "peach", title: "วางแผนเงินเก็บก้อนแรก", text: "เปลี่ยนเป้าหมายให้เป็นแผนที่ทำได้", page: "saving" as Page },
    { tag: "CLARITY", color: "mint", title: "เริ่มบันทึกวันนี้", text: "เริ่มจากหนึ่งรายการก็เพียงพอ", page: "saving" as Page },
  ] : [
    { tag: "WELLBEING", color: "peach", title: "วันนี้ฉันดูแลตัวเองหรือยัง?", text: "บันทึกการขยับร่างกายและการพักผ่อน", page: "health" as Page },
    { tag: "THOUGHTS", color: "lavender", title: "มีเรื่องไหนที่อยากเก็บไว้ไหม?", text: "จดความคิดสั้น ๆ ก่อนจะลืม", page: "notes" as Page },
    { tag: "DAILY", color: "mint", title: "ทำวันธรรมดาให้ดีขึ้น", text: "เลือกสิ่งเล็ก ๆ ที่อยากทำให้ตัวเอง", page: "health" as Page },
  ]
  const modules = [
    { id: "saving" as const, no: "01", color: "violet", tag: "MONEY, MADE CLEAR", heading: "คุณตั้งเป้าหมายไว้\nMll ช่วยให้มองเห็นทาง", body: "จดรายรับรายจ่าย เห็นยอดคงเหลือ และติดตามเป้าหมายการออม โดยไม่ต้องเปิดหลายแอป", page: "saving" as Page, action: "เปิดพื้นที่การเงิน" },
    { id: "health" as const, no: "02", color: "pink", tag: "CARE, AT YOUR PACE", heading: "คุณค่อย ๆ ลงมือ\nMll ช่วยเก็บความคืบหน้า", body: "บันทึกน้ำหนัก การออกกำลังกาย และกิจวัตรสุขภาพ เพื่อเห็นความเปลี่ยนแปลงในระยะยาว", page: "health" as Page, action: "เปิดพื้นที่สุขภาพ" },
    { id: "notes" as const, no: "03", color: "orange", tag: "THOUGHTS, KEPT", heading: "ความคิดดี ๆ ไม่ต้องหายไป\nMll ช่วยเก็บมันไว้", body: "รวมไอเดีย บันทึกสั้น ๆ และเรื่องที่อยากกลับมาอ่านไว้ในพื้นที่เดียว", page: "notes" as Page, action: "เปิดพื้นที่โน้ต" },
  ]
  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = prompt.trim().toLowerCase()
    if (/สุขภาพ|น้ำหนัก|ออกกำลัง|เดิน|นอน/.test(value)) navigate("health")
    else if (/โน้ต|จด|ความคิด|บันทึกเรื่อง/.test(value)) navigate("notes")
    else navigate("saving")
  }
  return <main className="mll-home pancake-home">
    <section className="pancake-hero-wrap">
      <svg className="pancake-ribbon pancake-ribbon-hero" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-80 10 C220 0 220 245 500 180 S840 -45 1100 80 S1320 240 1520 90"/><path d="M-80 30 C220 20 235 265 510 200 S850 -25 1110 100 S1330 260 1520 110"/><path d="M-80 50 C220 40 250 285 520 220 S860 -5 1120 120 S1340 280 1520 130"/><path d="M-80 70 C220 60 265 305 530 240 S870 15 1130 140 S1350 300 1520 150"/><path d="M-80 90 C220 80 280 325 540 260 S880 35 1140 160 S1360 320 1520 170"/>
      </svg>
      <div className="pancake-navline">
        <button className="pancake-wordmark" onClick={() => navigate("home")}><span className="pancake-mark">m</span><span>Mll</span><sup>PRIVATE SPACE</sup></button>
        <nav className="pancake-navlinks" aria-label="พื้นที่หลัก"><button onClick={() => navigate("saving")}>การเงิน <span>↘</span></button><button onClick={() => navigate("health")}>สุขภาพ <span>↘</span></button><button onClick={() => navigate("notes")}>โน้ต</button><a href="#how-it-works">วิธีใช้งาน</a><a href="#pricing">ราคา</a></nav>
        <div className="pancake-navright"><span className="pancake-private-label">พื้นที่ส่วนตัว</span><button className="pancake-dark-pill" onClick={() => navigate("saving")}>เริ่มใช้งาน <span>↗</span></button></div>
      </div>
      <div className="pancake-hero-content">
        <div className="pancake-hero-copy"><p className="pancake-eyebrow"><span /> YOUR LIFE, IN ONE PLACE</p><h1>จัดระเบียบชีวิต<br />ให้เป็น <em>แบบของคุณ</em></h1></div>
        <div className="pancake-hero-side"><div className="pancake-toggle" role="group" aria-label="เลือกมุมมอง"><button className={audience === "today" ? "active" : ""} onClick={() => setAudience("today")}>สำหรับวันนี้</button><button className={audience === "future" ? "active" : ""} onClick={() => setAudience("future")}>เพื่อวันข้างหน้า</button></div>
          <p>{audience === "today" ? "ดูแลเรื่องเล็ก ๆ ในแต่ละวัน ตั้งแต่เงินที่ใช้ไปจนถึงความคิดที่อยากเก็บไว้" : "ค่อย ๆ สร้างนิสัยที่ดี ด้วยภาพรวมที่ช่วยให้เห็นว่าคุณกำลังไปทางไหน"}</p>
          <div className="pancake-hero-buttons"><button className="pancake-dark-pill" onClick={() => navigate("saving")}>เปิดพื้นที่ของฉัน <span>↗</span></button><button className="pancake-peach-pill" onClick={() => document.getElementById("product-demo")?.scrollIntoView({ behavior: "smooth" })}>ดูว่าเริ่มยังไง</button></div>
          <div className="pancake-trustline"><span>⌑</span> พื้นที่ส่วนตัวของคุณ <i />ใช้ฟรี · ไม่มีค่าสมาชิก</div>
        </div>
      </div>
    </section>
    <section id="product-demo" className="pancake-demo-section"><div className="pancake-demo-card">
      <div className="pancake-demo-top"><span className="pancake-mini-label">A LITTLE MORE CLARITY</span><span className="pancake-demo-counter">MLL / 01</span></div>
      <h2>วันนี้อยากเริ่มจากเรื่องไหน?</h2><p className="pancake-demo-subtitle">เลือกพื้นที่ที่ต้องการ หรือพิมพ์สิ่งที่อยากจัดการ แล้วไปต่อได้เลย</p>
      <form className="pancake-prompt" onSubmit={submitPrompt}><span className="pancake-prompt-symbol">✳</span><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="เช่น อยากจัดการรายจ่าย หรือบันทึกการออกกำลัง…" aria-label="บอกสิ่งที่อยากจัดการ" /><button type="submit" aria-label="ไปยังพื้นที่ที่เกี่ยวข้อง">↗</button></form>
      <div className="pancake-suggestions">{cards.map((item) => <button key={item.title} className="pancake-suggestion" onClick={() => navigate(item.page)}><span className={"pancake-tag " + item.color}>{item.tag}</span><strong>{item.title}</strong><small>{item.text}</small><span className="pancake-suggestion-arrow">↗</span></button>)}</div>
      <div className="pancake-demo-foot"><span>ไม่ต้องทำทุกอย่างในวันเดียว</span><span>เลือกทีละเรื่อง <b>→</b></span></div>
    </div><div className="pancake-demo-switch"><span>เลือกมุมมอง</span><div className="pancake-toggle compact" role="group" aria-label="เปลี่ยนตัวอย่าง"><button className={demoMode === "money" ? "active" : ""} onClick={() => setDemoMode("money")}>เงินและเป้าหมาย</button><button className={demoMode === "life" ? "active" : ""} onClick={() => setDemoMode("life")}>ชีวิตประจำวัน</button></div></div></section>
    <section className="pancake-proof"><p className="pancake-mini-label">YOUR PERSONAL SPACE, AT A GLANCE</p><div className="pancake-proof-words"><span>เงิน <i>✳</i></span><span>สุขภาพ</span><span>ความคิด <i>✳</i></span><span>เป้าหมาย</span><span>กิจวัตร</span><span>ความทรงจำ</span></div><p className="pancake-proof-note">สามพื้นที่ที่ทำงานร่วมกัน เพื่อให้ทุกวันของคุณชัดเจนขึ้น</p></section>
    <section id="how-it-works" className="pancake-statement"><p className="pancake-eyebrow"><span /> SMALL STEPS, YOUR OWN PACE</p><h2>ในขณะที่คุณใช้ชีวิต<br /><em>Mll ช่วยให้เรื่องสำคัญไม่หลุดมือ</em></h2><p>ไม่ใช่การทำให้ทุกอย่างสมบูรณ์แบบ แต่เป็นพื้นที่ให้คุณกลับมาดูแลสิ่งที่มีความหมายได้เสมอ</p></section>
    <section className="pancake-feature-list">{modules.map((item, index) => <article key={item.id} className={"pancake-feature-panel feature-" + item.color}>
      <div className="pancake-feature-copy"><span className={"pancake-feature-number " + item.color}>{item.no}</span><p className="pancake-mini-label">{item.tag}</p><h3>{item.heading.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h3><p className="pancake-feature-body">{item.body}</p><button className="pancake-text-link" onClick={() => navigate(item.page)}>{item.action} <span>↗</span></button></div>
      <div className={"pancake-product-visual visual-" + item.color}>
        {index === 0 ? <div className="pancake-visual-ledger"><div className="pancake-visual-heading"><span>ภาพรวมการเงิน</span><span className="pancake-status-dot" /></div><small>ยอดสุทธิที่บันทึกไว้</small><strong>{money(balance)}</strong><div className="pancake-ledger-bars"><span style={{ height: "36%" }} /><span style={{ height: "58%" }} /><span style={{ height: "42%" }} /><span style={{ height: "76%" }} /><span style={{ height: "52%" }} /><span style={{ height: "88%" }} /><span style={{ height: "66%" }} /></div><div className="pancake-ledger-row"><span>รายรับทั้งหมด</span><b>{money(snapshot.income)}</b></div><div className="pancake-ledger-row"><span>รายจ่ายทั้งหมด</span><b>{money(snapshot.expense)}</b></div><div className="pancake-visual-foot"><span>เป้าหมายการออม</span><b>{progress}%</b></div><div className="pancake-progress-track"><span style={{ width: progress + "%" }} /></div></div>
        : index === 1 ? <><div className="pancake-float-card health-float-back"><span>สม่ำเสมอสำคัญกว่าสมบูรณ์แบบ</span><b>วันนี้ก็นับนะ ✳</b></div><div className="pancake-visual-health"><div className="pancake-visual-heading"><span>บันทึกสุขภาพ</span><span>↗</span></div><div className="pancake-health-ring"><div><strong>{snapshot.healthWeight === null ? "—" : snapshot.healthWeight}</strong><small>กิโลกรัม</small></div></div><div className="pancake-health-bottom"><span>กิจกรรมวันนี้</span><b>{snapshot.todayExerciseCount} รายการ</b></div><div className="pancake-health-chip">✳ {snapshot.todayWellness ? "บันทึกการดูแลตัวเองแล้ว" : "ทุกก้าวมีความหมาย"}</div></div></>
        : <div className="pancake-visual-notes"><div className="pancake-note-window"><div className="pancake-note-window-top"><span /><span /><span /><small>พื้นที่ความคิด</small></div><div className="pancake-note-paper"><span>บันทึกที่อยากเก็บไว้</span><strong>{snapshot.lastNoteTitle || "ไอเดียเล็ก ๆ ของวันนี้"}</strong><p>บางเรื่องไม่ต้องรีบหาคำตอบ แค่เก็บไว้ให้กลับมาอ่านอีกครั้งก็พอ</p><div className="pancake-note-paper-foot"><span>MY NOTES</span><b>✳</b></div></div><div className="pancake-note-count"><strong>{snapshot.notesCount}</strong><span>โน้ตที่เก็บไว้</span></div></div></div>}
      </div>
    </article>)}</section>
    <section className="pancake-breathing-band" aria-label="พื้นที่พักสายต"><div className="pancake-band-orbit" /><span>PAUSE. BREATHE. BEGIN AGAIN.</span></section>
    <section className="pancake-cta-wrap"><svg className="pancake-cta-ribbon left" viewBox="0 0 120 360" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 0 C100 60 -10 120 70 180 S20 300 120 360"/><path d="M-20 0 C100 60 0 120 80 180 S30 300 120 360"/><path d="M-20 0 C100 60 10 120 90 180 S40 300 120 360"/><path d="M-20 0 C100 60 20 120 100 180 S50 300 120 360"/><path d="M-20 0 C100 60 30 120 110 180 S60 300 120 360"/></svg>
      <div className="pancake-cta-inner"><p className="pancake-eyebrow"><span /> YOUR SPACE IS READY</p><h2>เริ่มจากเรื่องเล็ก ๆ<br /><em>ที่สำคัญกับคุณ</em></h2><p>ทุกเครื่องมืออยู่ในพื้นที่เดียว ใช้ได้ฟรีและค่อย ๆ ปรับให้เข้ากับชีวิตของคุณ</p><div className="pancake-hero-buttons"><button className="pancake-dark-pill" onClick={() => navigate("saving")}>เริ่มใช้งาน Mll <span>↗</span></button><button className="pancake-peach-pill" onClick={() => navigate("notes")}>จดความคิดแรก</button></div></div>
      <svg className="pancake-cta-ribbon right" viewBox="0 0 120 360" preserveAspectRatio="none" aria-hidden="true"><path d="M140 0 C20 60 130 120 50 180 S100 300 0 360"/><path d="M140 0 C20 60 120 120 40 180 S90 300 0 360"/><path d="M140 0 C20 60 110 120 30 180 S80 300 0 360"/><path d="M140 0 C20 60 100 120 20 180 S70 300 0 360"/><path d="M140 0 C20 60 90 120 10 180 S60 300 0 360"/></svg></section>
    <section id="pricing" className="pancake-pricing"><div className="pancake-pricing-left"><p className="pancake-eyebrow"><span /> SIMPLE BY DESIGN</p><h2>พื้นที่ของคุณ<br />ไม่ควรมีราคา</h2><p className="pancake-price"><span>เริ่มต้นที่</span><strong>฿0<small>/ ตลอดไป</small></strong></p></div><div className="pancake-pricing-right"><p className="pancake-mini-label">EVERYDAY TOOLS, INCLUDED</p><ul><li><span>✓</span> บันทึกรายรับ รายจ่าย และเป้าหมาย</li><li><span>✓</span> ติดตามสุขภาพและกิจกรรมประจำวัน</li><li><span>✓</span> เก็บโน้ตและความคิดสำคัญ</li><li><span>✓</span> ดูข้อมูลสรุปในพื้นที่เดียว</li><li><span>✓</span> ใช้งานได้ทั้งมือถือและคอมพิวเตอร์</li><li><span>✓</span> ไม่มีค่าสมาชิกแอบแฝง</li></ul><button className="pancake-dark-pill" onClick={() => navigate("saving")}>ไปยังพื้นที่ส่วนตัว <span>↗</span></button><p className="pancake-pricing-note">ใช้ฟรี · ไม่มีระบบเรียกเก็บเงิน</p></div></section>
    <footer className="pancake-footer"><svg className="pancake-ribbon pancake-ribbon-footer" viewBox="0 0 1440 230" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 20 C240 180 330 0 560 100 S900 260 1120 90 S1360 10 1480 130"/><path d="M-20 40 C240 200 330 20 560 120 S900 280 1120 110 S1360 30 1480 150"/><path d="M-20 60 C240 220 330 40 560 140 S900 300 1120 130 S1360 50 1480 170"/><path d="M-20 80 C240 240 330 60 560 160 S900 320 1120 150 S1360 70 1480 190"/><path d="M-20 100 C240 260 330 80 560 180 S900 340 1120 170 S1360 90 1480 210"/></svg><div className="pancake-footer-main"><div className="pancake-footer-brand"><button className="pancake-footer-wordmark" onClick={() => navigate("home")}>Mll<span>✳</span></button><p>พื้นที่เล็ก ๆ สำหรับสิ่งสำคัญ<br />ในชีวิตของคุณ</p></div><div className="pancake-footer-column"><b>พื้นที่ของฉัน</b><button onClick={() => navigate("saving")}>การเงิน</button><button onClick={() => navigate("health")}>สุขภาพ</button><button onClick={() => navigate("notes")}>โน้ต</button></div><div className="pancake-footer-column"><b>เริ่มต้นใช้งาน</b><a href="#how-it-works">วิธีใช้งาน</a><a href="#pricing">ราคา</a><button onClick={() => navigate("saving")}>เปิดพื้นที่ส่วนตัว</button></div><div className="pancake-footer-column"><b>เกี่ยวกับ Mll</b><span>พื้นที่ส่วนตัว</span><span>ใช้ฟรี</span><span>ออกแบบเพื่อทุกวัน</span></div></div><div className="pancake-footer-bottom"><span>© Mll · YOUR PERSONAL SPACE</span><span>Made for your everyday, with care.</span><div><a href="#privacy" onClick={(e) => e.preventDefault()}>ความเป็นส่วนตัว</a><a href="#terms" onClick={(e) => e.preventDefault()}>เงื่อนไขการใช้งาน</a></div></div></footer>
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
      <header data-workspace-id="health-header" className="relative mb-7 grid min-h-[250px] overflow-hidden border border-[#141513] bg-[#FCFBF7] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end lg:p-12">
        <div className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full border border-[#D8D3C5] sm:right-10 sm:top-[-70px] sm:h-80 sm:w-80" />
        <div className="pointer-events-none absolute right-8 top-0 h-36 w-36 rounded-full border border-[#D8D3C5] sm:right-24 sm:top-[-5px] sm:h-56 sm:w-56" />
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#B94E3D]"><span className="h-2 w-2 bg-[#F87562]" /> MLL / WELLBEING / 02</p>
          <h1 className="max-w-xl text-[clamp(2.6rem,6.8vw,5.2rem)] font-medium leading-[.96] tracking-[-.075em] text-[#141513]">ดูแลตัวเอง.<br /><span className="font-light italic text-[#B94E3D]">ทีละวัน</span></h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#777A71]">ติดตามน้ำหนัก การเคลื่อนไหว และกิจวัตรที่ช่วยให้คุณรู้สึกดีขึ้นอย่างต่อเนื่อง</p>
        </div>
        <div className="relative z-10 mt-7 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
          <select aria-label="เลือกโปรไฟล์" value={profile.id} onChange={(e) => setData((old) => ({ ...old, activeProfileId: e.target.value }))} className="h-11 max-w-[180px] border border-[#D8D3C5] bg-[#F3F0E7] px-4 text-sm text-[#141513]">{data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={() => { setShowAdd(true); setKind("weight") }} className="inline-flex h-11 items-center gap-2 border border-[#141513] bg-[#141513] px-5 text-sm font-medium text-[#F3F0E7] hover:bg-[#55745B]"><Icon name="plus" className="h-4 w-4" /> บันทึกข้อมูล</button>
        </div>
      </header>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-[#141513] bg-transparent pb-0">{([{id:"overview",label:"ภาพรวม"},{id:"records",label:"ประวัติและปฏิทิน"},{id:"profiles",label:"โปรไฟล์"}] as const).map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={"border-b-2 px-4 py-3 text-sm transition " + (tab === t.id ? "border-[#F87562] font-semibold text-[#141513]" : "border-transparent text-[#747970] hover:text-[#141513]")}>{t.label}</button>)}</div>
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
      {page !== "home" && <Header current={page} onOpenSearch={openSearch} />}
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
