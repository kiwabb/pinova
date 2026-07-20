# Hook Guidelines

## Local Patterns

The app currently uses built-in React hooks directly; there are no custom hook modules. Keep related state and its effects together in the owning component: `App.tsx` uses `useState` for editor state, `useMemo` for derived statistics, `useCallback` for edit callbacks, and `useEffect` for persistence and worker lifecycle.

Use functional state updates when the next value depends on the previous one, for example `setHistory((current) => ...)`. Memoize callbacks only when they are passed to a component that benefits from stable identity.

## Resource Effects

Effects must list every value they read, and cleanup must reverse subscriptions, timers, object URLs, workers, observers, or WebGL resources. Keep asynchronous work cancellable or safely ignored after teardown.

Create a custom hook only when the same state/effect sequence is reused by at least two components. Name it `useX`, return a typed object/tuple, and keep it in `src/` near the consuming layer.
