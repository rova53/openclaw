import { buildPluginConfigSchema } from "openclaw/plugin-sdk";
import { z } from "zod";

export const RedisStreamsConfigSchema = buildPluginConfigSchema({
  host: z.string().trim().min(1).default("127.0.0.1"),
  port: z.number().int().min(1).max(65535).default(6379),
  password: z.string().trim().optional(),
});

export type RedisStreamsConfig = z.infer<typeof RedisStreamsConfigSchema>;
