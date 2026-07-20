# State Management

## Ownership

There is no external state library or server state. `App.tsx` owns the studio session state with `useState`: `project`, conversion settings, source image, editor tool, selection, history/redo, busy status, and view mode. Keep state at the lowest owner that needs it and pass changes through typed callbacks.

Derived values such as color counts, board count, and physical dimensions are computed with `useMemo` from `project`; do not store duplicate derived state.

## Persistence and Workers

`domain/project.ts` is the only localStorage boundary. Persist the serializable form of `PatternProject` by converting `Int16Array` to a number array, and restore it with `Int16Array.from`. Preserve the fallback sample project and validation when changing the storage shape.

Image conversion runs through `src/workers/converter.worker.ts`; use typed `postMessage` request/result contracts and transfer large array buffers. Keep the UI responsive and update `busy`/message state for success and failure.

Avoid adding a global store for editor state or writing localStorage from JSX.
