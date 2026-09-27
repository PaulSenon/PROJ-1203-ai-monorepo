import { protectedProcedures, publicProcedures } from "../orpc.js";

export const demoPublicPing = publicProcedures.demo.public.ping.handler(
  async ({ input }) => ({
    message: input.message ?? "pong",
  })
);

export const demoPrivatePing = protectedProcedures.demo.private.ping.handler(
  async ({ input }) => ({
    message: input.message ?? "pong",
    userId: "authenticated-user",
  })
);
