# @elucim/core

## [0.15.0](https://github.com/sethjuarez/elucim/compare/core-v0.14.1...core-v0.15.0) (2026-04-23)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.14.1](https://github.com/sethjuarez/elucim/compare/core-v0.14.0...core-v0.14.1) (2026-03-21)


### Bug Fixes

* reduce FunctionPlot soft limit from 5x to 3x yClamp range ([b23ebdb](https://github.com/sethjuarez/elucim/commit/b23ebdb024c9ef932bf84896b73577db1afd80bf))

## [0.14.0](https://github.com/sethjuarez/elucim/compare/core-v0.13.1...core-v0.14.0) (2026-03-20)


### Features

* image picker and resolver architecture ([aa0fbf3](https://github.com/sethjuarez/elucim/commit/aa0fbf34fa4acabcb294d96ccc58af737f1946ce))


### Bug Fixes

* replace y-value clamping with SVG clipPath in FunctionPlot ([7b7a989](https://github.com/sethjuarez/elucim/commit/7b7a989f33ad813f17b521a61c853f65127d7fb2))
* shorten arrow line to arrowhead base and add short-arrow guards ([cb0a546](https://github.com/sethjuarez/elucim/commit/cb0a5469f9392cf39408702188227649b69bce4d))

## [0.13.1](https://github.com/sethjuarez/elucim/compare/core-v0.13.0...core-v0.13.1) (2026-03-18)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.13.0](https://github.com/sethjuarez/elucim/compare/core-v0.12.0...core-v0.13.0) (2026-03-18)


### Bug Fixes

* **editor:** a11y, design tokens, error colors, reduced-motion ([#27](https://github.com/sethjuarez/elucim/issues/27) [#28](https://github.com/sethjuarez/elucim/issues/28) [#29](https://github.com/sethjuarez/elucim/issues/29) [#30](https://github.com/sethjuarez/elucim/issues/30)) ([25e9391](https://github.com/sethjuarez/elucim/commit/25e939164fafd2a25e1b1f477b970214d6803b7f))

## [0.12.0](https://github.com/sethjuarez/elucim/compare/core-v0.11.0...core-v0.12.0) (2026-03-18)


### ⚠ BREAKING CHANGES

* ElucimEditor 'theme' prop is now ElucimTheme (content tokens). Use 'editorTheme' for explicit chrome overrides.

### Features

* unified ElucimTheme, fitToContainer, error boundary, auto-derive editor chrome ([2109651](https://github.com/sethjuarez/elucim/commit/21096512cb2c36378569ef3ee31282a93d583f56))


### Bug Fixes

* **core:** Presentation next button advances slide on first click ([f9fa47c](https://github.com/sethjuarez/elucim/commit/f9fa47c0c6794e096288d28ce3926e01c3bd97a9))

## [0.11.0](https://github.com/sethjuarez/elucim/compare/core-v0.10.0...core-v0.11.0) (2026-03-18)


### Features

* DslRenderer overrides, onPlayStateChange, initialFrame='last' ([2cb8b9e](https://github.com/sethjuarez/elucim/commit/2cb8b9e309cca7acd40bf9d4da8dc561f7284f5c))

## [0.10.0](https://github.com/sethjuarez/elucim/compare/core-v0.9.0...core-v0.10.0) (2026-03-18)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.9.0](https://github.com/sethjuarez/elucim/compare/core-v0.8.4...core-v0.9.0) (2026-03-18)


### Bug Fixes

* fadeOut timing bug, smart inspector, timeline UX ([d9bb410](https://github.com/sethjuarez/elucim/commit/d9bb4104dc702af163c1fdc47cfec925e2e27982))
* pipe colorScheme through to Presentation component ([98a50dc](https://github.com/sethjuarez/elucim/commit/98a50dc92db764b546e7da05f420a98e0a3f8217))
* Presentation dark mode default + remove legacy VitePress docs ([0bdf8b5](https://github.com/sethjuarez/elucim/commit/0bdf8b5b081088b2f79908732b42ace3eafdbabf))

## [0.8.4](https://github.com/sethjuarez/elucim/compare/core-v0.8.3...core-v0.8.4) (2026-03-18)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.8.3](https://github.com/sethjuarez/elucim/compare/core-v0.8.2...core-v0.8.3) (2026-03-17)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.8.2](https://github.com/sethjuarez/elucim/compare/core-v0.8.1...core-v0.8.2) (2026-03-17)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.8.1](https://github.com/sethjuarez/elucim/compare/core-v0.8.0...core-v0.8.1) (2026-03-17)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.8.0](https://github.com/sethjuarez/elucim/compare/core-v0.7.0...core-v0.8.0) (2026-03-17)


### Bug Fixes

* **core:** make colorScheme configurable instead of hardcoded ([a170702](https://github.com/sethjuarez/elucim/commit/a170702a1614d3636ae0629f721d13fed2a96b6a))
* **editor:** resize direction, matrix bounds, graph node drag ([bae3f3e](https://github.com/sethjuarez/elucim/commit/bae3f3e527b1263b170608810b7db82df93a9d04))

## [0.7.0](https://github.com/sethjuarez/elucim/compare/core-v0.6.0...core-v0.7.0) (2026-03-17)


### Features

* **core:** click to complete slide animations before advancing ([ac513ab](https://github.com/sethjuarez/elucim/commit/ac513abf0dec7a661fdcaf0bdb8b56f5d28dee71))


### Bug Fixes

* **core:** presentation now renders at proper 16:9 aspect ratio ([d957e24](https://github.com/sethjuarez/elucim/commit/d957e24779f395ccb965eb6cc2b192c4de81a974))

## [0.6.0](https://github.com/sethjuarez/elucim/compare/core-v0.5.0...core-v0.6.0) (2026-03-16)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.5.0](https://github.com/sethjuarez/elucim/compare/core-v0.4.1...core-v0.5.0) (2026-03-15)


### Miscellaneous

* **core:** Synchronize elucim versions

## [0.4.1](https://github.com/sethjuarez/elucim/compare/core-v0.4.0...core-v0.4.1) (2026-03-14)


### Bug Fixes

* externalize react-dom/server to fix React 19 compatibility ([29a4176](https://github.com/sethjuarez/elucim/commit/29a417620dc6c24588500d1b45caee5c9afb82ff))

## [0.4.0](https://github.com/sethjuarez/elucim/compare/core-v0.3.0...core-v0.4.0) (2026-03-14)


### Features

* add integration features — presets, theme tokens, poster mode, imperative ref, headless rendering ([97775ef](https://github.com/sethjuarez/elucim/commit/97775efc3bc26a5f3c45665f99bcb9282a9fc3f8))

## [0.3.0](https://github.com/sethjuarez/elucim/compare/core-v0.2.1...core-v0.3.0) (2026-03-14)


### Features

* add BezierCurve primitive with quadratic and cubic support ([f480887](https://github.com/sethjuarez/elucim/commit/f480887703521adbeb8c1d08a2e3babc5ebbce67))

## [0.2.1](https://github.com/sethjuarez/elucim/compare/core-v0.2.0...core-v0.2.1) (2026-03-06)


### Bug Fixes

* add missing keywords for new primitives in package metadata ([5d9d8aa](https://github.com/sethjuarez/elucim/commit/5d9d8aa71cd7a9bd8bb0a8652df27a8aa0e91199))

## [0.2.0](https://github.com/sethjuarez/elucim/compare/core-v0.1.3...core-v0.2.0) (2026-03-06)


### Features

* add Image and Group primitives, universal transforms, z-index ([4564e2b](https://github.com/sethjuarez/elucim/commit/4564e2b518320820ce8a14c812172b6419485bc2))
* add interactive Explorer app + video export system ([c858cca](https://github.com/sethjuarez/elucim/commit/c858cca30245e7ef9c7390d354bc9528a96e8d13))
* add LaTeX, VectorField, and Polygon primitives ([2fea0b2](https://github.com/sethjuarez/elucim/commit/2fea0b228b509796eda21956bdebd72699263875))
* add npm publishing with GitHub Actions OIDC ([e42388f](https://github.com/sethjuarez/elucim/commit/e42388fdfeba5db1c056300aad8dc6ec9f2c094c))
* add Presentation/Slide mode with transitions, HUD, keyboard nav, and presenter notes ([1d96f2d](https://github.com/sethjuarez/elucim/commit/1d96f2dcd2bb359feb65150537724bbacf223023))
* auto theme-aware defaults in core via light-dark() CSS ([4c148c5](https://github.com/sethjuarez/elucim/commit/4c148c5bc8371aae70dd4bf030389b57c1a727c0))
* **core:** add BarChart component and strokeDasharray support ([bc5683f](https://github.com/sethjuarez/elucim/commit/bc5683f1b724ae058dbf4ff4ac136858718decd2))
* make Presentation component fully theme-aware in core ([9171443](https://github.com/sethjuarez/elucim/commit/9171443406284ce87e15a0e797d04ccc384ed369))
* Phase 1 core engine — Scene, Sequence, Player, Mobjects, easing ([8911966](https://github.com/sethjuarez/elucim/commit/89119669af0b4dd41c7bcc5e23992287a35119b8))
* Phase 2 math primitives — Axes, FunctionPlot, Vector, Matrix, Graph ([bea646c](https://github.com/sethjuarez/elucim/commit/bea646c3d1adb0397b3ad113eb4e547e6ae9e86c))
* Phase 3 animation system — FadeIn, FadeOut, Write, Transform, Morph, Stagger ([075bed3](https://github.com/sethjuarez/elucim/commit/075bed349533548d0aeb155f8647e841d3fb7934))
* remove HUD bar background, use inherited theme colors ([70f9195](https://github.com/sethjuarez/elucim/commit/70f9195e993432a661fed9a675185e9d8e59ef29))
* switch to npm OIDC trusted publishing (no tokens) ([d2ae5ba](https://github.com/sethjuarez/elucim/commit/d2ae5ba568713561cf490ed4508328b5a1cc3ade))
* theme-aware Player controls via CSS custom properties ([7a4e84b](https://github.com/sethjuarez/elucim/commit/7a4e84b8842624fcb00512d60da1d69f4f6c2a75))
* theme-aware Scene backgrounds via CSS custom properties ([22cab30](https://github.com/sethjuarez/elucim/commit/22cab30bcb157be324b99d6d44ca06a32a873207))


### Bug Fixes

* animation demos, LaTeX rendering, matrix centering, example pages ([61499f7](https://github.com/sethjuarez/elucim/commit/61499f78bff02e83cd20f65270b6a729628ed2b7))
* eliminate slide transition bump caused by margin injection ([71a13bc](https://github.com/sethjuarez/elucim/commit/71a13bc71cf5113f36aa038832dd08db8f5bf468))
* group transport buttons tightly in controls bar ([02c3a61](https://github.com/sethjuarez/elucim/commit/02c3a617121e157439a59e55cac24e086c3df29f))
* LaTeX centering and demo positioning ([b336b7d](https://github.com/sethjuarez/elucim/commit/b336b7d920c87dc6b0e9e9d09365f4108d57c099))
* presentation HUD dots alignment, fullscreen button, transition stability ([0180434](https://github.com/sethjuarez/elucim/commit/0180434fb2aa802efb7f6441c3d3e1a53ea3536c))
* rebuild controls bar with flexbox + CSS resets ([7efcba2](https://github.com/sethjuarez/elucim/commit/7efcba254d72f8b988ba57b07767711788e1f6e0))
* remove build warnings by disabling rollupTypes for core ([65e2ddb](https://github.com/sethjuarez/elucim/commit/65e2ddbeb0495e1f4bcb06dfb5ee894fa001b2f9))
* replace Unicode nav arrows with SVG chevrons, shrink circle ([c7e4b59](https://github.com/sethjuarez/elucim/commit/c7e4b593edfe1d67c6b0d120459180623797ed96))
* reset Starlight margin injection on Presentation dots and buttons ([f31caaf](https://github.com/sethjuarez/elucim/commit/f31caaf9fd5b54b69773558f7e2b0c13fdf0aa45))
* responsive Scene/Player sizing and compact homepage demo ([09e7df9](https://github.com/sethjuarez/elucim/commit/09e7df96f1302df812cfbdb46aef28cc4097b2e7))
* theme-aware Player controls and transparent demo backgrounds ([da42103](https://github.com/sethjuarez/elucim/commit/da421036c3a6a7a66a566a48ce9a746bd30fabad))
* uniform controls bar layout with consistent sizing ([89c9535](https://github.com/sethjuarez/elucim/commit/89c95353341c5bcb61881c95c922bf32cdbebe86))

## 0.1.3

### Patch Changes

- e8581f7: Update package homepage URLs and README links to point to elucim.com

## 0.1.2

### Patch Changes

- f7c0721: Theme-aware presentation polish, SVG nav arrows, light-dark defaults, automated publishing
