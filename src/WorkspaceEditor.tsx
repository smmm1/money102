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
function readStyle() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null")
    return { accent: typeof value?.accent === "string" ? value.accent : "sage", scale: typeof value?.scale === "string" ? value.scale : "comfortable" }
  } catch { return { accent: "sage", scale: "comfortable" } }
}
export default function WorkspaceEditor() {
  const [mode, setMode] = useState<Mode>(null)
  const [saved, setSaved] = useState<LayoutStore>(readStore)
  const [draft, setDraft] = useState<LayoutStore>(readStore)
  const [style, setStyle] = useState(readStyle)
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
    document.documentElement.dataset.workspaceScale = style.scale
    document.documentElement.dataset.workspaceAccent = style.accent
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(style))
  }, [style])
  useEffect(() => {
    if (mode !== "editing") return
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
    return () => cleanup.forEach((fn) => fn())
  }, [mode, draft, viewportKey])
  const saveLayout = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); setSaved(draft); setMode(null); setActiveId(""); applyLayout(draft[viewportKey])
  }
  const cancel = () => { setDraft(saved); applyLayout(saved[viewportKey]); setMode(null); setActiveId("") }
  const reset = () => {
    if (!window.confirm("คืนค่าตำแหน่งและขนาดขององค์ประกอบทั้งหมดใช่ไหม? ข้อมูลออมเงินและโน้ตจะไม่ถูกลบ")) return
    const clean = emptyStore(); setDraft(clean); setSaved(clean); localStorage.removeItem(STORAGE_KEY); applyLayout(clean[viewportKey]); setActiveId("")
  }
  const open = () => { const latest = readStore(); setSaved(latest); setDraft(latest); setMode("editing") }
  const count = useMemo(() => Object.keys(activeLayout).length, [activeLayout])
  return <>
    {mode === null && <button onClick={open} className="fixed right-5 top-[76px] z-40 inline-flex h-10 items-center gap-2 rounded-full border border-[#DEDACF] bg-[#FCFBF7]/95 px-4 text-sm font-medium text-[#354337] shadow-lg backdrop-blur transition hover:-translate-y-0.5 md:right-8 md:top-[88px]" aria-label="ปรับแต่งหน้าตาและเลย์เอาต์"><span aria-hidden="true">✣</span><span className="hidden sm:inline">จัดหน้าเว็บ</span></button>}
    {mode !== null && <>
      <div className="pointer-events-none fixed inset-0 z-[80] border-2 border-dashed border-[#52785B]/40" aria-hidden="true" />
      <section className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-4xl rounded-[24px] border border-[#DEDACF] bg-[#FCFBF7]/97 p-4 shadow-[0_24px_90px_rgba(25,35,27,0.25)] backdrop-blur-xl md:bottom-5 md:p-5" aria-label="ตัวแก้ไขพื้นที่ทำงาน">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52785B]">CUSTOM WORKSPACE · {viewportMobile ? "MOBILE" : "DESKTOP"}</p><h2 className="mt-1 text-lg font-semibold text-[#263329]">{mode === "editing" ? "จัดวางองค์ประกอบได้ตามใจ" : "ดูตัวอย่างการจัดหน้า"}</h2><p className="mt-1 text-xs leading-5 text-[#777C73]">จับสัญลักษณ์ ⠿ เพื่อย้าย · จับ ↘ เพื่อปรับความกว้าง · ข้อมูลออมเงินและโน้ตไม่ถูกแก้ไข</p></div><span className="rounded-full bg-[#E6F0E7] px-3 py-1.5 text-xs text-[#52785B]">{count} รายการที่ปรับตำแหน่งแล้ว</span></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">โทนสี<select value={style.accent} onChange={(event) => setStyle((old) => ({ ...old, accent: event.target.value }))} className="bg-transparent text-xs text-[#263329] outline-none"><option value="sage">เขียวละมุน</option><option value="rose">ชมพูอบอุ่น</option><option value="ocean">ฟ้าเย็น</option><option value="mono">ขาวดำ</option></select></label>
          <label className="flex items-center gap-2 rounded-full border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">ระยะห่าง<select value={style.scale} onChange={(event) => setStyle((old) => ({ ...old, scale: event.target.value }))} className="bg-transparent text-xs text-[#263329] outline-none"><option value="comfortable">สบายตา</option><option value="compact">กระชับ</option><option value="spacious">โปร่ง</option></select></label>
          <button onClick={() => setMode(mode === "editing" ? "preview" : "editing")} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#354337]">{mode === "editing" ? "ดูตัวอย่าง" : "กลับไปแก้ไข"}</button>
          <button onClick={reset} className="rounded-full border border-[#E6D7C7] bg-white px-4 py-2 text-xs font-medium text-[#9A722F]">คืนค่าตำแหน่ง</button><div className="flex-1" />
          <button onClick={cancel} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#6D716B]">ยกเลิก</button><button onClick={saveLayout} className="rounded-full bg-[#263329] px-5 py-2 text-xs font-medium text-white hover:bg-[#3B4A3E]">บันทึก</button>
        </div>
      </section>
      {mode === "editing" && <div className="fixed right-4 top-4 z-[120] rounded-full bg-[#263329] px-3 py-2 text-xs text-white shadow-lg">กำลังแก้ไข · {activeId || "เลือกจุดจับขององค์ประกอบ"}</div>}
    </>}
  </>
}
