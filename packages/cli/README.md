# Elucim CLI

Agent-discoverable command line tools for validating, inspecting, polishing, and laying out Elucim documents.

```bash
npx @elucim/cli ops --json
npx @elucim/cli validate diagram.elc --json
npx @elucim/cli check-layout diagram.elc --json
npx @elucim/cli repair-layout diagram.elc --out repaired.elc --json
npx @elucim/cli inspect diagram.elc --json
npx @elucim/cli nudges diagram.elc --semantic-layout --json
npx @elucim/cli polish diagram.elc --apply-safe --out polished.elc --json
npx @elucim/cli add-textbox diagram.elc --id summary --x 80 --y 120 --width 320 --height 120 --text "Bounded copy" --auto-fit shrink --background panel --out diagram.elc --json
npx @elucim/cli add-step-card diagram.elc --id draft --x 80 --y 120 --title "Draft" --body "Editable grouped card" --out diagram.elc --json
npx @elucim/cli add-connector diagram.elc --id draft-to-review --from draft --to review --label "then" --line-style dashed --end-cap arrow --out diagram.elc --json
npx @elucim/cli add-beat diagram.elc --id intro-flow --preset revealFlow --targets draft,review --duration 60 --out diagram.elc --json
npx @elucim/cli animate-flow diagram.elc --id draft-handoff --from draft --to review --connector draft-to-review --out diagram.elc --json
npx @elucim/cli sample-beats diagram.elc --timeline intro-flow --beats 4 --json
npx @elucim/cli hold-final diagram.elc --timeline intro-flow --out poster.elc --json
npx @elucim/cli reduced-motion diagram.elc --mode minimal --out reduced.elc --json
```

Use `npx @elucim/cli ops --json` as the discovery entrypoint for agents. Run `check-layout --json` before rendering generated scenes to catch text overflow, unreadably small auto-fit text, and likely overlaps; the JSON output includes deterministic `repairSuggestions` with `update-element` argv templates for follow-up edits. Run `repair-layout --out repaired.elc --json` to apply safe layout repairs automatically and get before/after layout diagnostics. Review-level repairs are opt-in with `--apply-review <id>` or `--apply-all-review`, and `--max-passes <n>` controls iterative repair passes. The installed binary is still `elucim`, so global installs can run `elucim ops --json`.

Copyable fixtures live in `fixtures/agent`:

- `concept-card.elc` is a minimal editor-friendly card with semantic layout and intent.
- `animated-state-machine.elc` adds a timeline and default state machine for preview/export workflows.

Authoring shortcuts such as `add-textbox`, `add-step-card`, `add-text-block`, `add-card-grid`, and `add-connector` write normal editable Elucim elements. Use `add-textbox` for generated prose that must stay inside a known rectangle; pass `--background none` when the text should be bounded for layout without a visible panel. At edit time these are groups plus SVG primitives; semantic connectors also add relationship metadata that the ELK layout pass reads as virtual graph edges.

The broader composite helper set is available from `@elucim/dsl` and advertised by `elucim ops --json`: decision nodes, boundaries/containers, badges/pills, queues/stacks, roadmaps, comparison tables, auto-layout groups, and progressive reveal groups.

Semantic motion commands compile higher-level animation verbs into ordinary Elucim timelines. Use `add-beat` for presets such as `revealFlow`, `emphasizeDecision`, `tracePath`, `loopOnce`, `handoff`, `drainQueue`, and `compareBeforeAfter`; `reveal-group` to auto-stagger by document order, rank, or group; `sample-beats` for motion lint plus beat-level before/after summaries; `hold-final` for static posters; `reduced-motion` for static or minimal-motion fallbacks; and `export-frames` for selected frame documents.

## Cue-driven timing and frame export

Author a timeline at its natural pace with named `markers` (frames), then land those markers on external cue frames such as TTS word timings:

```bash
# Move markers to cue frames. Frames between markers stretch piecewise-linearly, so easing survives.
npx @elucim/cli retime scene.elc --timeline intro --map agent=50,tool=110 --out retimed.elc --json
# Or read cues from JSON ({"agent": 50} or {"cues": {"agent": 50}}), converting from 25 fps cue frames:
npx @elucim/cli retime scene.elc --timeline intro --map-file cues.json --cue-fps 25 --duration 150 --out retimed.elc --json

# Render exact frames headlessly (no browser). Output frame n samples document frame n * scene.fps / --fps.
npx @elucim/cli export-frames retimed.elc --out-dir frames --fps 25 --count 150 --background transparent --json
```

`retime` prints the anchors, the new duration, validation, and motion lint. Segments that span a cue are split there, so the authored state lands exactly on the cue. Lint flags `squeezed-beat` when a marker gets fewer than `minTransitionFrames` before the next cue and `collapsed-marker` when cues collide. It exits 1 on unknown markers, non-monotonic cues, or collisions. `--duration` sets the new timeline length; by default the tail after the last marker is kept.

`export-frames --out-dir <dir>` writes `frame-000000.png` and onward (`pattern` in the JSON is ffmpeg-ready, for example `ffmpeg -framerate 25 -start_number 0 -i frames/frame-%06d.png`). Flags:

| Flag | Meaning |
| --- | --- |
| `--timeline <id>` | Timeline to play. Default: the default state machine's entry timeline, else the only timeline, else a static frame. |
| `--fps <n>` | Output frame rate. Default `scene.fps` (60 when unset). Set `scene.fps` to the cue fps (25 for Playwright takes) for a 1:1 frame map. |
| `--start <n>`, `--end <n>` / `--count <n>` | Half-open output frame range `[start, end)` or `count` frames. The count written is exactly what you request; frames past the timeline hold its final state. Default: frames `0..duration` inclusive. |
| `--frames 0,10,20` | Explicit output frame indices instead of a range. |
| `--width <px>`, `--height <px>` | Output pixel size; one keeps the aspect ratio, both must match it. |
| `--background scene\|transparent\|<color>` | `transparent` writes RGBA PNGs for compositing over video. |
| `--anchors boxes.json` | Bind measured boxes to the document's named anchors (see below). |
| `--format png\|svg` | PNG (default) or standalone SVG frames. |
| `--font file.ttf` (repeatable) / `--system-fonts` | Fonts for text. Passing font files avoids scanning system fonts, which costs hundreds of milliseconds per text frame. |
| `--prefix <name>` | File name prefix (default `frame-`). |

Without `--out-dir`, `export-frames --timeline <id> --frames ...` keeps returning frame summaries (and documents with `--print-document`).

Standalone export cannot draw LaTeX (`foreignObject`) or remote `http(s)` images; it fails with a clear error. Inline images as `data:` URIs.

### Overlays that point at real UI

Declare named anchors in the document and attach elements with `layout.anchor`:

```json
{
  "anchors": { "submitBtn": { "x": 100, "y": 100, "width": 80, "height": 40 } },
  "elements": {
    "ring": { "id": "ring", "type": "rect", "layout": { "anchor": { "id": "submitBtn", "point": "top-left" } }, "props": { "type": "rect", "x": 96, "y": 96, "width": 88, "height": 48 } },
    "arrow": { "id": "arrow", "type": "arrow", "layout": { "anchor": { "id": "submitBtn", "point": "left", "endpoint": "end" } }, "props": { "type": "arrow", "x1": 20, "y1": 20, "x2": 100, "y2": 120 } }
  }
}
```

At export, pass measured boxes (for example from a take log) with `--anchors boxes.json`:

```json
{ "source": { "width": 1280, "height": 720 }, "anchors": { "submitBtn": { "x": 612, "y": 418, "w": 96, "h": 32 } } }
```

Anchored elements keep their authored offset from the anchor point. Their absolute-position animation tracks (`x`, point `from`/`to`) move with them. `endpoint` pins just one end of a line or arrow. Groups move their children, except children with their own anchor. `source` scales boxes from video or viewport pixels into scene units; omit it when the scene size equals the video size.

### Programmatic API

```ts
import { exportFrames, planFrameExport, renderFramePng } from '@elucim/cli';
import { retimeTimeline, bindAnchors } from '@elucim/dsl';

const timed = retimeTimeline(doc, 'intro', { agent: 50, tool: 110 });
const result = await exportFrames(timed, { outDir: 'frames', fps: 25, count: 150, background: 'transparent', anchors: { anchors: boxes } });
const png: Uint8Array = renderFramePng(timed, 42, { background: 'transparent', width: 1920 });
```
