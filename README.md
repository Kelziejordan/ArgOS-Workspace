# ArgOS Workspace

ArgOS Workspace is the application layer built above ArgCore. It is a local-first, provider-neutral multi-intelligence workspace.

## Primary interaction

Four intelligence columns are visible simultaneously. Each column has an explicit participant control:

```text
AI 1      AI 2      AI 3      AI 4
[ON]      [ON]      [OFF]     [ON]

---------------------------------
          USER CHAT
---------------------------------
```

The user decides which participants receive the next message. `Select all` and `Clear` are convenience controls. The bottom composer spans the full workspace.

## ArgOS workflow

`User goal -> selected intelligence -> parallel responses -> evidence -> explicit reconciliation -> governed next action`

No model response is treated as authoritative merely because it is present in a column. Reconciliation is an explicit second-stage operation that identifies agreement, disagreement, evidence quality, uncertainty, and what should be verified next.

## Provider boundary

The browser never stores provider secrets. It calls the same-origin `/api/ai` gateway. Provider credentials and model identifiers are deployment environment variables. `/api/reconcile` performs an explicit synthesis pass using the configured ArgOS reconciler.

## Local-first behavior

Session state, participant selection, responses, and reconciliation records are stored in IndexedDB. If the application is offline, the UI preserves the task and can display a clearly labeled local fallback rather than pretending an unavailable provider answered.

## Architecture

ArgOS Workspace is not ArgCore. ArgCore supplies governance, authority, state, provenance, validation, recovery, observability, resource control, and provider interfaces. ArgOS owns model selection, multi-intelligence orchestration, evidence comparison, reconciliation, and user experience.

Legacy Trading, LifeOS, InspectionOS, Discovery, and provider implementations are not imported into the workspace.
