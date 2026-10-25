# Repository Role Declaration

## Identity
ArgOS Workspace is a user-facing application layer built above ArgCore. Its README describes a local-first, provider-neutral multi-intelligence workspace in which the user selects participants and explicitly reconciles responses before choosing a governed next action.

## Responsibilities
- Own the workspace UI, interaction model, participant selection, session experience, and application-level orchestration implemented in this repository.
- Keep the user in control of which model participants receive a message and how conflicting outputs are reconciled.
- Treat model responses as inputs to review, not as authoritative facts or authorization.
- Validate data crossing application, provider, and persistence boundaries.
- Keep provider credentials server-side or in an appropriate secret store; never expose them to client bundles or logs.
- Make unavailable, partial, or failed provider responses visible rather than silently presenting them as complete.

## Authority boundaries
ArgCore owns constitutional/foundational governance contracts. Arg owns the current ArgOS runtime and orchestration. ArgAtlas preserves engineering continuity, provenance, and evidence records. ArgLearn supports evidence analysis and experiments; it does not independently authorize production or constitutional changes.

ArgOS Workspace consumes or integrates with those systems only to the extent shown by concrete code and tests. This declaration does not imply that every dependency, governance gate, provider, or end-to-end workflow is currently integrated or proven.

## User control and safety
- Participant selection must remain explicit and must not be silently broadened.
- Reconciliation must preserve disagreements and uncertainty; it must not manufacture consensus.
- A generated recommendation is not permission to perform an external or consequential action.
- Any externally consequential action requires a separately implemented and tested authorization boundary.
- Session history, prompts, and provider outputs should be handled according to documented privacy and retention behavior.

## Evidence language
- **Implemented** means code exists.
- **Tested** means named tests passed.
- **Integrated** means the named boundary was exercised.
- **Production-ready** requires demonstrated deployment, security, privacy, reliability, and operational controls.
- **Not proven** means available evidence does not establish the claim.

A successful UI render or isolated unit test does not prove provider interoperability, durable session continuity, governance enforcement, or production readiness.

## Change control
Changes to participant routing, reconciliation, provider adapters, session persistence, authorization, or external effects require focused tests at the changed boundary, including failure and partial-response cases. Keep the provider layer replaceable where supported by the existing design. Do not introduce a second source of truth for ArgCore policy.

## Explicit non-goals
This repository is not the constitutional authority, the shared ArgOS runtime, or the canonical cross-repository evidence ledger. It must not claim enterprise compliance, autonomous authority, or end-to-end ArgOS certification without specific, reproducible evidence.

## Maintainer decision rule
Prefer the smallest change that improves the user-controlled multi-intelligence workflow, preserves provider and governance boundaries, and adds reproducible evidence. State uncertainty directly; do not infer maturity from product intent or architecture diagrams.
