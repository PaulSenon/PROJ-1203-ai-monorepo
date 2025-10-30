import { oc } from "@orpc/contract";
import z from "zod";

export const greetingPublic = {
  greeting: oc
    .input(z.object().optional())
    .output(z.object({ text: z.string() })),
} as const;

export const greetingPrivate = {
  greeting: oc
    .input(z.object().optional())
    .output(z.object({ text: z.string() })),
} as const;

export const exampleContract = oc.router({
  public: greetingPublic,
  private: greetingPrivate,
});

export type ExampleContract = typeof exampleContract;
