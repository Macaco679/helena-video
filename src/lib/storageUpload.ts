import { appConfig } from "./config";

type StudioStoragePayload = {
  error?: string;
  detail?: string;
  publicUrl?: string;
  url?: string;
};

export async function uploadToStudioStorage(file: File, purpose: string): Promise<string> {
  if (!appConfig.studioStorageUploadUrl) {
    throw new Error("Configure VITE_STUDIO_STORAGE_UPLOAD_URL para enviar mídia.");
  }

  const body = new FormData();
  body.set("file", file);
  body.set("purpose", purpose);
  body.set("source", "helena-video");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  let response: Response;
  try {
    response = await fetch(appConfig.studioStorageUploadUrl, {
      method: "POST",
      body,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Upload de mídia demorou demais para responder.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as StudioStoragePayload;
  const publicUrl = payload.publicUrl || payload.url;

  if (!response.ok || !publicUrl) {
    const message = typeof payload.detail === "string" ? payload.detail : payload.error;
    throw new Error(message ?? "Não foi possível enviar o arquivo.");
  }

  return publicUrl;
}
