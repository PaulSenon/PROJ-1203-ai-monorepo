import { os } from "./orpc.js";
import { chat } from "./routers/chat.js";
import { demoPrivatePing, demoPublicPing } from "./routers/demo.js";

// Export the router with all procedures
export const router = os.router({
  chat,
  demo: {
    public: {
      ping: demoPublicPing,
    },
    private: {
      ping: demoPrivatePing,
    },
  },
});

export type { ApiConfig, ServiceContext } from "./config.js";
