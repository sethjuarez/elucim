# @elucim/dsl

## [0.14.1](https://github.com/sethjuarez/elucim/compare/dsl-v0.14.0...dsl-v0.14.1) (2026-03-21)


### Miscellaneous

* **dsl:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.14.1
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.14.1

## [0.14.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.13.1...dsl-v0.14.0) (2026-03-20)


### Features

* image picker and resolver architecture ([aa0fbf3](https://github.com/sethjuarez/elucim/commit/aa0fbf34fa4acabcb294d96ccc58af737f1946ce))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.14.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.14.0

## [0.13.1](https://github.com/sethjuarez/elucim/compare/dsl-v0.13.0...dsl-v0.13.1) (2026-03-18)


### Miscellaneous

* **dsl:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.13.1
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.13.1

## [0.13.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.12.0...dsl-v0.13.0) (2026-03-18)


### Bug Fixes

* **editor:** a11y, design tokens, error colors, reduced-motion ([#27](https://github.com/sethjuarez/elucim/issues/27) [#28](https://github.com/sethjuarez/elucim/issues/28) [#29](https://github.com/sethjuarez/elucim/issues/29) [#30](https://github.com/sethjuarez/elucim/issues/30)) ([25e9391](https://github.com/sethjuarez/elucim/commit/25e939164fafd2a25e1b1f477b970214d6803b7f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.13.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.13.0

## [0.12.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.11.0...dsl-v0.12.0) (2026-03-18)


### ⚠ BREAKING CHANGES

* ElucimEditor 'theme' prop is now ElucimTheme (content tokens). Use 'editorTheme' for explicit chrome overrides.

### Features

* unified ElucimTheme, fitToContainer, error boundary, auto-derive editor chrome ([2109651](https://github.com/sethjuarez/elucim/commit/21096512cb2c36378569ef3ee31282a93d583f56))


### Bug Fixes

* **editor:** use explicit colorScheme over luminance detection for var() backgrounds ([842514c](https://github.com/sethjuarez/elucim/commit/842514c9eef08f2e9e32129e1d7e66cdf8ffb3c4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.12.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.12.0

## [0.11.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.10.0...dsl-v0.11.0) (2026-03-18)


### Features

* DslRenderer overrides, onPlayStateChange, initialFrame='last' ([2cb8b9e](https://github.com/sethjuarez/elucim/commit/2cb8b9e309cca7acd40bf9d4da8dc561f7284f5c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.11.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.11.0

## [0.10.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.9.0...dsl-v0.10.0) (2026-03-18)


### Miscellaneous

* **dsl:** Synchronize elucim versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.10.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.10.0

## [0.9.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.8.4...dsl-v0.9.0) (2026-03-18)


### Bug Fixes

* pipe colorScheme through to Presentation component ([98a50dc](https://github.com/sethjuarez/elucim/commit/98a50dc92db764b546e7da05f420a98e0a3f8217))
* Presentation dark mode default + remove legacy VitePress docs ([0bdf8b5](https://github.com/sethjuarez/elucim/commit/0bdf8b5b081088b2f79908732b42ace3eafdbabf))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.9.0
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.9.0

## [0.8.4](https://github.com/sethjuarez/elucim/compare/dsl-v0.8.3...dsl-v0.8.4) (2026-03-18)


### Bug Fixes

* move @elucim/core to peerDependencies in dsl and editor ([67d8437](https://github.com/sethjuarez/elucim/commit/67d8437a8aa82abc9184295e9cf8b0c3409e897e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @elucim/core bumped to 0.8.4
  * peerDependencies
    * @elucim/core bumped from >=0.8.0 to >=0.8.4

## [0.8.3](https://github.com/sethjuarez/elucim/compare/dsl-v0.8.2...dsl-v0.8.3) (2026-03-17)


### Bug Fixes

* **dsl:** fix renderToPng OffscreenCanvas decode failure, add E2E tests ([05370ad](https://github.com/sethjuarez/elucim/commit/05370ad03f277919356c72decc79e590c7b31714)), closes [#13](https://github.com/sethjuarez/elucim/issues/13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.3

## [0.8.2](https://github.com/sethjuarez/elucim/compare/dsl-v0.8.1...dsl-v0.8.2) (2026-03-17)


### Bug Fixes

* **dsl:** handle nested var(), light-dark() in renderToPng SVG output ([7291150](https://github.com/sethjuarez/elucim/commit/72911507dd4a226985d03dcdd26b7c15ea05e1f7)), closes [#13](https://github.com/sethjuarez/elucim/issues/13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.2

## [0.8.1](https://github.com/sethjuarez/elucim/compare/dsl-v0.8.0...dsl-v0.8.1) (2026-03-17)


### Bug Fixes

* **dsl:** resolve \ colors to hex fallbacks in renderToPng ([4404a12](https://github.com/sethjuarez/elucim/commit/4404a121e6f1768c2873737fd07bd85c5d0dc669)), closes [#13](https://github.com/sethjuarez/elucim/issues/13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.1

## [0.8.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.7.0...dsl-v0.8.0) (2026-03-17)


### Features

* **dsl:** add renderToPng for CSP-safe PNG export ([a0c07d9](https://github.com/sethjuarez/elucim/commit/a0c07d9581bc2475c23af1eeb54d047cd7802feb))


### Bug Fixes

* add missing id to VectorFieldNode, fix ElementNode id access in reducer ([2486389](https://github.com/sethjuarez/elucim/commit/24863897c3010b272b8eabd4480503b7dd03b94a))
* **core:** make colorScheme configurable instead of hardcoded ([a170702](https://github.com/sethjuarez/elucim/commit/a170702a1614d3636ae0629f721d13fed2a96b6a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.8.0

## [0.7.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.6.0...dsl-v0.7.0) (2026-03-17)


### Features

* **dsl:** add colorScheme prop for automatic light/dark theme support ([1500c44](https://github.com/sethjuarez/elucim/commit/1500c44679fcbd49be3161b70b1fe60a7d397eb5))
* **dsl:** convert all examples to semantic tokens + 16:9 presentations ([d29d8bd](https://github.com/sethjuarez/elucim/commit/d29d8bd3cef8c4accfd60ffbe1e8030c823f2edb))


### Bug Fixes

* **core:** presentation now renders at proper 16:9 aspect ratio ([d957e24](https://github.com/sethjuarez/elucim/commit/d957e24779f395ccb965eb6cc2b192c4de81a974))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.7.0

## [0.6.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.5.0...dsl-v0.6.0) (2026-03-16)


### Bug Fixes

* prevent blank screen when typing special characters in expression fields ([7428f30](https://github.com/sethjuarez/elucim/commit/7428f30b9741519a32a0e782618af412fb348268))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.6.0

## [0.5.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.4.1...dsl-v0.5.0) (2026-03-15)


### Features

* semantic color tokens in DSL color fields ([3bfce9c](https://github.com/sethjuarez/elucim/commit/3bfce9cb9ea9eee60b6568ad1dfcd0f294e6969d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.5.0

## [0.4.1](https://github.com/sethjuarez/elucim/compare/dsl-v0.4.0...dsl-v0.4.1) (2026-03-14)


### Bug Fixes

* externalize react-dom/server to fix React 19 compatibility ([29a4176](https://github.com/sethjuarez/elucim/commit/29a417620dc6c24588500d1b45caee5c9afb82ff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.4.1

## [0.4.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.3.0...dsl-v0.4.0) (2026-03-14)


### Features

* add integration features — presets, theme tokens, poster mode, imperative ref, headless rendering ([97775ef](https://github.com/sethjuarez/elucim/commit/97775efc3bc26a5f3c45665f99bcb9282a9fc3f8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.4.0

## [0.3.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.2.1...dsl-v0.3.0) (2026-03-14)


### Features

* add BezierCurve primitive with quadratic and cubic support ([f480887](https://github.com/sethjuarez/elucim/commit/f480887703521adbeb8c1d08a2e3babc5ebbce67))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.3.0

## [0.2.1](https://github.com/sethjuarez/elucim/compare/dsl-v0.2.0...dsl-v0.2.1) (2026-03-06)


### Bug Fixes

* add missing keywords for new primitives in package metadata ([5d9d8aa](https://github.com/sethjuarez/elucim/commit/5d9d8aa71cd7a9bd8bb0a8652df27a8aa0e91199))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.2.1

## [0.2.0](https://github.com/sethjuarez/elucim/compare/dsl-v0.1.3...dsl-v0.2.0) (2026-03-06)


### Features

* add @elucim/dsl package — JSON DSL for AI agents ([33365b6](https://github.com/sethjuarez/elucim/commit/33365b65811f3307c34544b8c54a84e9dfa34655))
* add 12-slide 'From Words to Agents' presentation ([cf0b83a](https://github.com/sethjuarez/elucim/commit/cf0b83a3a628a67fe0c7355e974743786df12fba))
* add complex calculus presentation DSL example (9 slides) ([9021016](https://github.com/sethjuarez/elucim/commit/90210165f22a427afa70ec427eec5fedfdc6ab26))
* add Image and Group primitives, universal transforms, z-index ([4564e2b](https://github.com/sethjuarez/elucim/commit/4564e2b518320820ce8a14c812172b6419485bc2))
* add npm publishing with GitHub Actions OIDC ([e42388f](https://github.com/sethjuarez/elucim/commit/e42388fdfeba5db1c056300aad8dc6ec9f2c094c))
* **dsl:** add fluent builder API, BarChart/dashed-line DSL support ([c344bab](https://github.com/sethjuarez/elucim/commit/c344bab0039242bd8cb9804f2b743297a7d38f02))
* switch to npm OIDC trusted publishing (no tokens) ([d2ae5ba](https://github.com/sethjuarez/elucim/commit/d2ae5ba568713561cf490ed4508328b5a1cc3ade))


### Bug Fixes

* calculus presentation visual fixes (yClamp, unicode, coordinates) ([943a9b3](https://github.com/sethjuarez/elucim/commit/943a9b3c994834391c0b826e78a41de95118b713))
* replace plain text vector label with LaTeX node for e^{iπ} = -1 on slide 9 ([9006e2a](https://github.com/sethjuarez/elucim/commit/9006e2aa6ec53c673c6639fcc1c9e5835021e4c5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @elucim/core bumped to 0.2.0

## 0.1.3

### Patch Changes

- e8581f7: Update package homepage URLs and README links to point to elucim.com
- Updated dependencies [e8581f7]
  - @elucim/core@0.1.3

## 0.1.2

### Patch Changes

- f7c0721: Theme-aware presentation polish, SVG nav arrows, light-dark defaults, automated publishing
- Updated dependencies [f7c0721]
  - @elucim/core@0.1.2
