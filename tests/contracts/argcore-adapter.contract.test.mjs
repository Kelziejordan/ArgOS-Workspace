import assert from "node:assert/strict";
import { createArgCoreAdapter } from "../../src/server/argcore.js";

const calls = [];
const adapter = createArgCoreAdapter({
  runtime: {
    executeGovernedLifecycle: async (input) => {
      calls.push(input);
      return {
        status: "COMPLETED",
        grantId: "grant-fixture",
        outcome: { ok: true, value: "fixture" },
        events: [{ eventType: "EXECUTION_OUTCOME", correlationId: input.request.correlationId }],
      };
    },
  },
});

const result = await adapter.execute(
  {
    sessionId: "session-001",
    principalId: "principal-001",
    providerId: "deepseek",
    action: "intelligence.execute",
    resource: "session-001",
    correlationId: "corr-adapter-001",
    prompt: "fixture",
    authority: {
      principalId: "principal-001",
      action: "intelligence.execute",
      resource: "session-001",
      expiresAt: "2026-08-24T00:00:00.000Z",
      consumed: false,
    },
    policy: { allow: true },
    budget: { remainingCalls: 1, remainingTokens: 1000 },
  },
  async () => ({ output: "fixture" }),
);

assert.equal(result.status, "COMPLETED");
assert.equal(result.grantId, "grant-fixture");
assert.equal(result.outcome.value, "fixture");
assert.equal(calls.length, 1);
assert.deepEqual(calls[0].request, {
  correlationId: "corr-adapter-001",
  principalId: "principal-001",
  sessionId: "session-001",
});
assert.deepEqual(calls[0].principal, { id: "principal-001" });
assert.deepEqual(calls[0].authority, {
  principalId: "principal-001",
  action: "intelligence.execute",
  resource: "session-001",
  expiresAt: "2026-08-24T00:00:00.000Z",
  consumed: false,
});
assert.deepEqual(calls[0].policy, { allow: true });
assert.deepEqual(calls[0].budget, { remainingCalls: 1, remainingTokens: 1000 });

assert.throws(
  () => createArgCoreAdapter({ runtime: {} }),
  /ArgCore runtime is required/i,
);

console.log("ARGOS ArgCore adapter contract: PASS");
