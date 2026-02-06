 // Shared helper for sending push notifications
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  import {
    ApplicationServer,
    importVapidKeys,
    Urgency,
    PushMessageError,
  } from "jsr:@negrel/webpush";
  import { getVapidKeysAsJwk } from "./vapid.ts";
 
 let appServerCache: ApplicationServer | null = null;
 
 async function getAppServer(): Promise<ApplicationServer | null> {
   if (appServerCache) return appServerCache;
 
   const jwkKeys = getVapidKeysAsJwk();
   if (!jwkKeys) {
     console.log("VAPID keys not configured");
     return null;
   }
 
   try {
     const vapidKeys = await importVapidKeys(jwkKeys);
     appServerCache = await ApplicationServer.new({
       contactInformation: "mailto:admin@felansfx.com",
       vapidKeys,
     });
     return appServerCache;
   } catch (error) {
     console.error("Failed to initialize VAPID:", error);
     return null;
   }
 }
 
 export interface PushNotificationOptions {
   userIds?: string[]; // If empty, sends to all subscribers
   title: string;
   message: string;
   url?: string;
   type?: "info" | "success" | "warning" | "error";
 }
 
 export async function sendPushNotifications(
   options: PushNotificationOptions
 ): Promise<{ sent: number; failed: number; cleaned: number }> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
   const { userIds, title, message, url = "/", type = "info" } = options;
 
   const result = { sent: 0, failed: 0, cleaned: 0 };
 
   try {
     // Create in-app notifications
     let targetUserIds = userIds;
     
     if (!targetUserIds || targetUserIds.length === 0) {
       // Get all users with subscriptions
       const { data: allSubs } = await supabase
         .from("push_subscriptions")
         .select("user_id");
       targetUserIds = [...new Set(allSubs?.map((s: any) => s.user_id) || [])];
     }
 
     if (targetUserIds.length > 0) {
       const notifications = targetUserIds.map((userId: string) => ({
         user_id: userId,
         title,
         message,
         type,
         action_url: url,
       }));
 
       await supabase.from("notifications").insert(notifications);
     }
 
     // Send push notifications
     const server = await getAppServer();
     if (!server) {
       console.log("Push notifications not configured");
       return result;
     }
 
     // Fetch subscriptions
     let query = supabase.from("push_subscriptions").select("*");
     if (targetUserIds && targetUserIds.length > 0) {
       query = query.in("user_id", targetUserIds);
     }
 
     const { data: subscriptions } = await query;
     if (!subscriptions || subscriptions.length === 0) {
       return result;
     }
 
     // Deduplicate by endpoint
     const uniqueByEndpoint = new Map();
     for (const sub of subscriptions) {
       if (!uniqueByEndpoint.has(sub.endpoint)) {
         uniqueByEndpoint.set(sub.endpoint, sub);
       }
     }
 
     const payload = JSON.stringify({
       title,
       body: message,
       url,
       icon: "/favicon-512.png",
     });
 
      const expiredIds: string[] = [];
      const authErrorByUser = new Map<string, { statusCode: number | null; error: string | null }>();

      for (const [, sub] of uniqueByEndpoint) {
        try {
          const subscriber = server.subscribe({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          });

          await subscriber.pushTextMessage(payload, {
            urgency: Urgency.High,
            ttl: 86400,
          });

          result.sent++;
        } catch (error: any) {
          result.failed++;

          let statusCode: number | null = null;
          let errDetails = error?.message || "Unknown error";

          if (error instanceof PushMessageError) {
            statusCode = error.response?.status || null;
            errDetails = error.toString();
          } else {
            statusCode = error?.response?.status ?? error?.status ?? null;
          }

          console.error(`Push to ${sub.endpoint.substring(0, 40)}... failed: ${errDetails}`);

          // Expired/gone subscription
          const isExpired =
            (typeof error?.isGone === "function" && error.isGone()) ||
            statusCode === 410 ||
            (error?.response && error.response.status === 410);

          if (isExpired) {
            expiredIds.push(sub.id);
          }

          // Unauthorized (usually VAPID/public key mismatch) => flag user for refresh
          if (statusCode === 401 || statusCode === 403) {
            authErrorByUser.set(sub.user_id, { statusCode, error: errDetails });
          }
        }
      }

      // Flag users that need a resubscribe
      if (authErrorByUser.size > 0) {
        const nowIso = new Date().toISOString();
        const rows = [...authErrorByUser.entries()].map(([userId, v]) => ({
          user_id: userId,
          reason: "push_auth_error",
          last_status_code: v.statusCode,
          last_error: v.error,
          updated_at: nowIso,
        }));

        const { error: flagError } = await supabase
          .from("push_resubscribe_flags")
          .upsert(rows, { onConflict: "user_id" });

        if (flagError) console.error("Failed to set push resubscribe flags:", flagError);
      }
 
     // Clean up expired subscriptions
     if (expiredIds.length > 0) {
       await supabase.from("push_subscriptions").delete().in("id", expiredIds);
       result.cleaned = expiredIds.length;
     }
 
     console.log(
       `Push notifications: ${result.sent} sent, ${result.failed} failed, ${result.cleaned} cleaned`
     );
   } catch (error) {
     console.error("Error sending push notifications:", error);
   }
 
   return result;
 }