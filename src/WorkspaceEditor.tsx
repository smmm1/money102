import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
const TEXT_SIZE_KEY = "lamoon-workspace-text-sizes-v1"
const ELEMENT_OVERRIDES_KEY = "lamoon-workspace-element-overrides-v1"
const POPUP_KEY = "lamoon-workspace-popup-v1"
type PopupPrefs = { x: number; y: number; width: number; height: number; collapsed: boolean }
function readPopupPrefs(): PopupPrefs {
  const fallback = { x: typeof window === "undefined" ? 24 : Math.max(12, window.innerWidth - 780), y: typeof window === "undefined" ? 100 : Math.max(76, window.innerHeight - 760), width: 760, height: 700, collapsed: false }
  try {
    const value = JSON.parse(localStorage.getItem(POPUP_KEY) || "null")
    if (!value || typeof value !== "object") return fallback
    return { x: Number.isFinite(value.x) ? value.x : fallback.x, y: Number.isFinite(value.y) ? value.y : fallback.y, width: Number.isFinite(value.width) ? Math.max(340, value.width) : fallback.width, height: Number.isFinite(value.height) ? Math.max(60, value.height) : fallback.height, collapsed: Boolean(value.collapsed) }
  } catch { return fallback }
}
type TextOverrides = Record<string, string>
type TextSizes = Record<string, number>
type ElementOverride = { backgroundColor?: string; color?: string; padding?: string; borderRadius?: string; icon?: string }
type ElementOverrides = Record<string, ElementOverride>
function readElementOverrides(): ElementOverrides {
  try {
    const value = JSON.parse(localStorage.getItem(ELEMENT_OVERRIDES_KEY) || "{}") as Record<string, unknown>
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const result: ElementOverrides = {}
    Object.entries(value).forEach(([id, raw]) => {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !raw || typeof raw !== "object") return
      const item = raw as Record<string, unknown>
      const safe = (v: unknown) => typeof v === "string" && v.length <= 100 && /^[#(),.%\\w\\s-]*$/.test(v) ? v : undefined
      const icon = typeof item.icon === "string" && item.icon.length <= 12 ? item.icon : undefined
      result[id] = { backgroundColor: safe(item.backgroundColor), color: safe(item.color), padding: safe(item.padding), borderRadius: safe(item.borderRadius), icon }
    })
    return result
  } catch { return {} }
}
function applyElementOverrides(overrides: ElementOverrides) {
  document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((root) => {
    const id = root.dataset.workspaceId
    if (!id) return
    const value = overrides[id] || {}
    const applyStyle = (key: "backgroundColor" | "color" | "padding" | "borderRadius", next: string | undefined) => {
      const attr = "data-workspace-original-" + key.toLowerCase()
      if (!root.hasAttribute(attr)) root.setAttribute(attr, root.style[key] || "")
      root.style[key] = next || root.getAttribute(attr) || ""
    }
    applyStyle("backgroundColor", value.backgroundColor)
    applyStyle("color", value.color)
    applyStyle("padding", value.padding)
    applyStyle("borderRadius", value.borderRadius)
    const svg = root.querySelector<SVGElement>("svg")
    let iconNode = root.querySelector<HTMLElement>(":scope > [data-workspace-icon-override]")
    if (value.icon && svg) {
      if (!svg.hasAttribute("data-workspace-original-display")) svg.setAttribute("data-workspace-original-display", svg.style.display || "")
      svg.style.display = "none"
      if (!iconNode) {
        iconNode = document.createElement("span")
        iconNode.dataset.workspaceIconOverride = "true"
        iconNode.dataset.workspaceEditorUi = "true"
        Object.assign(iconNode.style, { display: "inline-grid", placeItems: "center", lineHeight: "1", marginInlineEnd: "0.25em" })
        root.insertBefore(iconNode, root.firstChild)
      }
      if (iconNode.textContent !== value.icon) iconNode.textContent = value.icon
    } else {
      if (iconNode) iconNode.remove()
      if (svg?.hasAttribute("data-workspace-original-display")) svg.style.display = svg.getAttribute("data-workspace-original-display") || ""
    }
  })
}
function readTextSizes(): TextSizes { try { const value = JSON.parse(localStorage.getItem(TEXT_SIZE_KEY) || "{}"); return value && typeof value === "object" ? value : {} } catch { return {} } }
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

type EditableTextItem = { key: string; id: string; path: string; text: string; tag: string }
const protectedWorkspaceIds = ["saving-summary", "saving-goal", "saving-activity", "health-metrics", "health-entry-panels", "health-history", "health-progress", "health-calendar"]
function scanEditableTexts(overrides: TextOverrides): EditableTextItem[] {
  const items: EditableTextItem[] = []
  document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((root) => {
    const id = root.dataset.workspaceId
    if (!id || id.startsWith("note-") || protectedWorkspaceIds.includes(id)) return
    root.querySelectorAll<HTMLElement>("*").forEach((leaf) => {
      if (leaf.children.length || !leaf.textContent?.trim() || leaf.closest("input, textarea, select, option, script, style, svg, [data-workspace-editor-ui], [contenteditable='true']")) return
      if (leaf.classList.contains("workspace-drag-handle") || leaf.classList.contains("workspace-resize-handle")) return
      const path = textPath(leaf, root)
      if (!path) return
      const key = id + ":" + path
      items.push({ key, id, path, text: overrides[key] ?? leaf.textContent.trim(), tag: leaf.tagName.toLowerCase() })
    })
  })
  return items.filter((item, index, all) => all.findIndex((candidate) => candidate.key === item.key) === index)
}

function applyTextOverrides(overrides: TextOverrides, sizes: TextSizes = {}) {
  document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((root) => {
    const prefix = root.dataset.workspaceId + ":"
    root.querySelectorAll<HTMLElement>("*").forEach((target) => {
      if (target.children.length !== 0 || target.isContentEditable || target.closest("[data-workspace-editor-ui], .workspace-drag-handle, .workspace-resize-handle")) return
      const path = textPath(target, root)
      if (!path) return
      const key = prefix + path
      const override = overrides[key]
      const size = sizes[key]
      if (target.hasAttribute("data-workspace-original-size")) {
        const originalSize = target.getAttribute("data-workspace-original-size") || ""
        target.style.fontSize = size ? `${size}px` : originalSize
      } else if (size) {
        target.setAttribute("data-workspace-original-size", target.style.fontSize || "")
        target.style.fontSize = `${size}px`
      }
      if (target.hasAttribute("data-workspace-original-text")) {
        const original = target.getAttribute("data-workspace-original-text") || ""
        const next = override === undefined ? original : override
        if (target.textContent !== next) target.textContent = next
      } else if (override !== undefined) {
        target.setAttribute("data-workspace-original-text", target.textContent || "")
        if (target.textContent !== override) target.textContent = override
      }
    })
  })
}
export default function WorkspaceEditor() {
  const [mode, setMode] = useState<Mode>(null)
  const [popupPrefs, setPopupPrefs] = useState<PopupPrefs>(readPopupPrefs)
  const popupDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const popupResizeRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null)
  const [saved, setSaved] = useState<LayoutStore>(readStore)
  const [draft, setDraft] = useState<LayoutStore>(readStore)
  const [style, setStyle] = useState<WorkspaceStyle>(readStyle)
  const [savedStyle, setSavedStyle] = useState<WorkspaceStyle>(readStyle)
  const [textOverrides, setTextOverrides] = useState<TextOverrides>(readTextOverrides)
  const [savedTextOverrides, setSavedTextOverrides] = useState<TextOverrides>(readTextOverrides)
  const [textSizes, setTextSizes] = useState<TextSizes>(readTextSizes)
  const [savedTextSizes, setSavedTextSizes] = useState<TextSizes>(readTextSizes)
  const [elementOverrides, setElementOverrides] = useState<ElementOverrides>(readElementOverrides)
  const [savedElementOverrides, setSavedElementOverrides] = useState<ElementOverrides>(readElementOverrides)
  const [activeId, setActiveId] = useState("")
  const [textSearch, setTextSearch] = useState("")
  const [selectedTextKey, setSelectedTextKey] = useState("")
  const [textScanVersion, setTextScanVersion] = useState(0)
  const [viewportMobile, setViewportMobile] = useState(isMobile)
  const viewportKey = viewportMobile ? "mobile" : "desktop"
  const activeLayout = draft[viewportKey]
  const workspaceElements = useMemo(() => Array.from(document.querySelectorAll<HTMLElement>("[data-workspace-id]")).map((element) => ({ id: element.dataset.workspaceId || "", label: element.getAttribute("aria-label") || element.dataset.workspaceId || "" })).filter((item) => item.id && !item.id.startsWith("note-")), [mode, textScanVersion])
  const activeElementOverride = elementOverrides[activeId] || {}
  const setActiveElementOverride = (patch: Partial<ElementOverride>) => {
    if (!activeId) return
    setElementOverrides((current) => ({ ...current, [activeId]: { ...(current[activeId] || {}), ...patch } }))
  }
  useEffect(() => {
    try { localStorage.setItem(POPUP_KEY, JSON.stringify(popupPrefs)) } catch { /* storage may be unavailable */ }
  }, [popupPrefs])
  useEffect(() => {
    const update = () => {
      setViewportMobile(isMobile())
      setPopupPrefs((old) => ({ ...old, x: Math.max(8, Math.min(old.x, window.innerWidth - Math.min(old.width, window.innerWidth - 16) - 8)), y: Math.max(8, Math.min(old.y, window.innerHeight - (old.collapsed ? 60 : 100))), width: Math.min(old.width, window.innerWidth - 16), height: Math.min(old.height, window.innerHeight - 16) }))
    }
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
    applyElementOverrides(elementOverrides)
    const observer = new MutationObserver(() => applyElementOverrides(elementOverrides))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [elementOverrides])
  useEffect(() => {
    applyTextOverrides(textOverrides, textSizes)
    const observer = new MutationObserver(() => applyTextOverrides(textOverrides, textSizes))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [textOverrides, textSizes])
  useEffect(() => {
    if (mode !== "editing") return
    const onTextClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target || target.closest(".workspace-drag-handle, .workspace-resize-handle, [data-workspace-editor-ui]")) return
      const leaf = target.closest<HTMLElement>("[data-workspace-id]") ? target : null
      const root = leaf?.closest<HTMLElement>("[data-workspace-id]")
      if (!leaf || !root || leaf.children.length > 0 || !leaf.textContent?.trim() || leaf.closest("input, textarea, select, option, script, style, svg")) return
      const id = root.dataset.workspaceId
      if (!id || id.startsWith("note-") || ["saving-summary", "saving-goal", "saving-activity", "health-metrics", "health-entry-panels", "health-history", "health-progress", "health-calendar"].includes(id)) return
      const path = textPath(leaf, root)
      if (!id || !path) return
      event.preventDefault()
      event.stopPropagation()
      const next = window.prompt("แก้ไขข้อความบนหน้าเว็บ (ไม่กระทบข้อมูลที่บันทึกไว้)", textOverrides[id + ":" + path] ?? leaf.textContent.trim())
      if (next === null || next.trim() === "") return
      const updated = { ...textOverrides, [id + ":" + path]: next.trim() }
      setTextOverrides(updated)
    }
    document.addEventListener("dblclick", onTextClick, true)
    const cleanup: (() => void)[] = []
    document.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((root) => {
      const id = root.dataset.workspaceId
      if (!id || id.startsWith("note-") || protectedWorkspaceIds.includes(id)) return
      root.querySelectorAll<HTMLElement>("*").forEach((leaf) => {
        if (leaf.children.length || !leaf.textContent?.trim() || leaf.closest("input, textarea, select, option, script, style, svg, [data-workspace-editor-ui], [contenteditable='true']")) return
        const path = textPath(leaf, root)
        if (!path) return
        const pencil = document.createElement("button")
        pencil.type = "button"
        pencil.className = "workspace-text-pencil"
        pencil.textContent = "✎"
        pencil.title = "แก้ไขข้อความและขนาดตัวอักษร"
        pencil.setAttribute("aria-label", `แก้ไขข้อความ: ${leaf.textContent.trim().slice(0, 40)}`)
        pencil.setAttribute("data-workspace-editor-ui", "true")
        Object.assign(pencil.style, { position: "fixed", zIndex: "115", width: "25px", height: "25px", borderRadius: "50%", border: "1px solid #D9E3D7", background: "#FCFBF7", color: "#354337", boxShadow: "0 2px 8px #26332924", fontSize: "14px", lineHeight: "1", display: "grid", placeItems: "center", cursor: "pointer" })
        const place = () => {
          if (!leaf.isConnected) return
          const rect = leaf.getBoundingClientRect()
          pencil.style.left = `${Math.min(window.innerWidth - 30, Math.max(4, rect.right + 3))}px`
          pencil.style.top = `${Math.min(window.innerHeight - 30, Math.max(4, rect.top - 3))}px`
          pencil.style.display = rect.width && rect.height && rect.bottom > 0 && rect.top < window.innerHeight ? "grid" : "none"
        }
        const openTextEditor = (event: MouseEvent) => {
          event.preventDefault(); event.stopPropagation()
          setSelectedTextKey(id + ":" + path)
          setTextSearch("")
          const panel = document.querySelector<HTMLElement>("[data-workspace-editor-ui='true']")
          panel?.scrollTo({ top: panel.scrollHeight, behavior: "smooth" })
        }
        pencil.addEventListener("click", openTextEditor)
        document.body.appendChild(pencil)
        place()
        window.addEventListener("scroll", place, true)
        window.addEventListener("resize", place)
        cleanup.push(() => { pencil.removeEventListener("click", openTextEditor); window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); pencil.remove() })
      })
    })
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-workspace-id]"))
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(style)); localStorage.setItem(TEXT_KEY, JSON.stringify(textOverrides)); localStorage.setItem(TEXT_SIZE_KEY, JSON.stringify(textSizes)); localStorage.setItem(ELEMENT_OVERRIDES_KEY, JSON.stringify(elementOverrides)); setSavedElementOverrides(elementOverrides); setSaved(draft); setSavedStyle(style); setSavedTextOverrides(textOverrides); setSavedTextSizes(textSizes); setMode(null); setActiveId(""); applyLayout(draft[viewportKey])
  }
  const cancel = () => { setDraft(saved); setStyle(savedStyle); setTextOverrides(savedTextOverrides); setTextSizes(savedTextSizes); setElementOverrides(savedElementOverrides); applyElementOverrides(savedElementOverrides); applyTextOverrides(savedTextOverrides, savedTextSizes); applyLayout(saved[viewportKey]); setMode(null); setActiveId("") }
  const reset = () => {
    if (!window.confirm("คืนค่าตำแหน่งและขนาดขององค์ประกอบทั้งหมดใช่ไหม? ข้อมูลออมเงินและโน้ตจะไม่ถูกลบ")) return
    const clean = emptyStore(); setDraft(clean); setSaved(clean); localStorage.removeItem(STORAGE_KEY); applyLayout(clean[viewportKey]); setActiveId("")
  }
  const open = () => { const latest = readStore(); const latestStyle = readStyle(); const latestText = readTextOverrides(); const latestSizes = readTextSizes(); const latestElementOverrides = readElementOverrides(); setSavedElementOverrides(latestElementOverrides); setElementOverrides(latestElementOverrides); applyElementOverrides(latestElementOverrides); setSaved(latest); setDraft(latest); setSavedStyle(latestStyle); setStyle(latestStyle); setSavedTextOverrides(latestText); setTextOverrides(latestText); setSavedTextSizes(latestSizes); setTextSizes(latestSizes); setSelectedTextKey(""); setMode("editing") }
  const count = useMemo(() => Object.keys(activeLayout).length, [activeLayout])
  const editableTexts = useMemo(() => scanEditableTexts(textOverrides), [textOverrides, textScanVersion, mode])
  const filteredTexts = useMemo(() => {
    const query = textSearch.trim().toLocaleLowerCase()
    return editableTexts.filter((item) => !query || item.text.toLocaleLowerCase().includes(query) || item.id.toLocaleLowerCase().includes(query))
  }, [editableTexts, textSearch])
  const selectedText = editableTexts.find((item) => item.key === selectedTextKey)
  return <>
    {mode === null && <button onClick={open} className="fixed right-5 top-[76px] z-40 inline-flex h-10 items-center gap-2 rounded-full border border-[#DEDACF] bg-[#FCFBF7]/95 px-4 text-sm font-medium text-[#354337] shadow-lg backdrop-blur transition hover:-translate-y-0.5 md:right-8 md:top-[88px]" aria-label="ปรับแต่งหน้าตาและเลย์เอาต์"><span aria-hidden="true">✣</span><span className="hidden sm:inline">จัดหน้าเว็บ</span></button>}
    {mode !== null && <>
      <div className="pointer-events-none fixed inset-0 z-[80] border-2 border-dashed border-[#52785B]/40" aria-hidden="true" />
      <section className="fixed z-[120] flex flex-col rounded-[24px] border border-[#DEDACF] bg-[#FCFBF7]/97 shadow-[0_24px_90px_rgba(25,35,27,0.25)] backdrop-blur-xl" style={{ left: Math.max(8, Math.min(popupPrefs.x, window.innerWidth - Math.min(popupPrefs.width, window.innerWidth - 16) - 8)), top: Math.max(8, Math.min(popupPrefs.y, window.innerHeight - (popupPrefs.collapsed ? 58 : 100))), width: Math.min(popupPrefs.width, window.innerWidth - 16), height: popupPrefs.collapsed ? 58 : Math.min(popupPrefs.height, window.innerHeight - 16), maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100vh - 16px)" }} data-workspace-editor-ui="true" aria-label="ตัวแก้ไขพื้นที่ทำงาน">
        <div className="flex shrink-0 cursor-move items-center justify-between gap-3 rounded-t-[24px] border-b border-[#E6E2D8] bg-[#F4F4EC] px-4 py-3" onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          event.preventDefault()
          popupDragRef.current = { startX: event.clientX, startY: event.clientY, originX: popupPrefs.x, originY: popupPrefs.y }
          const move = (e: PointerEvent) => { const drag = popupDragRef.current; if (!drag) return; setPopupPrefs((old) => ({ ...old, x: Math.max(8, Math.min(window.innerWidth - 80, drag.originX + e.clientX - drag.startX)), y: Math.max(8, Math.min(window.innerHeight - 58, drag.originY + e.clientY - drag.startY)) })) }
          const end = () => { popupDragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end) }
          window.addEventListener("pointermove", move); window.addEventListener("pointerup", end)
        }}>
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52785B]">จัดหน้าเว็บ · ลากแถบนี้เพื่อย้าย</p><p className="truncate text-sm font-semibold text-[#263329]">{popupPrefs.collapsed ? "ตัวแก้ไขพื้นที่ทำงาน (พับอยู่)" : "ตัวแก้ไขพื้นที่ทำงาน"}</p></div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setPopupPrefs((old) => ({ ...old, collapsed: !old.collapsed }))} className="grid h-8 w-8 place-items-center rounded-full border border-[#D9D4C6] bg-white text-[#354337]" aria-label={popupPrefs.collapsed ? "ขยายหน้าต่าง" : "พับหน้าต่าง"} title={popupPrefs.collapsed ? "ขยาย" : "พับ"}>{popupPrefs.collapsed ? "▢" : "−"}</button>
            <button type="button" onClick={() => setPopupPrefs((old) => ({ ...old, x: Math.max(8, window.innerWidth - Math.min(760, window.innerWidth - 16) - 8), y: 76, width: Math.min(760, window.innerWidth - 16), height: Math.min(700, window.innerHeight - 92), collapsed: false }))} className="grid h-8 w-8 place-items-center rounded-full border border-[#D9D4C6] bg-white text-[#354337]" aria-label="จัดหน้าต่างให้อยู่ในหน้าจอ" title="จัดหน้าต่างใหม่">↗</button>
          </div>
        </div>
        {!popupPrefs.collapsed && <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52785B]">CUSTOM WORKSPACE · {viewportMobile ? "MOBILE" : "DESKTOP"}</p><h2 className="mt-1 text-lg font-semibold text-[#263329]">{mode === "editing" ? "จัดวางองค์ประกอบได้ตามใจ" : "ดูตัวอย่างการจัดหน้า"}</h2><p className="mt-1 text-xs leading-5 text-[#777C73]">เปิดโหมดนี้แล้วกดปากกาข้างหัวข้อเพื่อแก้ข้อความและขนาด · จับ ⠿ เพื่อย้าย · จับ ↘ เพื่อปรับความกว้าง</p></div><span className="rounded-full bg-[#E6F0E7] px-3 py-1.5 text-xs text-[#52785B]">{count} รายการที่ปรับตำแหน่งแล้ว</span></div>
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
          <button onClick={() => { if (window.confirm("คืนข้อความที่แก้ไขทั้งหมดให้เป็นข้อความเดิมใช่ไหม?")) { setTextOverrides({}); setTextSizes({}); applyTextOverrides({}, {}); } }} className="rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs font-medium text-[#9A722F]">คืนค่าข้อความเดิม</button>
          <div className="col-span-full rounded-2xl border border-[#D9E3D7] bg-[#F5F8F3] p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-[#263329]">แก้ไขหน้าตาองค์ประกอบเดิม</h3><p className="mt-1 text-[11px] leading-5 text-[#777C73]">เลือกส่วนของหน้าเพื่อเปลี่ยนสีพื้นหลัง สีข้อความ ระยะห่าง มุมโค้ง และไอคอนแรกที่พบในส่วนนั้น</p></div>
              <button type="button" onClick={() => setTextScanVersion((value) => value + 1)} className="rounded-full border border-[#D9E3D7] bg-white px-3 py-2 text-xs font-medium text-[#354337]">สแกนส่วนหน้าใหม่</button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-[#6D716B]" htmlFor="workspace-element-id">ส่วนของหน้า</label>
                <select id="workspace-element-id" value={activeId} onChange={(event) => setActiveId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DEDACF] bg-white px-3 py-2.5 text-xs text-[#263329]">
                  <option value="">เลือกส่วนที่ต้องการแก้ไข…</option>
                  {workspaceElements.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <p className="mt-2 text-[10px] leading-5 text-[#858880]">รองรับส่วนที่มี data-workspace-id บนหน้าเดิม หากไม่พบองค์ประกอบให้เพิ่ม ID ในโค้ดหน้าเว็บก่อน</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">พื้นหลัง <input aria-label="สีพื้นหลังองค์ประกอบ" type="color" value={activeElementOverride.backgroundColor || "#ffffff"} onChange={(event) => setActiveElementOverride({ backgroundColor: event.target.value })} className="h-7 w-9 border-0 bg-transparent p-0" disabled={!activeId}/></label>
                <label className="flex items-center justify-between gap-2 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">สีข้อความ <input aria-label="สีข้อความองค์ประกอบ" type="color" value={activeElementOverride.color || "#263329"} onChange={(event) => setActiveElementOverride({ color: event.target.value })} className="h-7 w-9 border-0 bg-transparent p-0" disabled={!activeId}/></label>
                <label className="flex flex-col gap-1 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">Padding<input aria-label="ระยะห่างองค์ประกอบ" value={activeElementOverride.padding || ""} onChange={(event) => setActiveElementOverride({ padding: event.target.value })} placeholder="เช่น 16px" className="min-w-0 rounded-lg border border-[#E7E8E1] px-2 py-1.5 text-xs" disabled={!activeId}/></label>
                <label className="flex flex-col gap-1 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">มุมโค้ง<input aria-label="มุมโค้งองค์ประกอบ" value={activeElementOverride.borderRadius || ""} onChange={(event) => setActiveElementOverride({ borderRadius: event.target.value })} placeholder="เช่น 16px" className="min-w-0 rounded-lg border border-[#E7E8E1] px-2 py-1.5 text-xs" disabled={!activeId}/></label>
                <label className="col-span-full flex flex-col gap-1 rounded-xl border border-[#DEDACF] bg-white px-3 py-2 text-xs text-[#6D716B]">แทนที่ไอคอนด้วย Emoji<input aria-label="แทนที่ไอคอนองค์ประกอบ" value={activeElementOverride.icon || ""} onChange={(event) => setActiveElementOverride({ icon: event.target.value })} placeholder="เช่น ✦ ♡ 🐷 (เว้นว่างเพื่อคืนไอคอนเดิม)" maxLength={12} className="min-w-0 rounded-lg border border-[#E7E8E1] px-2 py-1.5 text-xs" disabled={!activeId}/></label>
              </div>
            </div>
          </div>
          <div className="col-span-full rounded-2xl border border-[#D9E3D7] bg-[#F5F8F3] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-[#263329]">แก้ไขข้อความและหัวข้อ</h3><p className="mt-1 text-[11px] leading-5 text-[#777C73]">กดปากกา ✎ ที่อยู่ข้างข้อความบนหน้าเว็บ หรือเลือกจากรายการ แล้วปรับข้อความและขนาดได้ทันที</p></div>
              <button type="button" onClick={() => setTextScanVersion((value) => value + 1)} className="rounded-full border border-[#D9E3D7] bg-white px-3 py-2 text-xs font-medium text-[#354337]">สแกนข้อความใหม่</button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0">
                <input value={textSearch} onChange={(event) => setTextSearch(event.target.value)} placeholder="ค้นหาหัวข้อหรือข้อความ..." aria-label="ค้นหาข้อความที่แก้ไขได้" className="w-full rounded-xl border border-[#DEDACF] bg-white px-3 py-2.5 text-sm text-[#263329] outline-none focus:border-[#9BB39D]" />
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#E6E8E0] bg-white p-1.5">
                  {filteredTexts.length === 0 ? <p className="px-3 py-4 text-xs text-[#858880]">ไม่พบข้อความที่แก้ไขได้ ลองกดสแกนข้อความใหม่</p> : filteredTexts.map((item) => <button key={item.key} type="button" onClick={() => setSelectedTextKey(item.key)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition ${selectedTextKey === item.key ? "bg-[#E4EDE2] text-[#263329]" : "text-[#5F675E] hover:bg-[#F5F6F1]"}`}><span className="block truncate font-medium">{item.text}</span><span className="mt-0.5 block truncate text-[10px] opacity-65">{item.id} · {item.tag}</span></button>)}
                </div>
                <p className="mt-1.5 text-[10px] text-[#858880]">พบ {editableTexts.length} ข้อความ · รายการข้อมูลออมเงิน สุขภาพ และโน้ตที่บันทึกไว้ถูกกันออก</p>
              </div>
              <div className="min-w-0 rounded-xl border border-[#E6E8E0] bg-white p-3">
                {selectedText ? <>
                  <label className="block text-xs font-medium text-[#6D716B]" htmlFor="workspace-text-value">ข้อความใหม่</label>
                  <textarea id="workspace-text-value" value={textOverrides[selectedText.key] ?? selectedText.text} onChange={(event) => setTextOverrides((old) => ({ ...old, [selectedText.key]: event.target.value }))} rows={3} maxLength={180} className="mt-1.5 w-full resize-y rounded-xl border border-[#DEDACF] bg-[#FCFBF7] px-3 py-2.5 text-sm text-[#263329] outline-none focus:border-[#9BB39D]" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setTextOverrides((old) => { const next = { ...old }; delete next[selectedText.key]; return next }); }} className="rounded-full border border-[#DEDACF] px-3 py-2 text-xs text-[#6D716B]">คืนข้อความนี้</button>
                    <button type="button" onClick={() => { const node = document.querySelector<HTMLElement>("[data-workspace-id='" + selectedText.id + "']"); const target = node ? elementAtPath(node, selectedText.path) : null; if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); target.style.outline = "2px solid #78977A"; window.setTimeout(() => { if (target.isConnected) target.style.outline = ""; }, 1800); } }} className="rounded-full bg-[#E4EDE2] px-3 py-2 text-xs font-medium text-[#354337]">ชี้ตำแหน่งบนหน้า</button>
                  </div>
                </> : <p className="py-5 text-xs leading-5 text-[#858880]">เลือกข้อความจากรายการทางซ้ายเพื่อเริ่มแก้ไขได้เลย</p>}
              </div>
            </div>
          </div>
          <p className="col-span-full text-[11px] leading-5 text-[#858880]">กดปากกาข้างข้อความเพื่อเลือกแก้ไข · ปรับขนาดได้รายข้อความ · กดบันทึกเมื่อเสร็จ หรือยกเลิกเพื่อคืนค่าก่อนแก้</p>
          <button onClick={() => setMode(mode === "editing" ? "preview" : "editing")} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#354337]">{mode === "editing" ? "ดูตัวอย่าง" : "กลับไปแก้ไข"}</button>
          <button onClick={reset} className="rounded-full border border-[#E6D7C7] bg-white px-4 py-2 text-xs font-medium text-[#9A722F]">คืนค่าตำแหน่ง</button><div className="flex-1" />
          <button onClick={cancel} className="rounded-full border border-[#DEDACF] bg-white px-4 py-2 text-xs font-medium text-[#6D716B]">ยกเลิก</button><button onClick={saveLayout} className="rounded-full bg-[#263329] px-5 py-2 text-xs font-medium text-white hover:bg-[#3B4A3E]">บันทึก</button>
        </div>
        </div>}
        <button type="button" aria-label="ลากเพื่อปรับขนาดหน้าต่าง" title="ลากเพื่อปรับขนาด" className="absolute bottom-1 right-1 z-10 grid h-7 w-7 cursor-nwse-resize place-items-center rounded-lg border border-[#D9D4C6] bg-white/95 text-sm text-[#354337]" style={{ touchAction: "none" }} onPointerDown={(event) => {
          event.preventDefault(); event.stopPropagation()
          popupResizeRef.current = { startX: event.clientX, startY: event.clientY, width: popupPrefs.width, height: popupPrefs.height }
          const move = (e: PointerEvent) => { const resize = popupResizeRef.current; if (!resize) return; setPopupPrefs((old) => ({ ...old, width: Math.max(340, Math.min(window.innerWidth - old.x - 8, resize.width + e.clientX - resize.startX)), height: Math.max(58, Math.min(window.innerHeight - old.y - 8, resize.height + e.clientY - resize.startY)) })) }
          const end = () => { popupResizeRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end) }
          window.addEventListener("pointermove", move); window.addEventListener("pointerup", end)
        }}>↘</button>
      </section>
      {mode === "editing" && <div className="fixed right-4 top-4 z-[120] rounded-full bg-[#263329] px-3 py-2 text-xs text-white shadow-lg">กำลังแก้ไข · {activeId || "เลือกจุดจับขององค์ประกอบ"}</div>}
    </>}
  </>
}
