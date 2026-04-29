export const appConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  helenaProxyUrl:
    import.meta.env.VITE_HELENA_VIDEO_PROXY_URL ??
    (import.meta.env.PROD ? "/api/helena" : ""),
  helenaApiUrl:
    import.meta.env.VITE_HELENA_VIDEO_API_URL ??
    "https://helena-anark-api.srv1153225.hstgr.cloud",
  helenaApiKey: import.meta.env.VITE_HELENA_VIDEO_API_KEY ?? ""
};

export const hasSupabaseConfig = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey
);
