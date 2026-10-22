import { useEffect, useState, type ReactNode } from "react"
import SavingsPage from "./SavingsPage"

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

function Header({ current }: { current: Page }) {
  return (
    <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 md:px-8 md:py-7">
      <Logo />
      <nav className="hidden items-center gap-1 rounded-full border border-[#E2DED1] bg-white/60 p-1.5 backdrop-blur md:flex">
        {(Object.keys(pageTitles) as Page[]).map((page) => (
          <button
            key={page}
            onClick={() => navigate(page)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              current === page
                ? "bg-[#263329] text-white"
                : "text-[#6D716B] hover:bg-white hover:text-[#263329]"
            }`}
          >
            {pageTitles[page]}
          </button>
        ))}
      </nav>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#F0C8B6] text-sm font-semibold text-[#733F34]">
        L
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
    color: "bg-[#F4C96B]",
    iconBg: "bg-[#FFE6A9]",
    detail: "เป้าหมายเดือนนี้ 68%",
  },
  {
    id: "health" as const,
    eyebrow: "ดูแลตัวเอง",
    title: "สุขภาพ",
    description: "บันทึกการนอน น้ำดื่ม และการเคลื่อนไหว",
    icon: "heart" as const,
    color: "bg-[#B8D8C0]",
    iconBg: "bg-[#D8EBDD]",
    detail: "วันนี้เดินแล้ว 5,840 ก้าว",
  },
  {
    id: "notes" as const,
    eyebrow: "พื้นที่ความคิด",
    title: "โน้ต",
    description: "เก็บทุกไอเดียและเรื่องสำคัญไว้ใกล้ตัว",
    icon: "note" as const,
    color: "bg-[#C9C0E8]",
    iconBg: "bg-[#E3DEF4]",
    detail: "มี 3 โน้ตที่ปักหมุด",
  },
]

function Home() {
  const today = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <main>
      <section className="mx-auto max-w-[1180px] px-5 pb-10 pt-8 md:px-8 md:pb-16 md:pt-16">
        <div className="mb-12 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[#70746E]">
              <span className="h-2 w-2 rounded-full bg-[#E8885C]" />
              {today}
            </div>
            <h1 className="text-[clamp(2.8rem,7vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-[#263329]">
              วันนี้ อยากดูแล
              <br />
              <span className="font-light italic text-[#E2734B]">
                เรื่องไหนดี?
              </span>
            </h1>
          </div>
          <div className="rounded-[30px] border border-[#DED9CA] bg-white/60 p-6 shadow-[0_18px_60px_rgba(48,52,43,0.06)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#96988F]">
                  ภาพรวมของคุณ
                </p>
                <p className="mt-1 text-lg font-semibold text-[#263329]">
                  ไปได้ดีเลย
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FCE1D3] text-[#C65E3D]">
                <Icon name="sparkle" className="h-5 w-5" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["68%", "การออม"],
                ["7 ชม.", "การนอน"],
                ["3", "งานวันนี้"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-[#F5F2E9] px-3 py-3.5"
                >
                  <p className="font-semibold text-[#263329]">{value}</p>
                  <p className="mt-0.5 text-xs text-[#83857D]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[#E2734B]">พื้นที่ของคุณ</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#263329] md:text-3xl">
              เลือกสิ่งที่อยากจัดการ
            </h2>
          </div>
          <p className="hidden text-sm text-[#868980] md:block">
            ทุกอย่างอยู่ในที่เดียว
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => navigate(section.id)}
              className={`${section.color} card-rise group relative min-h-[320px] overflow-hidden rounded-[32px] p-6 text-left md:p-7`}
            >
              <span className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-black/10" />
              <span className="absolute -right-1 top-10 h-24 w-24 rounded-full border border-black/10" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span
                    className={`${section.iconBg} grid h-14 w-14 place-items-center rounded-[20px] text-[#263329]`}
                  >
                    <Icon name={section.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-medium text-black/45">
                    0{index + 1}
                  </span>
                </div>
                <div className="mt-16">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                    {section.eyebrow}
                  </p>
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <h3 className="text-4xl font-semibold tracking-[-0.05em] text-[#263329]">
                        {section.title}
                      </h3>
                      <p className="mt-2 max-w-[230px] text-sm leading-6 text-[#3F493F]/75">
                        {section.description}
                      </p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#263329] text-white transition-transform duration-300 group-hover:-rotate-45">
                      <Icon name="arrow" className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-6 border-t border-black/10 pt-4 text-xs font-medium text-black/50">
                    {section.detail}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
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
      <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-[#F8F5EB] text-center">
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

      <section className="mt-5 grid gap-5 md:grid-cols-[0.85fr_1.3fr]">
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
            <button className="text-sm font-medium text-[#E2734B]">
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

export default function App() {
  const getPage = (): Page => {
    const hash = window.location.hash.replace("#", "") as Page
    return ["saving", "health", "notes"].includes(hash) ? hash : "home"
  }
  const [page, setPage] = useState<Page>(getPage)

  useEffect(() => {
    const onHashChange = () => {
      setPage(getPage())
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return (
    <div className="min-h-screen">
      <Header current={page} />
      {page === "home" ? (
        <Home />
      ) : page === "saving" ? (
        <SavingsPage onBack={() => navigate("home")} />
      ) : (
        <DetailPage page={page} />
      )}
      <footer className="mx-auto flex max-w-[1180px] items-center justify-between border-t border-[#DEDACD] px-5 py-7 text-xs text-[#8D9088] md:px-8">
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
