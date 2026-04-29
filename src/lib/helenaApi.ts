import { appConfig } from "./config";
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
  const response = await fetch(requestUrl("/health"), {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Health failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchCapabilities() {
  const response = await fetch(requestUrl("/api/v1/capabilities"), {
    headers: authHeaders()
  });

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

  if (files.video) body.set("video", files.video);
  if (files.audio) body.set("audio", files.audio);
  files.references?.slice(0, 3).forEach((file, index) => {
    body.set(`reference_image_${index + 1}`, file);
  });

  const response = await fetch(requestUrl(endpointForModule(form.module)), {
    method: "POST",
    headers: authHeaders(),
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Job failed: ${response.status}`);
  }

  return response.json();
}

function authHeaders() {
  return appConfig.helenaApiKey
    ? {
        "X-API-Key": appConfig.helenaApiKey
      }
    : undefined;
}

function proxyPath(path: string) {
  if (path === "/health") return "/health";
  if (path === "/api/v1/capabilities") return "/capabilities";
  const jobMatch = path.match(/^\/api\/v1\/jobs\/([^/]+)$/);
  return jobMatch ? `/jobs/${jobMatch[1]}` : path;
}
