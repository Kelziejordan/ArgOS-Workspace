import { executeGovernedLifecycle } from "@arg/argcore";

export function createArgCoreRuntime() {
  return Object.freeze({ executeGovernedLifecycle });
}
