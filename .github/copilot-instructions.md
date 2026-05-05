# Copilot instructions for Elucim

Elucim is a pnpm TypeScript monorepo for React-based animated concept explanations, math visualizations, a JSON/YAML DSL, and a visual editor. Optimize changes for correctness, type safety, browser interactivity, and stable public package APIs.

## Project structure

- `packages/core` contains the public React library: scene/player components, hooks, SVG primitives, animation helpers, themes, image resolution, and export utilities.
- `packages/dsl` contains schema types, validation, YAML parsing, safe math expression evaluation, DSL rendering, server-side SVG/PNG rendering helpers, and builder APIs.
- `packages/editor` contains the visual editor, canvas interactions, reducer/state model, inspector, toolbar, timeline, image picker, and editor theme tokens.
- `packages/demo` is the Vite demo playground on port 3100.
- `packages/explorer` is the primitive explorer on port 3200.
- `packages/e2e` contains Playwright end-to-end and visual regression tests.
- `docs` is the Astro/Starlight documentation site.

## Tooling and validation

- Use pnpm workspaces. Install with `pnpm install`; CI uses pnpm 10 and Node 24.
- Root scripts:
  - `pnpm build` builds `@elucim/core`, `@elucim/dsl`, and `@elucim/editor`.
  - `pnpm test` runs Vitest for `@elucim/core`, `@elucim/dsl`, and `@elucim/editor`.
  - `pnpm lint` runs TypeScript no-emit checks recursively.
  - `pnpm test:e2e` runs Playwright tests from `packages/e2e`.
- For focused work, prefer package filters such as `pnpm --filter @elucim/core test`, `pnpm --filter @elucim/dsl build`, or `pnpm --filter @elucim/editor lint`.
- E2E tests expect the demo app to be running, usually via `pnpm --filter @elucim/demo dev`.
- Do not add new package managers or duplicate lockfiles.

## TypeScript and API conventions

- Keep TypeScript strict. Avoid `any` and type assertions unless the surrounding code already requires them and a narrower type is impractical.
- Preserve ESM-style imports/exports and the package entry points in each `src/index.ts`.
- When adding public components, primitives, hooks, schema nodes, utilities, or types, export them from the relevant package entry point and update dependent packages if needed.
- Maintain compatibility with React 18 and React 19 peer dependencies.
- Prefer small, pure helpers for rendering, math, validation, interpolation, and state transformations.
- Throw explicit errors for invalid public API inputs instead of silently falling back.

## Core package guidance

- Core primitives are React components that render SVG-oriented elements and generally accept animation props plus spatial props (`rotation`, `rotationOrigin`, `scale`, `translate`) where applicable.
- New primitives should integrate with existing animation helpers (`useAnimation`) and transform helpers (`withTransform`, `buildTransform`, `sortByZIndex`) rather than duplicating transform or animation logic.
- Preserve frame-based behavior. Animation calculations should be deterministic from the current frame, duration, fps, easing, and input props.
- Keep visual defaults consistent with the existing primitives: SVG-first, dark-background friendly defaults, explicit colors/strokes, and no browser-only side effects during render.
- Respect accessibility/user settings such as reduced motion where existing hooks or patterns apply.

## DSL package guidance

- Treat `@elucim/core` as the canonical source for shared themes, color token resolution, and image resolver APIs.
- When adding or changing DSL element capabilities, update schema types, validation, rendering, builders if applicable, and tests together.
- Keep the math evaluator safe. Do not introduce arbitrary JavaScript evaluation for DSL expressions.
- Validation should return useful structured errors and should not accept malformed documents silently.
- Keep JSON/YAML DSL behavior renderer-independent where possible.

## Editor package guidance

- The editor manipulates `ElucimDocument` trees from `@elucim/dsl`; preserve document shape and compatibility with the DSL renderer.
- Reducer changes should be immutable and should preserve undo/redo history behavior.
- Canvas interactions should keep selection, snapping, viewport, keyboard, drag, resize, and bounds logic consistent across element types.
- Update editor tests when changing reducer behavior, templates, inspector controls, selection behavior, or import/export semantics.

## Testing expectations

- Add or update Vitest tests for behavior changes in core, DSL, or editor packages.
- Add or update Playwright tests when browser interaction, rendering, presentation mode, visual regression behavior, or demo-integrated flows change.
- Prefer focused package tests while iterating, then run the relevant root script before finishing when the change affects shared behavior.

## Documentation and release notes

- Update README files or `docs` content when public APIs, commands, examples, or user-visible behavior change.
- This repository uses release-please for published packages. Keep package versions managed by release automation unless explicitly asked otherwise.
- Use clear conventional commit-style wording for changes intended to be released.
