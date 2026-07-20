# Type Safety

## Domain Contracts

Use strict TypeScript types from `src/domain/types.ts` for cross-module data. Prefer unions for closed sets (`ImageMode`, `EditorTool`), interfaces for records, and typed arrays for the grid. Import types with `import type`.

Conversion boundaries use `ConvertRequest`, `ConvertResult`, and explicit `WorkerSuccess`/`WorkerFailure` discriminated unions in `App.tsx`. Preserve the `ok` discriminator when extending worker messages so failures cannot be treated as successful results.

## Runtime Validation

LocalStorage data is untrusted: `loadProject()` validates dimensions and cell count before reconstructing the typed array and falls back to `createSampleProject()`. Follow that boundary validation for any new persisted fields. Narrow nullable browser values (`sourceImage`, refs, optional files) before use rather than using non-null assertions to skip a branch.

Avoid `any`, broad casts over external data, and untyped maps. Keep palette color data typed as `BeadColor[]` and use the existing `RGB`/`Lab` contracts.
