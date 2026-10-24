import { useSyncExternalStore } from "react";
import { createDefaultDocument, createElement, isSafeLink, isSafeStyleValue, validateEditorDocument, type EditorDocument, type ElementType, type PageElement } from "./types";

const STORAGE_KEY = "money102-visual-builder-draft-v1";
const PAGES_KEY = "money102-visual-builder-pages-v1";
type EditorState = { document: EditorDocument; pages: EditorDocument[]; selectedId: string; viewport: "desktop" | "tablet" | "mobile"; history: EditorDocument[]; future: EditorDocument[] };

function readInitialPages(): EditorDocument[] {
  try {
    const pagesRaw = localStorage.getItem(PAGES_KEY);
    const pages: unknown = pagesRaw ? JSON.parse(pagesRaw) : null;
    if (Array.isArray(pages)) {
      const valid = pages.filter(validateEditorDocument);
      if (valid.length) return valid;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (validateEditorDocument(parsed)) return [parsed];
  } catch { /* local storage may be unavailable or contain invalid JSON */ }
  return [createDefaultDocument()];
}
const initialPages = readInitialPages();
let state: EditorState = { document: initialPages[0], pages: initialPages, selectedId: "root", viewport: "desktop", history: [], future: [] };
const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }
function persist(document: EditorDocument, pages: EditorDocument[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...document, updatedAt: new Date().toISOString() }));
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages.map((page) => page.page === document.page ? { ...document, updatedAt: new Date().toISOString() } : page)));
  } catch { /* export remains available if storage is full */ }
}
function findNode(node: PageElement, id: string): PageElement | undefined {
  if (node.id === id) return node;
  for (const child of node.children) { const found = findNode(child, id); if (found) return found; }
  return undefined;
}
function hasNode(node: PageElement, id: string): boolean { return Boolean(findNode(node, id)); }
function mapTree(node: PageElement, id: string, update: (node: PageElement) => PageElement): PageElement {
  if (node.id === id) return update(node);
  return { ...node, children: node.children.map((child) => mapTree(child, id, update)) };
}
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
function commitDocument(document: EditorDocument, history = true) {
  const pages = state.pages.some((page) => page.page === document.page)
    ? state.pages.map((page) => page.page === document.page ? document : page)
    : [...state.pages, document];
  state = { ...state, document, pages, history: history ? [...state.history, state.document].slice(-50) : state.history, future: history ? [] : state.future };
  persist(document, pages);
  emit();
}
function makePageId() {
  let id = `page-${Date.now().toString(36)}`;
  while (state.pages.some((page) => page.page === id)) id += "-new";
  return id;
}
function refreshNodeIds(node: PageElement, root = false): PageElement {
  return { ...node, id: root ? "root" : `node_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 14)}`, children: node.children.map((child) => refreshNodeIds(child)) };
}
export const editorActions = {
  select(id: string) { if (hasNode(state.document.root, id)) { state = { ...state, selectedId: id }; emit(); } },
  viewport(viewport: EditorState["viewport"]) { state = { ...state, viewport }; emit(); },
  switchPage(pageId: string) {
    const page = state.pages.find((item) => item.page === pageId);
    if (!page) return;
    state = { ...state, document: page, selectedId: "root", history: [], future: [] };
    persist(page, state.pages); emit();
  },
  createPage() {
    const document = createDefaultDocument();
    document.page = makePageId();
    document.title = "หน้าใหม่";
    commitDocument(document, false);
    state = { ...state, selectedId: "root", history: [], future: [] };
    emit();
  },
  duplicatePage() {
    const copy: EditorDocument = {
      ...state.document,
      page: makePageId(),
      title: `${state.document.title} (สำเนา)`.slice(0, 160),
      updatedAt: new Date().toISOString(),
      root: refreshNodeIds(state.document.root, true),
    };
    commitDocument(copy, false);
    state = { ...state, selectedId: "root", history: [], future: [] };
    emit();
  },
  deletePage() {
    if (state.pages.length <= 1) return;
    const pages = state.pages.filter((page) => page.page !== state.document.page);
    const document = pages[0];
    state = { ...state, document, pages, selectedId: "root", history: [], future: [] };
    try {
      localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    } catch { /* state remains editable in memory */ }
    emit();
  },
  importDocument(document: EditorDocument) {
    const imported = { ...document, page: makePageId(), updatedAt: new Date().toISOString(), root: refreshNodeIds(document.root, true) };
    commitDocument(imported, false);
    state = { ...state, selectedId: "root", history: [], future: [] };
    emit();
  },
  setTitle(title: string) {
    if (title.length > 160) return;
    commitDocument({ ...state.document, title, updatedAt: new Date().toISOString() });
  },
  update(id: string, patch: Partial<PageElement>) {
    if (!hasNode(state.document.root, id)) return;
    if (patch.href !== undefined && !isSafeLink(patch.href)) return;
    if (patch.src !== undefined && !isSafeLink(patch.src, true)) return;
    if (patch.styles && Object.entries(patch.styles).some(([key, value]) => !isSafeStyleValue(key, value))) return;
    const root = mapTree(state.document.root, id, (node) => ({ ...node, ...patch, styles: patch.styles ? { ...node.styles, ...patch.styles } : node.styles }));
    commitDocument({ ...state.document, root, updatedAt: new Date().toISOString() });
  },
  add(type: ElementType, parentId = "root") {
    const parent = findNode(state.document.root, parentId);
    if (!parent || !["section", "container", "card"].includes(parent.type)) return;
    const element = createElement(type);
    const root = mapTree(state.document.root, parentId, (node) => ({ ...node, children: [...node.children, element] }));
    commitDocument({ ...state.document, root, updatedAt: new Date().toISOString() });
    state = { ...state, selectedId: element.id }; emit();
  },
  addAt(type: ElementType, parentId: string) { this.add(type, parentId); },
  remove(id: string) {
    if (id === "root" || !hasNode(state.document.root, id)) return;
    const prune = (node: PageElement): PageElement => ({ ...node, children: node.children.filter((child) => child.id !== id).map(prune) });
    const root = prune(state.document.root);
    commitDocument({ ...state.document, root, updatedAt: new Date().toISOString() });
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
    commitDocument({ ...state.document, root: moveIn(state.document.root), updatedAt: new Date().toISOString() });
  },
  drop(type: ElementType, parentId: string) { this.add(type, parentId); },
  swapNodes(firstId: string, secondId: string) {
    if (firstId === "root" || secondId === "root" || firstId === secondId) return;
    const result = swapSiblings(state.document.root, firstId, secondId);
    if (result.swapped) commitDocument({ ...state.document, root: result.root, updatedAt: new Date().toISOString() });
  },
  undo() {
    const previous = state.history[state.history.length - 1];
    if (!previous) return;
    const pages = state.pages.map((page) => page.page === previous.page ? previous : page);
    state = { ...state, document: previous, pages, history: state.history.slice(0, -1), future: [state.document, ...state.future].slice(0, 50) };
    if (!hasNode(previous.root, state.selectedId)) state = { ...state, selectedId: "root" };
    persist(previous, pages); emit();
  },
  redo() {
    const next = state.future[0];
    if (!next) return;
    const pages = state.pages.map((page) => page.page === next.page ? next : page);
    state = { ...state, document: next, pages, history: [...state.history, state.document].slice(-50), future: state.future.slice(1) };
    if (!hasNode(next.root, state.selectedId)) state = { ...state, selectedId: "root" };
    persist(next, pages); emit();
  },
  reset() {
    const document = createDefaultDocument();
    document.page = state.document.page;
    document.title = state.document.title;
    commitDocument(document, false);
    state = { ...state, selectedId: "root", history: [], future: [] };
    emit();
  },
};
export function useEditorStore() {
  const current = useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => state);
  return { ...current, selected: findNode(current.document.root, current.selectedId) ?? current.document.root };
}
