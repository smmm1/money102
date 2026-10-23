import { useSyncExternalStore } from "react";
import { createDefaultDocument, createElement, validateEditorDocument, type EditorDocument, type ElementType, type PageElement } from "./types";

const STORAGE_KEY = "money102-visual-builder-draft-v1";
type EditorState = { document: EditorDocument; selectedId: string; viewport: "desktop" | "tablet" | "mobile"; history: EditorDocument[]; future: EditorDocument[] };
function readInitial(): EditorDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (validateEditorDocument(parsed)) return parsed;
  } catch { /* local storage may be unavailable or contain invalid JSON */ }
  return createDefaultDocument();
}
let state: EditorState = { document: readInitial(), selectedId: "root", viewport: "desktop", history: [], future: [] };
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
function hasNode(node: PageElement, id: string): boolean { return Boolean(findNode(node, id)); }
function swapSiblings(node: PageElement, firstId: string, secondId: string): { root: PageElement; swapped: boolean } {
  const children = [...node.children];
  const first = children.findIndex((child) => child.id === firstId);
  const second = children.findIndex((child) => child.id === secondId);
  if (first >= 0 && second >= 0) {
    [children[first], children[second]] = [children[second], children[first]];
    return { root: { ...node, children }, swapped: true };
  }
  for (let i = 0; i < children.length; i += 1) {
    const result = swapSiblings(children[i], firstId, secondId);
    if (result.swapped) {
      children[i] = result.root;
      return { root: { ...node, children }, swapped: true };
    }
  }
  return { root: node, swapped: false };
}
function updateDocument(root: PageElement) {
  const document = { ...state.document, root, updatedAt: new Date().toISOString() };
  state = { ...state, document, history: [...state.history, state.document].slice(-50), future: [] };
  persist(document); emit();
}
export const editorActions = {
  select(id: string) { if (hasNode(state.document.root, id)) { state = { ...state, selectedId: id }; emit(); } },
  viewport(viewport: EditorState["viewport"]) { state = { ...state, viewport }; emit(); },
  setTitle(title: string) {
    if (title.length > 160) return;
    const document = { ...state.document, title, updatedAt: new Date().toISOString() };
    state = { ...state, history: [...state.history, state.document].slice(-50), document, future: [] };
    persist(document); emit();
  },
  update(id: string, patch: Partial<PageElement>) {
    if (!hasNode(state.document.root, id)) return;
    updateDocument(mapTree(state.document.root, id, (node) => ({ ...node, ...patch, styles: patch.styles ? { ...node.styles, ...patch.styles } : node.styles })));
  },
  add(type: ElementType, parentId = "root") {
    const parent = findNode(state.document.root, parentId);
    if (!parent || !["section", "container", "card"].includes(parent.type)) return;
    const element = createElement(type);
    updateDocument(mapTree(state.document.root, parentId, (node) => ({ ...node, children: [...node.children, element] })));
    state = { ...state, selectedId: element.id }; emit();
  },
  addAt(type: ElementType, parentId: string) { this.add(type, parentId); },
  remove(id: string) {
    if (id === "root" || !hasNode(state.document.root, id)) return;
    const prune = (node: PageElement): PageElement => ({ ...node, children: node.children.filter((child) => child.id !== id).map(prune) });
    updateDocument(prune(state.document.root));
    if (!hasNode(state.document.root, state.selectedId)) state = { ...state, selectedId: "root" };
    emit();
  },
  move(id: string, direction: -1 | 1) {
    if (id === "root" || !hasNode(state.document.root, id)) return;
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
  drop(type: ElementType, parentId: string) { this.add(type, parentId); },
  swapNodes(firstId: string, secondId: string) {
    if (firstId === "root" || secondId === "root" || firstId === secondId) return;
    const result = swapSiblings(state.document.root, firstId, secondId);
    if (result.swapped) updateDocument(result.root);
  },
  undo() {
    const previous = state.history[state.history.length - 1];
    if (!previous) return;
    state = { ...state, document: previous, history: state.history.slice(0, -1), future: [state.document, ...state.future].slice(0, 50) };
    if (!hasNode(previous.root, state.selectedId)) state = { ...state, selectedId: "root" };
    persist(previous); emit();
  },
  redo() {
    const next = state.future[0];
    if (!next) return;
    state = { ...state, document: next, history: [...state.history, state.document].slice(-50), future: state.future.slice(1) };
    if (!hasNode(next.root, state.selectedId)) state = { ...state, selectedId: "root" };
    persist(next); emit();
  },
  reset() {
    const document = createDefaultDocument();
    state = { ...state, document, selectedId: "root", history: [], future: [] };
    persist(document); emit();
  },
};
export function useEditorStore() {
  const current = useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => state);
  return { ...current, selected: findNode(current.document.root, current.selectedId) ?? current.document.root };
}
