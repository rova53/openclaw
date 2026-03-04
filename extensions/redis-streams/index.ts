import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { RedisStreamsConfigSchema } from "./src/config.js";
import { closeRedisClient } from "./src/redisClient.js";
import { createRedisPublishTool, createRedisSubscribeTool } from "./src/tools.js";

const plugin = {
  id: "redis-streams",
  name: "Redis Streams",
  description: "OpenClaw plugin for Redis Streams integration.",
  configSchema: RedisStreamsConfigSchema,
  register(api: OpenClawPluginApi) {
    const logger = api.runtime.logging.getChildLogger({ module: "redis-streams" });
    const config = api.getPluginConfig("redis-streams");

    api.registerTool(createRedisPublishTool(api, config, logger));
    api.registerTool(createRedisSubscribeTool(api, config, logger));

    api.on("shutdown", async () => {
      await closeRedisClient(logger);
    });
  },
};

export default plugin;
