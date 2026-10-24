import { COMPONENT_LIBRARY, type ElementType, type PageElement } from "./types";
import { editorActions } from "./useEditorStore";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="builder-field"><span>{label}</span>{children}</label>;
}
export default function PropertyPanel({ selected }: { selected: PageElement }) {
  const update = (patch: Partial<PageElement>) => editorActions.update(selected.id, patch);
  const style = (key: keyof PageElement["styles"], value: string) => editorActions.update(selected.id, { styles: { [key]: value } });
  return <aside className="builder-inspector">
    <div className="builder-panel-heading"><div><p className="builder-eyebrow">INSPECTOR</p><h2>ปรับแต่ง</h2></div><span className="builder-selected-tag">{selected.type}</span></div>
    <div className="builder-inspector-content">
      <section className="builder-inspector-section"><h3>เนื้อหา</h3>
        <Field label="ชื่อ / ข้อความ"><textarea rows={3} value={selected.content || ""} onChange={(e) => update({ content: e.target.value })} /></Field>
        <Field label="ไอคอน (Emoji หรือสัญลักษณ์)"><input value={selected.icon || ""} onChange={(e) => update({ icon: e.target.value })} placeholder="เช่น ✦ ↗ ♡" /></Field>
        {selected.type === "button" && <Field label="ลิงก์ปลายทาง"><input value={selected.href || ""} onChange={(e) => update({ href: e.target.value })} placeholder="https://..." /></Field>}
        {selected.type === "image" && <Field label="URL รูปภาพ"><input value={selected.src || ""} onChange={(e) => update({ src: e.target.value })} placeholder="https://example.com/image.jpg" /></Field>}
      </section>
      <section className="builder-inspector-section"><h3>รูปแบบ</h3>
        <Field label="สีพื้นหลัง"><div className="builder-color-field"><input type="color" value={selected.styles.backgroundColor || "#ffffff"} onChange={(e) => style("backgroundColor", e.target.value)} /><input value={selected.styles.backgroundColor || ""} onChange={(e) => style("backgroundColor", e.target.value)} placeholder="#ffffff" /></div></Field>
        <Field label="สีข้อความ"><div className="builder-color-field"><input type="color" value={selected.styles.color || "#263329"} onChange={(e) => style("color", e.target.value)} /><input value={selected.styles.color || ""} onChange={(e) => style("color", e.target.value)} placeholder="#263329" /></div></Field>
        <div className="builder-field-row"><Field label="ขนาดตัวอักษร"><input value={selected.styles.fontSize || ""} onChange={(e) => style("fontSize", e.target.value)} placeholder="16px" /></Field><Field label="Padding"><input value={selected.styles.padding || ""} onChange={(e) => style("padding", e.target.value)} placeholder="16px" /></Field></div>
        <div className="builder-field-row"><Field label="Margin"><input value={selected.styles.margin || ""} onChange={(e) => style("margin", e.target.value)} placeholder="0 0 16px" /></Field><Field label="มุมโค้ง"><input value={selected.styles.borderRadius || ""} onChange={(e) => style("borderRadius", e.target.value)} placeholder="16px" /></Field></div>
        <Field label="จัดแนวข้อความ"><select value={selected.styles.textAlign || "left"} onChange={(e) => style("textAlign", e.target.value)}><option value="left">ชิดซ้าย</option><option value="center">กึ่งกลาง</option><option value="right">ชิดขวา</option></select></Field>
        <Field label="ความกว้าง"><input value={selected.styles.width || ""} onChange={(e) => style("width", e.target.value)} placeholder="100% หรือ auto" /></Field>
        <Field label="เส้นขอบ"><input value={selected.styles.border || ""} onChange={(e) => style("border", e.target.value)} placeholder="1px solid #e5e2d8" /></Field>
      </section>
      <section className="builder-inspector-section"><h3>จัดลำดับ</h3><div className="builder-order-actions"><button onClick={() => editorActions.move(selected.id, -1)}>↑ ย้ายขึ้น</button><button onClick={() => editorActions.move(selected.id, 1)}>↓ ย้ายลง</button></div>{selected.id !== "root" && <button className="builder-danger-button" onClick={() => { if (window.confirm("ลบองค์ประกอบนี้หรือไม่?")) editorActions.remove(selected.id); }}>ลบองค์ประกอบ</button>}</section>
    </div>
    <div className="builder-inspector-foot"><span className="builder-inspector-dot" /> เปลี่ยนแปลงแบบ Real-time</div>
  </aside>;
}
