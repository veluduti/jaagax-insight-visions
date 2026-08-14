import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown, User, Globe2, Map, MapPin, UserCheck, Cpu, Timer, Lock, Unlock, XCircle,
  Database, Bell, CheckCircle2, ArrowRight, Archive, GitBranch,
} from "lucide-react";

/* ── BPMN primitives ─────────────────────────────────────────────── */

type Tone = "start" | "task" | "decision" | "timer" | "system" | "end" | "reject";

const TONE: Record<Tone, string> = {
  start: "bg-primary/15 border-primary/40 text-foreground",
  task: "bg-card border-border text-foreground",
  decision: "bg-amber-500/10 border-amber-500/50 text-foreground",
  timer: "bg-sky-500/10 border-sky-500/50 text-foreground",
  system: "bg-violet-500/10 border-violet-500/50 text-foreground",
  end: "bg-emerald-500/15 border-emerald-500/50 text-foreground",
  reject: "bg-destructive/10 border-destructive/50 text-foreground",
};

function Node({
  label, tone = "task", icon: Icon, note,
}: { label: string; tone?: Tone; icon?: React.ElementType; note?: string }) {
  return (
    <div className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm ${TONE[tone]} ${tone === "decision" ? "rotate-0 rounded-md" : ""}`}>
      <span className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 opacity-80" /> : null}
        {tone === "decision" ? <GitBranch className="h-3.5 w-3.5 opacity-80" /> : null}
        {label}
      </span>
      {note ? <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{note}</span> : null}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <span className="flex shrink-0 flex-col items-center px-1 text-muted-foreground">
      <ArrowRight className="h-4 w-4" />
      {label ? <span className="text-[9px] uppercase tracking-wide">{label}</span> : null}
    </span>
  );
}

function Lane({
  title, icon: Icon, accent, children,
}: { title: string; icon: React.ElementType; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-max border-b border-border last:border-b-0">
      <div className={`sticky left-0 z-10 flex w-44 shrink-0 items-center gap-2 border-r border-border px-4 py-4 ${accent}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold leading-tight">{title}</span>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-y-3 px-4 py-4">{children}</div>
    </div>
  );
}

function Phase({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40 py-3">
        <CardTitle className="text-sm font-semibold">
          {title}
          {subtitle ? <span className="ml-2 text-xs font-normal text-muted-foreground">{subtitle}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

const LANE = {
  super: "bg-primary/10 text-primary",
  customer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  country: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  state: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  district: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  agent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  system: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const STATUS_FLOW = [
  "DRAFT", "SUBMITTED", "COUNTRY_QUEUE", "COUNTRY_HOLD", "COUNTRY_VERIFIED",
  "STATE_QUEUE", "STATE_HOLD", "STATE_VERIFIED",
  "DISTRICT_QUEUE", "DISTRICT_HOLD", "DISTRICT_VERIFIED",
  "OWNER_REVIEW", "AGENT_ASSIGNED", "LIVE", "SOLD", "CLOSED",
];

/* ── Page ────────────────────────────────────────────────────────── */

export default function WorkflowDiagram() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8">
      <Helmet>
        <title>JAAGAX Property Verification Workflow | BPMN Diagram</title>
        <meta name="description" content="Enterprise BPMN swimlane diagram of the JAAGAX property verification, hold, escalation and agent assignment engine." />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">JAAGAX Property Verification Engine</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          BPMN swimlane view of the Country → State → District escalation engine: parallel admin timers, first-hold-wins
          locking, visit scheduling, owner approval, agent assignment and automated publishing.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="gap-1"><Timer className="h-3 w-3" />Timer event</Badge>
          <Badge variant="outline" className="gap-1"><GitBranch className="h-3 w-3" />Gateway</Badge>
          <Badge variant="outline" className="gap-1"><Cpu className="h-3 w-3" />System automation</Badge>
          <Badge variant="outline" className="gap-1"><Bell className="h-3 w-3" />Notification</Badge>
          <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" />Data store</Badge>
        </div>
      </header>

      <Phase title="Phase 0 — Governance & configuration" subtitle="Super admin sets the rules of the engine">
        <Lane title="JAAGAX Super Admin" icon={Crown} accent={LANE.super}>
          <Node label="Create Country Admin" icon={Globe2} tone="start" />
          <Arrow />
          <Node label="Create State Admin" icon={Map} tone="start" />
          <Arrow />
          <Node label="Create District Admin" icon={MapPin} tone="start" />
          <Arrow />
          <Node label="Response timers" icon={Timer} note="Country / State / District — default 30 min" />
          <Arrow />
          <Node label="Hold duration" icon={Lock} note="Agent flow vs no-agent flow" />
          <Arrow />
          <Node label="Visit window" icon={Timer} note="Default 2 days" />
          <Arrow />
          <Node label="Notification templates" icon={Bell} />
        </Lane>
        <Lane title="System (Automation)" icon={Cpu} accent={LANE.system}>
          <Node label="workflow_settings" icon={Database} tone="system" note="Single source of truth for all rules" />
          <Arrow />
          <Node label="admin_scopes" icon={Database} tone="system" note="Country / State / District ownership" />
          <Arrow />
          <Node label="Location master" icon={Database} tone="system" note="Country → State → District → City → Locality" />
        </Lane>
      </Phase>

      <Phase title="Phase 1 — Property posting & routing" subtitle="Customer submits, system routes by location">
        <Lane title="Customer" icon={User} accent={LANE.customer}>
          <Node label="Log in" tone="start" />
          <Arrow />
          <Node label="Post property" />
          <Arrow />
          <Node label="Need a JAAGAX Agent?" tone="decision" note="YES → agent flow · NO → owner-managed flow" />
          <Arrow label="submit" />
          <Node label="Status = SUBMITTED" tone="system" />
        </Lane>
        <Lane title="System (Automation)" icon={Cpu} accent={LANE.system}>
          <Node label="Detect country / state / district" icon={Cpu} tone="system" />
          <Arrow />
          <Node label="Resolve eligible admins" icon={Cpu} tone="system" />
          <Arrow />
          <Node label="Status = PENDING_COUNTRY_REVIEW" tone="system" />
          <Arrow />
          <Node label="Start parallel timers" icon={Timer} tone="timer" note="One countdown per eligible admin" />
          <Arrow />
          <Node label="Notify all Country Admins" icon={Bell} tone="system" />
        </Lane>
      </Phase>

      <Phase title="Phase 2 — Country queue (first HOLD wins)" subtitle="Same logic repeats at State and District level">
        <Lane title="Country Admin" icon={Globe2} accent={LANE.country}>
          <Node label="Admin A · 30:00" icon={Timer} tone="timer" />
          <Node label="Admin B · 30:00" icon={Timer} tone="timer" />
          <Node label="Admin C · 30:00" icon={Timer} tone="timer" />
          <Arrow />
          <Node label="HOLD / RELEASE / REJECT" tone="decision" />
          <Arrow label="hold" />
          <Node label="HOLD wins" icon={Lock} />
          <Arrow />
          <Node label="Schedule visit" note="Within visit window" />
          <Arrow />
          <Node label="Visit & update fields" note="Images, video, documents, price, survey no., amenities" />
          <Arrow />
          <Node label="Submit verification to owner" icon={CheckCircle2} />
        </Lane>
        <Lane title="System (Automation)" icon={Cpu} accent={LANE.system}>
          <Node label="Lock property" icon={Lock} tone="system" />
          <Arrow />
          <Node label="Pause all other timers" icon={Timer} tone="timer" />
          <Arrow />
          <Node label='Show "Assigned to another admin"' icon={Bell} tone="system" />
          <Arrow />
          <Node label="Notify owner: under review" icon={Bell} tone="system" />
          <Arrow />
          <Node label="Write audit log" icon={Database} tone="system" note="property_hold_events" />
        </Lane>
        <Lane title="Customer" icon={User} accent={LANE.customer}>
          <Node label="Review admin changes" tone="decision" note="Approve or Reject" />
          <Arrow label="approve" />
          <Node label="Property VERIFIED" tone="end" icon={CheckCircle2} />
          <Arrow label="reject" />
          <Node label="Back to holding admin" tone="reject" />
        </Lane>
        <Lane title="Agent" icon={UserCheck} accent={LANE.agent}>
          <Node label="Holding admin becomes Assigned Agent" icon={UserCheck} note="Scenario YES only" />
          <Arrow />
          <Node label="Property LIVE" tone="end" />
          <Arrow />
          <Node label="Buyer calls · visits · negotiation · closing" note="Agent contact replaces owner contact" />
        </Lane>
      </Phase>

      <Phase title="Phase 3 — Release, expiry, rejection & closure">
        <Lane title="Country Admin" icon={Globe2} accent={LANE.country}>
          <Node label="RELEASE" icon={Unlock} tone="task" />
          <Arrow />
          <Node label="Unlock property" tone="system" />
          <Arrow />
          <Node label="Resume remaining timers" icon={Timer} tone="timer" />
          <Arrow />
          <Node label="Next admin may HOLD" />
        </Lane>
        <Lane title="System (Automation)" icon={Cpu} accent={LANE.system}>
          <Node label="Hold expired" icon={Timer} tone="timer" />
          <Arrow />
          <Node label="Auto-release" tone="system" />
          <Arrow />
          <Node label="All timers expired?" tone="decision" />
          <Arrow label="yes" />
          <Node label="Escalate to next level" tone="system" note="Country → State → District" />
        </Lane>
        <Lane title="Country / State / District Admin" icon={MapPin} accent={LANE.district}>
          <Node label="REJECT" icon={XCircle} tone="reject" note="Fake · Duplicate · Invalid documents · Fraud" />
          <Arrow />
          <Node label="Status = REJECTED" tone="reject" />
          <Arrow />
          <Node label="Notify customer · never published" icon={Bell} tone="reject" />
          <Arrow />
          <Node label="Mark property CLOSED" icon={Archive} note="Already sold · Already rented · Owner cancelled" />
          <Arrow />
          <Node label="Removed from every queue & listing" tone="system" />
        </Lane>
      </Phase>

      <Phase title="Phase 4 — Escalation chain" subtitle="Identical hold / visit / verification logic at each level">
        <Lane title="Country Admin" icon={Globe2} accent={LANE.country}>
          <Node label="Country queue" tone="timer" />
          <Arrow label="verified" />
          <Node label="LIVE" tone="end" />
          <Arrow label="no response" />
          <Node label="State queue" tone="system" />
        </Lane>
        <Lane title="State Admin" icon={Map} accent={LANE.state}>
          <Node label="State queue" tone="timer" />
          <Arrow label="hold" />
          <Node label="Visit · verify · owner approval" />
          <Arrow label="verified" />
          <Node label="LIVE" tone="end" />
          <Arrow label="no response" />
          <Node label="District queue" tone="system" />
        </Lane>
        <Lane title="District Admin" icon={MapPin} accent={LANE.district}>
          <Node label="District queue" tone="timer" note="Operational ownership level" />
          <Arrow label="hold" />
          <Node label="Visit · verify · owner approval" />
          <Arrow label="verified" />
          <Node label="Assign agent (Scenario YES)" icon={UserCheck} />
          <Arrow />
          <Node label="LIVE" tone="end" />
        </Lane>
      </Phase>

      <Phase title="Phase 5 — Scenario 2: owner-managed (no agent)">
        <Lane title="Customer" icon={User} accent={LANE.customer}>
          <Node label="Post property · Agent = NO" tone="start" />
          <Arrow />
          <Node label='"JAAGAX is reviewing your property"' icon={Bell} note="Estimated 7–10 days" />
          <Arrow />
          <Node label="Property LIVE" tone="end" />
          <Arrow />
          <Node label="Owner contact stays visible" note="No agent assigned — owner handles buyers" />
        </Lane>
        <Lane title="Country / State / District Admin" icon={Globe2} accent={LANE.country}>
          <Node label="HOLD" icon={Lock} note="Shorter hold limit — default 24h" />
          <Arrow />
          <Node label="Verify property" />
          <Arrow label="release / expire" />
          <Node label="Next admin, then next level" tone="system" />
        </Lane>
      </Phase>

      <Phase title="Phase 6 — System automation & data stores">
        <Lane title="System (Automation)" icon={Cpu} accent={LANE.system}>
          <Node label="Detect location" tone="system" icon={Cpu} />
          <Node label="Assign queue" tone="system" icon={Cpu} />
          <Node label="Start / pause / resume timers" tone="timer" icon={Timer} />
          <Node label="Auto-release expired holds" tone="system" icon={Unlock} />
          <Node label="Escalate C → S → D" tone="system" icon={ArrowRight} />
          <Node label="Send notifications" tone="system" icon={Bell} />
          <Node label="Audit log" tone="system" icon={Database} />
          <Node label="Assign agent" tone="system" icon={UserCheck} />
          <Node label="Publish LIVE" tone="end" icon={CheckCircle2} />
        </Lane>
      </Phase>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">Property status lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-y-2">
          {STATUS_FLOW.map((s, i) => (
            <span key={s} className="flex items-center">
              <span className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium">{s}</span>
              {i < STATUS_FLOW.length - 1 ? <ArrowRight className="mx-1 h-3.5 w-3.5 text-muted-foreground" /> : null}
            </span>
          ))}
          <div className="mt-3 flex w-full flex-wrap gap-2">
            <span className="text-[11px] text-muted-foreground">Alternative end states:</span>
            {["REJECTED", "CANCELLED", "EXPIRED"].map((s) => (
              <span key={s} className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-medium">{s}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
