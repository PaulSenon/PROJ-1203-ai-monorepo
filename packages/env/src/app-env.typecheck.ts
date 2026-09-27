import type { StandardSchemaV1 } from "@t3-oss/env-core";
import { defineAppEnvContract } from "./app-env";

const stringSchema = {
  "~standard": {
    version: 1,
    vendor: "typecheck",
    validate: (value: unknown) => {
      if (typeof value !== "string") {
        return {
          issues: [{ message: "expected string" }],
        };
      }

      return { value };
    },
  },
} satisfies StandardSchemaV1<string, string>;

defineAppEnvContract({
  publicPrefix: "VITE_",
  private: {
    SERVER_ONLY: stringSchema,
  },
  public: {
    VITE_PUBLIC_OK: stringSchema,
  },
});

// @ts-expect-error private keys cannot start with configured public prefix
defineAppEnvContract({
  publicPrefix: "VITE_",
  private: {
    VITE_PRIVATE_BAD: stringSchema,
  },
});

// @ts-expect-error public keys must start with configured public prefix
defineAppEnvContract({
  publicPrefix: "VITE_",
  private: {},
  public: {
    PUBLIC_BAD: stringSchema,
  },
});

const dynamicPrefix: string = "VITE_";

defineAppEnvContract({
  // @ts-expect-error prefix must be literal
  publicPrefix: dynamicPrefix,
  private: {},
  public: {},
});
