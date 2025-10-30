import { protectedProcedures, publicProcedures } from "../libs/orpc";

export const protectedRouter = {
  greeting: protectedProcedures.greeting.handler((ctx) => ({
    text: `Hello from private route ${ctx.context.auth.userId}`,
  })),
};

export const publicRouter = {
  greeting: publicProcedures.greeting.handler(() => ({
    text: "Hello from public endpoint",
  })),
};
