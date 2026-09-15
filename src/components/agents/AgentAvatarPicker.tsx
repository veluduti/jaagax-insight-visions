import { Check } from "lucide-react";
import { AGENT_AVATAR_TEMPLATES } from "./agentAvatarTemplates";
import { cn } from "@/lib/utils";

interface AgentAvatarPickerProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
}

/**
 * JAAGAX template picker — agents choose an official avatar instead of
 * uploading a personal photo.
 */
export default function AgentAvatarPicker({ value, onChange }: AgentAvatarPickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {AGENT_AVATAR_TEMPLATES.map((t) => {
          const selected = !!value && (value === t.url || value.includes(t.url) || t.url.includes(value));
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.url)}
              className={cn(
                "relative rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50",
              )}
              aria-label={t.label}
            >
              <img src={t.url} alt={t.label} loading="lazy" width={512} height={512} className="w-full aspect-square object-cover" />
              {selected && (
                <span className="absolute top-1.5 right-1.5 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Personal photo uploads are disabled. Pick an official JAAGAX template — customers identify you by your Agent Code.
      </p>
    </div>
  );
}
