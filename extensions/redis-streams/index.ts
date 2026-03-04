import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { RedisStreamsConfigSchema } from "./src/config.js";
import { createRedisPublishTool, createRedisSubscribeTool } from "./src/tools.js";

const plugin = {
  id: "redis-streams",
  name: "Redis Streams",
  description: "OpenClaw plugin for Redis Streams integration.",
  configSchema: RedisStreamsConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = api.getPluginConfig("redis-streams");

    api.registerTool(createRedisPublishTool(api, config));
    api.registerTool(createRedisSubscribeTool(api, config));

    api.on("shutdown", () => {
      // Potential cleanup for Redis client if needed, though ioredis handles reconnection.
    });
  },
};

export default plugin;
