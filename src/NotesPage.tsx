import { useEffect, useMemo, useState, type FormEvent } from "react"

type Mood = "happy" | "neutral" | "sad"
type Entry = {
  id: string
  title: string
  body: string
  tags: string[]
  mood: Mood
  pinned: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "lamoon-commonplace-notes-v1"
const moods: { id: Mood; label: string; icon: string }[] = [
  { id: "happy", label: "ดีใจ", icon: "☀" },
  { id: "neutral", label: "เฉย ๆ", icon: "—" },
  { id: "sad", label: "เศร้า", icon: "☁" },
]
const moodLabel = (mood: Mood) => moods.find((m) => m.id === mood) ?? moods[1]
const inputClass = "mt-1.5 w-full rounded-xl border border-[#E1DDCF] bg-white px-3.5 py-3 text-sm text-[#263329] outline-none placeholder:text-[#A2A49C] focus:border-[#9AA68F]"

function readEntries(): Entry[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export default function NotesPage({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[]>(readEntries)
  const [search, setSearch] = useState("")
  const [moodFilter, setMoodFilter] = useState<"all" | Mood>("all")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [mood, setMood] = useState<Mood>("neutral")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries
      .filter((entry) => moodFilter === "all" || entry.mood === moodFilter)
      .filter((entry) => !query || [entry.title, entry.body, ...entry.tags].join(" ").toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [entries, moodFilter, search])

  function startNew() {
    setActiveId(null)
    setTitle("")
    setBody("")
    setTagsText("")
    setMood("neutral")
    setEditing(true)
  }

  function openEntry(entry: Entry) {
    setActiveId(entry.id)
    setTitle(entry.title)
    setBody(entry.body)
    setTagsText(entry.tags.join(", "))
    setMood(entry.mood)
    setEditing(false)
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() && !body.trim()) return
    const now = new Date().toISOString()
    const tags = [...new Set(tagsText.split(",").map((tag) => tag.trim()).filter(Boolean))]
    if (activeId) {
      setEntries((old) => old.map((entry) => entry.id === activeId ? { ...entry, title: title.trim(), body: body.trim(), tags, mood, updatedAt: now } : entry))
    } else {
      const entry: Entry = { id: crypto.randomUUID(), title: title.trim(), body: body.trim(), tags, mood, pinned: false, createdAt: now, updatedAt: now }
      setEntries((old) => [entry, ...old])
      setActiveId(entry.id)
    }
    setEditing(false)
  }

  function removeEntry(id: string) {
    if (!window.confirm("ลบโน้ตนี้ใช่ไหม?")) return
    setEntries((old) => old.filter((entry) => entry.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setEditing(false)
      setTitle("")
      setBody("")
      setTagsText("")
    }
  }

  function togglePin(id: string) {
    setEntries((old) => old.map((entry) => entry.id === id ? { ...entry, pinned: !entry.pinned, updatedAt: new Date().toISOString() } : entry))
  }

  const activeEntry = entries.find((entry) => entry.id === activeId)
  const dateLabel = (date: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
  const fieldLabel = "block text-sm font-medium text-[#4C554D]"

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-5 md:px-8 md:pt-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-4 text-sm text-[#747970] hover:text-[#263329]">← กลับหน้าหลัก</button>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8C8D78]">YOUR COMMONPLACE BOOK</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#263329] md:text-4xl">สมุดสะสมความคิด</h1>
          <p className="mt-2 text-sm text-[#858880]">สิ่งที่ชอบ ความคิดที่อยากเก็บ และความรู้สึกในวันนั้น</p>
        </div>
        <button onClick={startNew} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#263329] px-5 text-sm font-medium text-white hover:bg-[#3B4A3E]">＋ เขียนโน้ตใหม่</button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="min-w-0 rounded-[26px] border border-[#E1DDCF] bg-white/65 p-4 md:p-5">
          <label className="block">
            <span className="sr-only">ค้นหาโน้ต</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาความคิดหรือแท็ก…" className={inputClass + " mt-0"} />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setMoodFilter("all")} className={"rounded-full px-3 py-1.5 text-xs " + (moodFilter === "all" ? "bg-[#263329] text-white" : "bg-[#F3F0E7] text-[#73786F]")}>ทั้งหมด</button>
            {moods.map((item) => <button key={item.id} onClick={() => setMoodFilter(item.id)} className={"rounded-full px-3 py-1.5 text-xs " + (moodFilter === item.id ? "bg-[#263329] text-white" : "bg-[#F3F0E7] text-[#73786F]")}>{item.icon} {item.label}</button>)}
          </div>
          <div className="mt-5 flex items-center justify-between border-b border-[#E8E4D9] pb-3">
            <p className="text-sm font-semibold text-[#263329]">บันทึกของคุณ</p>
            <span className="text-xs text-[#92958D]">{filtered.length} รายการ</span>
          </div>
          <div className="mt-2 space-y-1">
            {filtered.map((entry) => <button key={entry.id} onClick={() => openEntry(entry)} className={"block w-full rounded-2xl p-3.5 text-left transition-colors " + (activeId === entry.id && !editing ? "bg-[#F0EEE4]" : "hover:bg-[#F7F5EF]")}>
              <div className="flex items-center gap-2">
                {entry.pinned && <span className="text-xs text-[#8B866D]" aria-label="ปักหมุด">◆</span>}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#354036]">{entry.title || "ไม่มีชื่อเรื่อง"}</span>
                <span className="text-sm text-[#7C8277]" title={moodLabel(entry.mood).label}>{moodLabel(entry.mood).icon}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#858880]">{entry.body || entry.tags.join(" · ") || "ไม่มีเนื้อหา"}</p>
              <p className="mt-2 text-[11px] text-[#A0A197]">{dateLabel(entry.updatedAt)}</p>
            </button>)}
            {!filtered.length && <div className="px-3 py-10 text-center"><p className="text-sm text-[#777D73]">{entries.length ? "ไม่พบโน้ตที่ตรงกับการค้นหา" : "สมุดยังว่างอยู่"}</p><p className="mt-1 text-xs text-[#A0A197]">เริ่มเก็บความคิดแรกของคุณได้เลย</p></div>}
          </div>
        </aside>

        <section className="min-h-[430px] rounded-[26px] border border-[#E1DDCF] bg-white/65 p-5 md:p-8">
          {editing ? <form onSubmit={saveEntry} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8C8D78]">{activeId ? "EDIT ENTRY" : "NEW ENTRY"}</p>
              <button type="button" onClick={() => { setEditing(false); if (activeEntry) openEntry(activeEntry) }} className="text-sm text-[#858880]">ยกเลิก</button>
            </div>
            <label className={fieldLabel}>หัวข้อ<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เรื่องที่อยากจำ…" className={inputClass} /></label>
            <label className={fieldLabel}>บันทึกความคิด<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="เขียนสิ่งที่ชอบ ไอเดีย หรือเรื่องที่เกิดขึ้น…" rows={8} className={inputClass + " resize-y leading-7"} /></label>
            <label className={fieldLabel}>แท็ก<input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="เช่น หนังสือ, ไอเดีย, คำคม (คั่นด้วยจุลภาค)" className={inputClass} /></label>
            <fieldset>
              <legend className="text-sm font-medium text-[#4C554D]">ตอนเขียนโน้ตนี้รู้สึกอย่างไร?</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {moods.map((item) => <button key={item.id} type="button" onClick={() => setMood(item.id)} className={"rounded-2xl border px-3 py-3 text-sm transition-colors " + (mood === item.id ? "border-[#AAB4A1] bg-[#F0F1E8] text-[#263329]" : "border-[#E5E1D7] bg-white text-[#72786F] hover:bg-[#F8F7F2]")}><span className="block text-lg">{item.icon}</span><span className="mt-1 block">{item.label}</span></button>)}
              </div>
            </fieldset>
            <button type="submit" className="h-11 w-full rounded-full bg-[#263329] text-sm font-medium text-white hover:bg-[#3B4A3E]">บันทึกโน้ต</button>
          </form> : activeEntry ? <article>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-[#F3F0E7] px-3 py-1.5 text-xs text-[#6F766B]">{moodLabel(activeEntry.mood).icon} {moodLabel(activeEntry.mood).label}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => togglePin(activeEntry.id)} className="text-sm text-[#747970] hover:text-[#263329]">{activeEntry.pinned ? "เลิกปักหมุด" : "ปักหมุด"}</button>
                <button onClick={() => { setTitle(activeEntry.title); setBody(activeEntry.body); setTagsText(activeEntry.tags.join(", ")); setMood(activeEntry.mood); setEditing(true) }} className="text-sm text-[#747970] hover:text-[#263329]">แก้ไข</button>
                <button onClick={() => removeEntry(activeEntry.id)} className="text-sm text-[#A65D4D]">ลบ</button>
              </div>
            </div>
            <h2 className="mt-6 whitespace-pre-wrap break-words text-2xl font-semibold leading-snug tracking-[-0.04em] text-[#263329] md:text-3xl">{activeEntry.title || "ไม่มีชื่อเรื่อง"}</h2>
            <p className="mt-2 text-xs text-[#9A9C93]">บันทึกล่าสุด {dateLabel(activeEntry.updatedAt)}</p>
            <div className="my-6 border-t border-[#E8E4D9]" />
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#4D574E]">{activeEntry.body || "ไม่มีเนื้อหา"}</p>
            {!!activeEntry.tags.length && <div className="mt-6 flex flex-wrap gap-2">{activeEntry.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F3F0E7] px-3 py-1.5 text-xs text-[#70776C]">#{tag}</span>)}</div>}
            <p className="mt-8 border-t border-[#E8E4D9] pt-4 text-xs text-[#A0A197]">สร้างเมื่อ {dateLabel(activeEntry.createdAt)}</p>
          </article> : <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F0EEE4] text-xl text-[#65715F]">✳</span>
            <h2 className="mt-5 text-xl font-semibold text-[#263329]">พื้นที่เก็บสิ่งที่อยากจำ</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#858880]">คำพูดที่ประทับใจ ไอเดียที่แวบเข้ามา หรือความรู้สึกในวันหนึ่ง เก็บไว้กลับมาอ่านเมื่อไรก็ได้</p>
            <button onClick={startNew} className="mt-5 rounded-full bg-[#263329] px-5 py-2.5 text-sm font-medium text-white">เขียนบันทึกแรก</button>
          </div>}
        </section>
      </section>
      <p className="mt-4 text-xs text-[#9A9C93]">บันทึกเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้</p>
    </main>
  )
}
