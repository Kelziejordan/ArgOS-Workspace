function requireRuntime(runtime) {
  if (!runtime || typeof runtime.executeGovernedLifecycle !== "function") {
    throw new Error("ArgCore runtime is required");
  }
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object") throw new TypeError("ArgOS execution request is required");

  const required = ["correlationId", "principalId", "sessionId", "action", "resource"];
  for (const field of required) {
    if (!request[field]) throw new Error(`ArgOS execution request requires ${field}`);
  }

  if (!request.authority || !request.policy || !request.budget) {
    throw new Error("ArgOS execution request requires authority, policy, and budget");
  }

  return {
    request: {
      correlationId: request.correlationId,
      principalId: request.principalId,
      sessionId: request.sessionId,
    },
    principal: { id: request.principalId },
    authority: request.authority,
    policy: request.policy,
    budget: request.budget,
  };
}

export function createArgCoreAdapter({ runtime }) {
  requireRuntime(runtime);

  return {
    execute(request, executor) {
      if (typeof executor !== "function") throw new TypeError("ArgOS execution executor is required");

      return runtime.executeGovernedLifecycle({
        ...normalizeRequest(request),
        executor,
      });
    },
  };
}
