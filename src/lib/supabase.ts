import { createClient } from "@supabase/supabase-js";
import { appConfig, hasSupabaseConfig } from "./config";

export const supabase = hasSupabaseConfig
  ? createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey)
  : null;

export async function checkSupabaseConnection() {
  if (!hasSupabaseConfig) return "missing" as const;

  const response = await fetch(`${appConfig.supabaseUrl}/auth/v1/settings`, {
    headers: {
      apikey: appConfig.supabasePublishableKey,
      authorization: `Bearer ${appConfig.supabasePublishableKey}`
    }
  });

  return response.ok ? ("online" as const) : ("invalid" as const);
}
