# Directory Structure

## Source Layout

- `src/App.tsx` is the composition root for the studio workflow and owns the top-level UI state.
- `src/components/` contains visual units with a stable public component API; `PatternCanvas.tsx` handles the editable canvas and `MeltPreview.tsx` owns the Three.js preview.
- `src/domain/` contains browser-independent contracts and persistence helpers: `types.ts`, `palette.ts`, and `project.ts`.
- `src/engine/` contains deterministic conversion/export logic. Pure helpers in `converter.ts` are tested by `converter.test.ts`.
- `src/workers/` contains worker entry points only; the worker delegates to the engine instead of duplicating conversion logic.
- `src/styles.css` is the application-wide design system and layout stylesheet; `src/main.tsx` mounts the app and imports it.

## Placement Rules

Put reusable domain calculations in `domain` or `engine`, not in JSX. Put a new canvas/visual surface in `components` and keep its DOM/Three.js lifecycle inside that component. Add a worker only for work that can block conversion or large image processing, and import the shared engine function from it.

Avoid creating generic `utils` or `hooks` directories for one-off functions; the current app has no custom hook module and keeps small helpers beside their own domain or engine concern.
