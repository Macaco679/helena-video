import {
  Aperture,
  Bot,
  Captions,
  CheckCircle2,
  Clapperboard,
  Cloud,
  Download,
  Film,
  Gauge,
  Image,
  Layers3,
  MessageSquareText,
  Music2,
  Play,
  Rocket,
  Scissors,
  Settings2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appConfig, hasSupabaseConfig } from "./lib/config";
import { createHelenaJob, fetchHealth } from "./lib/helenaApi";
import { providerMatrix } from "./lib/providers";
import { checkSupabaseConnection } from "./lib/supabase";
import type { ChatMessage, GenerationForm, HelenaModule } from "./lib/types";

const initialForm: GenerationForm = {
  module: "module2",
  prompt:
    "Crie um video vertical cinematografico para lancamento de produto, com cortes rapidos, camera tracking e textura premium.",
  referenceNotes: "Manter logo e paleta Helena Video: preto, amarelo, magenta e violeta.",
  creativeProfile: "social-premium",
  preferredModel: "helena-native",
  qualityProfile: "cinema",
  cameraPreset: "tracking-push",
  motionIntensity: "balanced",
  continuityMode: "character+style",
  durationSeconds: 18,
  shotCount: 6,
  audioMode: "sync-from-upload",
  aspectRatio: "9:16",
  fps: 30
};

const assistantSeed: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Helena Video pronta para roteirizar, gerar, cortar, legendar e preparar publicacao. Envie briefing, midia ou escolha um preset."
  },
  {
    role: "system",
    content:
      "Modo seguro ativo: produto separado, sem tocar FelpaMusic/Vitrinno e sem deploy automatico."
  }
];

const modules: Array<{
  id: HelenaModule;
  label: string;
  icon: typeof Wand2;
  description: string;
}> = [
  {
    id: "module1",
    label: "Transformar",
    icon: Wand2,
    description: "Reprocessa video enviado com look, camera e acabamento."
  },
  {
    id: "module2",
    label: "Storyboard",
    icon: Clapperboard,
    description: "Gera sequencia de cenas a partir de prompt e referencias."
  },
  {
    id: "autocut",
    label: "AutoCut",
    icon: Scissors,
    description: "Cria cortes sociais, highlights e variacoes curtas."
  }
];

type NavLabel = "Studio" | "Assets" | "Audio" | "Legendas" | "Publicar" | "Ajustes";

const navItems: Array<{
  label: NavLabel;
  path: string;
  icon: typeof Film;
}> = [
  { label: "Studio", path: "/studio", icon: Film },
  { label: "Assets", path: "/assets", icon: Image },
  { label: "Audio", path: "/audio", icon: Music2 },
  { label: "Legendas", path: "/legendas", icon: Captions },
  { label: "Publicar", path: "/publicar", icon: Share2 },
  { label: "Ajustes", path: "/ajustes", icon: Settings2 }
];

const routeByPath = new Map(navItems.map((item) => [item.path, item]));

const sectionPlaceholders: Record<
  Exclude<NavLabel, "Studio">,
  {
    title: string;
    eyebrow: string;
    description: string;
    items: string[];
  }
> = {
  Assets: {
    title: "Assets",
    eyebrow: "Biblioteca",
    description:
      "Area reservada para organizar videos, imagens, logos e referencias antes da geracao.",
    items: ["Uploads do projeto", "Referencias visuais", "Kits de marca"]
  },
  Audio: {
    title: "Audio",
    eyebrow: "Som e trilha",
    description:
      "Area reservada para trilhas, vozes, stems, efeitos e sincronizacao com o corte.",
    items: ["Trilha principal", "Voiceover", "Efeitos e stems"]
  },
  Legendas: {
    title: "Legendas",
    eyebrow: "Texto na tela",
    description:
      "Area reservada para gerar, revisar e exportar legendas em formatos sociais.",
    items: ["Transcricao", "Estilo de legenda", "Exportacao SRT/VTT"]
  },
  Publicar: {
    title: "Publicar",
    eyebrow: "Distribuicao",
    description:
      "Area reservada para preparar variacoes, metadados e publicacao em canais sociais.",
    items: ["Pacote final", "Copy e hashtags", "Agendamento"]
  },
  Ajustes: {
    title: "Ajustes",
    eyebrow: "Preferencias",
    description:
      "Area reservada para configurar conta, provedores, presets e chaves do workspace.",
    items: ["Conta", "Modelos e APIs", "Padroes do editor"]
  }
};

function routeFromPath(pathname: string) {
  let normalizedPath = pathname || "/";

  while (normalizedPath.startsWith("/r/")) {
    normalizedPath = normalizedPath.slice(2);
  }

  if (normalizedPath === "/" || normalizedPath === "/r") {
    normalizedPath = "/studio";
  }

  const item = routeByPath.get(normalizedPath) ?? routeByPath.get("/studio")!;
  return item;
}

function initialToolFromLocation(): NavLabel {
  if (typeof window === "undefined") return "Studio";
  return routeFromPath(window.location.pathname).label;
}

const providerStateLabels = {
  ready: "pronto",
  planned: "planejado",
  "needs-key": "chave",
  inactive: "inativo"
} as const;

function App() {
  const [form, setForm] = useState(initialForm);
  const [activeTool, setActiveTool] = useState<NavLabel>(initialToolFromLocation);
  const [messages, setMessages] = useState<ChatMessage[]>(assistantSeed);
  const [chatInput, setChatInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [statusLine, setStatusLine] = useState("Workspace local pronto");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "blocked">("checking");
  const [supabaseStatus, setSupabaseStatus] = useState<
    "checking" | "online" | "invalid" | "missing"
  >(hasSupabaseConfig ? "checking" : "missing");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === form.module)!,
    [form.module]
  );

  const activeSection = activeTool === "Studio" ? null : sectionPlaceholders[activeTool];

  useEffect(() => {
    const syncRoute = () => {
      const route = routeFromPath(window.location.pathname);
      setActiveTool(route.label);

      if (window.location.pathname !== route.path) {
        window.history.replaceState(null, "", route.path);
      }
    };

    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkSupabaseConnection()
      .then((status) => {
        if (isMounted) setSupabaseStatus(status);
      })
      .catch(() => {
        if (isMounted) setSupabaseStatus("invalid");
      });

    fetchHealth()
      .then(() => {
        if (isMounted) setApiStatus("online");
      })
      .catch(() => {
        if (isMounted) setApiStatus("blocked");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateForm = <K extends keyof GenerationForm>(
    key: K,
    value: GenerationForm[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openTool = (item: (typeof navItems)[number]) => {
    setActiveTool(item.label);
    setStatusLine(`Ferramenta ativa: ${item.label}`);

    if (window.location.pathname !== item.path) {
      window.history.pushState(null, "", item.path);
    }
  };

  const submitChat = () => {
    if (!chatInput.trim()) return;
    setMessages((current) => [
      ...current,
      { role: "user", content: chatInput.trim() },
      {
        role: "assistant",
        content:
          "Recebi. Vou transformar isso em direcao criativa, parametros de cena e checklist de producao dentro do job atual."
      }
    ]);
    setChatInput("");
  };

  const exportProject = () => {
    const payload = {
      product: "Helena Video",
      activeTool,
      form,
      files: {
        video: videoFile?.name ?? null,
        audio: audioFile?.name ?? null,
        references: referenceFiles.map((file) => file.name)
      },
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "helena-video-project.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatusLine("Projeto exportado em JSON");
  };

  const togglePreview = () => {
    setIsPreviewPlaying((current) => {
      const next = !current;
      setStatusLine(next ? "Preview em reprodução" : "Preview pausado");
      return next;
    });
  };

  const submitJob = async () => {
    setIsSubmitting(true);
    setStatusLine("Enviando job para Helena API...");

    try {
      const result = await createHelenaJob(form, {
        video: videoFile,
        audio: audioFile,
        references: referenceFiles
      });
      setStatusLine(`Job criado: ${result.job_id ?? result.id ?? "sem id retornado"}`);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Job ${result.job_id ?? result.id ?? "Helena"} enviado para ${selectedModule.label}.`
        }
      ]);
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "Falha ao criar job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark">
          <img src="/helena-video-logo.jpeg" alt="Helena Video" />
        </div>
        <nav className="rail-nav" aria-label="Ferramentas">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTool === item.label ? "nav-button active" : "nav-button"}
                key={item.label}
                onClick={() => openTool(item)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="meta-label">Helena Video Studio</p>
            <h1>Editor IA independente</h1>
          </div>
          <div className="topbar-actions">
            <span className={supabaseStatus === "online" ? "status good" : "status warn"}>
              <Cloud size={15} />
              Supabase {supabaseLabel(supabaseStatus)}
            </span>
            <span className={apiStatus === "online" ? "status good" : apiStatus === "blocked" ? "status warn" : "status"}>
              <Gauge size={15} />
              API {apiStatus === "online" ? "online" : apiStatus === "blocked" ? "bloqueada" : appConfig.helenaProxyUrl ? "proxy" : "checando"}
            </span>
            <button className="ghost-button" onClick={exportProject}>
              <Download size={16} />
              Exportar
            </button>
            <button className="primary-button" onClick={submitJob} disabled={isSubmitting}>
              <Rocket size={16} />
              {isSubmitting ? "Gerando" : "Gerar"}
            </button>
          </div>
        </header>

        {activeSection ? (
          <section className="section-placeholder" aria-label={activeSection.title}>
            <div className="section-hero">
              <span className="meta-label">{activeSection.eyebrow}</span>
              <h2>{activeSection.title}</h2>
              <p>{activeSection.description}</p>
            </div>
            <div className="section-list">
              {activeSection.items.map((item) => (
                <div className="section-list-item" key={item}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="section-note">
              Esta secao esta preparada no frontend e sera conectada aos fluxos da Helena conforme
              as APIs forem liberadas.
            </div>
          </section>
        ) : (
        <div className="studio-grid">
          <section className="left-panel">
            <div className="panel-title">
              <SlidersHorizontal size={18} />
              <span>Parametros</span>
            </div>

            <div className="module-switcher">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    className={form.module === module.id ? "module-card selected" : "module-card"}
                    key={module.id}
                    onClick={() => updateForm("module", module.id)}
                  >
                    <Icon size={18} />
                    <span>{module.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="field">
              Prompt
              <textarea
                value={form.prompt}
                onChange={(event) => updateForm("prompt", event.target.value)}
                rows={5}
              />
            </label>

            <label className="field">
              Notas de referencia
              <textarea
                value={form.referenceNotes}
                onChange={(event) => updateForm("referenceNotes", event.target.value)}
                rows={3}
              />
            </label>

            <div className="field-grid">
              <label className="field">
                Modelo
                <select
                  value={form.preferredModel}
                  onChange={(event) => updateForm("preferredModel", event.target.value)}
                >
                  {providerMatrix.map((provider) => (
                    <option value={provider.id} key={provider.id}>
                      {provider.id === "helena-native" ? "Helena Native" : provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Qualidade
                <select
                  value={form.qualityProfile}
                  onChange={(event) =>
                    updateForm("qualityProfile", event.target.value as GenerationForm["qualityProfile"])
                  }
                >
                  <option value="fast">Fast</option>
                  <option value="pro">Pro</option>
                  <option value="cinema">Cinema</option>
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                Duracao
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={form.durationSeconds}
                  onChange={(event) => updateForm("durationSeconds", Number(event.target.value))}
                />
              </label>
              <label className="field">
                Cenas
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.shotCount}
                  onChange={(event) => updateForm("shotCount", Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="canvas-zone">
            <div className="canvas-toolbar">
              <div>
                <span className="meta-label">Projeto</span>
                <strong>Campanha Helena Launch</strong>
                <span className="format-label">Formato {form.aspectRatio}</span>
              </div>
              <div className="segmented-control">
                {(["9:16", "16:9", "1:1"] as const).map((ratio) => (
                  <button
                    className={form.aspectRatio === ratio ? "active" : ""}
                    key={ratio}
                    onClick={() => {
                      updateForm("aspectRatio", ratio);
                      setStatusLine(`Formato ${ratio} selecionado`);
                    }}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="preview-stage">
              <div className="preview-phone">
                <div className="preview-topline" />
                <div className="preview-logo">
                  <img src="/helena-video-logo.jpeg" alt="" />
                </div>
                <div className="preview-copy">
                  <span>{selectedModule.label}</span>
                  <strong>Corte IA cinemático</strong>
                </div>
                <button
                  className={isPreviewPlaying ? "play-button playing" : "play-button"}
                  aria-label={isPreviewPlaying ? "Pausar preview" : "Reproduzir preview"}
                  onClick={togglePreview}
                >
                  <Play size={22} fill="currentColor" />
                </button>
              </div>
            </div>

            <div className="timeline">
              <div className="timeline-head">
                <span>{statusLine}</span>
                <span>00:00 / 00:{String(form.durationSeconds).padStart(2, "0")}</span>
              </div>
              {["Vídeo", "Áudio", "Legendas", "Efeitos"].map((track, index) => (
                <div className="track" key={track}>
                  <span>{track}</span>
                  <div className="clip-row">
                    <div className={`clip clip-${index + 1}`} style={{ width: `${52 + index * 9}%` }}>
                      {track === "Vídeo" ? selectedModule.description : track}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="right-panel">
            <div className="panel-title">
              <Bot size={18} />
              <span>Helena IA</span>
            </div>
            <div className="chat-feed">
              {messages.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitChat();
                }}
                placeholder="Pedir roteiro, legenda, corte..."
              />
              <button onClick={submitChat} aria-label="Enviar mensagem">
                <MessageSquareText size={17} />
              </button>
            </div>

            <div className="upload-stack">
              <label className="upload-box">
                <Upload size={18} />
                <span>{videoFile ? videoFile.name : "Video base"}</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="upload-box">
                <Music2 size={18} />
                <span>{audioFile ? audioFile.name : "Audio / trilha"}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="upload-box">
                <Layers3 size={18} />
                <span>
                  {referenceFiles.length
                    ? `${referenceFiles.length} referencias`
                    : "Referencias visuais"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) =>
                    setReferenceFiles(Array.from(event.target.files ?? []).slice(0, 3))
                  }
                />
              </label>
            </div>

            <div className="provider-list">
              <div className="panel-title compact">
                <Sparkles size={17} />
                <span>Ferramentas</span>
              </div>
              {providerMatrix.map((provider) => (
                <div className="provider-row" key={provider.id}>
                  <div>
                    <strong>{provider.name}</strong>
                    <span>{provider.summary}</span>
                  </div>
                  <span className={`provider-state ${provider.state}`}>
                    {provider.state === "ready" ? <CheckCircle2 size={14} /> : <Aperture size={14} />}
                    {providerStateLabels[provider.state]}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
        )}
      </section>
    </main>
  );
}

export default App;

function supabaseLabel(status: "checking" | "online" | "invalid" | "missing") {
  if (status === "online") return "online";
  if (status === "invalid") return "chave inválida";
  if (status === "missing") return "pendente";
  return "checando";
}
