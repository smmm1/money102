import { useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Canvas from "./Canvas";
import PropertyPanel from "./PropertyPanel";
import { editorActions, useEditorStore } from "./useEditorStore";
import "./backoffice.css";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char); }
function renderHtml(node: ReturnType<typeof useEditorStore>["document"]["root"]): string {
  const style = Object.entries(node.styles).map(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return `${cssKey}:${escapeHtml(String(value))}`;
  }).join(";");
  const children = node.children.map(renderHtml).join("");
  const content = escapeHtml(node.content || "");
  if (node.type === "image") return node.src ? `<img src="${escapeHtml(node.src)}" alt="${content}" style="${style}" />` : `<div style="${style}">${content}</div>`;
  if (node.type === "button") return `<a href="${escapeHtml(node.href || "#")}" style="${style}">${escapeHtml(node.icon || "")} ${content}</a>`;
  if (node.type === "heading") return `<h2 style="${style}">${content}</h2>`;
  if (node.type === "text") return `<p style="${style}">${content}</p>`;
  return `<section style="${style}">${node.type === "card" ? `<h3>${escapeHtml(node.icon || "")} ${content}</h3>` : ""}${children}</section>`;
}
export default function Backoffice() {
  const { document, selected, selectedId, viewport } = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.version !== 1 || !parsed.root || !Array.isArray(parsed.root.children)) throw new Error("invalid");
      localStorage.setItem("money102-visual-builder-draft-v1", JSON.stringify(parsed));
      window.location.reload();
    } catch { window.alert("ไฟล์ JSON ไม่ถูกต้อง หรือไม่ใช่ Schema ของ Visual Builder รุ่นนี้"); }
  };
  return <div className="builder-app">
    <header className="builder-topbar">
      <a className="builder-brand" href="/"><span className="builder-brand-mark">m</span><span><b>money102</b><small>VISUAL BUILDER</small></span></a>
      <div className="builder-page-title"><span className="builder-breadcrumb">Workspace</span><span>/</span><input aria-label="ชื่อหน้า" value={document.title} onChange={(e) => editorActions.setTitle(e.target.value)} /></div>
      <div className="builder-top-actions">
        <button className="builder-quiet-button" onClick={() => editorActions.undo()} disabled={!useEditorStore().history.length}>↶ Undo</button>
        <button className="builder-quiet-button" onClick={() => fileInput.current?.click()}>Import JSON</button>
        <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={(e) => void importJson(e.target.files?.[0])} />
        <button className="builder-export-button" onClick={() => setExportOpen(true)}>Export / Save ↗</button>
      </div>
    </header>
    <div className="builder-workbench">
      <Sidebar root={document.root} selectedId={selectedId} />
      <div className="builder-center-column">
        <div className="builder-device-switch" role="group" aria-label="ขนาดหน้าจอ">
          <span>Preview</span><div className="builder-device-options">
            <button className={viewport === "desktop" ? "active" : ""} onClick={() => editorActions.viewport("desktop")}>▰ Desktop</button>
            <button className={viewport === "tablet" ? "active" : ""} onClick={() => editorActions.viewport("tablet")}>▯ Tablet</button>
            <button className={viewport === "mobile" ? "active" : ""} onClick={() => editorActions.viewport("mobile")}>▯ Mobile</button>
          </div>
        </div>
        <Canvas root={document.root} selectedId={selectedId} viewport={viewport} />
      </div>
      <PropertyPanel selected={selected} />
    </div>
    {exportOpen && <div className="builder-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setExportOpen(false); }}>
      <section className="builder-export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <button className="builder-modal-close" onClick={() => setExportOpen(false)} aria-label="ปิด">×</button>
        <p className="builder-eyebrow">EXPORT YOUR DESIGN</p><h2 id="export-title">บันทึกผลงาน</h2><p className="builder-muted">แบบร่างบันทึกในเบราว์เซอร์แล้ว ส่งออกเป็น JSON เพื่อสำรองหรือแก้ต่อได้</p>
        <button className="builder-export-choice" onClick={() => download("money102-page-schema.json", JSON.stringify(document, null, 2), "application/json")}><span>﹝JSON﹞</span><span><b>Export JSON Schema</b><small>Tree structure และ properties ทั้งหมด</small></span><b>↓</b></button>
        <button className="builder-export-choice" onClick={() => download("money102-page.html", `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(document.title)}</title><body style="margin:0;font-family:system-ui,sans-serif;background:#fcfbf7;">${renderHtml(document.root)}</body></html>`, "text/html")}><span>‹/›</span><span><b>Export HTML</b><small>HTML แบบ standalone พร้อม inline styles</small></span><b>↓</b></button>
        <div className="builder-export-note"><b>หมายเหตุ:</b> Export เป็นไฟล์ต้นแบบ ไม่ได้ Publish ขึ้นเว็บไซต์จริง และไม่เปลี่ยนข้อมูลบัญชีหรือฐานข้อมูล</div>
        <button className="builder-modal-done" onClick={() => setExportOpen(false)}>เสร็จสิ้น</button>
      </section>
    </div>}
  </div>;
}
