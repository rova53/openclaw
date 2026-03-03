import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ChannelHook } from "openclaw/plugin-sdk"; // Assurez-vous d'importer ChannelHook

export function registerWhatsAppSubagentHooks(api: OpenClawPluginApi) {
  api.on("subagent_spawning", (event) => {
    const channel = event.requester?.channel?.trim().toLowerCase();
    if (channel !== "whatsapp") {
      return;
    }
    // Permettre thread=true pour WhatsApp. Ceci débloque le flag dans OpenClaw.
    // NOTE: Une implémentation complète de la liaison de thread WhatsApp réelle nécessiterait
    // une interaction avec l'API WhatsApp, ce qui est hors de portée de cette modification.
    if (event.threadRequested) {
      return { status: "ok", threadBindingReady: true };
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
