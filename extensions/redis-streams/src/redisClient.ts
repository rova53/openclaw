import Redis from "ioredis";
import { getChildLogger } from "../../logging/logger.js";
import { RedisStreamsConfig } from "./config.js";

const pluginLogger = getChildLogger({ module: "redis-streams" });

let redisClient: Redis | null = null;

export function getRedisClient(config: RedisStreamsConfig): Redis {
  if (!redisClient) {
    pluginLogger.info("Initializing Redis client...");
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
    });

    redisClient.on("error", (err) => {
      pluginLogger.error({ err }, "Redis Client Error");
    });

    redisClient.on("connect", () => {
      pluginLogger.info("Redis Client Connected");
    });

    redisClient.on("ready", () => {
      pluginLogger.info("Redis Client Ready");
    });

    redisClient.on("end", () => {
      pluginLogger.info("Redis Client Disconnected");
      redisClient = null; // Clear client on disconnect
    });
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    pluginLogger.info("Closing Redis client...");
    await redisClient.quit();
    redisClient = null;
  }
}
