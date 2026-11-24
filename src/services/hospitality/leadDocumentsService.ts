import { supabase } from "@/integrations/supabase/client";
import { matchesDocumentSignature, validateDocumentReview, validateLeadDocument, type LeadDocumentStatus } from "@/lib/leadDocuments";

export type LeadDocument = {
  id: string; lead_id: string; document_key: string; storage_path: string; file_name: string;
  mime_type: string; file_size: number; status: LeadDocumentStatus; review_note: string;
  created_at: string; reviewed_at: string | null;
  status_history: { status: string; at: string; by: string; note: string }[];
};
const BUCKET = "lead-documents";

export async function listLeadDocuments(leadId: string): Promise<LeadDocument[]> {
  const { data, error } = await supabase.from("hotel_lead_documents").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error("Could not load documents. Please retry.");
  return (data ?? []) as unknown as LeadDocument[];
}

export async function uploadLeadDocument(hotelId: string, leadId: string, key: string, file: File) {
  validateLeadDocument(file);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesDocumentSignature(file.type, header)) throw new Error("This file does not match its image or PDF format.");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please sign in again before uploading.");
  const id = crypto.randomUUID();
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "pdf";
  const path = `${hotelId}/${leadId}/${id}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Upload failed. Check your connection and property access, then retry.");
  const { error } = await supabase.from("hotel_lead_documents").insert({
    id, lead_id: leadId, document_key: key, storage_path: path, file_name: file.name,
    mime_type: file.type, file_size: file.size, uploaded_by: user.id,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error("Could not save the document. Please retry.");
  }
}

export async function reviewLeadDocument(id: string, status: LeadDocumentStatus, note: string) {
  validateDocumentReview(status, note);
  const { data, error } = await supabase.from("hotel_lead_documents").update({ status, review_note: note.trim() }).eq("id", id).select("id").single();
  if (error || !data) throw new Error("Could not save this review. Check your property access and retry.");
}

export async function leadDocumentPreview(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data?.signedUrl) throw new Error("Could not open this document. Please retry.");
  return data.signedUrl;
}