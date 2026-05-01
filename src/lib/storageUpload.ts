import { appConfig } from "./config";

type StudioStoragePayload = {
  error?: string;
  detail?: string;
  publicUrl?: string;
  url?: string;
};

export async function uploadToStudioStorage(file: File, purpose: string): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("purpose", purpose);
  body.set("source", "helena-video");

  const response = await fetch(appConfig.studioStorageUploadUrl, {
    method: "POST",
    body
  });

  const payload = (await response.json().catch(() => ({}))) as StudioStoragePayload;
  const publicUrl = payload.publicUrl || payload.url;

  if (!response.ok || !publicUrl) {
    const message = typeof payload.detail === "string" ? payload.detail : payload.error;
    throw new Error(message ?? "Nao foi possivel enviar o arquivo.");
  }

  return publicUrl;
}
