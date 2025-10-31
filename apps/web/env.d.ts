// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

import type { web } from "../../alchemy.run";

export type CloudflareEnv = typeof web.Env;

declare global {
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  // biome-ignore lint/style/noNamespace: cloudflare
  namespace Cloudflare {
    // biome-ignore lint/nursery/noShadow: cloudflare
    export interface Env extends CloudflareEnv {}
  }
}
