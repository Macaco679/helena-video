import { createClient } from "@supabase/supabase-js";
import { appConfig, hasSupabaseConfig } from "./config";

export const supabase = hasSupabaseConfig
  ? createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey)
  : null;
