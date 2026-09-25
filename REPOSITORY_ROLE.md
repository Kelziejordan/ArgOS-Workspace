# Repository Role Declaration — ArgOS Workspace

Declaration version: 1.0
Effective status: FROZEN AUTHORITY BOUNDARY
Repository: Kelziejordan/ArgOS-Workspace

## Classification
- Tier: 5 — Development/product workspace
- Lifecycle: Active development/support
- Source of truth: No for foundational contracts; source of truth for this workspace's application behavior
- Historical/reference: No, except explicitly marked material

## Authority
- Identity: CONSUMER
- State: CONSUMER
- Governance: CONSUMER
- Provenance: CONSUMER
- Execution: CONSUMER

## Role
ArgOS Workspace is an application layer above ArgCore. It owns multi-intelligence interaction, participant selection, evidence comparison, reconciliation UX, and local workspace behavior.

## Boundary
IndexedDB/UI/session state is workspace state, not constitutional execution state. Provider responses are intelligence inputs, not authority. Reconciliation is a consumer workflow and must remain subject to governed runtime contracts.

## Permitted modifications
May evolve UI, workspace orchestration, local-first behavior, and product workflow. Must not redefine ArgCore identity/state/governance/provenance contracts.

FINAL RULE: workspace state is not constitutional state.
