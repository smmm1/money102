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

export function createElement(type: ElementType): PageElement {
  const id = `node_${Math.random().toString(36).slice(2, 9)}`;
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
