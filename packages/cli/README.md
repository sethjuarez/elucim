# Elucim CLI

Agent-discoverable command line tools for validating, inspecting, polishing, and laying out Elucim documents.

```bash
npx elucim ops --json
npx elucim validate diagram.elc --json
npx elucim inspect diagram.elc --json
npx elucim nudges diagram.elc --semantic-layout --json
npx elucim polish diagram.elc --apply-safe --out polished.elc --json
```

Use `elucim ops --json` as the discovery entrypoint for agents. It returns the CLI command catalog plus the code-backed `@elucim/dsl/agent` operation catalog.
