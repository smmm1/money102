import { COMPONENT_LIBRARY, type ElementType, type PageElement } from "./types";
import { editorActions } from "./useEditorStore";

function ElementView({ node, selectedId }: { node: PageElement; selectedId: string }) {
  const style: React.CSSProperties = {
    backgroundColor: node.styles.backgroundColor,
    color: node.styles.color,
    fontSize: node.styles.fontSize,
    padding: node.styles.padding,
    margin: node.styles.margin,
    borderRadius: node.styles.borderRadius,
    textAlign: node.styles.textAlign,
    width: node.styles.width,
    minHeight: node.styles.minHeight,
    border: node.styles.border,
  };
  const selected = selectedId === node.id;
  const acceptDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const type = event.dataTransfer.getData("application/x-money102-element") as ElementType;
    if (COMPONENT_LIBRARY.some((item) => item.type === type)) editorActions.drop(type, node.id);
  };
  const shared = {
    className: `builder-canvas-element ${selected ? "is-active" : ""} builder-element-${node.type}`,
    style,
    onClick: (event: React.MouseEvent) => { event.stopPropagation(); editorActions.select(node.id); },
    onDragOver: (event: React.DragEvent) => event.preventDefault(),
    onDrop: acceptDrop,
    "data-node-id": node.id,
  };
  let content: React.ReactNode;
  if (node.type === "image") {
    content = node.src ? <img className="builder-image" src={node.src} alt={node.content || "ภาพ"} /> : <div className="builder-image-placeholder"><span>▧</span><b>{node.content || "เพิ่มรูปภาพ"}</b><small>ใส่ URL รูปภาพในแผงด้านขวา</small></div>;
  } else if (node.type === "button") {
    content = <span className="builder-button-preview">{node.icon && <span>{node.icon} </span>}{node.content || "ปุ่ม"}</span>;
  } else if (node.type === "heading") {
    content = <h2 style={{ margin: 0, color: node.styles.color, fontSize: node.styles.fontSize || "28px", textAlign: node.styles.textAlign }}>{node.content || "หัวข้อ"}</h2>;
  } else {
    content = node.type === "section" || node.type === "container" || node.type === "card"
      ? <>{node.type === "section" && node.id !== "root" && <div className="builder-node-label">{node.content || "Section"}</div>}{node.type === "card" && <div className="builder-card-title">{node.icon && <span>{node.icon} </span>}{node.content || "Card"}</div>}{node.type === "container" && node.children.length === 0 && <div className="builder-empty-container">Container · ลากองค์ประกอบมาวางได้</div>}{node.children.map((child) => <ElementView key={child.id} node={child} selectedId={selectedId} />)}</>
      : <p style={{ margin: 0, color: node.styles.color, fontSize: node.styles.fontSize, textAlign: node.styles.textAlign }}>{node.content || "ข้อความ"}</p>;
  }
  if (node.type === "button") return <div {...shared}><div className="builder-node-label">{node.content || "Button"}</div>{content}</div>;
  return <div {...shared}>{content}{node.type === "image" && node.children.map((child) => <ElementView key={child.id} node={child} selectedId={selectedId} />)}</div>;
}

export default function Canvas({ root, selectedId, viewport }: { root: PageElement; selectedId: string; viewport: "desktop" | "tablet" | "mobile" }) {
  const acceptDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-money102-element") as ElementType;
    if (COMPONENT_LIBRARY.some((item) => item.type === type)) editorActions.add(type, root.id);
  };
  return <main className="builder-workspace">
    <div className="builder-canvas-toolbar"><div><span className="builder-live-dot" /> Canvas <span className="builder-toolbar-separator">/</span><span className="builder-muted">{root.children.length} elements</span></div><span className="builder-canvas-hint">คลิกเพื่อเลือก · ลาก Component มาวาง</span></div>
    <div className="builder-canvas-scroll">
      <div className={`builder-canvas-frame viewport-${viewport}`} onClick={() => editorActions.select(root.id)} onDragOver={(event) => event.preventDefault()} onDrop={acceptDrop}>
        <ElementView node={root} selectedId={selectedId} />
      </div>
    </div>
    <div className="builder-canvas-footer"><span>Draft preview</span><span>{viewport === "desktop" ? "1440 px" : viewport === "tablet" ? "768 px" : "390 px"} viewport</span></div>
  </main>;
}
