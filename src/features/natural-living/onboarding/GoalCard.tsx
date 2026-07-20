/**
 * GoalCard
 * --------
 * Reusable card for a Natural Living goal.
 * Renders icon, title, subtitle, description, category, popular badge,
 * and a selected state. Selection is controlled by the parent.
 */
import { Check, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export interface GoalCardData {
  id: string;
  code: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category: string;
  icon?: string | null;
  popular?: boolean;
}

function toIconName(icon?: string | null) {
  if (!icon) return "Sprout";
  return icon
    .split(/[-_ ]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function IconFor({ name }: { name?: string | null }) {
  const key = toIconName(name);
  const Cmp = (Icons as any)[key] || Icons.Sprout;
  return <Cmp className="h-5 w-5" aria-hidden="true" />;
}

export default function GoalCard({
  goal,
  selected,
  disabled,
  onToggle,
}: {
  goal: GoalCardData;
  selected: boolean;
  disabled?: boolean;
  onToggle: (goal: GoalCardData) => void;
}) {
  const inert = disabled && !selected;
  return (
    <button
      type="button"
      onClick={() => !inert && onToggle(goal)}
      aria-pressed={selected}
      aria-disabled={inert}
      className={cn(
        "group relative text-left w-full h-full rounded-2xl border p-5 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        selected
          ? "border-[hsl(var(--nl-forest))] shadow-[0_10px_30px_-15px_hsl(var(--nl-forest)/0.5)]"
          : "border-[hsl(var(--nl-forest)/0.18)] hover:border-[hsl(var(--nl-forest)/0.5)] hover:-translate-y-[2px]",
        inert && "opacity-50 cursor-not-allowed hover:translate-y-0",
      )}
      style={{
        background: selected ? "hsl(var(--nl-forest)/0.06)" : "hsl(var(--nl-cream))",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="flex items-center justify-center h-10 w-10 rounded-xl"
          style={{
            background: selected ? "hsl(var(--nl-forest))" : "hsl(var(--nl-forest)/0.1)",
            color: selected ? "hsl(var(--nl-cream))" : "hsl(var(--nl-forest))",
          }}
        >
          <IconFor name={goal.icon} />
        </div>
        <div className="flex items-center gap-2">
          {goal.popular && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[hsl(var(--nl-forest)/0.1)] text-[hsl(var(--nl-forest))]">
              <Sparkles className="h-3 w-3" /> Popular
            </span>
          )}
          <div
            className={cn(
              "h-6 w-6 rounded-full border flex items-center justify-center transition-colors",
              selected
                ? "bg-[hsl(var(--nl-forest))] border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-cream))]"
                : "border-[hsl(var(--nl-forest)/0.3)] text-transparent",
            )}
            aria-hidden="true"
          >
            <Check className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--nl-ink)/0.55)] mb-1">
        {goal.category}
      </div>
      <h3 className="nl-serif text-lg md:text-xl leading-snug text-[hsl(var(--nl-ink))]">
        {goal.title}
      </h3>
      {goal.subtitle && (
        <div className="text-sm text-[hsl(var(--nl-forest))] mt-0.5">{goal.subtitle}</div>
      )}
      {goal.description && (
        <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.7)] leading-relaxed">
          {goal.description}
        </p>
      )}
    </button>
  );
}
