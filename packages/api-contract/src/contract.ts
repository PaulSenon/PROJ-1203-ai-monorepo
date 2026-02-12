import { oc } from "@orpc/contract";
import { chatProcedureContract } from "./contract/chat.js";
import { demoContract } from "./contract/demo.js";

export const contract = oc.router({
  chat: chatProcedureContract,
  demo: demoContract,
});

export type AppContract = typeof contract;

export type { ChatProcedureContract } from "./contract/chat.js";
export type { DemoContract } from "./contract/demo.js";
