# Changelog

## [0.8.2](https://github.com/sethjuarez/elucim/compare/editor-v0.8.1...editor-v0.8.2) (2026-03-17)


### Miscellaneous

* **editor:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.2
    * @elucim/dsl bumped to 0.8.2

## [0.8.1](https://github.com/sethjuarez/elucim/compare/editor-v0.8.0...editor-v0.8.1) (2026-03-17)


### Miscellaneous

* **editor:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.1
    * @elucim/dsl bumped to 0.8.1

## [0.8.0](https://github.com/sethjuarez/elucim/compare/editor-v0.7.0...editor-v0.8.0) (2026-03-17)


### Features

* **editor:** add menu bar with export/import, theme picker, custom themes ([18cc8f9](https://github.com/sethjuarez/elucim/commit/18cc8f9c53a9a5a2c499030667ccc010559555e6))
* **editor:** add missing primitives, group/ungroup, rename/reorder ([70a1b87](https://github.com/sethjuarez/elucim/commit/70a1b871ebdd467bfbd35e4bacdce6c2827a42dc))
* **editor:** interactive timeline with rename, reorder, bar editing, easing ([ef78e63](https://github.com/sethjuarez/elucim/commit/ef78e6349ac91f2184c6cc7bf31e5fe66fd4eed6))
* **editor:** right-click context menu, group move/resize, full editor theming ([d2f95a7](https://github.com/sethjuarez/elucim/commit/d2f95a742d225d15b4686e6b6186d6699f818e26))
* **editor:** standardize all icons as monochrome SVGs ([efab8b9](https://github.com/sethjuarez/elucim/commit/efab8b977aeab9208c39262e06b6e821d040c985))
* **editor:** switch to Lucide icons with overridable icon system ([32a66d3](https://github.com/sethjuarez/elucim/commit/32a66d314ea552e1391b024241b4e0c6c2419927))
* **editor:** unified data editors for bar chart, graph, polygon, matrix ([1b4cd19](https://github.com/sethjuarez/elucim/commit/1b4cd19b53d0e358869d1e65a965c3dadf2bdcd2))


### Bug Fixes

* add missing id to VectorFieldNode, fix ElementNode id access in reducer ([2486389](https://github.com/sethjuarez/elucim/commit/24863897c3010b272b8eabd4480503b7dd03b94a))
* **editor:** compact number spinners, allow negative number input ([4c8c8db](https://github.com/sethjuarez/elucim/commit/4c8c8db5225f5ef26b79c2acb527a40683105d98))
* **editor:** consolidate toolbar, standardize Lucide icons, fix matrix bounds and graph move ([c537e53](https://github.com/sethjuarez/elucim/commit/c537e53d0e15ed502525c237df83d3431effd0ff))
* **editor:** disable text selection across entire editor UI ([94a7ae7](https://github.com/sethjuarez/elucim/commit/94a7ae7447848db672d21204118c0e3b6fca24c0))
* **editor:** LaTeX rendering and rotated matrix selection box ([30f5649](https://github.com/sethjuarez/elucim/commit/30f56492d24607a282870b8c1394c0ad687a933a))
* **editor:** refine graph and pin icons for clarity ([cfd4615](https://github.com/sethjuarez/elucim/commit/cfd4615f14c4bcc29b47ee8f56b9620fa0f41d33))
* **editor:** resize direction, matrix bounds, graph node drag ([bae3f3e](https://github.com/sethjuarez/elucim/commit/bae3f3e527b1263b170608810b7db82df93a9d04))
* **editor:** snap move/resize positions to integer values ([3ecaa50](https://github.com/sethjuarez/elucim/commit/3ecaa50f6e48c7a4dc862e871005714d8208677f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.0
    * @elucim/dsl bumped to 0.8.0

## [0.7.0](https://github.com/sethjuarez/elucim/compare/editor-v0.6.0...editor-v0.7.0) (2026-03-17)


### Miscellaneous

* **editor:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.7.0
    * @elucim/dsl bumped to 0.7.0

## [0.6.0](https://github.com/sethjuarez/elucim/compare/editor-v0.5.0...editor-v0.6.0) (2026-03-16)


### Features

* add @elucim/editor package — Phase 1 foundation ([12ba5ab](https://github.com/sethjuarez/elucim/commit/12ba5ab7517949f26bcea5ca76acc700f90353c5))
* **editor:** canvas-as-object — click empty canvas shows scene properties ([0ef2513](https://github.com/sethjuarez/elucim/commit/0ef25131977393655943636a52981cf1a07649e9))
* **editor:** contextual inspector positioning and cursor modes ([e8d1356](https://github.com/sethjuarez/elucim/commit/e8d1356b1bf16e8683809f8a90286762375c286d))
* **editor:** DOM-based bounds measurement via getBBox() ([c3ecbb3](https://github.com/sethjuarez/elucim/commit/c3ecbb3e39c96674d605e3b74b75101227dd0322))
* **editor:** full-bleed canvas with floating panels, zoom/pan, minimap ([f3b9a1e](https://github.com/sethjuarez/elucim/commit/f3b9a1ee4473189b0f8c4b2c4838b8240bb2d0f2))
* **editor:** marquee (lasso) selection ([ed0c62d](https://github.com/sethjuarez/elucim/commit/ed0c62d51c8c720956a9cb927893d40b2b5fea27))
* **editor:** Phase 2 — drag, resize, rotate, snap guides ([ab1c9b8](https://github.com/sethjuarez/elucim/commit/ab1c9b80e490a3d52fc7693a3db342801e39dd2e))
* **editor:** Phase 3 — toolbar, element palette, presets ([5cc094a](https://github.com/sethjuarez/elucim/commit/5cc094a7b179dafed088dbe28c3b8b19208d1fae))
* **editor:** Phase 4 — inspector panel with property editing ([7d2cb3a](https://github.com/sethjuarez/elucim/commit/7d2cb3addac9300a7d8d5cfcc24037861a557055))
* **editor:** Phase 5 — animation timeline with playback controls ([35ed500](https://github.com/sethjuarez/elucim/commit/35ed500e2285ed2743c41af25964649df93f5791))
* **editor:** Phase 6 — import/export, keyboard shortcuts, release config ([7e08a71](https://github.com/sethjuarez/elucim/commit/7e08a71aa17044969a4798dde8df75fbbd4dca76))
* **editor:** rotation cursor icon for rotation handle and active drag ([44e4391](https://github.com/sethjuarez/elucim/commit/44e4391999261577152bb6b938f43f88c7c7ee8d))


### Bug Fixes

* **editor:** Ctrl+scroll zooms canvas not browser, matrix selection/editing ([aafd151](https://github.com/sethjuarez/elucim/commit/aafd1517d91fc765aa568f941d5baf42d2c850a5))
* **editor:** resolve floating panel interactions and update e2e tests ([0d97b36](https://github.com/sethjuarez/elucim/commit/0d97b360a6a9b4844c68b2f9b9925c35b14a3075))
* **editor:** selection boxes rotate with elements ([5cc9652](https://github.com/sethjuarez/elucim/commit/5cc96522b4bec78b05fa01f9d08aa26c41855113))
* **editor:** text selection bounds account for textAnchor and baseline ([d0a5fe5](https://github.com/sethjuarez/elucim/commit/d0a5fe5a396ba060d3b9b62442167785c314282d))
* prevent blank screen when typing special characters in expression fields ([7428f30](https://github.com/sethjuarez/elucim/commit/7428f30b9741519a32a0e782618af412fb348268))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.6.0
    * @elucim/dsl bumped to 0.6.0

## 0.5.0

### Features

* Visual editor for creating and editing Elucim animated scenes
* Full-bleed canvas with infinite pan/zoom, dot grid, and minimap
* Floating toolbar with element palette (shapes, lines, math, data)
* Contextual floating inspector with property editing
* Premiere-style animation timeline with playback controls
* Canvas-as-object — click empty canvas to edit scene properties
* Element-agnostic selection, rotation, resize, and movement
* DOM-based bounds measurement via getBBox() for pixel-perfect overlays
* Marquee (lasso) selection with Shift+drag to add
* Semantic design tokens for full theme customization
* Error boundary for graceful recovery from render errors
* Keyboard shortcuts (delete, undo/redo, arrow nudge, escape)
* Export/import JSON documents
