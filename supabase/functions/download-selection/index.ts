import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sel } = await supabase
      .from("selections")
      .select("id, payment_status, download_enabled, download_expires_at")
      .eq("public_token", token)
      .maybeSingle();

    if (!sel) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!sel.download_enabled || sel.payment_status !== "approved") {
      return new Response(JSON.stringify({ error: "downloads not available" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sel.download_expires_at && new Date(sel.download_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "download link expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows } = await supabase
      .from("selection_photos")
      .select("event_photos(id, photo_code, storage_path, filename)")
      .eq("selection_id", sel.id);

    const photos = (rows || []).map((r: any) => r.event_photos).filter(Boolean);
    const paths = photos.map((p: any) => p.storage_path);

    const { data: signed, error } = await supabase.storage
      .from("event-photos")
      .createSignedUrls(paths, 600);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlByPath = new Map((signed || []).map((s) => [s.path, s.signedUrl]));
    const result = photos.map((p: any) => ({
      id: p.id,
      photo_code: p.photo_code,
      filename: p.filename,
      url: urlByPath.get(p.storage_path) || null,
    }));

    return new Response(JSON.stringify({ photos: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});