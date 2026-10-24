# money102 Visual Builder

## Architecture

The builder is a second Vite entry point (/back.html) that shares the existing React application and styling system without replacing the production app entry point.

    back.html
    └── src/editor/main.tsx
        └── Backoffice.tsx                 workspace switcher, page manager, import/export
            ├── LegacyPageEditor.tsx       same-origin preview of existing app routes
            │   └── existing WorkspaceEditor.tsx
            └── new-page builder
                ├── Sidebar.tsx            component library + layer tree
                ├── Canvas.tsx             schema renderer, selection, drag/drop
                ├── PropertyPanel.tsx      content, icon, link, image, style inspector
                ├── useEditorStore.ts      state, draft persistence, undo/redo, page lifecycle
                ├── types.ts               schema, component catalog, validation
                └── backoffice.css         builder UI

## Data flow

- Each new-page design is an EditorDocument (schema version 1) with a recursive PageElement tree.
- useEditorStore validates imported and saved documents, limits tree depth and node count, maintains undo/redo history, and saves drafts to browser localStorage.
- Multiple draft pages are kept in money102-visual-builder-pages-v1. The prior single-draft key is read as a migration fallback.
- Export JSON keeps the schema; Export HTML produces a standalone snapshot. Export is **not** a publish operation.
- Existing routes (/, /#saving, /#health, /#notes) are loaded in the legacy workspace. That workspace uses the existing WorkspaceEditor and persists its text/layout/theme/element overrides under lamoon-* keys, which the existing Cloudflare state sync already recognizes when the user is authenticated.
- New-page JSON drafts are currently browser-local and are not written to the site's live route configuration or database.

## Add a component

1. Add its ElementType, default content/styles, and library descriptor in types.ts.
2. Add a rendering case in Canvas.tsx.
3. Add its editable fields in PropertyPanel.tsx if it needs fields beyond content, icon, URL, and common styles.
4. Add the corresponding safe HTML export case in Backoffice.tsx.
5. Extend validateEditorDocument only with explicit validation for the new fields; do not remove validation or accept arbitrary HTML/JS.

## Legacy page editability

The existing-page editor can edit only areas instrumented with data-workspace-id. Add stable IDs to a new area before expecting it to appear in the legacy style inspector. Data-entry areas are intentionally not turned into arbitrary DOM fields; this avoids treating account data as page copy.

## Verification

Run npm run typecheck and npm run build. A passing build confirms static checks only; browser interaction tests are still required before treating this as production-ready.

## Security and publishing status

- The backoffice currently has no verified server-side admin role/permission guard.
- It does not write a published page or perform a live deploy.
- Do not expose a future publish endpoint until server-side authorization, draft versioning, validation, rollback, and audit logging are implemented.
