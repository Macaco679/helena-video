import type { ProviderStatus } from "./types";

export const providerMatrix: ProviderStatus[] = [
  {
    id: "helena-native",
    name: "Helena Native Motion",
    category: "native",
    state: "ready",
    summary: "Renderizador local FFmpeg/cinema usado por module1, module2 e autocut.",
    requiredParams: ["prompt", "qualityProfile", "durationSeconds", "cameraPreset"]
  },
  {
    id: "kling",
    name: "Kling AI",
    category: "video",
    state: "needs-key",
    summary: "Ponte para text-to-video, image-to-video, movimento e continuidade.",
    requiredParams: ["prompt", "negativePrompt", "imageRefs", "aspectRatio", "duration", "seed", "cfg"]
  },
  {
    id: "runway",
    name: "Runway Gen-4",
    category: "video",
    state: "needs-key",
    summary: "Referência para controle profissional, motion brush, edição e upscale.",
    requiredParams: ["prompt", "imageRefs", "duration", "ratio", "seed", "qualityProfile"]
  },
  {
    id: "sora",
    name: "Sora",
    category: "video",
    state: "planned",
    summary: "Referência para storyboard, remix, stitching, som e coerência de cena.",
    requiredParams: ["prompt", "storyboard", "duration", "orientation", "audioIntent"]
  },
  {
    id: "veo",
    name: "Google Veo",
    category: "video",
    state: "needs-key",
    summary: "Ponte para text/image-to-video, frames inicial/final e prompt rewriting.",
    requiredParams: ["prompt", "imageRefs", "duration", "aspectRatio", "resolution"]
  },
  {
    id: "luma",
    name: "Luma Ray",
    category: "video",
    state: "needs-key",
    summary: "Ponte para geração rápida, image-to-video e variações por API.",
    requiredParams: ["prompt", "keyframes", "duration", "resolution", "loop"]
  },
  {
    id: "pika",
    name: "Pika",
    category: "video",
    state: "planned",
    summary: "Referência para efeitos sociais, cenas rápidas e fluxos simples para creator.",
    requiredParams: ["prompt", "imageRefs", "effect", "duration", "aspectRatio"]
  },
  {
    id: "wan",
    name: "Wan",
    category: "video",
    state: "needs-key",
    summary: "Ponte para geração cinematográfica condicionada por imagem e vídeo.",
    requiredParams: ["prompt", "imageRefs", "duration", "resolution", "seed"]
  },
  {
    id: "seedance",
    name: "Seedance",
    category: "video",
    state: "needs-key",
    summary: "Ponte para variantes sociais rápidas e movimento estilizado.",
    requiredParams: ["prompt", "imageRefs", "duration", "aspectRatio", "style"]
  },
  {
    id: "hailuo",
    name: "Hailuo",
    category: "video",
    state: "needs-key",
    summary: "Ponte para geração alternativa e renders comparativos.",
    requiredParams: ["prompt", "imageRefs", "duration", "model"]
  },
  {
    id: "image-lab",
    name: "Image Lab",
    category: "image",
    state: "planned",
    summary: "Necessário para thumbnails, storyboards e entradas image-to-video.",
    requiredParams: ["prompt", "style", "aspectRatio", "referenceImages"]
  },
  {
    id: "music-tts",
    name: "Music / TTS",
    category: "audio",
    state: "planned",
    summary: "Necessário para trilha, voz, narração e sincronização por beat.",
    requiredParams: ["lyricsOrScript", "voice", "mood", "duration", "language"]
  },
  {
    id: "super-video-hub",
    name: "Publish Hub",
    category: "publish",
    state: "inactive",
    summary: "Super Video Hub existe em código, mas precisa ser separado e reativado.",
    requiredParams: ["platforms", "caption", "schedule", "assetUrl", "account"]
  }
];
