import Redis from "ioredis";
import type { RuntimeLogger } from "openclaw/plugin-sdk";
import type { RedisStreamsConfig } from "./config.js";

let redisClient: Redis | null = null;

export function getRedisClient(config: RedisStreamsConfig, logger: RuntimeLogger): Redis {
  if (!redisClient) {
    logger.info("Initializing Redis client...");
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Client Error", { err });
    });

    redisClient.on("connect", () => {
      logger.info("Redis Client Connected");
    });

    redisClient.on("ready", () => {
      logger.info("Redis Client Ready");
    });

    redisClient.on("end", () => {
      logger.info("Redis Client Disconnected");
      redisClient = null;
    });
  }
  return redisClient;
}

export async function closeRedisClient(logger: RuntimeLogger): Promise<void> {
  if (redisClient) {
    logger.info("Closing Redis client...");
    await redisClient.quit();
    redisClient = null;
  }
}
