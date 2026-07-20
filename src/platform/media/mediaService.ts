/**
 * Media Service
 * -------------
 * Uniform upload API for images, documents, drone captures and
 * AI-generated assets. Wraps Supabase Storage + `platform_media`
 * index so every uploaded file is discoverable per user and module.
 */
import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "image" | "document" | "drone" | "ai_asset" | "video" | "audio" | "other";

export interface UploadInput {
  bucket: string;
  path: string;
  file: File | Blob;
  kind: MediaKind;
  moduleKey?: string;
  meta?: Record<string, unknown>;
  ownerUserId: string;
  upsert?: boolean;
  contentType?: string;
}

export interface UploadResult {
  id: string;
  bucket: string;
  path: string;
  publicUrl?: string;
}

export async function upload(input: UploadInput): Promise<UploadResult> {
  const { error: upErr } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, input.file, {
      upsert: input.upsert ?? false,
      contentType: input.contentType,
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(input.bucket).getPublicUrl(input.path);

  const { data, error } = await supabase
    .from("platform_media" as never)
    .insert({
      owner_user_id: input.ownerUserId,
      module_key: input.moduleKey ?? null,
      kind: input.kind,
      bucket: input.bucket,
      path: input.path,
      mime: input.contentType ?? (input.file as File).type ?? null,
      size_bytes: (input.file as File).size ?? null,
      meta: input.meta ?? {},
    } as never)
    .select("id")
    .single();
  if (error) throw error;

  return {
    id: (data as { id: string }).id,
    bucket: input.bucket,
    path: input.path,
    publicUrl: pub?.publicUrl,
  };
}

export async function signedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
