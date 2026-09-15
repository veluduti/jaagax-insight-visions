import avatar1 from "@/assets/agent-avatars/avatar-1.jpg";
import avatar2 from "@/assets/agent-avatars/avatar-2.jpg";
import avatar3 from "@/assets/agent-avatars/avatar-3.jpg";
import avatar4 from "@/assets/agent-avatars/avatar-4.jpg";
import avatar5 from "@/assets/agent-avatars/avatar-5.jpg";
import avatar6 from "@/assets/agent-avatars/avatar-6.jpg";

/**
 * Official JAAGAX agent photo templates.
 * Agents cannot upload personal photos — they must pick one of these.
 */
export const AGENT_AVATAR_TEMPLATES = [
  { id: "avatar-1", label: "Template 1", url: avatar1 },
  { id: "avatar-2", label: "Template 2", url: avatar2 },
  { id: "avatar-3", label: "Template 3", url: avatar3 },
  { id: "avatar-4", label: "Template 4", url: avatar4 },
  { id: "avatar-5", label: "Template 5", url: avatar5 },
  { id: "avatar-6", label: "Template 6", url: avatar6 },
] as const;

export const AGENT_AVATAR_TEMPLATE_URLS: string[] = AGENT_AVATAR_TEMPLATES.map((t) => t.url);

export const isAgentAvatarTemplate = (url?: string | null) =>
  !!url && AGENT_AVATAR_TEMPLATE_URLS.some((t) => url.includes(t) || t.includes(url));
