# Component Guidelines

## Component Shape

Use named function components and explicit prop interfaces. `PatternCanvas` and `MeltPreview` demonstrate the local pattern: props are domain types plus callbacks, rendering is declarative, and imperative canvas/WebGL resources are managed through refs and effects.

Prefer callback props for changes (`onCellsChange`, `onPickColor`) and keep mutation in the parent. Use `lucide-react` icons through the existing icon imports rather than drawing ad-hoc SVG icons.

## Effects and Cleanup

Imperative resources must be created and disposed in the same effect. The converter worker in `App.tsx` is terminated on unmount; `MeltPreview.tsx` disposes its texture, material, geometry, renderer, and canvas. Follow this pattern for new browser resources.

Do not return entities or untyped objects from components. Do not hide business state in module globals; lift it to `App` when siblings need it.
