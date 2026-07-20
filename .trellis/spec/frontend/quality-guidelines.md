# Quality Guidelines

## Verification

Run focused tests with `npm test`; conversion behavior is covered in `src/engine/converter.test.ts` (palette mapping, color limiting, and cleanup). For TypeScript/frontend changes, use `npm run build` when the change affects component wiring, worker contracts, or bundling. Keep pure engine helpers deterministic and add Vitest cases for edge conditions before changing them.

## Accessibility and UX

Interactive controls should have visible labels or `aria-label`s. The canvas uses `aria-label="拼豆图纸编辑区域"`, and the preview exposes its purpose with an accessible label. Preserve keyboard focus styles from `src/styles.css`, disabled states, and pointer capture cleanup when changing controls.

## Browser Resource Safety

Revoke object URLs, terminate workers, disconnect observers, and dispose Three.js resources in effect cleanup. Keep image processing in the worker and avoid shipping synchronous full-image loops on pointer or render paths.

Avoid weakening TypeScript checks, suppressing errors with `any`, or adding unmocked network calls: the product intentionally processes images locally and persists only to browser storage.
