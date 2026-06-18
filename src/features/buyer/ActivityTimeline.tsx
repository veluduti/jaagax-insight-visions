import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock, Search, Calendar, Home, Wallet, FileText, Heart, Filter, Eye, Sparkles, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActivity, type ActivityType } from "@/hooks/useActivity";

const TYPE_ICONS: Record<string, any> = {
  search: Search, visit: Calendar, posting: Home, wallet: Wallet,
  enquiry: FileText, favorite: Heart, view: Eye,
};
const TYPE_LABEL: Record<string, string> = {
  search: "Search", visit: "Visit", posting: "Posting", wallet: "Wallet",
  enquiry: "Enquiry", favorite: "Favorite", view: "View",
};

export function ActivityTimeline() {
  const { activities, isLoading, hasMore, insights, filters, applyFilters, loadMore } = useActivity();
  const [type, setType] = useState<ActivityType | "all">("all");
  const [range, setRange] = useState<"today" | "week" | "month" | "year" | "all">("all");

  useEffect(() => { applyFilters({ type, range }); /* eslint-disable-next-line */ }, [type, range]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2"><Clock className="h-6 w-6" /> Activity Timeline</h2>
        <p className="text-sm text-muted-foreground">Your complete activity history used for AI recommendations.</p>
      </div>

      {/* AI insights */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" /> AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights ? (
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {insights.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Analyzing your activity…</p>}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="search">Searches</SelectItem>
              <SelectItem value="visit">Visits</SelectItem>
              <SelectItem value="posting">Postings</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="enquiry">Enquiries</SelectItem>
              <SelectItem value="favorite">Favorites</SelectItem>
              <SelectItem value="view">Views</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          {isLoading && activities.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" /> Loading activity…
            </div>
          ) : activities.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No activity yet. Start exploring properties.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <ul className="divide-y">
                {activities.map((a) => {
                  const Icon = TYPE_ICONS[a.activity_type] || Clock;
                  return (
                    <li key={a.id} className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-md bg-muted shrink-0"><Icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{TYPE_LABEL[a.activity_type]}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{a.description}</p>
                        {a.metadata && Object.keys(a.metadata).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.entries(a.metadata).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <div className="p-4 border-t text-center">
                  <Button variant="outline" size="sm" onClick={loadMore}>Load more</Button>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ActivityTimeline;
