import { appConfig } from "./config";
import { uploadToStudioStorage } from "./storageUpload";
import type { GenerationForm } from "./types";

export type HelenaJobResponse = {
  id?: string;
  job_id?: string;
  status?: string;
  output_url?: string;
  [key: string]: unknown;
};

const endpointForModule = (module: GenerationForm["module"]) =>
  `/api/v1/jobs/${module}`;

const requestUrl = (path: string) =>
  appConfig.helenaProxyUrl
    ? `${appConfig.helenaProxyUrl}${proxyPath(path)}`
    : `${appConfig.helenaApiUrl}${path}`;

export async function fetchHealth() {
  const response = await fetchWithTimeout(requestUrl("/health"));

  if (!response.ok) {
    throw new Error(`Health failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchCapabilities() {
  const response = await fetchWithTimeout(requestUrl("/api/v1/capabilities"));

  if (!response.ok) {
    throw new Error(`Capabilities failed: ${response.status}`);
  }

  return response.json();
}

export async function createHelenaJob(
  form: GenerationForm,
  files: {
    video?: File | null;
    audio?: File | null;
    references?: File[];
  }
): Promise<HelenaJobResponse> {
  const body = new FormData();
  body.set("prompt", form.prompt);
  body.set("job_type", form.module);
  body.set("mode", form.module);
  body.set("module", form.module);
  body.set("reference_notes", form.referenceNotes);
  body.set("creative_profile", form.creativeProfile);
  body.set("preferred_model", form.preferredModel);
  body.set("quality_profile", form.qualityProfile);
  body.set("camera_preset", form.cameraPreset);
  body.set("motion_intensity", form.motionIntensity);
  body.set("continuity_mode", form.continuityMode);
  body.set("duration_seconds", String(form.durationSeconds));
  body.set("shot_count", String(form.shotCount));
  body.set("audio_mode", form.audioMode);
  body.set("aspect_ratio", form.aspectRatio);
  body.set("fps", String(form.fps));
  body.set("resolution", form.resolution);
  body.set("variation_count", String(form.variationCount));
  if (form.negativePrompt.trim()) body.set("negative_prompt", form.negativePrompt.trim());
  if (form.seed !== "") body.set("seed", String(form.seed));

  const hasLocalFiles = Boolean(files.video || files.audio || (files.references ?? []).length);
  const shouldUploadToStorage = Boolean(appConfig.studioStorageUploadUrl);

  if (files.video) {
    if (shouldUploadToStorage) body.set("video_url", await uploadToStudioStorage(files.video, "helena-video"));
    else body.set("video", files.video);
  }
  if (files.audio) {
    if (shouldUploadToStorage) body.set("audio_url", await uploadToStudioStorage(files.audio, "helena-audio"));
    else body.set("audio", files.audio);
  }
  for (const [index, file] of (files.references ?? []).slice(0, 3).entries()) {
    if (shouldUploadToStorage) body.set(`reference_image_${index + 1}_url`, await uploadToStudioStorage(file, "helena-reference"));
    else body.set(`reference_image_${index + 1}`, file);
  }

  const jobUrl = appConfig.helenaN8nJobWebhookUrl && !hasLocalFiles
    ? appConfig.helenaN8nJobWebhookUrl
    : requestUrl(endpointForModule(form.module));

  const response = await fetchWithTimeout(jobUrl, {
    method: "POST",
    body
  }, 120_000);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Job failed: ${response.status}`);
  }

  return response.json();
}

function proxyPath(path: string) {
  if (path === "/health") return "/health";
  if (path === "/api/v1/capabilities") return "/capabilities";
  const jobMatch = path.match(/^\/api\/v1\/jobs\/([^/]+)$/);
  return jobMatch ? `/jobs/${jobMatch[1]}` : path;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Helena API demorou demais para responder.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
