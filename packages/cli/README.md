# Elucim CLI

Agent-discoverable command line tools for validating, inspecting, polishing, and laying out Elucim documents.

```bash
npx @elucim/cli ops --json
npx @elucim/cli validate diagram.elc --json
npx @elucim/cli inspect diagram.elc --json
npx @elucim/cli nudges diagram.elc --semantic-layout --json
npx @elucim/cli polish diagram.elc --apply-safe --out polished.elc --json
```

Use `npx @elucim/cli ops --json` as the discovery entrypoint for agents. The installed binary is still `elucim`, so global installs can run `elucim ops --json`.
