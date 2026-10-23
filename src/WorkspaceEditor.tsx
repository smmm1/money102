import { useCallback, useEffect, useMemo, useState } from "react"

type Placement = { x: number; y: number; width?: number }
type LayoutMap = Record<string, Placement>
type LayoutStore = { desktop: LayoutMap; mobile: LayoutMap }
type Mode = "editing" | "preview" | null
const STORAGE_KEY = "lamoon-workspace-layout-v1"
const SETTINGS_KEY = "lamoon-workspace-style-v1"
const emptyStore = (): LayoutStore => ({ desktop: {}, mobile: {} })
function readStore(): LayoutStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<LayoutStore> | null
    return { desktop: parsed?.desktop && typeof parsed.desktop === "object" ? parsed.desktop : {}, mobile: parsed?.mobile && typeof parsed.mobile === "object" ? parsed.mobile : {} }
  } catch { return emptyStore() }
}
function isMobile() { return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches }
type WorkspaceStyle = { accent: string; scale: string; font: string; size: number; headingSize: number; weight: string; headingWeight: string; textColor: string; lineHeight: string; letterSpacing: string }
const defaultStyle: WorkspaceStyle = { accent: "sage", scale: "comfortable", font: "noto", size: 15, headingSize: 1, weight: "400", headingWeight: "600", textColor: "#263329", lineHeight: "1.6", letterSpacing: "normal" }
const TEXT_KEY = "lamoon-workspace-text-v1"
type TextOverrides = Record<string, string>
function readTextOverrides(): TextOverrides {
  try { const value = JSON.parse(localStorage.getItem(TEXT_KEY) || "{}"); return value && typeof value === "object" ? value : {} } catch { return {} }
}
function readStyle(): WorkspaceStyle {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null")
    return { ...defaultStyle, ...(value && typeof value === "object" ? value : {}) }
  } catch { return defaultStyle }
}
function textPath(element: HTMLElement, root: HTMLElement): string {
  const parts: number[] = []
  let current: HTMLElement | null = element
  while (current && current !== root) {
    const parent: HTMLElement | null = current.parentElement
    if (!parent) return ""
    parts.unshift(Array.prototype.indexOf.call(parent.children, current) as number)
    current = parent
  }
  return current === root ? parts.join(".") : ""
}
function elementAtPath(root: HTMLElement, path: string): HTMLElement | null {
  let current: HTMLElement = root
  if (!path) return null
  for (const part of path.split(".")) {
    const next = current.children.item(Number(part))
    if (!(next instanceof HTMLElement)) return null
    current = next
  }
  return current
}
function applyTextOverrides(overrides: TextOverrides) {
  document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((root) => {
    Object.entries(overrides).forEach(([key, value]) => {
      const prefix = root.dataset.workspaceId + ":"
      if (!key.startsWith(prefix)) return
      const target = elementAtPath(root, key.slice(prefix.length))
      if (target && target.children.length === 0 && target.textContent !== value && !target.isContentEditable) target.textContent = value
    })
  })
}
export default function WorkspaceEditor() {
  const [mode, setMode] = useState<Mode>(null)
  const [saved, setSaved] = useState<LayoutStore>(readStore)
  const [draft, setDraft] = useState<LayoutStore>(readStore)
  const [style, setStyle] = useState<WorkspaceStyle>(readStyle)
  const [savedStyle, setSavedStyle] = useState<WorkspaceStyle>(readStyle)
  const [textOverrides, setTextOverrides] = useState<TextOverrides>(readTextOverrides)
  const [savedTextOverrides, setSavedTextOverrides] = useState<TextOverrides>(readTextOverrides)
  const [activeId, setActiveId] = useState("")
  const [viewportMobile, setViewportMobile] = useState(isMobile)
  const viewportKey = viewportMobile ? "mobile" : "desktop"
  const activeLayout = draft[viewportKey]
  useEffect(() => {
    const update = () => setViewportMobile(isMobile())
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  const applyLayout = useCallback((layout: LayoutMap) => {
    document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((element) => {
      const id = element.dataset.workspaceId
      if (!id) return
      const placement = layout[id]
      element.style.translate = placement && (placement.x || placement.y) ? `${placement.x}px ${placement.y}px` : ""
      element.style.width = placement?.width ? `${placement.width}px` : ""
      element.style.maxWidth = placement?.width ? "calc(100vw - 24px)" : ""
      element.style.zIndex = placement && (placement.x || placement.y) ? "2" : ""
    })
  }, [])
  useEffect(() => { applyLayout(activeLayout) }, [activeLayout, applyLayout, viewportKey, mode])
  useEffect(() => {
    document.documentElement.dataset.workspaceEditor = mode === "editing" ? "on" : "off"
  }, [mode])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.workspaceScale = style.scale
    root.dataset.workspaceAccent = style.accent
    root.style.setProperty("--workspace-font-family", style.font === "sarabun" ? "'Sarabun', sans-serif" : style.font === "prompt" ? "'Prompt', sans-serif" : style.font === "plex" ? "'IBM Plex Sans Thai', sans-serif" : "'Noto Sans Thai', sans-serif")
    root.style.setProperty("--workspace-font-size", `${style.size}px`)
    root.style.setProperty("--workspace-heading-scale", String(style.headingSize))
    root.style.setProperty("--workspace-font-weight", style.weight)
    root.style.setProperty("--workspace-heading-weight", style.headingWeight)
    root.style.setProperty("--workspace-text-color", style.textColor)
    root.style.setProperty("--workspace-line-height", style.lineHeight)
    root.style.setProperty("--workspace-letter-spacing", style.letterSpacing)
  }, [style])
  useEffect(() => {
    applyTextOverrides(textOverrides)
    const observer = new MutationObserver(() => applyTextOverrides(textOverrides))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [textOverrides])
  useEffect(() => {
    if (mode !== "editing") return
    const onTextClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target || target.closest(".workspace-drag-handle, .workspace-resize-handle, [data-workspace-editor-ui]")) return
      const leaf = target.closest<HTMLElement>("[data-workspace-id]") ? target : null
      const root = leaf?.closest<HTMLElement>("[data-workspace-id]")
      if (!leaf || !root || leaf.children.length > 0 || !leaf.textContent?.trim() || leaf.closest("input, textarea, select, option, script, style, svg, button")) return
      const id = root.dataset.workspaceId
      const path = textPath(leaf, root)
      if (!id || !path) return
      event.preventDefault()
      event.stopPropagation()
      const next = window.prompt("แก้ไขข้อความบนหน้าเว็บ (ไม่กระทบข้อมูลที่บันทึกไว้)", textOverrides[id + ":" + path] ?? leaf.textContent.trim())
      if (next === null || next.trim() === "") return
      const updated = { ...textOverrides, [id + ":" + path]: next.trim() }
      setTextOverrides(updated)
      localStorage.setItem(TEXT_KEY, JSON.stringify(updated))
    }
    document.addEventListener("dblclick", onTextClick, true)
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-workspace-id]"))
    const cleanup: (() => void)[] = []
    elements.forEach((element) => {
      const id = element.dataset.workspaceId
      if (!id || element.querySelector(":scope > .workspace-drag-handle")) return
      const oldPosition = element.style.position
      if (getComputedStyle(element).position === "static") element.style.position = "relative"
      const handle = document.createElement("button")
      handle.type = "button"; handle.className = "workspace-drag-handle"
      handle.setAttribute("aria-label", `ลากย้าย ${element.getAttribute("aria-label") || id}`)
      handle.title = "กดค้างเพื่อลากย้าย"; handle.textContent = "⠿"
      Object.assign(handle.style, { position: "absolute", top: "7px", right: "7px", zIndex: "90", width: "30px", height: "30px", borderRadius: "10px", border: "1px solid #d9d4c6", background: "#fffdf7", color: "#344538", boxShadow: "0 2px 8px #2633291c", cursor: "grab", touchAction: "none", lineHeight: "1", fontSize: "19px" })
      element.appendChild(handle)
      const resize = document.createElement("button")
      resize.type = "button"; resize.className = "workspace-resize-handle"
      resize.setAttribute("aria-label", `ปรับขนาด ${id}`); resize.title = "ลากเพื่อปรับความกว้าง"; resize.textContent = "↘"
      Object.assign(resize.style, { position: "absolute", right: "7px", bottom: "7px", zIndex: "90", width: "27px", height: "27px", borderRadius: "8px", border: "1px solid #d9d4c6", background: "#fffdf7", color: "#344538", cursor: "nwse-resize", touchAction: "none", lineHeight: "1", fontSize: "15px" })
      element.appendChild(resize)
      const beginDrag = (event: PointerEvent) => {
        event.preventDefault(); event.stopPropagation(); setActiveId(id)
        const startX = event.clientX, startY = event.clientY
        const previous = draft[viewportKey][id] || { x: 0, y: 0 }
        const move = (e: PointerEvent) => {
          const x = previous.x + e.clientX - startX, y = previous.y + e.clientY - startY
          element.style.translate = `${x}px ${y}px`; element.style.zIndex = "2"
        }
        const end = (e: PointerEvent) => {
          const x = previous.x + e.clientX - startX, y = previous.y + e.clientY - startY
          setDraft((current) => ({ ...current, [viewportKey]: { ...current[viewportKey], [id]: { ...(current[viewportKey][id] || { x: 0, y: 0 }), x, y } } }))
          window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end)
        }
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", end, { once: true })
      }
      const beginResize = (event: PointerEvent) => {
        event.preventDefault(); event.stopPropagation(); setActiveId(id)
        const startX = event.clientX, startWidth = element.getBoundingClientRect().width
        const previous = draft[viewportKey][id] || { x: 0, y: 0 }
        const move = (e: PointerEvent) => {
          const width = Math.max(180, Math.min(window.innerWidth - 24, startWidth + e.clientX - startX))
          element.style.width = `${width}px`; element.style.maxWidth = "calc(100vw - 24px)"
        }
        const end = (e: PointerEvent) => {
          const width = Math.max(180, Math.min(window.innerWidth - 24, startWidth + e.clientX - startX))
          setDraft((current) => ({ ...current, [viewportKey]: { ...current[viewportKey], [id]: { ...previous, width } } }))
          window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end)
        }
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", end, { once: true })
      }
      handle.addEventListener("pointerdown", beginDrag); resize.addEventListener("pointerdown", beginResize)
      cleanup.push(() => { handle.removeEventListener("pointerdown", beginDrag); resize.removeEventListener("pointerdown", beginResize); handle.remove(); resize.remove(); element.style.position = oldPosition })
    })
    return () => { document.removeEventListener("dblclick", onTextClick, true); cleanup.forEach((fn) => fn()) }
  }, [mode, draft, viewportKey, textOverrides])
  const saveLayout = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(style)); localStorage.setItem(TEXT_KEY, JSON.stringify(textOverrides)); setSaved(draft); setSavedStyle(style); setSavedTextOverrides(textOverrides); setMode(null); setActiveId(""); applyLayout(draft[viewportKey])
  }
  const cancel = () => { setDraft(saved); setStyle(savedStyle); setTextOverrides(savedTextOverrides); applyTextOverrides(savedTextOverrides); applyLayout(saved[viewportKey]); setMode(null); setActiveId("") }
  const reset = () => {
    if (!window.confirm("คืนค่าตำแหน่งและขนาดขององค์ประกอบทั้งหมดใช่ไหม? ข้อมูลออมเงินและโน้ตจะไม่ถูกลบ")) return
    const clean = emptyStore(); setDraft(clean); setSaved(clean); localStorage.removeItem(STORAGE_KEY); applyLayout(clean[viewportKey]); setActiveId("")
  }
  const open = () => { const latest = readStore(); const latestStyle = readStyle(); const latestText = readTextOverrides(); setSaved(latest); setDraft(latest); setSavedStyle(latestStyle); setStyle(latestStyle); setSavedTextOverrides(latestText); setTextOverrides(latestText); setMode("editing") }
  const count = useMemo(() => Object.keys(activeLayout).length, [activeLayout])
  return <>
    {mode === null && <button onClick={open} className="fixed right-5 top-[76px] z-40 inline-flex h-10 items-center gap-2 rounded-full border border-[#DEDACF] bg-[#FCFBF7]/95 px-4 text-sm font-medium text-[#354337] shadow-lg backdrop-blur transition hover:-translate-y-0.5 md:right-8 md:top-[88px]" aria-label="ปรับแต่งหน้าตาและเลย์เอาต์"><span aria-hidden="true">✣</span><span className="hidden sm:inline">จัดหน้าเว็บ</span></button>}
    {mode !== null && <>
      <div className="pointer-events-none fixed inset-0 z-[80] border-2 border-dashed border-[#52785B]/40" aria-hidden="true" />
      <section className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-4xl rounded-[24px] border border-[#DEDACF] bg-[#FCFBF7]/97 p-4 shadow-[0_24px_90px_rgba(25,35,27,0.25)] backdrop-blur-xl md:bottom-5 md:p-5" data-workspace-editor-ui="true" aria-label="ตัวแก้ไขพื้นที่ทำงาน">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52785B]">CUSTOM WORKSPACE · {viewportMobile ? "MOBILE" : "DESKTOP"}</p><h2 className="mt-1 text-lg font-semibold text-[#263329]">{mode === "editing" ? "จัดวางองค์ประกอบได้ตามใจ" : "ดูตัวอย่างการจัดหน้า"}</h2><p className="mt-1 text-xs leading-5 text-[#777C73]">จับสัญลักษณ์ ⠿ เพื่อย้าย · จับ ↘ เพื่อปรับความกว้าง · ข้อมูลออมเงินและโน้ตไม่ถูกแก้ไข</p></div><span className="rounded-full bg-[#E6F0E7] px-3 py-1.5 text-xs text-[#52785B]">{count} รายการที่ปรับตำแหน่งแล้ว</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <label className="flex items-center gap-2 rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">โทนสี<select value={style.accent} onChange={(event) => setStyle((old) => ({ ...old, accent: event.target.value }))} className="bg-transparent text-xs text-[#263329] outline-none"><option value="sage">เขียวละมุน</option><option value="rose">ชมพูอบอุ่น</option><option value="ocean">ฟ้าเย็น</option><option value="mono">ขาวดำ</option></select></label>
          <label className="flex items-center gap-2 rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ระยะห่าง<select value={style.scale} onChange={(event) => setStyle((old) => ({ ...old, scale: event.target.value }))} className="bg-transparent text-xs text-[#263329] outline-none"><option value="comfortable">สบายตา</option><option value="compact">กระชับ</option><option value="spacious">โปร่ง</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ฟอนต์<select value={style.font} onChange={(event) => setStyle((old) => ({ ...old, font: event.target.value }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="noto">Noto Sans Thai</option><option value="sarabun">Sarabun</option><option value="prompt">Prompt</option><option value="plex">IBM Plex Sans Thai</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ขนาดข้อความ <input aria-label="ขนาดข้อความ" type="range" min="12" max="22" value={style.size} onChange={(event) => setStyle((old) => ({ ...old, size: Number(event.target.value) }))} className="w-16"/><span className="w-8 text-right tabular-nums">{style.size}px</span></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ขนาดหัวข้อ<select value={style.headingSize} onChange={(event) => setStyle((old) => ({ ...old, headingSize: Number(event.target.value) }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="0.85">เล็ก</option><option value="1">ปกติ</option><option value="1.15">ใหญ่</option><option value="1.3">ใหญ่มาก</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ความหนาข้อความ<select value={style.weight} onChange={(event) => setStyle((old) => ({ ...old, weight: event.target.value }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="300">บาง</option><option value="400">ปกติ</option><option value="500">กลาง</option><option value="600">หนา</option><option value="700">หนามาก</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ความหนาหัวข้อ<select value={style.headingWeight} onChange={(event) => setStyle((old) => ({ ...old, headingWeight: event.target.value }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="400">ปกติ</option><option value="500">กลาง</option><option value="600">หนา</option><option value="700">หนามาก</option><option value="800">หนาพิเศษ</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">สีข้อความ <input aria-label="สีข้อความ" type="color" value={style.textColor} onChange={(event) => setStyle((old) => ({ ...old, textColor: event.target.value }))} className="h-6 w-8 border-0 bg-transparent p-0"/></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ระยะบรรทัด<select value={style.lineHeight} onChange={(event) => setStyle((old) => ({ ...old, lineHeight: event.target.value }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="1.35">แน่น</option><option value="1.6">ปกติ</option><option value="1.85">โปร่ง</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ตัวอักษร<select value={style.letterSpacing} onChange={(event) => setStyle((old) => ({ ...old, letterSpacing: event.target.value }))} className="min-w-0 bg-transparent text-xs text-[#263329] outline-none"><option value="normal">ปกติ</option><option value="-0.02em">ชิด</option><option value="0.03em">ห่าง</option></select></label>
          <button onClick={() => { const reset = { ...defaultStyle }; setStyle(reset); document.documentElement.style.setProperty("--workspace-font-family", "'Noto Sans Thai', sans-serif"); }} className="rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs font-medium text-[#354337]">คืนค่ารูปแบบตัวอักษร</button>
          <p className="col-span-full text-[11px] leading-5 text-[#858880]">ดับเบิลคลิกข้อความบนหน้าเว็บเพื่อแก้คำได้ · การเปลี่ยนข้อความเป็นการปรับหน้าตา ไม่เปลี่ยนข้อมูลธุรกรรมหรือเนื้อหาโน้ต</p>
          <button onClick={() => setMode(mode === "editing" ? "preview" : "editing")} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#354337]">{mode === "editing" ? "ดูตัวอย่าง" : "กลับไปแก้ไข"}</button>
          <button onClick={reset} className="rounded-full border border-[#E6D7C7] bg-white px-4 py-2 text-xs font-medium text-[#9A722F]">คืนค่าตำแหน่ง</button><div className="flex-1" />
          <button onClick={cancel} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#6D716B]">ยกเลิก</button><button onClick={saveLayout} className="rounded-full bg-[#263329] px-5 py-2 text-xs font-medium text-white hover:bg-[#3B4A3E]">บันทึก</button>
        </div>
      </section>
      {mode === "editing" && <div className="fixed right-4 top-4 z-[120] rounded-full bg-[#263329] px-3 py-2 text-xs text-white shadow-lg">กำลังแก้ไข · {activeId || "เลือกจุดจับขององค์ประกอบ"}</div>}
    </>}
  </>
}
