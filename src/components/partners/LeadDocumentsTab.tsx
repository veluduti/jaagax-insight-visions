import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, FileText, History, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadDocumentPreview, listLeadDocuments, reviewLeadDocument, uploadLeadDocument, type LeadDocument } from "@/services/hospitality/leadDocumentsService";
import type { LeadDocumentStatus } from "@/lib/leadDocuments";

const date = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function LeadDocumentsTab({ hotelId, leadId, categories, onChanged }: {
  hotelId: string; leadId: string; categories: [string, string][]; onChanged: () => Promise<void>;
}) {
  const [files, setFiles] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const uploadKey = useRef("");
  const mounted = useRef(true);
  const [preview, setPreview] = useState<LeadDocument | null>(null);
  const [url, setUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [review, setReview] = useState<LeadDocument | null>(null);
  const [status, setStatus] = useState<LeadDocumentStatus>("uploaded");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<LeadDocument | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const rows = await listLeadDocuments(leadId); if (mounted.current) setFiles(rows); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Could not load documents."); }
    finally { if (mounted.current) setLoading(false); }
  }, [leadId]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [load]);
  useEffect(() => {
    if (!preview) { setUrl(""); return; }
    let active = true;
    const refresh = async () => {
      setPreviewError("");
      try { const link = await leadDocumentPreview(preview.storage_path); if (active) setUrl(link); }
      catch (e) { if (active) { setUrl(""); setPreviewError(e instanceof Error ? e.message : "Could not open document."); } }
    };
    setUrl(""); void refresh();
    const timer = window.setInterval(() => void refresh(), 90000);
    return () => { active = false; window.clearInterval(timer); };
  }, [preview]);

  const upload = async (file: File) => {
    const key = uploadKey.current;
    setBusy(true);
    try {
      await uploadLeadDocument(hotelId, leadId, key, file);
      if (!mounted.current) return;
      toast.success("Document uploaded. Awaiting review."); await load(); await onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed."); }
    finally { if (mounted.current) setBusy(false); }
  };
  const saveReview = async () => {
    if (!review) return;
    setBusy(true);
    try { await reviewLeadDocument(review.id, status, note); if (!mounted.current) return; setReview(null); toast.success("Document review saved."); await load(); await onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save review."); }
    finally { if (mounted.current) setBusy(false); }
  };
  const allCategories = [...categories, ...Array.from(new Set(files.map(f => f.document_key))).filter(key => !categories.some(c => c[0] === key)).map(key => [key, key] as [string, string])];

  return <div className="space-y-3">
    <Input ref={input} type="file" className="hidden" aria-label="Upload lead document" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
    {loading ? <Loader2 aria-label="Loading documents" className="mx-auto h-5 w-5 animate-spin text-primary" /> : error ? <div className="text-sm text-destructive">{error}<Button variant="link" size="sm" onClick={() => void load()}>Retry</Button></div> : allCategories.map(([key, label]) => {
      const documents = files.filter(f => f.document_key === key);
      const latest = documents[0];
      return <section key={key} className="space-y-2 border-b pb-3 last:border-0">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h3 className="text-sm font-medium">{label}</h3><Badge variant={latest?.status === "verified" ? "default" : latest?.status === "rejected" ? "destructive" : "secondary"} className="mt-1 capitalize">{latest?.status ?? "pending"}</Badge></div>
          <Button variant="outline" size="sm" aria-label={`Upload ${label}`} disabled={busy} onClick={() => { uploadKey.current = key; input.current?.click(); }}><Upload className="mr-1 h-4 w-4" />Upload</Button></div>
        {!documents.length && <p className="text-xs text-muted-foreground">No document uploaded.</p>}
        {documents.map((file, i) => <div key={file.id} className="min-w-0 space-y-1 rounded-md border bg-muted/30 p-2">
          <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.file_name}</p><p className="text-xs text-muted-foreground">{(file.file_size / 1024).toFixed(0)} KB · {date(file.created_at)}</p></div></div>
          <div className="flex flex-wrap items-center gap-1"><Badge variant="outline" className="capitalize">{file.status}</Badge>{i > 0 && <span className="text-xs text-muted-foreground">Earlier upload</span>}</div>
          {file.review_note && <p className="break-words text-xs">{file.review_note}</p>}
          <div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" aria-label={`Preview ${file.file_name}`} onClick={() => setPreview(file)}><Eye className="mr-1 h-4 w-4" />Preview</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => { setReview(file); setStatus(file.status); setNote(file.review_note); }}><ShieldCheck className="mr-1 h-4 w-4" />Review</Button><Button size="icon" variant="ghost" aria-label={`Status history for ${file.file_name}`} title="Status history" onClick={() => setHistory(file)}><History className="h-4 w-4" /></Button></div>
        </div>)}
      </section>;
    })}
    {busy && <div role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Saving document…</div>}
    <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle className="break-all pr-5">{preview?.file_name}</DialogTitle></DialogHeader>
      {previewError ? <div className="text-sm text-destructive">{previewError}<Button variant="link" onClick={() => preview && setPreview({ ...preview })}>Retry</Button></div> : !url ? <Loader2 aria-label="Loading preview" className="mx-auto h-6 w-6 animate-spin" /> : preview?.mime_type === "application/pdf" ? <iframe title="Document PDF preview" src={url} className="h-[60vh] w-full rounded-md border" sandbox="allow-same-origin allow-scripts" referrerPolicy="no-referrer" /> : <img src={url} alt={preview?.file_name} className="max-h-[65vh] w-full object-contain" onError={() => setPreviewError("Preview could not load. Please retry.")} />}
    </DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={open => !busy && !open && setReview(null)}><DialogContent><DialogHeader><DialogTitle>Review document</DialogTitle></DialogHeader><p className="break-all text-sm text-muted-foreground">{review?.file_name}</p>
      <label className="space-y-1 text-sm">Status<Select value={status} onValueChange={value => setStatus(value as LeadDocumentStatus)}><SelectTrigger aria-label="Document review status"><SelectValue /></SelectTrigger><SelectContent>{["uploaded", "verified", "rejected"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></label>
      <label className="space-y-1 text-sm">Review note{status === "rejected" ? " (required)" : ""}<Textarea aria-label="Document review note" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <DialogFooter><Button disabled={busy} onClick={() => void saveReview()}>Save Review</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!history} onOpenChange={open => !open && setHistory(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Status history</DialogTitle></DialogHeader><p className="break-all text-sm text-muted-foreground">{history?.file_name}</p><ol className="space-y-3 border-l pl-3">{history?.status_history.map((item, i) => <li key={i}><Badge variant="outline" className="capitalize">{item.status}</Badge><p className="text-xs text-muted-foreground">{date(item.at)}</p>{item.note && <p className="break-words text-sm">{item.note}</p>}</li>)}</ol></DialogContent></Dialog>
  </div>;
}