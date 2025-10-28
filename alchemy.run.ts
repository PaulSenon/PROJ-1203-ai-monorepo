import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env.local" });
config({ path: "./.env" });
config({ path: "./apps/web/.env.local" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env.local" });
config({ path: "./apps/server/.env" });

const app = await alchemy("ai-monorepo");

console.log("CORS_ORIGIN",  process.env.CORS_ORIGIN)

export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	bindings: {
		VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
	},
	dev: {
		command: "pnpm run dev",
	},
});

export const server = await Worker("server", {
	cwd: "apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	placement: {
		mode: 'smart',
	},
	bindings: {
		CORS_ORIGIN: process.env.CORS_ORIGIN || "",
		GOOGLE_GENERATIVE_AI_API_KEY: alchemy.secret(
			process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		),
	},
	dev: {
		port: 3000,
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
