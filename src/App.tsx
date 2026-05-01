import {
  Aperture,
  Bot,
  Captions,
  CheckCircle2,
  Clapperboard,
  Cloud,
  Crop,
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
  Wand2,
  X,
  ZoomIn
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig } from "./lib/config";
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
  badge: string;
}> = [
  {
    id: "module1",
    label: "Transformar",
    icon: Wand2,
    description: "Reprocessa video enviado com look, camera e acabamento.",
    badge: "Video to video"
  },
  {
    id: "module2",
    label: "Storyboard",
    icon: Clapperboard,
    description: "Gera sequencia de cenas a partir de prompt e referencias.",
    badge: "Prompt to video"
  },
  {
    id: "autocut",
    label: "AutoCut",
    icon: Scissors,
    description: "Cria cortes sociais, highlights e variacoes curtas.",
    badge: "Social cuts"
  }
];

const quickPrompts = [
  "Corte os melhores trechos com foco no rosto",
  "Gere legendas dinamicas para Reels",
  "Sugira uma trilha moderna e cortes no beat"
];

const timelineTracks = [
  { name: "Video", className: "clip-1" },
  { name: "Audio", className: "clip-2" },
  { name: "Legendas", className: "clip-3" },
  { name: "Efeitos", className: "clip-4" }
];

type UploadReview = {
  type: "video" | "audio" | "reference";
  fileName: string;
  previewUrl: string | null;
  mediaKind: "video" | "audio" | "image" | "file";
};

type NavLabel = "Studio" | "Assets" | "Audio" | "Legendas" | "Publicar" | "Ajustes";

type NavItem = {
  label: NavLabel;
  path: string;
  icon: typeof Film;
};

const navItems: NavItem[] = [
  { label: "Studio", path: "/studio", icon: Film },
  { label: "Assets", path: "/assets", icon: Image },
  { label: "Audio", path: "/audio", icon: Music2 },
  { label: "Legendas", path: "/legendas", icon: Captions },
  { label: "Publicar", path: "/publicar", icon: Share2 },
  { label: "Ajustes", path: "/ajustes", icon: Settings2 }
];

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Edicao", items: navItems.filter((item) => ["Studio", "Legendas"].includes(item.label)) },
  { label: "Midia", items: navItems.filter((item) => ["Assets", "Audio"].includes(item.label)) },
  { label: "Entrega", items: navItems.filter((item) => ["Publicar", "Ajustes"].includes(item.label)) }
];

const routeByPath = new Map(navItems.map((item) => [item.path, item]));

const sectionPlaceholders: Record<
  Exclude<NavLabel, "Studio">,
  {
    title: string;
    eyebrow: string;
    description: string;
    note: string;
    stats: Array<{ label: string; value: string }>;
    items: Array<{ title: string; description: string; state: string }>;
  }
> = {
  Assets: {
    title: "Assets",
    eyebrow: "Biblioteca",
    description:
      "Organize videos, imagens, logos e referencias antes da geracao.",
    note: "Biblioteca pronta para preparar entradas de video, imagem e marca antes do envio aos fluxos Helena.",
    stats: [
      { label: "Slots", value: "3 refs" },
      { label: "Formatos", value: "Video + imagem" },
      { label: "Origem", value: "Local/URL" }
    ],
    items: [
      {
        title: "Uploads do projeto",
        description: "Centraliza video base, imagens e arquivos de apoio.",
        state: "Pronto"
      },
      {
        title: "Referencias visuais",
        description: "Mantem estilo, personagem, produto e paleta consistentes.",
        state: "Controle"
      },
      {
        title: "Kits de marca",
        description: "Prepara logo, cores e notas para geracao ou edicao.",
        state: "Marca"
      }
    ]
  },
  Audio: {
    title: "Audio",
    eyebrow: "Som e trilha",
    description:
      "Controle trilhas, vozes, stems, efeitos e sincronizacao com o corte.",
    note: "Audio pronto para combinar upload, sugestao por IA e sincronizacao por beat dentro do job.",
    stats: [
      { label: "Entrada", value: "Trilha/voz" },
      { label: "Sync", value: "Beat cut" },
      { label: "Saida", value: "Mix social" }
    ],
    items: [
      {
        title: "Trilha principal",
        description: "Define mood, duracao e ponto de entrada para o corte.",
        state: "Sync"
      },
      {
        title: "Voiceover",
        description: "Reserva roteiro, idioma e guia de narracao.",
        state: "IA"
      },
      {
        title: "Efeitos e stems",
        description: "Separa impactos, transicoes e camadas de acabamento.",
        state: "Mix"
      }
    ]
  },
  Legendas: {
    title: "Legendas",
    eyebrow: "Texto na tela",
    description:
      "Gere, revise e exporte legendas em formatos sociais.",
    note: "Legendas preparadas para transcricao, estilo visual e exportacao SRT/VTT por projeto.",
    stats: [
      { label: "Idioma", value: "PT/EN" },
      { label: "Estilo", value: "Social" },
      { label: "Arquivo", value: "SRT/VTT" }
    ],
    items: [
      {
        title: "Transcricao",
        description: "Cria texto base para fala, gancho e chamadas.",
        state: "Texto"
      },
      {
        title: "Estilo de legenda",
        description: "Define peso, cor, safe area e ritmo de leitura.",
        state: "Visual"
      },
      {
        title: "Exportacao SRT/VTT",
        description: "Prepara arquivo de legenda para plataformas externas.",
        state: "Entrega"
      }
    ]
  },
  Publicar: {
    title: "Publicar",
    eyebrow: "Distribuicao",
    description:
      "Prepare variacoes, metadados e publicacao em canais sociais.",
    note: "Publicacao pronta para empacotar render, copy, hashtags e checklist por canal.",
    stats: [
      { label: "Canais", value: "Reels/TikTok" },
      { label: "Pacote", value: "Render + copy" },
      { label: "Controle", value: "Checklist" }
    ],
    items: [
      {
        title: "Pacote final",
        description: "Consolida video, capa, legenda e arquivos de apoio.",
        state: "Final"
      },
      {
        title: "Copy e hashtags",
        description: "Gera variacoes de titulo, descricao e CTA.",
        state: "IA"
      },
      {
        title: "Agendamento",
        description: "Organiza entrega por plataforma e data de publicacao.",
        state: "Fila"
      }
    ]
  },
  Ajustes: {
    title: "Ajustes",
    eyebrow: "Preferencias",
    description:
      "Configure conta, provedores, presets e chaves do workspace.",
    note: "Ajustes mantem o produto separado e deixa claro quais provedores estao prontos, pendentes ou inativos.",
    stats: [
      { label: "Dados", value: "Supabase" },
      { label: "Motor", value: "Helena API" },
      { label: "Escopo", value: "Separado" }
    ],
    items: [
      {
        title: "Conta",
        description: "Agrupa workspace, permissoes e preferencias de produto.",
        state: "Base"
      },
      {
        title: "Modelos e APIs",
        description: "Lista chaves, provedores e estados operacionais.",
        state: "Ops"
      },
      {
        title: "Padroes do editor",
        description: "Salva qualidade, formato, idioma e presets iniciais.",
        state: "Preset"
      }
    ]
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
  const [timelineZoom, setTimelineZoom] = useState(72);
  const [uploadReview, setUploadReview] = useState<UploadReview | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false);
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
  const apiLabel =
    apiStatus === "online" ? "online" : apiStatus === "blocked" ? "atencao" : "checando";

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

  useEffect(() => {
    return () => {
      if (uploadReview?.previewUrl) {
        URL.revokeObjectURL(uploadReview.previewUrl);
      }
    };
  }, [uploadReview?.previewUrl]);

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

  const submitChat = (preset?: string) => {
    const content = preset ?? chatInput.trim();
    if (!content.trim()) return;
    setMessages((current) => [
      ...current,
      { role: "user", content: content.trim() },
      {
        role: "assistant",
        content:
          "Recebi. Vou transformar isso em direcao criativa, parametros de cena e checklist de producao dentro do job atual."
      }
    ]);
    setChatInput("");
  };

  const openUploadReview = (
    file: File,
    type: UploadReview["type"],
    mediaKind: UploadReview["mediaKind"]
  ) => {
    setCropZoom(1);
    setUploadReview({
      type,
      fileName: file.name,
      previewUrl:
        mediaKind === "video" || mediaKind === "audio" || mediaKind === "image"
          ? URL.createObjectURL(file)
          : null,
      mediaKind
    });
    setStatusLine(`Midia carregada: ${file.name}`);
  };

  const confirmUploadReview = () => {
    setStatusLine(`Enquadramento confirmado em ${cropZoom.toFixed(1)}x`);
    setUploadReview(null);
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
          <img
            alt="Helena Video"
            decoding="async"
            height={58}
            src="/helena-video-logo-small.jpeg"
            width={58}
          />
        </div>
        <nav className="rail-nav" aria-label="Ferramentas">
          {navGroups.map((group) => (
            <div className="rail-group" key={group.label}>
              <span className="rail-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activeTool === item.label ? "nav-button active" : "nav-button"}
                    key={item.label}
                    onClick={() => openTool(item)}
                    title={item.label}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="meta-label">Helena Video Studio</p>
            <h1>Editor IA independente</h1>
          </div>
          <div className="topbar-actions">
            <span
              className={supabaseStatus === "online" ? "status good" : "status warn"}
              title={`Supabase ${supabaseLabel(supabaseStatus)}`}
            >
              <Cloud size={15} />
              Dados {supabaseLabel(supabaseStatus)}
            </span>
            <span
              className={apiStatus === "online" ? "status good" : apiStatus === "blocked" ? "status warn" : "status"}
              title={`Helena API ${apiLabel}`}
            >
              <Gauge size={15} />
              Motor IA {apiLabel}
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
            <div className="section-dashboard">
              <div className="section-list">
                {activeSection.items.map((item) => (
                  <button
                    className="section-list-item"
                    key={item.title}
                    onClick={() =>
                      setStatusLine(`${activeSection.title}: ${item.title} pronto para configurar`)
                    }
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                    <small>{item.state}</small>
                  </button>
                ))}
              </div>
              <aside className="section-inspector">
                <span className="meta-label">Operacao</span>
                <h3>Fila Helena</h3>
                <div className="section-stats">
                  {activeSection.stats.map((stat) => (
                    <div key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
            <div className="section-note">
              {statusLine.startsWith(`${activeSection.title}:`) ? statusLine : activeSection.note}
            </div>
          </section>
        ) : (
        <div className={isAssistantCollapsed ? "studio-grid assistant-collapsed" : "studio-grid"}>
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
                    title={module.description}
                  >
                    <Icon size={18} />
                    <span>{module.label}</span>
                    <small>{module.badge}</small>
                    <p>{module.description}</p>
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

            <details className="advanced-settings">
              <summary>Controles avancados</summary>
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
            </details>
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
                  <img
                    alt=""
                    decoding="async"
                    height={192}
                    loading="lazy"
                    src="/helena-video-logo-small.jpeg"
                    width={240}
                  />
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
                <div>
                  <span aria-live="polite">{statusLine}</span>
                  <strong>00:00 / 00:{String(form.durationSeconds).padStart(2, "0")}</strong>
                </div>
                <label className="timeline-zoom">
                  <ZoomIn size={14} />
                  <input
                    aria-label="Zoom da timeline"
                    type="range"
                    min={48}
                    max={132}
                    value={timelineZoom}
                    onChange={(event) => setTimelineZoom(Number(event.target.value))}
                  />
                  <span>{timelineZoom}%</span>
                </label>
              </div>
              {timelineTracks.map((track, index) => (
                <div className="track" key={track.name}>
                  <span>{track.name}</span>
                  <div className="clip-row">
                    {track.name === "Video" ? (
                      <div className="clip-strip" style={{ width: `${timelineZoom + 58}%` }}>
                        {Array.from({ length: form.shotCount }).map((_, shotIndex) => (
                          <div className="clip-thumb" key={shotIndex}>
                            <span>{shotIndex + 1}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`clip ${track.className}`}
                        style={{ width: `${Math.min(96, 46 + index * 12 + timelineZoom / 6)}%` }}
                      >
                        {track.name === "Audio" ? "Sincronia com trilha" : track.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className={isAssistantCollapsed ? "right-panel collapsed" : "right-panel"}>
            <div className="panel-title panel-title-with-action">
              <div className="panel-title-main">
                <Bot size={18} />
                <span>Helena IA</span>
              </div>
              <button
                aria-label={isAssistantCollapsed ? "Expandir Helena IA" : "Recolher Helena IA"}
                className="panel-toggle"
                onClick={() => setIsAssistantCollapsed((current) => !current)}
                type="button"
              >
                <MessageSquareText size={16} />
              </button>
            </div>
            {isAssistantCollapsed ? (
              <button
                className="assistant-collapsed-card"
                onClick={() => setIsAssistantCollapsed(false)}
                type="button"
              >
                <Bot size={18} />
                <span>IA pronta</span>
              </button>
            ) : (
              <>
            <div className="chat-feed">
              {messages.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="quick-prompts" aria-label="Comandos rapidos da Helena">
              {quickPrompts.map((prompt) => (
                <button key={prompt} onClick={() => submitChat(prompt)}>
                  {prompt}
                </button>
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
              <button onClick={() => submitChat()} aria-label="Enviar mensagem">
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
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setVideoFile(file);
                    if (file) openUploadReview(file, "video", "video");
                  }}
                />
              </label>
              <label className="upload-box">
                <Music2 size={18} />
                <span>{audioFile ? audioFile.name : "Audio / trilha"}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAudioFile(file);
                    if (file) openUploadReview(file, "audio", "audio");
                  }}
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
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).slice(0, 3);
                    setReferenceFiles(files);
                    if (files[0]) openUploadReview(files[0], "reference", "image");
                  }}
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
              </>
            )}
          </aside>
        </div>
        )}
      </section>
      {uploadReview ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label="Ajuste de midia"
            aria-modal="true"
            className="upload-modal"
            role="dialog"
          >
            <header className="modal-head">
              <div>
                <span className="meta-label">
                  {uploadReview.type === "reference" ? "Referencia visual" : uploadReview.type}
                </span>
                <h2>Ajuste antes de editar</h2>
              </div>
              <button
                aria-label="Fechar ajuste de midia"
                className="icon-button"
                onClick={() => setUploadReview(null)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="crop-preview">
              {uploadReview.mediaKind === "video" && uploadReview.previewUrl ? (
                <video
                  controls
                  muted
                  src={uploadReview.previewUrl}
                  style={{ transform: `scale(${cropZoom})` }}
                />
              ) : null}
              {uploadReview.mediaKind === "image" && uploadReview.previewUrl ? (
                <img
                  alt=""
                  src={uploadReview.previewUrl}
                  style={{ transform: `scale(${cropZoom})` }}
                />
              ) : null}
              {uploadReview.mediaKind === "audio" && uploadReview.previewUrl ? (
                <div className="audio-preview">
                  <Music2 size={26} />
                  <audio controls src={uploadReview.previewUrl} />
                </div>
              ) : null}
              <div className="crop-safe-area" />
            </div>

            <div className="modal-controls">
              <div>
                <strong>{uploadReview.fileName}</strong>
                <span>Prepare enquadramento, zoom e revisao antes do job.</span>
              </div>
              <label>
                <Crop size={16} />
                Zoom
                <input
                  aria-label="Zoom do enquadramento"
                  max={2}
                  min={1}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                  step={0.1}
                  type="range"
                  value={cropZoom}
                />
                <span>{cropZoom.toFixed(1)}x</span>
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setUploadReview(null)}>
                Cancelar
              </button>
              <button className="primary-button" onClick={confirmUploadReview}>
                Confirmar enquadramento
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;

function supabaseLabel(status: "checking" | "online" | "invalid" | "missing") {
  if (status === "online") return "online";
  if (status === "invalid") return "atencao";
  if (status === "missing") return "pendente";
  return "checando";
}
