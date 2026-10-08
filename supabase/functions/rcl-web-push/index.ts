import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

type NotificationRecord = {
  id: string;
  recipient_id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
};

type HookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: NotificationRecord;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return Response.json({ error: "Server credentials unavailable" }, { status: 503 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: config, error: configError } = await supabase
    .from("web_push_config")
    .select("vapid_keys,webhook_secret,contact_information")
    .eq("singleton", true)
    .single();

  if (configError || !config?.webhook_secret || !config?.vapid_keys) {
    return Response.json({ error: "Push configuration unavailable" }, { status: 503 });
  }

  const suppliedSecret = req.headers.get("x-rcl-push-secret");
  if (!suppliedSecret || suppliedSecret !== config.webhook_secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notification = payload.record;
  if (!notification?.recipient_id || !notification.id) {
    return Response.json({ error: "Notification record required" }, { status: 400 });
  }

  const [{ data: subscriptions, error: subscriptionError }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("web_push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("profile_id", notification.recipient_id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", notification.recipient_id)
      .is("read_at", null),
  ]);

  if (subscriptionError) return Response.json({ error: subscriptionError.message }, { status: 500 });
  if (!subscriptions?.length) return Response.json({ delivered: 0, subscriptions: 0 });

  const vapidKeys = await webpush.importVapidKeys(config.vapid_keys, { extractable: false });
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: config.contact_information || "mailto:info@corbin-ventures.com",
    vapidKeys,
  });

  const badgeCount = Math.max(0, unreadCount ?? 1);
  const message = JSON.stringify({
    title: notification.title || "Rich City League",
    body: notification.body || "New RCL activity needs your attention.",
    url: notification.link || "/notifications",
    badgeCount,
    tag: `rcl-${notification.id}`,
    notificationId: notification.id,
    type: notification.type,
  });

  let delivered = 0;
  let removed = 0;
  const staleIds: string[] = [];

  await Promise.allSettled(subscriptions.map(async (row) => {
    try {
      const subscriber = appServer.subscribe({
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      });
      await subscriber.pushTextMessage(message, {});
      delivered += 1;
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      if (/\b404\b|\b410\b|gone|not found/i.test(text)) staleIds.push(row.id);
      console.error("RCL web push delivery failed", row.id, text);
    }
  }));

  if (staleIds.length) {
    const { error: deleteError } = await supabase.from("web_push_subscriptions").delete().in("id", staleIds);
    if (!deleteError) removed = staleIds.length;
  }

  return Response.json({ delivered, subscriptions: subscriptions.length, removed, badgeCount });
});
