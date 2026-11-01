import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { loadDayState, saveDayState, localDate, uid, type LoadedState } from "./dayState"

type Note = {
  id: string; title: string; body: string; kind: "note" | "diary"; date: string
  mood: string; tags: string[]; pinned: boolean; archived: boolean
  updatedAt: string; version: number; createdAt?: string
}
const moods = ["ดีใจ", "เฉยๆ", "เศร้า"]
const emptyNote = (): Note => ({
  id: uid(), title: "", body: "", kind: "diary", date: localDate(), mood: "",
  tags: [], pinned: false, archived: false, updatedAt: new Date().toISOString(), version: 1,
})

function normalizeNotes(raw: Record<string, unknown>[]): Note[] {
  return raw.filter(item => item && typeof item.id === "string").map(item => ({
    ...item,
    title: typeof item.title === "string" ? item.title : "",
    body: typeof item.body === "string" ? item.body : "",
    kind: item.kind === "note" ? "note" : "diary",
    date: typeof item.date === "string" ? item.date : localDate(),
    mood: typeof item.mood === "string" ? item.mood : "",
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
    pinned: Boolean(item.pinned),
    archived: Boolean(item.archived),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
    version: Number.isSafeInteger(item.version) ? Number(item.version) : 1,
  })) as Note[]
}

export default function Journal() {
  const loadedRef = useRef<LoadedState | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [moodFilter, setMoodFilter] = useState("all")
  const [editor, setEditor] = useState<Note | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const loaded = await loadDayState()
      loadedRef.current = loaded
      setNotes(normalizeNotes(loaded.state.notes))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "โหลดบันทึกส่วนตัวไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const activeNotes = notes.filter(note => !note.archived)
  const term = search.trim().toLocaleLowerCase()
  const visible = useMemo(() => activeNotes
    .filter(note => (moodFilter === "all" || note.mood === moodFilter) &&
      (!term || [note.title, note.body, note.tags.join(" "), note.date, note.mood]
        .join(" ").toLocaleLowerCase().includes(term)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) ||
      b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
  [notes, term, moodFilter])

  async function persist(next: Note[]) {
    if (!loadedRef.current || saving) return
    setSaving(true)
    setError("")
    try {
      const state = { ...loadedRef.current.state, notes: next }
      const revision = await saveDayState(loadedRef.current, state)
      loadedRef.current = { ...loadedRef.current, state, revision }
      setNotes(next)
      setEditor(null)
      setDeleteId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ")
      if ((cause as { status?: number }).status === 409) await load()
    } finally {
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!editor || saving) return
    const clean = {
      ...editor,
      title: editor.title.trim(),
      body: editor.body.trim(),
      tags: [...new Set(editor.tags.map(tag => tag.trim()).filter(Boolean))].slice(0, 100),
      updatedAt: new Date().toISOString(),
      version: notes.find(note => note.id === editor.id) ? (notes.find(note => note.id === editor.id)?.version || 1) + 1 : 1,
    }
    if (!clean.title && !clean.body) {
      setError("เขียนหัวข้อหรือเนื้อหาอย่างน้อยหนึ่งอย่าง")
      return
    }
    void persist(notes.some(note => note.id === clean.id)
      ? notes.map(note => note.id === clean.id ? clean : note)
      : [clean, ...notes])
  }

  if (loading) return <div className="dl-state"><span className="auth-loading-mark" /><p>กำลังเปิดพื้นที่บันทึกส่วนตัว…</p></div>

  return <section className="jr-wrap">
    <div className="jr-toolbar">
      <div><span className="dt-eyebrow">A PLACE FOR YOUR THOUGHTS</span><p>{activeNotes.length} เรื่องราวที่เก็บไว้</p></div>
      <button className="dl-primary" onClick={() => { setError(""); setEditor(emptyNote()) }}>＋ เขียนบันทึก</button>
    </div>

    {error && <p className="dl-error" role="alert">{error}</p>}

    <div className="jr-search-tools">
      <input type="search" aria-label="ค้นหาบันทึก" placeholder="ค้นหาหัวข้อ เนื้อหา หรือแท็ก…"
        value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="กรองตามความรู้สึก" value={moodFilter} onChange={event => setMoodFilter(event.target.value)}>
        <option value="all">ทุกความรู้สึก</option>
        {moods.map(mood => <option key={mood} value={mood}>{mood}</option>)}
      </select>
      <span className="jr-result-count" aria-live="polite">{visible.length} / {activeNotes.length} รายการ</span>
    </div>

    {visible.length === 0
      ? <div className="dl-empty">
        <span>♡</span>
        <b>{activeNotes.length ? "ไม่พบเรื่องราวที่ตรงกัน" : "พื้นที่เล็ก ๆ สำหรับความคิดของคุณ"}</b>
        <p>{activeNotes.length ? "ลองเปลี่ยนคำค้นหาหรือเลือกทุกความรู้สึก" : "จะเขียนเรื่องดี ๆ หรือเรื่องที่ยังค้างอยู่ในใจก็ได้"}</p>
        {activeNotes.length
          ? <button onClick={() => { setSearch(""); setMoodFilter("all") }}>ล้างตัวกรอง</button>
          : <button onClick={() => setEditor(emptyNote())}>เขียนบันทึกแรก</button>}
      </div>
      : <div className="jr-list">{visible.map(note => <article className="jr-entry" key={note.id}>
        <time className="jr-entry-date">{new Intl.DateTimeFormat("th-TH", {
          day: "numeric", month: "short", year: "numeric",
        }).format(new Date(note.date + "T12:00:00"))}</time>
        <div className="jr-entry-main">
          <div className="jr-entry-meta">
            <span className="jr-kind">{note.kind === "note" ? "โน้ต" : "ไดอารี่"}</span>
            {note.mood && <span className="jr-mood">{note.mood}</span>}
            {note.pinned && <span className="jr-pinned">ปักหมุด</span>}
          </div>
          <h3>{note.title || "ไม่มีหัวข้อ"}</h3>
          <p>{note.body || "ไม่มีรายละเอียด"}</p>
          {note.tags.length > 0 && <div className="jr-tags">{note.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
        </div>
        <div className="jr-entry-actions">
          <button onClick={() => { setEditor({ ...note }); setError("") }}>แก้ไข</button>
          <button onClick={() => void persist(notes.map(item => item.id === note.id ? { ...item, pinned: !item.pinned } : item))}>
            {note.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
          </button>
          <button className="danger" onClick={() => setDeleteId(note.id)}>ลบ</button>
        </div>
        {deleteId === note.id && <div className="dl-delete-confirm">
          <span>ลบเรื่องราวนี้ใช่ไหม?</span>
          <button onClick={() => void persist(notes.filter(item => item.id !== note.id))} disabled={saving}>ยืนยันลบ</button>
          <button onClick={() => setDeleteId(null)}>ยกเลิก</button>
        </div>}
      </article>)}</div>}

    {editor && <div className="dl-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) setEditor(null)
    }}>
      <form className="dl-editor jr-editor" onSubmit={submit}>
        <button type="button" className="dl-close" onClick={() => setEditor(null)}>×</button>
        <span className="dt-eyebrow">PERSONAL JOURNAL</span>
        <h2>{notes.some(note => note.id === editor.id) ? "แก้ไขเรื่องราว" : "เขียนสิ่งที่อยู่ในใจ"}</h2>

        <label htmlFor="jr-title">หัวข้อ</label>
        <input id="jr-title" maxLength={240} value={editor.title}
          onChange={event => setEditor({ ...editor, title: event.target.value })} placeholder="วันนี้อยากจดจำอะไร…" />
        <label htmlFor="jr-body">บันทึกของคุณ</label>
        <textarea id="jr-body" rows={8} maxLength={100000} value={editor.body}
          onChange={event => setEditor({ ...editor, body: event.target.value })} placeholder="ไม่ต้องเรียบเรียงให้สวยงาม เขียนตามที่รู้สึกได้เลย…" />

        <details className="jr-advanced">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <label htmlFor="jr-kind">รูปแบบ</label>
          <select id="jr-kind" value={editor.kind}
            onChange={event => setEditor({ ...editor, kind: event.target.value as Note["kind"] })}>
            <option value="diary">ไดอารี่</option>
            <option value="note">โน้ต</option>
          </select>
          <label htmlFor="jr-date">วันที่</label>
          <input id="jr-date" type="date" required value={editor.date}
            onChange={event => setEditor({ ...editor, date: event.target.value })} />
          <label>ความรู้สึกในวันนี้</label>
          <div className="dl-moods">{moods.map(mood => <button type="button" key={mood}
            className={editor.mood === mood ? "selected" : ""}
            onClick={() => setEditor({ ...editor, mood: editor.mood === mood ? "" : mood })}>
            {mood === "ดีใจ" ? "☀" : mood === "เฉยๆ" ? "○" : "☁"} {mood}
          </button>)}</div>
          <label htmlFor="jr-tags">แท็ก (คั่นด้วยเครื่องหมายจุลภาค)</label>
          <input id="jr-tags" value={editor.tags.join(", ")}
            onChange={event => setEditor({
              ...editor, tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean),
            })} placeholder="งาน, ครอบครัว, ความคิด" />
          <div className="jr-pin-toggle">
            <input id="jr-pin" type="checkbox" checked={editor.pinned}
              onChange={event => setEditor({ ...editor, pinned: event.target.checked })} />
            <label htmlFor="jr-pin">ปักหมุดเรื่องนี้ไว้ด้านบน</label>
          </div>
        </details>

        <div className="dl-editor-actions">
          <button type="button" className="dl-cancel" onClick={() => setEditor(null)} disabled={saving}>ยกเลิก</button>
          <button type="submit" className="dl-primary" disabled={saving}>{saving ? "กำลังบันทึก…" : "เก็บไว้ในบันทึกส่วนตัว"}</button>
        </div>
      </form>
    </div>}
  </section>
}
