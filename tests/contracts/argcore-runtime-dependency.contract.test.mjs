import assert from "node:assert/strict";
import { executeGovernedLifecycle } from "@arg/argcore";
import { createArgCoreRuntime } from "../../src/server/argcore-runtime.js";

assert.equal(typeof executeGovernedLifecycle, "function");

const runtime = createArgCoreRuntime();
assert.equal(runtime.executeGovernedLifecycle, executeGovernedLifecycle);

const result = await runtime.executeGovernedLifecycle({
  request: {
    correlationId: "corr-package-001",
    principalId: "principal-001",
    sessionId: "session-001",
  },
  principal: { id: "principal-001" },
  authority: {
    principalId: "principal-001",
    action: "intelligence.execute",
    resource: "session-001",
    expiresAt: "2099-01-01T00:00:00.000Z",
    consumed: false,
  },
  policy: { allow: true },
  budget: { remainingCalls: 1, remainingTokens: 1000 },
  executor: async () => ({ ok: true, value: "package-runtime" }),
});

assert.equal(result.status, "COMPLETED");
assert.equal(result.outcome.value, "package-runtime");
assert.ok(result.events.every((event) => event.correlationId === "corr-package-001"));

console.log("ARGOS ArgCore runtime dependency contract: PASS");
