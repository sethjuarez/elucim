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
