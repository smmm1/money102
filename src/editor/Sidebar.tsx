import { COMPONENT_LIBRARY, type ElementType, type PageElement } from "./types";
import { editorActions } from "./useEditorStore";

function TreeItem({ node, depth = 0, selectedId }: { node: PageElement; depth?: number; selectedId: string }) {
  return <div>
    <button className={`builder-tree-item ${selectedId === node.id ? "is-selected" : ""}`} style={{ paddingLeft: 12 + depth * 14 }} onClick={() => editorActions.select(node.id)}>
      <span className="builder-tree-icon">{node.icon || ({ section: "▤", container: "▣", heading: "T", text: "¶", button: "↗", image: "▧", card: "▱" }[node.type])}</span>
      <span className="builder-tree-label">{node.content || node.type}</span><span className="builder-tree-type">{node.type}</span>
    </button>
    {node.children.map((child) => <TreeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} />)}
  </div>;
}

export default function Sidebar({ root, selectedId, selectedType }: { root: PageElement; selectedId: string; selectedType: ElementType }) {
  const add = (type: ElementType) => editorActions.add(type, selectedId === "root" || ["section", "container", "card"].includes(selectedType) ? selectedId : "root");
  return <aside className="builder-sidebar">
    <div className="builder-panel-heading"><div><p className="builder-eyebrow">LIBRARY</p><h2>องค์ประกอบ</h2></div><span className="builder-count">{COMPONENT_LIBRARY.length}</span></div>
    <p className="builder-muted">คลิกเพื่อเพิ่มลงใน Element ที่เลือก หรือใช้การลากวาง</p>
    <div className="builder-component-grid">
      {COMPONENT_LIBRARY.map((item) => <button key={item.type} draggable onDragStart={(event) => event.dataTransfer.setData("application/x-money102-element", item.type)} onClick={() => add(item.type)} className="builder-component">
        <span className="builder-component-icon">{item.icon}</span><span className="builder-component-label">{item.label}</span><span className="builder-component-desc">{item.description}</span>
      </button>)}
    </div>
    <div className="builder-panel-heading builder-tree-heading"><div><p className="builder-eyebrow">LAYERS</p><h2>โครงสร้างหน้า</h2></div></div>
    <div className="builder-tree"><TreeItem node={root} selectedId={selectedId} /></div>
    <p className="builder-sidebar-foot">บันทึกเป็นแบบร่างในเบราว์เซอร์นี้</p>
  </aside>;
}
