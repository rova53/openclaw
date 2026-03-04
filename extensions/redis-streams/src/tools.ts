import { Type } from "@sinclair/typebox";
import type { AnyAgentTool, OpenClawPluginApi, RuntimeLogger } from "openclaw/plugin-sdk";
import type { RedisStreamsConfig } from "./config.js";
import { getRedisClient } from "./redisClient.js";

const RedisPublishParamsSchema = Type.Object({
  streamName: Type.String({ description: "Name of the Redis stream" }),
  message: Type.Record(Type.String(), Type.String(), {
    description: "Key-value pairs to publish (string keys and values)",
  }),
});

const RedisSubscribeParamsSchema = Type.Object({
  streamName: Type.String({ description: "Name of the Redis stream" }),
  consumerGroup: Type.String({ description: "Consumer group name" }),
  consumerName: Type.String({ description: "Consumer name within the group" }),
  blockMs: Type.Optional(
    Type.Number({
      description: "Block timeout in milliseconds (default 5000)",
      minimum: 0,
      default: 5000,
    }),
  ),
  count: Type.Optional(
    Type.Number({
      description: "Max messages to read per call (default 10)",
      minimum: 1,
      default: 10,
    }),
  ),
});

export function createRedisPublishTool(
  api: OpenClawPluginApi,
  config: RedisStreamsConfig,
  logger: RuntimeLogger,
): AnyAgentTool {
  return {
    name: "redis_publish",
    description: "Publishes a message to a Redis Stream.",
    parameters: RedisPublishParamsSchema,
    execute: async (toolCallId, params) => {
      const redis = getRedisClient(config, logger);
      try {
        const id = await redis.xadd(
          params.streamName,
          "*",
          ...Object.entries(params.message).flat(),
        );
        logger.info("Redis message published", {
          stream: params.streamName,
          id,
          message: params.message,
        });
        return { status: "ok", output: { id, stream: params.streamName } };
      } catch (error) {
        logger.error("Failed to publish Redis message", {
          error,
          stream: params.streamName,
          message: params.message,
        });
        return { status: "error", error: String(error) };
      }
    },
  };
}

export function createRedisSubscribeTool(
  api: OpenClawPluginApi,
  config: RedisStreamsConfig,
  logger: RuntimeLogger,
): AnyAgentTool {
  return {
    name: "redis_subscribe",
    description: "Subscribes and consumes messages from a Redis Stream using a consumer group.",
    parameters: RedisSubscribeParamsSchema,
    execute: async (toolCallId, params) => {
      const redis = getRedisClient(config, logger);
      const blockMs = params.blockMs ?? 5000;
      const count = params.count ?? 10;
      try {
        await redis.xgroup("CREATE", params.streamName, params.consumerGroup, "$", "MKSTREAM");
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("BUSYGROUP")) {
          logger.debug?.("Consumer group already exists.", {
            group: params.consumerGroup,
            stream: params.streamName,
          });
        } else {
          logger.error("Failed to create consumer group.", {
            error,
            group: params.consumerGroup,
            stream: params.streamName,
          });
          return { status: "error", error: String(error) };
        }
      }

      try {
        const result = await redis.xreadgroup(
          "GROUP",
          params.consumerGroup,
          params.consumerName,
          "BLOCK",
          blockMs,
          "COUNT",
          count,
          "STREAMS",
          params.streamName,
          ">",
        );

        const messages = result
          ? result[0][1].map(([id, data]) => ({ id, data: Object.fromEntries(data) }))
          : [];
        logger.info("Redis messages consumed", {
          stream: params.streamName,
          group: params.consumerGroup,
          messagesCount: messages.length,
        });

        return { status: "ok", output: { stream: params.streamName, messages } };
      } catch (error) {
        logger.error("Failed to consume Redis messages", {
          error,
          stream: params.streamName,
          group: params.consumerGroup,
        });
        return { status: "error", error: String(error) };
      }
    },
  };
}
