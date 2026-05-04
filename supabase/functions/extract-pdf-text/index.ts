// Server-side fallback: extract text from a PDF (or image-based PDF) using
// unpdf for text layer + Gemini Vision for OCR fallback. Keeps the browser
// free of pdfjs worker fragility.

import { extractText } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function ocrPdfWithGemini(pdfDataUrl: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "";
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL readable text from this real-estate brochure/poster (PDF). Include every BHK, area, price, locality, project name, amenities, RERA/DTCP/HMDA numbers, and any title or headline. Output plain text only. No commentary.",
              },
              { type: "image_url", image_url: { url: pdfDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      console.warn("OCR gateway", r.status, await r.text());
      return "";
    }
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.warn("OCR failed", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { pdf_data_url } = await req.json();
    if (!pdf_data_url || typeof pdf_data_url !== "string") {
      return new Response(JSON.stringify({ error: "pdf_data_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode data URL → Uint8Array
    const m = pdf_data_url.match(/^data:.*?;base64,(.+)$/);
    if (!m) {
      return new Response(JSON.stringify({ error: "invalid data url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "PDF too large (max 15MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text = "";
    try {
      const { text: extracted } = await extractText(bytes, { mergePages: true });
      text = (Array.isArray(extracted) ? extracted.join("\n") : extracted || "").trim();
    } catch (e) {
      console.warn("unpdf extract failed", e);
    }

    // If the text layer is empty / scanned, fall back to Gemini vision OCR.
    if (!text || text.length < 20) {
      const ocr = await ocrPdfWithGemini(pdf_data_url);
      if (ocr.trim().length > text.length) text = ocr.trim();
    }

    return new Response(JSON.stringify({ text: text.slice(0, 40000) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-pdf-text error", e);
    return new Response(JSON.stringify({ text: "", error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
