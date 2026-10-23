import { useSyncExternalStore } from "react";
import { createDefaultDocument, createElement, type EditorDocument, type ElementType, type PageElement } from "./types";

const STORAGE_KEY = "money102-visual-builder-draft-v1";
type EditorState = { document: EditorDocument; selectedId: string; viewport: "desktop" | "tablet" | "mobile"; history: EditorDocument[] };
function readInitial(): EditorDocument {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as EditorDocument | null;
    if (parsed?.version === 1 && parsed.root?.children) return parsed;
  } catch { /* local storage may be unavailable */ }
  return createDefaultDocument();
}
let state: EditorState = { document: readInitial(), selectedId: "root", viewport: "desktop", history: [] };
const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }
function persist(document: EditorDocument) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...document, updatedAt: new Date().toISOString() })); } catch { /* export remains available if storage is full */ }
}
function mapTree(node: PageElement, id: string, update: (node: PageElement) => PageElement): PageElement {
  if (node.id === id) return update(node);
  return { ...node, children: node.children.map((child) => mapTree(child, id, update)) };
}
function findNode(node: PageElement, id: string): PageElement | undefined {
  if (node.id === id) return node;
  for (const child of node.children) { const found = findNode(child, id); if (found) return found; }
  return undefined;
}
function updateDocument(root: PageElement) {
  const document = { ...state.document, root, updatedAt: new Date().toISOString() };
  state = { ...state, document, history: [...state.history, state.document].slice(-30) };
  persist(document); emit();
}
export const editorActions = {
  select(id: string) { state = { ...state, selectedId: id }; emit(); },
  viewport(viewport: EditorState["viewport"]) { state = { ...state, viewport }; emit(); },
  setTitle(title: string) { state = { ...state, document: { ...state.document, title } }; persist(state.document); emit(); },
  update(id: string, patch: Partial<PageElement>) { updateDocument(mapTree(state.document.root, id, (node) => ({ ...node, ...patch, styles: patch.styles ? { ...node.styles, ...patch.styles } : node.styles }))); },
  add(type: ElementType, parentId = "root") {
    const element = createElement(type);
    updateDocument(mapTree(state.document.root, parentId, (node) => ({ ...node, children: [...node.children, element] })));
    state = { ...state, selectedId: element.id }; emit();
  },
  addAt(type: ElementType, parentId: string) {
    const element = createElement(type);
    updateDocument(mapTree(state.document.root, parentId, (node) => ({ ...node, children: [...node.children, element] })));
    state = { ...state, selectedId: element.id }; emit();
  },
  remove(id: string) {
    if (id === "root") return;
    const prune = (node: PageElement): PageElement => ({ ...node, children: node.children.filter((child) => child.id !== id).map(prune) });
    updateDocument(prune(state.document.root));
    state = { ...state, selectedId: "root" }; emit();
  },
  move(id: string, direction: -1 | 1) {
    if (id === "root") return;
    const moveIn = (node: PageElement): PageElement => {
      const children = [...node.children];
      const index = children.findIndex((child) => child.id === id);
      if (index >= 0) {
        const next = index + direction;
        if (next >= 0 && next < children.length) [children[index], children[next]] = [children[next], children[index]];
        return { ...node, children };
      }
      return { ...node, children: children.map(moveIn) };
    };
    updateDocument(moveIn(state.document.root));
  },
  drop(type: ElementType, parentId: string) { this.addAt(type, parentId); },
  undo() {
    const previous = state.history[state.history.length - 1];
    if (!previous) return;
    state = { ...state, document: previous, history: state.history.slice(0, -1) };
    persist(previous); emit();
  },
  reset() {
    const document = createDefaultDocument();
    state = { ...state, document, selectedId: "root", history: [] };
    persist(document); emit();
  },
};
export function useEditorStore() {
  const current = useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => state);
  return { ...current, selected: findNode(current.document.root, current.selectedId) ?? current.document.root };
}
