import alchemy from "alchemy";
import { Vite, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

const isProd = process.env.NODE_ENV === "production";
console.log("MODE", isProd ? "PRODUCTION" : "DEVELOPMENT");

if (isProd) {
  config({ path: "./.env.local" });
  config({ path: "./apps/web/.env.local" });
  config({ path: "./apps/server/.env.local" });
} else {
  config({ path: "./apps/web/.env.development.local" });
  config({ path: "./apps/server/.env.development.local" });
  config({ path: "./apps/web/.env.development" });
  config({ path: "./apps/server/.env.development" });
}
config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

if (!isProd) {
  console.log(process.env.VITE_SERVER_URL);
}

const app = await alchemy("ai-monorepo");

export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
  },
  dev: {
    command: "pnpm run dev",
  },
  bundle: {
    sourcemap: "both",
  },
});

export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  placement: {
    mode: "smart",
  },
  bindings: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || "",
    CLERK_SECRET_KEY: alchemy.secret(process.env.CLERK_SECRET_KEY),
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || "",
    CLERK_JWT_KEY: process.env.CLERK_JWT_KEY || "",
  },
  dev: {
    port: 3000,
  },
  bundle: {
    sourcemap: "both",
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
