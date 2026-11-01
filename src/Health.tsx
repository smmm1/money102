import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { HEALTH_PROFILE_KEY, isModernState, loadDayState, saveDayState, localDateTime, uid, type LoadedState } from "./dayState"

type Metric = "weight" | "pressure" | "sleep" | "water" | "symptom" | "exercise"
type Entry = Record<string, unknown> & { id: string; date: string }
type FormValue = {
  kind: Metric; date: string; weight: string; sys: string; dia: string; pulse: string
  bedtime: string; wake: string; water: string; symptom: string; severity: string
  exercise: string; duration: string; note: string
}

const fresh = (): FormValue => ({
  kind: "weight", date: localDateTime(), weight: "", sys: "120", dia: "80", pulse: "",
  bedtime: "23:00", wake: "07:00", water: "250", symptom: "", severity: "3",
  exercise: "", duration: "30", note: "",
})
const txt = (value: unknown) => typeof value === "string" ? value : ""
const durationHours = (bed: string, wake: string) => {
  const [bh, bm] = bed.split(":").map(Number)
  const [wh, wm] = wake.split(":").map(Number)
  let minutes = wh * 60 + wm - (bh * 60 + bm)
  if (minutes <= 0) minutes += 1440
  return (minutes / 60).toFixed(1)
}
const validTime = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60)
}
const dateLabel = (value: string) => {
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric",
    hour: value.length > 10 ? "2-digit" : undefined,
    minute: value.length > 10 ? "2-digit" : undefined,
  }).format(date)
}

function toForm(entry: Entry): FormValue {
  const form = fresh()
  form.date = txt(entry.date) || localDateTime()
  form.note = txt(entry.note)
  const kind = entry.kind === "bloodPressure" ? "pressure" : entry.kind === "legacy" ? "exercise" : txt(entry.kind)
  form.kind = (["weight", "pressure", "sleep", "water", "symptom", "exercise"].includes(kind) ? kind : "weight") as Metric

  if (entry.kind === "weight") form.weight = String(entry.value ?? "")
  if (entry.kind === "bloodPressure") {
    form.sys = String(entry.systolic ?? 120)
    form.dia = String(entry.diastolic ?? 80)
    form.pulse = String(entry.pulse ?? "")
  }
  if (entry.kind === "pressure") {
    const pressure = txt(entry.value).split("/")
    form.sys = pressure[0] || "120"
    form.dia = pressure[1] || "80"
    form.pulse = (txt(entry.extra).match(/ชีพจร\s+(\d+)/) || [])[1] || ""
  }
  if (entry.kind === "water") form.water = String(entry.value ?? "")
  if (entry.kind === "sleep") {
    form.bedtime = txt(entry.bedtime) || ((txt(entry.extra).match(/เข้านอน\s+(\d{2}:\d{2})/) || [])[1] || "23:00")
    form.wake = txt(entry.wakeTime) || ((txt(entry.extra).match(/ตื่น\s+(\d{2}:\d{2})/) || [])[1] || "07:00")
  }
  if (entry.kind === "symptom") {
    form.symptom = txt(entry.title) || txt(entry.value)
    form.severity = String(entry.severity ?? ((txt(entry.extra).match(/(\d)\/5/) || [])[1] || "3"))
  }
  if (entry.kind === "legacy" || entry.kind === "exercise") {
    form.exercise = txt(entry.title) || txt(entry.value)
    const modernDuration = (txt(entry.extra).match(/(\d+)\s*นาที/) || [])[1]
    const legacyDuration = txt(entry.note).match(/(?:^| · )(\d+)\s*นาที$/)
    form.duration = modernDuration || (legacyDuration ? legacyDuration[1] : "") || "30"
    // Older records stored the duration at the end of the note; keep it out of the editable note field.
    if (entry.kind === "legacy" && legacyDuration) {
      form.note = txt(entry.note).slice(0, legacyDuration.index).trim()
    }
  }
  return form
}

function label(entry: Entry) {
  if (entry.kind === "weight") return "น้ำหนัก " + entry.value + " กก."
  if (entry.kind === "bloodPressure") return "ความดัน " + entry.systolic + "/" + entry.diastolic
  if (entry.kind === "pressure") return "ความดัน " + entry.value
  if (entry.kind === "water") return "ดื่มน้ำ " + entry.value + " มล."
  if (entry.kind === "sleep") return entry.bedtime ? "การนอน " + entry.bedtime + " – " + entry.wakeTime : "การนอน " + entry.value + " ชั่วโมง"
  if (entry.kind === "symptom") return "อาการ: " + (entry.title || entry.value)
  return "ออกกำลังกาย: " + (entry.title || entry.value)
}

export default function Health() {
  const loadedRef = useRef<LoadedState | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [height, setHeight] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editor, setEditor] = useState<FormValue | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const loaded = await loadDayState()
      loadedRef.current = loaded
      setEntries(loaded.state.health as Entry[])
      let profile: Record<string, unknown> = {}
      try { profile = JSON.parse(loaded.payload[HEALTH_PROFILE_KEY] || "{}") } catch { /* keep the empty profile */ }
      setHeight(typeof profile.heightCm === "number" ? String(profile.heightCm) : "")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "โหลดข้อมูลสุขภาพไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const sorted = useMemo(() => [...entries].sort((a, b) => txt(b.date).localeCompare(txt(a.date))), [entries])
  const latest = sorted.find(entry => entry.kind === "weight")
  const weights = sorted.filter(entry => entry.kind === "weight").slice(0, 8).reverse()
  const bmi = latest && Number(height) > 0 ? Number(latest.value) / ((Number(height) / 100) ** 2) : null

  async function persist(next: Entry[], nextHeight = height) {
    if (!loadedRef.current || saving) return
    setSaving(true)
    setError("")
    try {
      if (nextHeight.trim() && (!Number.isFinite(Number(nextHeight)) || Number(nextHeight) < 80 || Number(nextHeight) > 250)) {
        setError("ส่วนสูงต้องอยู่ระหว่าง 80–250 ซม.")
        return
      }
      const state = { ...loadedRef.current.state, health: next }
      const profile = JSON.stringify({ heightCm: nextHeight.trim() ? Number(nextHeight) : null })
      const revision = await saveDayState(loadedRef.current, state, { [HEALTH_PROFILE_KEY]: profile })
      loadedRef.current = {
        ...loadedRef.current, state, revision,
        payload: { ...loadedRef.current.payload, [HEALTH_PROFILE_KEY]: profile },
      }
      setEntries(next)
      setEditor(null)
      setEditingId(null)
      setDeleteId(null)
      setHeight(nextHeight)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ")
      if ((cause as { status?: number }).status === 409) await load()
    } finally {
      setSaving(false)
    }
  }

  function build(form: FormValue, old?: Entry): Entry | null {
    if (!form.date || !Number.isFinite(new Date(form.date).getTime())) return null
    const modern = isModernState(loadedRef.current!.state)
    const base = { id: old?.id || uid(), date: form.date, note: form.note.trim() }

    if (form.kind === "weight") {
      const value = Number(form.weight)
      if (!Number.isFinite(value) || value <= 0 || value > 500) return null
      return modern
        ? { ...base, kind: "weight", value: String(Number(value.toFixed(2))), extra: "" }
        : { ...base, kind: "weight", value }
    }
    if (form.kind === "pressure") {
      const systolic = Number(form.sys)
      const diastolic = Number(form.dia)
      const pulse = form.pulse ? Number(form.pulse) : undefined
      if (!Number.isInteger(systolic) || systolic < 1 || systolic > 300 ||
          !Number.isInteger(diastolic) || diastolic < 1 || diastolic > 250 ||
          (pulse !== undefined && (!Number.isInteger(pulse) || pulse < 1 || pulse > 250))) return null
      return modern
        ? { ...base, kind: "pressure", value: systolic + "/" + diastolic, extra: pulse ? "ชีพจร " + pulse + " ครั้ง/นาที" : "" }
        : { ...base, kind: "bloodPressure", systolic, diastolic, ...(pulse ? { pulse } : {}) }
    }
    if (form.kind === "sleep") {
      if (!validTime(form.bedtime) || !validTime(form.wake)) return null
      return modern
        ? { ...base, kind: "sleep", value: durationHours(form.bedtime, form.wake), extra: "เข้านอน " + form.bedtime + " · ตื่น " + form.wake }
        : { ...base, kind: "sleep", bedtime: form.bedtime, wakeTime: form.wake }
    }
    if (form.kind === "water") {
      const value = Number(form.water)
      if (!Number.isInteger(value) || value < 1 || value > 20000) return null
      return modern ? { ...base, kind: "water", value: String(value), extra: "" } : { ...base, kind: "water", value }
    }
    if (form.kind === "symptom") {
      if (!form.symptom.trim()) return null
      const severity = Number(form.severity)
      if (!Number.isInteger(severity) || severity < 1 || severity > 5) return null
      return modern
        ? { ...base, kind: "symptom", value: form.symptom.trim(), extra: "ระดับความรู้สึก: " + severity + "/5" }
        : { ...base, kind: "symptom", title: form.symptom.trim(), severity }
    }

    const duration = Number(form.duration)
    if (!form.exercise.trim() || !Number.isInteger(duration) || duration < 1 || duration > 1440) return null
    return modern
      ? { ...base, kind: "exercise", value: form.exercise.trim(), extra: duration + " นาที" }
      : { ...base, kind: "legacy", title: form.exercise.trim(), note: [form.note.trim(), duration + " นาที"].filter(Boolean).join(" · ") }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!editor || saving || !loadedRef.current) return
    const next = build(editor, editingId ? entries.find(entry => entry.id === editingId) : undefined)
    if (!next) {
      setError("ตรวจสอบค่าที่กรอกอีกครั้ง โดยเฉพาะตัวเลขและช่วงเวลา")
      return
    }
    void persist(editingId
      ? entries.map(entry => entry.id === editingId ? next : entry)
      : [next, ...entries])
  }

  const matchesType = (entry: Entry) => filter === "all" ||
    (filter === "pressure" ? ["pressure", "bloodPressure"].includes(txt(entry.kind)) :
      filter === "exercise" ? ["exercise", "legacy"].includes(txt(entry.kind)) : entry.kind === filter)
  const term = search.trim().toLocaleLowerCase()
  const filtered = sorted.filter(entry => matchesType(entry) && (!term ||
    [label(entry), txt(entry.note), txt(entry.date), dateLabel(txt(entry.date))]
      .join(" ").toLocaleLowerCase().includes(term)))

  if (loading) return <div className="dl-state"><span className="auth-loading-mark" /><p>กำลังโหลดประวัติสุขภาพ…</p></div>

  return <section className="hl-wrap">
    <div className="hl-toolbar">
      <div><span className="dt-eyebrow">YOUR WELLBEING, OVER TIME</span><p>{entries.length} รายการในประวัติสุขภาพ</p></div>
      <button className="dl-primary" onClick={() => {
        setError(""); setEditingId(null); setEditor(fresh())
      }}>＋ บันทึกสุขภาพ</button>
    </div>

    {error && <p className="dl-error" role="alert">{error}</p>}

    <div className="hl-summary">
      <article>
        <span>น้ำหนักล่าสุด</span>
        <strong>{latest ? Number(latest.value).toLocaleString("th-TH") : "—"}<small>{latest ? "กก." : ""}</small></strong>
        <p>{latest ? dateLabel(txt(latest.date)) : "ยังไม่มีข้อมูลน้ำหนัก"}</p>
      </article>
      <article>
        <span>ดัชนีมวลกาย (BMI)</span>
        <strong>{bmi !== null && Number.isFinite(bmi) ? bmi.toFixed(1) : "—"}</strong>
        <p>{bmi !== null && Number.isFinite(bmi)
          ? bmi < 18.5 ? "ต่ำกว่าเกณฑ์" : bmi < 25 ? "ช่วงมาตรฐาน" : bmi < 30 ? "สูงกว่าเกณฑ์" : "สูงมาก"
          : "เพิ่มส่วนสูงเพื่อคำนวณ BMI"}</p>
      </article>
      <article className="hl-height">
        <label htmlFor="hl-height">ส่วนสูงของคุณ</label>
        <div>
          <input id="hl-height" type="number" min="80" max="250" step="0.1" value={height}
            onChange={event => setHeight(event.target.value)} placeholder="เช่น 165" />
          <span>ซม.</span>
          <button onClick={() => void persist(entries, height)} disabled={saving}>บันทึก</button>
        </div>
        <p>ใช้คำนวณ BMI จากน้ำหนักล่าสุด</p>
      </article>
    </div>

    {weights.length > 1 && <section className="hl-chart">
      <div><span className="dt-eyebrow">WEIGHT HISTORY</span><h3>แนวโน้มน้ำหนัก</h3></div>
      <div className="hl-bars">{weights.map(weight => {
        const values = weights.map(item => Number(item.value))
        const min = Math.min(...values)
        const max = Math.max(...values)
        const percent = max === min ? 62 : 25 + ((Number(weight.value) - min) / (max - min)) * 65
        return <div className="hl-bar" key={weight.id}>
          <strong>{Number(weight.value).toLocaleString("th-TH")}</strong>
          <div><i style={{ height: percent + "%" }} /></div>
          <small>{dateLabel(txt(weight.date)).split(" ")[0]}</small>
        </div>
      })}</div>
    </section>}

    <section className="hl-history">
      <div className="hl-history-head">
        <div><span className="dt-eyebrow">HEALTH JOURNAL</span><h3>ประวัติการดูแลตัวเอง</h3></div>
        <p className="hl-results" aria-live="polite">แสดง {filtered.length} จาก {sorted.length} รายการ</p>
      </div>
      <div className="hl-history-tools">
        <input type="search" aria-label="ค้นหาประวัติสุขภาพ" placeholder="ค้นหาประเภท วันที่ หรือหมายเหตุ…"
          value={search} onChange={event => setSearch(event.target.value)} />
        <select value={filter} onChange={event => setFilter(event.target.value)} aria-label="กรองประเภทข้อมูลสุขภาพ">
          <option value="all">ทุกประเภท</option>
          <option value="weight">น้ำหนัก</option>
          <option value="pressure">ความดัน</option>
          <option value="sleep">การนอน</option>
          <option value="water">ดื่มน้ำ</option>
          <option value="symptom">อาการ</option>
          <option value="exercise">ออกกำลังกาย</option>
        </select>
      </div>

      {filtered.length === 0
        ? <div className="dl-empty">
          <span>♡</span>
          <b>{sorted.length === 0 ? "เริ่มดูแลตัวเองจากข้อมูลเล็ก ๆ" : "ไม่พบประวัติที่ตรงกัน"}</b>
          <p>{sorted.length === 0 ? "บันทึกน้ำหนัก การนอน หรือกิจกรรมแรกของคุณได้เลย" : "ลองเปลี่ยนคำค้นหาหรือเลือกดูทุกประเภท"}</p>
          {sorted.length === 0
            ? <button onClick={() => { setError(""); setEditor(fresh()) }}>เพิ่มข้อมูลแรก</button>
            : <button onClick={() => { setSearch(""); setFilter("all") }}>ล้างตัวกรอง</button>}
        </div>
        : <div className="hl-list">{filtered.map(entry => <article className="hl-entry" key={entry.id}>
          <div className="hl-entry-icon">
            {entry.kind === "weight" ? "↗" : ["pressure", "bloodPressure"].includes(txt(entry.kind)) ? "♡" :
              entry.kind === "sleep" ? "☾" : entry.kind === "water" ? "◌" : entry.kind === "symptom" ? "✳" : "⌁"}
          </div>
          <div className="hl-entry-main">
            <b>{label(entry)}</b>
            <time>{dateLabel(txt(entry.date))}</time>
            {typeof entry.note === "string" && entry.note.length > 0 && <p>{entry.note}</p>}
          </div>
          <div className="hl-entry-actions">
            <button onClick={() => { setEditingId(entry.id); setEditor(toForm(entry)); setError("") }}>แก้ไข</button>
            <button onClick={() => setDeleteId(entry.id)}>ลบ</button>
          </div>
          {deleteId === entry.id && <div className="dl-delete-confirm">
            <span>ลบรายการนี้ใช่ไหม?</span>
            <button onClick={() => void persist(entries.filter(item => item.id !== entry.id))} disabled={saving}>ยืนยันลบ</button>
            <button onClick={() => setDeleteId(null)}>ยกเลิก</button>
          </div>}
        </article>)}</div>}
    </section>

    {editor && <div className="dl-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) setEditor(null)
    }}>
      <form className="dl-editor hl-editor" onSubmit={submit}>
        <button type="button" className="dl-close" onClick={() => setEditor(null)}>×</button>
        <span className="dt-eyebrow">HEALTH & WELLBEING</span>
        <h2>{editingId ? "แก้ไขข้อมูลสุขภาพ" : "บันทึกสุขภาพ"}</h2>
        <label htmlFor="hl-kind">ต้องการบันทึกอะไร</label>
        <select id="hl-kind" value={editor.kind} onChange={event => setEditor({ ...editor, kind: event.target.value as Metric })}>
          <option value="weight">น้ำหนัก</option>
          <option value="pressure">ความดันโลหิต</option>
          <option value="sleep">การนอน</option>
          <option value="water">ปริมาณน้ำดื่ม</option>
          <option value="symptom">อาการ / ความรู้สึก</option>
          <option value="exercise">ออกกำลังกาย</option>
        </select>
        <label htmlFor="hl-date">วันที่และเวลา</label>
        <input id="hl-date" type="datetime-local" value={editor.date}
          onChange={event => setEditor({ ...editor, date: event.target.value })} required />

        {editor.kind === "weight" && <>
          <label htmlFor="hl-weight">น้ำหนัก (กก.)</label>
          <input id="hl-weight" type="number" min="0.1" max="500" step="0.01" value={editor.weight}
            onChange={event => setEditor({ ...editor, weight: event.target.value })} required />
        </>}
        {editor.kind === "pressure" && <>
          <label>ความดัน (mmHg)</label>
          <div className="hl-fields">
            <input aria-label="ค่าความดันตัวบน" type="number" min="1" max="300" value={editor.sys}
              onChange={event => setEditor({ ...editor, sys: event.target.value })} />
            <span>/</span>
            <input aria-label="ค่าความดันตัวล่าง" type="number" min="1" max="250" value={editor.dia}
              onChange={event => setEditor({ ...editor, dia: event.target.value })} />
          </div>
        </>}
        {editor.kind === "sleep" && <>
          <label>เวลานอนและเวลาตื่น</label>
          <div className="hl-fields">
            <input aria-label="เวลาเข้านอน" type="time" value={editor.bedtime}
              onChange={event => setEditor({ ...editor, bedtime: event.target.value })} />
            <span>ถึง</span>
            <input aria-label="เวลาตื่น" type="time" value={editor.wake}
              onChange={event => setEditor({ ...editor, wake: event.target.value })} />
          </div>
          <p className="hl-hint">ระยะเวลาประมาณ {durationHours(editor.bedtime, editor.wake)} ชั่วโมง</p>
        </>}
        {editor.kind === "water" && <>
          <label htmlFor="hl-water">ปริมาณน้ำ (มล.)</label>
          <input id="hl-water" type="number" min="1" max="20000" value={editor.water}
            onChange={event => setEditor({ ...editor, water: event.target.value })} required />
        </>}
        {editor.kind === "symptom" && <>
          <label htmlFor="hl-symptom">อาการที่ต้องการบันทึก</label>
          <input id="hl-symptom" maxLength={200} value={editor.symptom}
            onChange={event => setEditor({ ...editor, symptom: event.target.value })} placeholder="เช่น ปวดหัว คัดจมูก" required />
          <label htmlFor="hl-severity">ระดับความรู้สึก 1–5</label>
          <input id="hl-severity" type="number" min="1" max="5" value={editor.severity}
            onChange={event => setEditor({ ...editor, severity: event.target.value })} />
        </>}
        {editor.kind === "exercise" && <>
          <label htmlFor="hl-exercise">กิจกรรมที่ทำ</label>
          <input id="hl-exercise" maxLength={200} value={editor.exercise}
            onChange={event => setEditor({ ...editor, exercise: event.target.value })} placeholder="เช่น เดินเร็ว วิดพื้น ปั่นจักรยาน" required />
          <label htmlFor="hl-duration">ระยะเวลา (นาที)</label>
          <input id="hl-duration" type="number" min="1" max="1440" value={editor.duration}
            onChange={event => setEditor({ ...editor, duration: event.target.value })} required />
        </>}

        <details className="hl-advanced" open={Boolean(editor.note || editor.pulse)}>
          <summary>รายละเอียดเพิ่มเติม (ไม่บังคับ)</summary>
          {editor.kind === "pressure" && <>
            <label htmlFor="hl-pulse">ชีพจร (ครั้ง/นาที)</label>
            <input id="hl-pulse" type="number" min="1" max="250" value={editor.pulse}
              onChange={event => setEditor({ ...editor, pulse: event.target.value })} />
          </>}
          <label htmlFor="hl-note">หมายเหตุ</label>
          <textarea id="hl-note" rows={3} maxLength={4000} value={editor.note}
            onChange={event => setEditor({ ...editor, note: event.target.value })} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" />
        </details>

        <div className="dl-editor-actions">
          <button type="button" className="dl-cancel" onClick={() => setEditor(null)} disabled={saving}>ยกเลิก</button>
          <button type="submit" className="dl-primary" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูลสุขภาพ"}</button>
        </div>
      </form>
    </div>}
  </section>
}
