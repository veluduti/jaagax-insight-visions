import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { crmService, type CRMNote, type CRMNoteInput, type CRMNotePriority, type CRMNoteType } from "@/services/crmService";

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderProfileId?: string | null;
  editNote?: CRMNote | null;
  onSaved?: () => void;
}

const TYPES: CRMNoteType[] = ["note", "task", "follow_up", "reminder", "call", "meeting"];
const PRIORITIES: CRMNotePriority[] = ["low", "medium", "high", "urgent"];

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export const AddNoteModal = ({ open, onOpenChange, builderProfileId, editNote, onSaved }: AddNoteModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CRMNoteInput>({
    title: "",
    content: "",
    type: "note",
    priority: "medium",
    status: "open",
    due_date: null,
    reminder_at: null,
    builder_profile_id: builderProfileId ?? null,
  });

  useEffect(() => {
    if (editNote) {
      setForm({
        title: editNote.title,
        content: editNote.content ?? "",
        type: editNote.type,
        priority: editNote.priority,
        status: editNote.status,
        due_date: editNote.due_date,
        reminder_at: editNote.reminder_at,
        builder_profile_id: editNote.builder_profile_id,
      });
    } else {
      setForm({
        title: "", content: "", type: "note", priority: "medium", status: "open",
        due_date: null, reminder_at: null, builder_profile_id: builderProfileId ?? null,
      });
    }
  }, [editNote, builderProfileId, open]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editNote) {
        await crmService.updateNote(editNote.id, form);
        toast({ title: "Note updated" });
      } else {
        await crmService.createNote(form);
        toast({ title: "Note created" });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editNote ? "Edit Note" : "Add Note / Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with lead..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CRMNoteType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as CRMNotePriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="datetime-local" value={toDateInput(form.due_date)} onChange={(e) => setForm({ ...form, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <Label>Reminder</Label>
              <Input type="datetime-local" value={toDateInput(form.reminder_at)} onChange={(e) => setForm({ ...form, reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : editNote ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNoteModal;
