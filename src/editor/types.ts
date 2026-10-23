export type ElementType = "section" | "container" | "heading" | "text" | "button" | "image" | "card";

export type ElementStyles = {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  textAlign?: "left" | "center" | "right";
  width?: string;
  minHeight?: string;
  border?: string;
};

export type PageElement = {
  id: string;
  type: ElementType;
  content?: string;
  icon?: string;
  href?: string;
  src?: string;
  styles: ElementStyles;
  children: PageElement[];
};

export type EditorDocument = {
  version: 1;
  title: string;
  page: string;
  updatedAt: string;
  root: PageElement;
};

export const COMPONENT_LIBRARY: { type: ElementType; label: string; icon: string; description: string }[] = [
  { type: "section", label: "Section", icon: "▤", description: "ส่วนหลักของหน้า" },
  { type: "container", label: "Container", icon: "▣", description: "กลุ่มองค์ประกอบ" },
  { type: "heading", label: "Heading", icon: "T", description: "หัวข้อ" },
  { type: "text", label: "Text", icon: "¶", description: "ข้อความทั่วไป" },
  { type: "button", label: "Button", icon: "↗", description: "ปุ่มลิงก์" },
  { type: "image", label: "Image", icon: "▧", description: "รูปภาพ" },
  { type: "card", label: "Card", icon: "▱", description: "การ์ดเนื้อหา" },
];

const ELEMENT_TYPES = new Set<string>(COMPONENT_LIBRARY.map((item) => item.type));
const STYLE_KEYS = new Set<keyof ElementStyles>(["backgroundColor", "color", "fontSize", "padding", "margin", "borderRadius", "textAlign", "width", "minHeight", "border"]);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const CSS_VALUE_PATTERN = /^[#(),.%\w\s-]+$/;

export function isSafeLink(value: unknown, image = false): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (!value.trim()) return true;
  if (image) return /^https?:\/\//i.test(value);
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value);
}

export function validateEditorDocument(value: unknown): value is EditorDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<EditorDocument>;
  if (doc.version !== 1 || typeof doc.title !== "string" || doc.title.length > 160 ||
      typeof doc.page !== "string" || doc.page.length > 80 ||
      typeof doc.updatedAt !== "string" || !doc.root || typeof doc.root !== "object") return false;
  const ids = new Set<string>();
  let count = 0;
  const visit = (node: unknown, depth: number): node is PageElement => {
    if (!node || typeof node !== "object" || depth > 20 || count++ > 1000) return false;
    const item = node as Partial<PageElement>;
    if (typeof item.id !== "string" || !ID_PATTERN.test(item.id) || ids.has(item.id)) return false;
    ids.add(item.id);
    if (typeof item.type !== "string" || !ELEMENT_TYPES.has(item.type)) return false;
    if (item.content !== undefined && (typeof item.content !== "string" || item.content.length > 10000)) return false;
    if (item.icon !== undefined && (typeof item.icon !== "string" || item.icon.length > 64)) return false;
    if (item.href !== undefined && !isSafeLink(item.href)) return false;
    if (item.src !== undefined && !isSafeLink(item.src, true)) return false;
    if (!item.styles || typeof item.styles !== "object" || Array.isArray(item.styles)) return false;
    for (const [key, styleValue] of Object.entries(item.styles)) {
      if (!STYLE_KEYS.has(key as keyof ElementStyles) || typeof styleValue !== "string" || styleValue.length > 120 || !CSS_VALUE_PATTERN.test(styleValue)) return false;
    }
    if (!Array.isArray(item.children) || item.children.length > 200) return false;
    return item.children.every((child) => visit(child, depth + 1));
  };
  return visit(doc.root, 0);
}

export function createElement(type: ElementType): PageElement {
  const id = `node_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 14)}`;
  const defaults: Record<ElementType, Partial<PageElement>> = {
    section: { content: "Section ใหม่", styles: { padding: "28px", backgroundColor: "#f5f3eb", borderRadius: "20px", minHeight: "120px" } },
    container: { content: "Container", styles: { padding: "16px", backgroundColor: "#ffffff", borderRadius: "16px" } },
    heading: { content: "หัวข้อใหม่", styles: { fontSize: "28px", color: "#263329", margin: "0 0 12px", textAlign: "left" } },
    text: { content: "พิมพ์ข้อความของคุณที่นี่", styles: { fontSize: "15px", color: "#626b61", margin: "0 0 12px", textAlign: "left" } },
    button: { content: "ปุ่มใหม่", icon: "↗", href: "#", styles: { padding: "12px 18px", backgroundColor: "#263329", color: "#ffffff", borderRadius: "999px", fontSize: "14px" } },
    image: { content: "ภาพตัวอย่าง", src: "", styles: { width: "100%", minHeight: "140px", backgroundColor: "#e7e5dc", borderRadius: "14px" } },
    card: { content: "การ์ดใหม่", icon: "✦", styles: { padding: "20px", backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e5e2d8" } },
  };
  return { id, type, icon: defaults[type].icon ?? "", href: defaults[type].href ?? "", src: defaults[type].src ?? "", content: defaults[type].content ?? "", styles: defaults[type].styles ?? {}, children: [] };
}

export function createDefaultDocument(): EditorDocument {
  const root = createElement("section");
  root.id = "root";
  root.content = "หน้าใหม่";
  root.styles = { padding: "28px", backgroundColor: "#fcfbf7", borderRadius: "24px", minHeight: "520px" };
  const heading = createElement("heading");
  heading.content = "ออกแบบหน้าเว็บของคุณ";
  const text = createElement("text");
  text.content = "เลือกองค์ประกอบจากแถบซ้าย แล้วปรับแต่งได้ทันทีจากแผงด้านขวา";
  const card = createElement("card");
  card.content = "เริ่มต้นด้วยการ์ด";
  card.icon = "✦";
  const button = createElement("button");
  button.content = "เริ่มต้นใช้งาน";
  root.children = [heading, text, card, button];
  return { version: 1, title: "หน้าเว็บตัวอย่าง", page: "home", updatedAt: new Date().toISOString(), root };
}
