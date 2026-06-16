import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  ListTodo,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { crmService, type CRMNote, type CRMNoteStatus, type CRMStats } from "@/services/crmService";
import AddNoteModal from "./AddNoteModal";

// ---------- Helper functions ----------
const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <Card className="border-border shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export const BuilderCRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | CRMNoteStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<CRMNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);

  // ---- Load builder profile and data ----
  const load = async () => {
    setLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        navigate("/auth");
        return;
      }

      // Get builder profile
      const { data: profile, error: profileError } = await supabase
        .from("builder_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast.error("Builder profile not found. Please create one first.");
        navigate("/add-builder-profile");
        return;
      }

      setBuilderProfileId(profile.id);

      // Load notes and stats
      const [notesList, statsData] = await Promise.all([
        crmService.listNotes({ builderProfileId: profile.id }),
        crmService.getStats(profile.id),
      ]);

      setNotes(notesList);
      setStats(statsData);
    } catch (e: any) {
      toast.error("Failed to load CRM data", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---- Filter notes ----
  const filtered = useMemo(() => {
    let result = notes;
    if (tab !== "all") {
      result = result.filter((n) => n.status === tab);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(s) || (n.content && n.content.toLowerCase().includes(s)),
      );
    }
    return result;
  }, [notes, tab, search]);

  // ---- Handlers ----
  const handleComplete = async (id: string) => {
    try {
      await crmService.markCompleted(id);
      toast.success("Marked as complete");
      load();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await crmService.deleteNote(deleteId);
      toast.success("Deleted");
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">CRM & Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage notes, follow-ups, and reminders</p>
          </div>
          <Button
            onClick={() => {
              setEditNote(null);
              setShowModal(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} icon={ListTodo} color="bg-blue-100 text-blue-600" />
            <StatCard label="Open" value={stats.open} icon={Clock} color="bg-emerald-100 text-emerald-600" />
            <StatCard
              label="Due Today"
              value={stats.dueToday}
              icon={CalendarIcon}
              color="bg-amber-100 text-amber-600"
            />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="bg-rose-100 text-rose-600" />
          </div>
        )}

        {/* Notes Section */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-foreground">Notes</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="pl-9 bg-background border-border"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No notes yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 rounded-lg border border-border bg-white hover:bg-muted/30 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">{n.title}</h3>
                              <Badge variant="outline" className={priorityColors[n.priority]}>
                                {n.priority}
                              </Badge>
                              <Badge variant="outline" className={statusColors[n.status]}>
                                {n.status.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                {n.type.replace("_", " ")}
                              </Badge>
                            </div>
                            {n.content && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                            )}
                            {(n.due_date || n.reminder_at) && (
                              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                                {n.due_date && <span>Due: {new Date(n.due_date).toLocaleString()}</span>}
                                {n.reminder_at && <span>Reminder: {new Date(n.reminder_at).toLocaleString()}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {n.status !== "completed" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600"
                                onClick={() => handleComplete(n.id)}
                                title="Mark complete"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => {
                                setEditNote(n);
                                setShowModal(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-rose-600"
                              onClick={() => setDeleteId(n.id)}
                            >
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

        {/* Modals */}
        <AddNoteModal
          open={showModal}
          onOpenChange={setShowModal}
          builderProfileId={builderProfileId}
          editNote={editNote}
          onSaved={load}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BuilderCRM;
