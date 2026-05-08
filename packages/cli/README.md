# Elucim CLI

Agent-discoverable command line tools for validating, inspecting, polishing, and laying out Elucim documents.

```bash
npx @elucim/cli ops --json
npx @elucim/cli validate diagram.elc --json
npx @elucim/cli inspect diagram.elc --json
npx @elucim/cli nudges diagram.elc --semantic-layout --json
npx @elucim/cli polish diagram.elc --apply-safe --out polished.elc --json
npx @elucim/cli add-step-card diagram.elc --id draft --x 80 --y 120 --title "Draft" --body "Editable grouped card" --out diagram.elc --json
npx @elucim/cli add-connector diagram.elc --id draft-to-review --from draft --to review --label "then" --line-style dashed --end-cap arrow --out diagram.elc --json
```

Use `npx @elucim/cli ops --json` as the discovery entrypoint for agents. The installed binary is still `elucim`, so global installs can run `elucim ops --json`.

Authoring shortcuts such as `add-step-card`, `add-text-block`, `add-card-grid`, and `add-connector` write normal editable Elucim elements. At edit time these are groups plus SVG primitives; semantic connectors also add relationship metadata that the ELK layout pass reads as virtual graph edges.

The broader composite helper set is available from `@elucim/dsl` and advertised by `elucim ops --json`: decision nodes, boundaries/containers, badges/pills, queues/stacks, roadmaps, comparison tables, auto-layout groups, and progressive reveal groups.
