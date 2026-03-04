import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { z } from "zod";
import { getChildLogger } from "../../logging/logger.js";
import { RedisStreamsConfig } from "./config.js";
import { getRedisClient } from "./redisClient.js";

const toolLogger = getChildLogger({ module: "redis-streams-tools" });

const RedisPublishParamsSchema = z.object({
  streamName: z.string().min(1),
  message: z.record(z.string(), z.string()),
});

const RedisSubscribeParamsSchema = z.object({
  streamName: z.string().min(1),
  consumerGroup: z.string().min(1),
  consumerName: z.string().min(1),
  blockMs: z.number().int().min(0).default(5000),
  count: z.number().int().min(1).default(10),
});

export function createRedisPublishTool(
  api: OpenClawPluginApi,
  config: RedisStreamsConfig,
): AnyAgentTool {
  return {
    name: "redis_publish",
    description: "Publishes a message to a Redis Stream.",
    parameters: RedisPublishParamsSchema,
    execute: async (toolCallId, params) => {
      const redis = getRedisClient(config);
      try {
        const id = await redis.xadd(
          params.streamName,
          "*",
          ...Object.entries(params.message).flat(),
        );
        toolLogger.info(
          { stream: params.streamName, id, message: params.message },
          "Redis message published",
        );
        return { status: "ok", output: { id, stream: params.streamName } };
      } catch (error) {
        toolLogger.error(
          { error, stream: params.streamName, message: params.message },
          "Failed to publish Redis message",
        );
        return { status: "error", error: String(error) };
      }
    },
  };
}

export function createRedisSubscribeTool(
  api: OpenClawPluginApi,
  config: RedisStreamsConfig,
): AnyAgentTool {
  return {
    name: "redis_subscribe",
    description: "Subscribes and consumes messages from a Redis Stream using a consumer group.",
    parameters: RedisSubscribeParamsSchema,
    execute: async (toolCallId, params) => {
      const redis = getRedisClient(config);
      try {
        await redis.xgroup("CREATE", params.streamName, params.consumerGroup, "$", "MKSTREAM");
      } catch (error: any) {
        if (error.message.includes("BUSYGROUP")) {
          toolLogger.debug(
            { group: params.consumerGroup, stream: params.streamName },
            "Consumer group already exists.",
          );
        } else {
          toolLogger.error(
            { error, group: params.consumerGroup, stream: params.streamName },
            "Failed to create consumer group.",
          );
          return { status: "error", error: String(error) };
        }
      }

      try {
        const result = await redis.xreadgroup(
          "GROUP",
          params.consumerGroup,
          params.consumerName,
          "BLOCK",
          params.blockMs,
          "COUNT",
          params.count,
          "STREAMS",
          params.streamName,
          ">", // Read new messages in the group
        );

        const messages = result
          ? result[0][1].map(([id, data]) => ({ id, data: Object.fromEntries(data) }))
          : [];
        toolLogger.info(
          {
            stream: params.streamName,
            group: params.consumerGroup,
            messagesCount: messages.length,
          },
          "Redis messages consumed",
        );

        return { status: "ok", output: { stream: params.streamName, messages } };
      } catch (error) {
        toolLogger.error(
          { error, stream: params.streamName, group: params.consumerGroup },
          "Failed to consume Redis messages",
        );
        return { status: "error", error: String(error) };
      }
    },
  };
}
