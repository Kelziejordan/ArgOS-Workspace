# ArgCore → ArgOS Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ArgCore the enforced server-side runtime boundary for ArgOS governed AI execution without moving provider credentials or provider SDKs into the browser or Core.

**Architecture:** ArgOS-Workspace remains the application and HTTP boundary. Its server-side execution adapter will call one versioned ArgCore runtime entry point for admission, grant, lifecycle, provenance, and governed execution. Provider adapters remain outside ArgCore and are invoked only after ArgCore permits execution. Reconciliation is a separately governed operation and must preserve the four-provider workspace invariant.

**Tech Stack:** React 18, Vite 5, Node ESM, IndexedDB via `idb`, ArgCore JavaScript runtime, server-side HTTP API boundary.

**Spec:** `docs/ARGCORE-004-EXECUTION-LIFECYCLE-COMPOSITION.md` and `docs/ARGCORE-004-INTEGRATED-GOVERNED-EXECUTION-HARNESS.md` in ArgCore; ArgOS application contract is represented by `src/App.jsx` and `src/lib/ai.js`.

## Global Constraints

- ArgCore remains provider-neutral; no OpenAI, Anthropic, Gemini, or DeepSeek SDKs enter ArgCore.
- ArgOS browser code never receives provider API credentials.
- The four-provider workspace invariant is absolute: OpenAI, Anthropic, Gemini, and DeepSeek remain selectable independently or simultaneously.
- Authority and governance admission precede provider execution.
- Execution grants are consumed before executor invocation and cannot be replayed.
- Every attempted governed execution has correlation and provenance linkage.
- Reconciliation is an explicit governed operation; it does not silently turn multiple responses into an authoritative answer.
- Local/offline fallback preserves state and must never masquerade as a provider response.
- Existing ARGCORE-004 contracts remain frozen; integration adapts to them rather than weakening them.
- The 94% data-saver capsule invariant remains in force for ArgAtlas/ArgOS ecosystem data exchange where that protocol applies.
- ArgOS is an operating-system/application layer above ArgCore; ArgAtlas remains the ecosystem continuity boundary, not an execution-provider.

---

### Task 1: Define the ArgOS server-side Core adapter boundary

**Files:**
- Create: `src/server/argcore.js`
- Create: `tests/contracts/argcore-adapter.contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: ArgCore governed lifecycle entry point and normalized execution request.
- Produces: `createArgCoreAdapter({ runtime })` with `execute(request, executor)` and a stable result shape containing `status`, `grantId`, `outcome`, and `events`.

- [ ] **Step 1: Write the failing adapter contract.**

```js
import assert from "node:assert/strict";
import { createArgCoreAdapter } from "../../src/server/argcore.js";

const calls = [];
const adapter = createArgCoreAdapter({
  runtime: {
    executeGovernedLifecycle: async (request) => {
      calls.push(request);
      return {
        status: "COMPLETED",
        grantId: "grant-fixture",
        outcome: { ok: true, value: "fixture" },
        events: [{ eventType: "EXECUTION_OUTCOME", correlationId: request.request.correlationId }],
      };
    },
  },
});

const result = await adapter.execute({
  sessionId: "session-001",
  principalId: "principal-001",
  providerId: "deepseek",
  action: "intelligence.execute",
  resource: "session-001",
  correlationId: "corr-adapter-001",
  prompt: "fixture",
}, async () => ({ output: "fixture" }));

assert.equal(result.status, "COMPLETED");
assert.equal(result.grantId, "grant-fixture");
assert.equal(calls.length, 1);
assert.equal(calls[0].request.correlationId, "corr-adapter-001");

console.log("ARGOS ArgCore adapter contract: PASS");
```

- [ ] **Step 2: Run the adapter contract and verify RED.**

Run: `node tests/contracts/argcore-adapter.contract.test.mjs`
Expected: FAIL because `src/server/argcore.js` does not exist.

- [ ] **Step 3: Implement the minimal adapter.**

```js
export function createArgCoreAdapter({ runtime }) {
  if (!runtime?.executeGovernedLifecycle) throw new Error("ArgCore runtime is required");
  return {
    execute(request, executor) {
      return runtime.executeGovernedLifecycle({
        request: {
          correlationId: request.correlationId,
          principalId: request.principalId,
          sessionId: request.sessionId,
        },
        principal: { id: request.principalId },
        authority: {
          principalId: request.principalId,
          action: request.action,
          resource: request.resource,
          expiresAt: "2099-01-01T00:00:00.000Z",
          consumed: false,
        },
        policy: { allow: true },
        budget: { remainingCalls: 1, remainingTokens: 100000 },
        executor,
      });
    },
  };
}
```

- [ ] **Step 4: Run the contract and verify GREEN.**

Run: `node tests/contracts/argcore-adapter.contract.test.mjs`
Expected: `ARGOS ArgCore adapter contract: PASS`

- [ ] **Step 5: Commit.**

```bash
git add src/server/argcore.js tests/contracts/argcore-adapter.contract.test.mjs package.json
git commit -m "feat: add ArgCore server adapter boundary"
```

### Task 2: Introduce a versioned ArgCore dependency without copying Core source

**Files:**
- Modify: `package.json`
- Create: `src/server/argcore-runtime.js`
- Create: `tests/contracts/argcore-runtime-dependency.contract.test.mjs`

**Interfaces:**
- Consumes: versioned ArgCore package export `executeGovernedLifecycle`.
- Produces: one server-side runtime object used by the adapter.

- [ ] **Step 1: Write the dependency contract requiring the runtime import from the package boundary.**
- [ ] **Step 2: Run it and capture RED if the package is unavailable or lacks the expected export.**
- [ ] **Step 3: Add the versioned dependency using the actual ArgCore repository package mechanism; do not copy `src/runtime` into ArgOS.**
- [ ] **Step 4: Add a thin runtime loader that imports only the public Core runtime export.**
- [ ] **Step 5: Run the dependency contract and the full ArgOS build.**
- [ ] **Step 6: Commit the dependency boundary.**

### Task 3: Replace the direct `/api/ai` provider path with governed execution

**Files:**
- Modify: `src/lib/ai.js`
- Create: server-side `/api/ai` implementation at the repository's existing server entry location after inspecting deployment configuration.
- Create: `tests/contracts/governed-ai-route.contract.test.mjs`

**Interfaces:**
- Consumes: normalized provider request from the Workspace and `createArgCoreAdapter`.
- Produces: provider response plus Core execution metadata suitable for persistence and audit display.

- [ ] **Step 1: Write the failing route contract for a permitted provider call and denied call.**
- [ ] **Step 2: Run the contract and capture actual RED.**
- [ ] **Step 3: Wrap provider invocation in the ArgCore lifecycle adapter.**
- [ ] **Step 4: Ensure credentials remain server-only and provider IDs are allow-listed.**
- [ ] **Step 5: Run route contract and existing application build.**
- [ ] **Step 6: Commit the governed `/api/ai` path.**

### Task 4: Make reconciliation a separately governed operation

**Files:**
- Modify: reconciliation server route.
- Modify: `src/App.jsx` only where response metadata requires it.
- Create: `tests/contracts/governed-reconciliation.contract.test.mjs`

**Interfaces:**
- Consumes: persisted independent provider responses and participant selection.
- Produces: explicit reconciliation result with correlation/provenance references and uncertainty metadata.

- [ ] **Step 1: Write the failing reconciliation contract.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Execute reconciliation through the ArgCore governed lifecycle.**
- [ ] **Step 4: Preserve agreement, disagreement, evidence, uncertainty, and verification recommendations.**
- [ ] **Step 5: Verify all four providers remain independently selectable and all four can participate simultaneously.**
- [ ] **Step 6: Commit the governed reconciliation path.**

### Task 5: End-to-end fixture workflow and deployment gate

**Files:**
- Create: `tests/contracts/argcore-argos-e2e.contract.test.mjs`
- Modify: `package.json`
- Create or modify: CI workflow only after confirming the repository's existing workflow layout.

**Interfaces:**
- Consumes: Workspace request → ArgCore adapter → provider fixture → provenance → reconciliation.
- Produces: one reproducible governed multi-provider workflow result.

- [ ] **Step 1: Write the fixture-backed end-to-end contract using all four provider identities.**
- [ ] **Step 2: Verify RED before integration is complete.**
- [ ] **Step 3: Implement the smallest integration needed to make the fixture workflow GREEN.**
- [ ] **Step 4: Run `npm run build` and the complete contract suite.**
- [ ] **Step 5: Run the real provider workflow with a capped budget only after fixture verification is GREEN.**
- [ ] **Step 6: Commit the verified integration tranche.**

## Verification Command

The final integration gate must have one canonical command that runs the ArgOS integration contracts and the ArgCore contract suite without duplicating test definitions. A successful result must explicitly identify both layers as GREEN.

```bash
npm run test:integration
npm run build
```

For the Core repository itself, the existing canonical verification remains:

```bash
npm run test:all
```

## Failure Budget

Allowed during this tranche: provider timeout, unavailable provider, partial multi-provider response, offline/local preservation, and fixture failures that are explicitly surfaced and audited.

Not allowed: browser-held provider credentials, unauthorized provider invocation, replayed execution, silent reconciliation, copied ArgCore source, uncorrelated execution records, or an ArgOS path that bypasses ArgCore governance.
