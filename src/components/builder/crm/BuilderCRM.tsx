import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CheckCircle2, Clock, AlertCircle, Pencil, Trash2, ListTodo, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { crmService, type CRMNote, type CRMNoteStatus, type CRMStats } from "@/services/crmService";
import { AddNoteModal } from "./AddNoteModal";

interface BuilderCRMProps {
  builderProfileId?: string | null;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export const BuilderCRM = ({ builderProfileId }: BuilderCRMProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | CRMNoteStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<CRMNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        crmService.listNotes(builderProfileId ? { builderProfileId } : {}),
        crmService.getStats(builderProfileId || undefined),
      ]);
      setNotes(list);
      setStats(s);
    } catch (e: any) {
      toast({ title: "Failed to load CRM", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [builderProfileId]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (tab !== "all" && n.status !== tab) return false;
      if (search && !`${n.title} ${n.content ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [notes, tab, search]);

  const handleComplete = async (id: string) => {
    try {
      await crmService.markCompleted(id);
      toast({ title: "Marked complete" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await crmService.deleteNote(deleteId);
      toast({ title: "Deleted" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">CRM & Tasks</h2>
          <p className="text-sm text-slate-400">Manage notes, follow-ups, and reminders</p>
        </div>
        <Button onClick={() => { setEditNote(null); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="h-4 w-4 mr-2" />Add Note
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} icon={ListTodo} color="bg-blue-500/20 text-blue-300" />
          <StatCard label="Open" value={stats.open} icon={Clock} color="bg-emerald-500/20 text-emerald-300" />
          <StatCard label="Due Today" value={stats.dueToday} icon={CalendarIcon} color="bg-amber-500/20 text-amber-300" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="bg-red-500/20 text-red-300" />
        </div>
      )}

      <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-white">Notes</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9 bg-slate-800/60 border-white/10 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-slate-800/60">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {loading ? (
                <div className="py-10 text-center text-slate-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-400">No notes yet</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((n) => (
                    <div key={n.id} className="p-4 rounded-lg border border-white/10 bg-slate-800/40 hover:bg-slate-800/60 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white truncate">{n.title}</h3>
                            <Badge variant="outline" className={priorityColors[n.priority]}>{n.priority}</Badge>
                            <Badge variant="outline" className={statusColors[n.status]}>{n.status.replace("_", " ")}</Badge>
                            <Badge variant="outline" className="bg-slate-700/40 text-slate-300 border-slate-600/40">{n.type.replace("_", " ")}</Badge>
                          </div>
                          {n.content && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{n.content}</p>}
                          {(n.due_date || n.reminder_at) && (
                            <div className="mt-2 flex gap-3 text-xs text-slate-500">
                              {n.due_date && <span>Due: {new Date(n.due_date).toLocaleString()}</span>}
                              {n.reminder_at && <span>Reminder: {new Date(n.reminder_at).toLocaleString()}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {n.status !== "completed" && (
                            <Button size="icon" variant="ghost" className="text-emerald-400" onClick={() => handleComplete(n.id)} title="Mark complete">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="text-slate-300" onClick={() => { setEditNote(n); setShowModal(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-400" onClick={() => setDeleteId(n.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddNoteModal
        open={showModal}
        onOpenChange={setShowModal}
        builderProfileId={builderProfileId}
        editNote={editNote}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuilderCRM;
