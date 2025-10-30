import { env } from "cloudflare:workers";
import { protectedRouter, publicRouter } from "@ai-monorepo/api/routers/index";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();
app.use(logger());
app.use(
  "/*",
  clerkMiddleware({
    jwtKey: env.CLERK_JWT_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  })
);
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

export const apiHandler = new OpenAPIHandler(publicRouter, {
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

export const rpcHandlerPublic = new RPCHandler(publicRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
export const rpcHandlerProtected = new RPCHandler(protectedRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/api-reference/*", async (ctx, next) => {
  const apiResult = await apiHandler.handle(ctx.req.raw, {
    prefix: "/api-reference",
    context: {},
  });

  if (apiResult.matched) {
    return ctx.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.use("/rpc/public/*", async (ctx, next) => {
  const rpcResultPublic = await rpcHandlerPublic.handle(ctx.req.raw, {
    prefix: "/rpc/public",
    context: {},
  });
  if (rpcResultPublic.matched) {
    return ctx.newResponse(
      rpcResultPublic.response.body,
      rpcResultPublic.response
    );
  }

  await next();
});

app.use("/rpc/private/*", async (ctx, next) => {
  const auth = getAuth(ctx);
  const rpcResultProtected = await rpcHandlerProtected.handle(ctx.req.raw, {
    prefix: "/rpc/private",
    context: {
      auth,
    },
  });
  if (rpcResultProtected.matched) {
    return ctx.newResponse(
      rpcResultProtected.response.body,
      rpcResultProtected.response
    );
  }

  await next();
});

app.post("/ai", async (c) => {
  const body = await c.req.json();
  const uiMessages = body.messages || [];
  const google = createGoogleGenerativeAI({
    apiKey: "",
  });
  const result = streamText({
    model: google("gemini-2.5-flash"),
    messages: convertToModelMessages(uiMessages),
  });

  return result.toUIMessageStreamResponse();
});

app.get("/", (c) => c.text("OK"));

export default app;
