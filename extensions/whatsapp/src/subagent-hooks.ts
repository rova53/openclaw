import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

export function registerWhatsAppSubagentHooks(api: OpenClawPluginApi) {
  api.on("subagent_spawning", (event) => {
    const channel = event.requester?.channel?.trim().toLowerCase();
    if (channel !== "whatsapp") {
      return;
    }
    if (event.threadRequested) {
      return {
        status: "error" as const,
        error: "WhatsApp does not support thread-based subagent sessions. Use mode='run' instead.",
      };
    }
    return { status: "ok" as const };
  });

  api.on("subagent_delivery_target", (event) => {
    if (!event.expectsCompletionMessage) {
      return;
    }
    const requesterChannel = event.requesterOrigin?.channel?.trim().toLowerCase();
    if (requesterChannel !== "whatsapp") {
      return;
    }
    const accountId = event.requesterOrigin?.accountId?.trim();
    const to = event.requesterOrigin?.to?.trim();
    if (!to) {
      return;
    }
    return {
      origin: {
        channel: "whatsapp",
        accountId,
        to,
      },
    };
  });
}
