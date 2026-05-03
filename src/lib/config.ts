export const appConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  helenaProxyUrl:
    import.meta.env.VITE_HELENA_VIDEO_PROXY_URL ?? "",
  helenaApiUrl:
    import.meta.env.VITE_HELENA_VIDEO_API_URL ??
    "https://desktop-7h37362.tail7e7437.ts.net:10000/video-anark-api",
  helenaN8nJobWebhookUrl:
    import.meta.env.VITE_HELENA_VIDEO_N8N_JOB_WEBHOOK_URL ??
    "https://desktop-7h37362.tail7e7437.ts.net/webhook/helena-video/url-intake",
  studioStorageUploadUrl:
    import.meta.env.VITE_STUDIO_STORAGE_UPLOAD_URL ?? ""
};

export const hasSupabaseConfig = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey
);
