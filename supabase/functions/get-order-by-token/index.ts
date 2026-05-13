import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sel, error } = await supabase
      .from("selections")
      .select("id, tenant_id, event_id, customer_name, whatsapp, total_photos, total_price, payment_status, payment_method, download_enabled, download_expires_at, payment_approved_at, created_at")
      .eq("public_token", token)
      .maybeSingle();

    if (error || !sel) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: event }, { data: settings }, { data: photos }, { data: proof }] = await Promise.all([
      supabase.from("events").select("name, slug, payment_mode").eq("id", sel.event_id).maybeSingle(),
      supabase.from("photographer_settings").select("photographer_name, pix_key, pix_recipient_name, pix_qrcode_url, whatsapp_number").eq("tenant_id", sel.tenant_id).maybeSingle(),
      supabase.from("selection_photos").select("event_photos(id, photo_code, thumbnail_path)").eq("selection_id", sel.id),
      supabase.from("payment_proofs").select("id, status, created_at").eq("selection_id", sel.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    return new Response(JSON.stringify({
      selection: sel,
      event,
      settings,
      photos: (photos || []).map((p: any) => p.event_photos).filter(Boolean),
      latest_proof: proof,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});