import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import { BadgeDefinition, BuilderMetrics } from "@/services/badgeService";

interface BadgeDisplayProps {
  current: BadgeDefinition | null;
  next: BadgeDefinition | null;
  progress: number;
  metrics: BuilderMetrics;
}

const getIcon = (name?: string | null) => {
  const I = (Icons as any)[name || "Shield"] ?? Icons.Shield;
  return I;
};

export default function BadgeDisplay({ current, next, progress, metrics }: BadgeDisplayProps) {
  if (!current) return null;
  const CurrentIcon = getIcon(current.icon);
  const NextIcon = next ? getIcon(next.icon) : null;

  const check = (val: number, min: number) => val >= min;

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${current.color}20`, color: current.color || undefined }}
          >
            <CurrentIcon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-semibold text-foreground">{current.name}</h3>
              <Badge variant="secondary">Tier {current.tier}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
            <div className="mt-3 text-sm">
              Trust score: <span className="font-semibold">{progress}%</span>
            </div>
          </div>
        </div>

        {next && NextIcon && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to next badge</span>
              <span className="flex items-center gap-2 font-medium" style={{ color: next.color || undefined }}>
                <NextIcon className="h-4 w-4" /> {next.name}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Properties listed</span>
                <span className={check(metrics.properties, next.min_properties) ? "text-emerald-600 font-medium" : ""}>
                  {metrics.properties} / {next.min_properties}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Reviews received</span>
                <span className={check(metrics.reviews, next.min_reviews) ? "text-emerald-600 font-medium" : ""}>
                  {metrics.reviews} / {next.min_reviews}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Average rating</span>
                <span className={check(metrics.avg_rating, next.min_rating) ? "text-emerald-600 font-medium" : ""}>
                  {metrics.avg_rating.toFixed(2)} / {next.min_rating.toFixed(2)}
                </span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
