import { oc } from "@orpc/contract";
import z from "zod";

export const demoContract = oc.router({
  public: oc.router({
    ping: oc
      .route({
        method: "GET",
        path: "/demo/ping",
        summary: "Public ping endpoint",
        tags: ["Demo"],
      })
      .input(z.object({ message: z.string().optional() }))
      .output(z.object({ message: z.string() })),
  }),
  private: oc.router({
    ping: oc
      .route({
        method: "GET",
        path: "/demo/private-ping",
        summary: "Private ping endpoint (requires auth)",
        tags: ["Demo"],
      })
      .input(z.object({ message: z.string().optional() }))
      .output(z.object({ message: z.string(), userId: z.string() })),
  }),
});

export type DemoContract = typeof demoContract;
