import { type ApiConfig, router } from "@ai-monorepo/api-service/service";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";

const app = new Hono();
app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.PUBLIC_CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// Create API config from environment
const apiConfig: ApiConfig = {
  clerk: {
    jwtKey: env.PUBLIC_CLERK_JWT_KEY,
    publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  },
  convex: {
    url: env.PUBLIC_CONVEX_URL,
  },
  ai: {
    googleApiKey: env.GOOGLE_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
  },
};

// Main RPC handler for all routes
export const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/rpc/*", async (ctx, next) => {
  const result = await rpcHandler.handle(ctx.req.raw, {
    prefix: "/rpc",
    context: {
      config: apiConfig,
      request: ctx.req.raw.clone(),
    },
  });
  if (result.matched) {
    return ctx.newResponse(result.response.body, result.response);
  }

  await next();
});

// OpenAPI handler for documentation
export const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/api-reference/*", async (ctx, next) => {
  const apiResult = await apiHandler.handle(ctx.req.raw, {
    prefix: "/api-reference",
    context: {
      config: apiConfig,
      request: ctx.req.raw.clone(),
    },
  });

  if (apiResult.matched) {
    return ctx.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

// Demo routes - public
export const rpcHandlerDemoPublic = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/rpc/demo/public/*", async (ctx, next) => {
  const result = await rpcHandlerDemoPublic.handle(ctx.req.raw, {
    prefix: "/rpc/demo/public",
    context: {
      config: apiConfig,
      request: ctx.req.raw.clone(),
    },
  });
  if (result.matched) {
    return ctx.newResponse(result.response.body, result.response);
  }

  await next();
});

// Demo routes - private (requires auth)
export const rpcHandlerDemoPrivate = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/rpc/demo/private/*", async (ctx, next) => {
  const result = await rpcHandlerDemoPrivate.handle(ctx.req.raw, {
    prefix: "/rpc/demo/private",
    context: {
      config: apiConfig,
      request: ctx.req.raw.clone(),
    },
  });
  if (result.matched) {
    return ctx.newResponse(result.response.body, result.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

export default app;
