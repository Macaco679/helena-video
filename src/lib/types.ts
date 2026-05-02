export type HelenaModule = "module1" | "module2" | "autocut";
export type QualityProfile = "fast" | "pro" | "cinema";
export type MotionIntensity = "subtle" | "balanced" | "aggressive";
export type ContinuityMode = "none" | "style" | "character" | "character+style";
export type AudioMode = "sync-from-upload" | "video-audio" | "no-audio";
export type OutputResolution = "720p" | "1080p" | "4k";

export type GenerationForm = {
  module: HelenaModule;
  prompt: string;
  referenceNotes: string;
  creativeProfile: string;
  preferredModel: string;
  qualityProfile: QualityProfile;
  cameraPreset: string;
  motionIntensity: MotionIntensity;
  continuityMode: ContinuityMode;
  durationSeconds: number;
  shotCount: number;
  audioMode: AudioMode;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  fps: 24 | 30 | 60;
  negativePrompt: string;
  seed: number | "";
  resolution: OutputResolution;
  variationCount: 1 | 2 | 3 | 4;
};

export type ProviderStatus = {
  id: string;
  name: string;
  category: "native" | "video" | "image" | "audio" | "publish";
  state: "ready" | "planned" | "needs-key" | "inactive";
  summary: string;
  requiredParams: string[];
};

export type ChatMessage = {
  role: "assistant" | "user" | "system";
  content: string;
};
