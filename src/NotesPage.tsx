import { useEffect, useMemo, useState, type FormEvent } from "react"

type Mood = "happy" | "neutral" | "sad"
type Entry = { id: string; title: string; body: string; tags: string[]; mood: Mood; pinned: boolean; createdAt: string; updatedAt: string }

const STORAGE_KEY = "lamoon-commonplace-notes-v1"
const moods: { id: Mood; label: string; icon: string; tone: string }[] = [
  { id: "happy", label: "ดีใจ", icon: "☀", tone: "bg-[#FBF1C9] text-[#B18B12]" },
  { id: "neutral", label: "เฉย ๆ", icon: "—", tone: "bg-[#EEF0E8] text-[#B18B12]" },
  { id: "sad", label: "เศร้า", icon: "☁", tone: "bg-[#E9EEF1] text-[#607782]" },
]
const moodLabel = (mood: Mood) => moods.find((m) => m.id === mood) ?? moods[1]
const inputClass = "mt-1.5 w-full rounded-xl border border-[#E1DDCF] bg-white px-3.5 py-3 text-sm text-[#141513] outline-none placeholder:text-[#A2A49C] focus:border-[#F0DCA9]"

function readEntries(): Entry[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export default function NotesPage({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[]>(readEntries)
  const [search, setSearch] = useState("")
  const [moodFilter, setMoodFilter] = useState<"all" | Mood>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [mood, setMood] = useState<Mood>("neutral")

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) }, [entries])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries
      .filter((entry) => moodFilter === "all" || entry.mood === moodFilter)
      .filter((entry) => !query || [entry.title, entry.body, ...entry.tags].join(" ").toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [entries, moodFilter, search])

  const dateLabel = (date: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
  const fieldLabel = "block text-sm font-medium text-[#4C554D]"

  function startNew() {
    setEditingId(null); setTitle(""); setBody(""); setTagsText(""); setMood("neutral"); setEditing(true)
  }
  function startEdit(entry: Entry) {
    setEditingId(entry.id); setTitle(entry.title); setBody(entry.body); setTagsText(entry.tags.join(", ")); setMood(entry.mood); setEditing(true)
  }
  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() && !body.trim()) return
    const now = new Date().toISOString()
    const tags = [...new Set(tagsText.split(",").map((tag) => tag.trim()).filter(Boolean))]
    if (editingId) {
      setEntries((old) => old.map((entry) => entry.id === editingId ? { ...entry, title: title.trim(), body: body.trim(), tags, mood, updatedAt: now } : entry))
    } else {
      const entry: Entry = { id: crypto.randomUUID(), title: title.trim(), body: body.trim(), tags, mood, pinned: false, createdAt: now, updatedAt: now }
      setEntries((old) => [entry, ...old])
    }
    setEditing(false); setEditingId(null)
  }
  function removeEntry(id: string) {
    if (!window.confirm("ลบโน้ตนี้ใช่ไหม?")) return
    setEntries((old) => old.filter((entry) => entry.id !== id))
    if (editingId === id) { setEditing(false); setEditingId(null) }
  }
  function togglePin(id: string) {
    setEntries((old) => old.map((entry) => entry.id === id ? { ...entry, pinned: !entry.pinned, updatedAt: new Date().toISOString() } : entry))
  }

  return (
    <main data-workspace-id="notes-page" className="mx-auto max-w-[1180px] px-5 pb-20 pt-5 md:px-8 md:pt-8">
      <header data-workspace-id="notes-header" className="relative mb-7 grid min-h-[250px] overflow-hidden border border-[#141513] bg-[#FCFBF7] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end lg:p-12">
        <div className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full border border-[#D8D3C5] sm:right-10 sm:top-[-70px] sm:h-80 sm:w-80" />
        <div className="pointer-events-none absolute right-8 top-0 h-36 w-36 rounded-full border border-[#D8D3C5] sm:right-24 sm:top-[-5px] sm:h-56 sm:w-56" />
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#92730B]"><span className="h-2 w-2 bg-[#F5C51B]" /> MLL / THOUGHTS / 03</p>
          <h1 className="max-w-xl text-[clamp(2.6rem,6.8vw,5.2rem)] font-medium leading-[.96] tracking-[-.075em] text-[#141513]">พื้นที่เก็บ<br /><span className="font-light italic text-[#92730B]">สิ่งที่สำคัญ</span></h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#777A71]">ไอเดีย เรื่องราว และความรู้สึกที่อยากเก็บไว้ กลับมาอ่านเมื่อไรก็ได้</p>
        </div>
        <div className="relative z-10 mt-7 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
          <button onClick={onBack} className="inline-flex h-11 items-center border border-[#D8D3C5] bg-[#F3F0E7] px-4 text-sm font-medium text-[#141513] hover:bg-[#FBF1C9]">หน้าหลัก</button>
          {!editing && <button onClick={startNew} className="inline-flex h-11 items-center gap-2 border border-[#141513] bg-[#141513] px-5 text-sm font-medium text-[#F3F0E7] transition hover:bg-[#55745B]">＋ เขียนโน้ตใหม่</button>}
        </div>
      </header>

      {editing && <><button type="button" aria-label="ปิดหน้าต่างโน้ต" onClick={() => { setEditing(false); setEditingId(null) }} className="fixed inset-0 z-40 cursor-default bg-[#1E2921]/40 backdrop-blur-sm" /><form onSubmit={saveEntry} className="fixed left-1/2 top-1/2 z-50 m-0 max-h-[92dvh] w-[calc(100vw-24px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#E1DDCF] bg-[#FCFBF7] p-5 shadow-[0_24px_80px_rgba(25,35,27,0.22)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8C8D78]">{editingId ? "EDIT ENTRY" : "NEW ENTRY"}</p><h2 className="mt-1 text-xl font-semibold text-[#141513]">{editingId ? "แก้ไขโน้ต" : "เขียนโน้ตใหม่"}</h2></div>
          <button type="button" onClick={() => { setEditing(false); setEditingId(null) }} className="rounded-full px-3 py-2 text-sm text-[#858880] hover:bg-[#F5F3EC]">ยกเลิก</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={fieldLabel}>หัวข้อ<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เรื่องที่อยากจำ…" className={inputClass} /></label>
          <label className={fieldLabel}>แท็ก<input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="หนังสือ, ไอเดีย, คำคม" className={inputClass} /></label>
          <label className={fieldLabel + " md:col-span-2"}>บันทึกความคิด<textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="เขียนสิ่งที่ชอบ ไอเดีย หรือเรื่องที่เกิดขึ้น…" rows={6} className={inputClass + " resize-y leading-7"} /></label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-[#4C554D]">วันนี้รู้สึกอย่างไร?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {moods.map((item) => <button key={item.id} type="button" onClick={() => setMood(item.id)} className={"rounded-full border px-4 py-2.5 text-sm transition " + (mood === item.id ? "border-[#AAB4A1] bg-[#F0F1E8] text-[#141513]" : "border-[#E5E1D7] bg-white text-[#72786F] hover:bg-[#F8F7F2]")}>{item.icon} {item.label}</button>)}
          </div>
        </fieldset>
        <div className="mt-6 flex justify-end"><button type="submit" className="h-11 w-full rounded-full bg-[#141513] px-7 text-sm font-medium text-white hover:bg-[#3B4A3E] sm:w-auto">บันทึกโน้ต</button></div>
      </form></>}

      <section>
        <div data-workspace-id="notes-filters" className="mb-5 rounded-[20px] border border-[#E1DDCF] bg-white/70 p-4 md:flex md:items-center md:justify-between md:gap-5">
          <label className="block md:min-w-[250px] md:flex-1"><span className="sr-only">ค้นหาโน้ต</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาหัวข้อ เนื้อหา หรือแท็ก…" className={inputClass + " mt-0"} /></label>
          <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">
            <span className="mr-1 text-xs text-[#92958D]">อารมณ์</span>
            <button onClick={() => setMoodFilter("all")} className={"rounded-full px-3 py-2 text-xs " + (moodFilter === "all" ? "bg-[#141513] text-white" : "bg-[#F3F0E7] text-[#73786F]")}>ทั้งหมด</button>
            {moods.map((item) => <button key={item.id} onClick={() => setMoodFilter(item.id)} className={"rounded-full px-3 py-2 text-xs " + (moodFilter === item.id ? "bg-[#141513] text-white" : "bg-[#F3F0E7] text-[#73786F]")}>{item.icon} {item.label}</button>)}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-[#354036]">บันทึกของคุณ</h2><span className="text-xs text-[#92958D]">{filtered.length} รายการ</span></div>
        {filtered.length > 0 ? <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => <article key={entry.id} data-workspace-id={`note-${entry.id}`} className="group flex min-h-[220px] flex-col rounded-[22px] border border-[#E5E1D7] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#F0DCA9] hover:shadow-[0_8px_24px_rgba(38,51,41,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] " + moodLabel(entry.mood).tone}>{moodLabel(entry.mood).icon} {moodLabel(entry.mood).label}</span>
              <div className="flex items-center gap-2">
                {entry.pinned && <span title="ปักหมุดแล้ว" className="text-xs text-[#8B866D]">◆</span>}
                <button onClick={() => togglePin(entry.id)} title={entry.pinned ? "เลิกปักหมุด" : "ปักหมุด"} className="rounded-full px-2 py-1 text-xs text-[#858880] hover:bg-[#F3F0E7]">{entry.pinned ? "ปักหมุดแล้ว" : "ปักหมุด"}</button>
              </div>
            </div>
            <h3 className="mt-4 break-words text-lg font-semibold leading-snug tracking-[-0.025em] text-[#141513]">{entry.title || "ไม่มีชื่อเรื่อง"}</h3>
            <p className="mt-2 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#687168] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden">{entry.body || "ไม่มีเนื้อหา"}</p>
            {!!entry.tags.length && <div className="mt-4 flex flex-wrap gap-1.5">{entry.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#F4F2EB] px-2.5 py-1 text-[11px] text-[#74796F]">#{tag}</span>)}{entry.tags.length > 3 && <span className="px-1 py-1 text-[11px] text-[#92958D]">+{entry.tags.length - 3}</span>}</div>}
            <div className="mt-5 flex items-center justify-between border-t border-[#F0EEE7] pt-3">
              <span className="text-[11px] text-[#A0A197]">{dateLabel(entry.updatedAt)}</span>
              <div className="flex gap-3"><button onClick={() => startEdit(entry)} className="text-xs text-[#9A722F] hover:text-[#141513]">แก้ไข</button><button onClick={() => removeEntry(entry.id)} className="text-xs text-[#B18B12] hover:text-[#9A722F]">ลบ</button></div>
            </div>
          </article>)}
        </div> : <div className="rounded-[24px] border border-dashed border-[#DAD8CC] bg-white/50 px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#F0EEE4] text-xl text-[#B18B12]">✳</span>
          <h3 className="mt-4 text-lg font-semibold text-[#141513]">{entries.length ? "ไม่พบโน้ตที่ค้นหา" : "สมุดยังว่างอยู่"}</h3>
          <p className="mt-2 text-sm text-[#858880]">{entries.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองอารมณ์" : "เริ่มเก็บความคิดแรกของคุณไว้ที่นี่"}</p>
          {!entries.length && !editing && <button onClick={startNew} className="mt-5 rounded-full bg-[#141513] px-5 py-2.5 text-sm font-medium text-white">เขียนบันทึกแรก</button>}
        </div>}
      </section>
      <p className="mt-5 text-xs text-[#9A9C93]">บันทึกเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้</p>
    </main>
  )
}
