import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const cleanupWorkpool = new Workpool(components.cleanupWorkpool, {
  maxParallelism: 1, // keep cleanup low-priority
});
