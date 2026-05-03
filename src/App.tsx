import {
  Aperture,
  AlertTriangle,
  Bot,
  Captions,
  CheckCircle2,
  Clapperboard,
  Cloud,
  CreditCard,
  Crop,
  Download,
  Film,
  Gauge,
  Image,
  KeyRound,
  Layers3,
  ListChecks,
  MessageSquareText,
  Music2,
  Play,
  Rocket,
  Scissors,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wallet,
  Wand2,
  Workflow,
  X,
  ZoomIn
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig } from "./lib/config";
import { createHelenaJob, fetchHealth } from "./lib/helenaApi";
import { providerMatrix } from "./lib/providers";
import { checkSupabaseConnection } from "./lib/supabase";
import type { ChatMessage, GenerationForm, HelenaModule, ProviderStatus } from "./lib/types";

const initialForm: GenerationForm = {
  module: "module2",
  prompt:
    "Crie um video vertical cinematográfico para lançamento de produto, com cortes rápidos, câmera tracking e textura premium.",
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
  fps: 30,
  negativePrompt: "Evitar texto ilegível, mãos deformadas, cortes bruscos e flicker.",
  seed: "",
  resolution: "1080p",
  variationCount: 2
};

const assistantSeed: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Pronta para montar roteiro, corte, legenda e pacote final."
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
    description: "Reprocessa video enviado com look, câmera e acabamento.",
    badge: "Video to video"
  },
  {
    id: "module2",
    label: "Storyboard",
    icon: Clapperboard,
    description: "Gera sequência de cenas a partir de prompt e referências.",
    badge: "Prompt to video"
  },
  {
    id: "autocut",
    label: "AutoCut",
    icon: Scissors,
    description: "Cria cortes sociais, highlights e variações curtas.",
    badge: "Social cuts"
  }
];

const quickPrompts = [
  "Corte os melhores trechos com foco no rosto",
  "Gere legendas dinâmicas para Reels",
  "Sugira uma trilha moderna e cortes no beat"
];

const timelineTracks = [
  { name: "Video", className: "clip-1" },
  { name: "Audio", className: "clip-2" },
  { name: "Legendas", className: "clip-3" },
  { name: "Efeitos", className: "clip-4" }
];

const benchmarkCriteria = [
  {
    label: "Storyboard",
    value: "shots editáveis",
    detail: "Sora e Flow elevam o padrão com controle por cena, duração e narrativa."
  },
  {
    label: "Controle",
    value: "câmera + seed",
    detail: "Runway e Kling dependem de parâmetros explícitos para consistência."
  },
  {
    label: "Providers",
    value: "roteamento",
    detail: "Helena precisa comparar modelos sem acoplar o produto a um único motor."
  },
  {
    label: "Entrega",
    value: "QA + publicação",
    detail: "O diferencial competitivo é sair do prompt e chegar ao pacote final."
  }
];

const productionChecklist = [
  "Prompt com intenção, câmera, ritmo e restrições",
  "Referências e notas de continuidade documentadas",
  "Provider pronto ou chave configurada no backend",
  "Formato, duração, FPS, resolução e variações definidos"
];

type UploadReview = {
  type: "video" | "audio" | "reference";
  fileName: string;
  previewUrl: string | null;
  mediaKind: "video" | "audio" | "image" | "file";
};

type NavLabel =
  | "Studio"
  | "Legendas"
  | "Assets"
  | "Audio"
  | "Publicar"
  | "Ajustes"
  | "Auth"
  | "Pagamentos"
  | "Carteira"
  | "Planos";

type NavItem = {
  label: NavLabel;
  path: string;
  icon: typeof Film;
};

const navItems: NavItem[] = [
  { label: "Studio", path: "/studio", icon: Film },
  { label: "Legendas", path: "/legendas", icon: Captions },
  { label: "Assets", path: "/assets", icon: Image },
  { label: "Audio", path: "/audio", icon: Music2 },
  { label: "Publicar", path: "/publicar", icon: Share2 },
  { label: "Ajustes", path: "/ajustes", icon: Settings2 },
  { label: "Auth", path: "/auth", icon: KeyRound },
  { label: "Pagamentos", path: "/pagamentos", icon: CreditCard },
  { label: "Carteira", path: "/carteira", icon: Wallet },
  { label: "Planos", path: "/planos", icon: Sparkles }
];

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Edição", items: navItems.filter((item) => ["Studio", "Legendas"].includes(item.label)) },
  { label: "Mídia", items: navItems.filter((item) => ["Assets", "Audio"].includes(item.label)) },
  { label: "Entrega", items: navItems.filter((item) => ["Publicar", "Ajustes"].includes(item.label)) },
  { label: "Conta", items: navItems.filter((item) => ["Planos", "Pagamentos", "Carteira"].includes(item.label)) }
];

const routeByPath = new Map([
  ...navItems.map((item) => [item.path, item] as const),
  ["/", navItems[0]],
  ["/login", navItems.find((item) => item.label === "Auth")!],
  ["/faturamento", navItems.find((item) => item.label === "Pagamentos")!],
  ["/billing", navItems.find((item) => item.label === "Pagamentos")!],
  ["/wallet", navItems.find((item) => item.label === "Carteira")!],
  ["/pricing", navItems.find((item) => item.label === "Planos")!],
]);

const sectionPlaceholders: Partial<Record<
  Exclude<NavLabel, "Studio">,
  {
    title: string;
    eyebrow: string;
    description: string;
    note: string;
    stats: Array<{ label: string; value: string }>;
    items: Array<{ title: string; description: string; state: string }>;
  }
>> = {
  Assets: {
    title: "Assets",
    eyebrow: "Biblioteca",
    description:
      "Organize videos, imagens, logos e referências antes da geração.",
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
        title: "Referências visuais",
        description: "Mantem estilo, personagem, produto e paleta consistentes.",
        state: "Controle"
      },
      {
        title: "Kits de marca",
        description: "Prepara logo, cores e notas para geração ou edição.",
        state: "Marca"
      }
    ]
  },
  Audio: {
    title: "Audio",
    eyebrow: "Som e trilha",
    description:
      "Controle trilhas, vozes, stems, efeitos e sincronização com o corte.",
    note: "Áudio pronto para combinar upload, sugestão por IA e sincronização por beat dentro do job.",
    stats: [
      { label: "Entrada", value: "Trilha/voz" },
      { label: "Sync", value: "Beat cut" },
      { label: "Saida", value: "Mix social" }
    ],
    items: [
      {
        title: "Trilha principal",
        description: "Define mood, duração e ponto de entrada para o corte.",
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
    note: "Legendas preparadas para transcrição, estilo visual e exportação SRT/VTT por projeto.",
    stats: [
      { label: "Idioma", value: "PT/EN" },
      { label: "Estilo", value: "Social" },
      { label: "Arquivo", value: "SRT/VTT" }
    ],
    items: [
      {
        title: "Transcrição",
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
      "Prepare variações, metadados e publicação em canais sociais.",
    note: "Publicação pronta para empacotar render, copy, hashtags e checklist por canal.",
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
        description: "Gera variações de título, descrição e CTA.",
        state: "IA"
      },
      {
        title: "Agendamento",
        description: "Organiza entrega por plataforma e data de publicação.",
        state: "Fila"
      }
    ]
  },
  Ajustes: {
    title: "Ajustes",
    eyebrow: "Preferências",
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
        description: "Agrupa workspace, permissões e preferências de produto.",
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
  const selectedProvider = useMemo(
    () => providerMatrix.find((provider) => provider.id === form.preferredModel),
    [form.preferredModel]
  );
  const storyboardShots = useMemo(() => buildStoryboardShots(form), [form]);
  const validationIssues = useMemo(
    () => validateGeneration(form, selectedProvider?.state, {
      hasVideo: Boolean(videoFile)
    }),
    [form, selectedProvider?.state, videoFile]
  );
  const canSubmit = validationIssues.length === 0 && !isSubmitting;

  const activeSection = activeTool === "Studio" ? null : sectionPlaceholders[activeTool];
  const apiLabel =
    apiStatus === "online" ? "online" : apiStatus === "blocked" ? "atenção" : "checando";

  useEffect(() => {
    const syncRoute = () => {
      const route = routeFromPath(window.location.pathname);
      setActiveTool(route.label);

      if (!routeByPath.has(window.location.pathname) && window.location.pathname !== route.path) {
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
          "Recebi. Vou transformar isso em direção criativa, parâmetros de cena e checklist de produção dentro do job atual."
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
    setStatusLine(`Mídia carregada: ${file.name}`);
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
    if (validationIssues.length > 0) {
      setStatusLine(`Revise antes de gerar: ${validationIssues[0]}`);
      return;
    }

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
    <main
      className={
        activeTool === "Auth"
          ? "app-shell auth-layout"
          : activeTool === "Studio"
            ? "app-shell"
            : "app-shell page-layout"
      }
    >
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
            <button className="primary-button" onClick={submitJob} disabled={!canSubmit}>
              <Rocket size={16} />
              {isSubmitting ? "Gerando" : "Gerar"}
            </button>
          </div>
        </header>

        {activeTool !== "Studio" ? (
          <WorkspacePage
            apiStatus={apiStatus}
            setStatusLine={setStatusLine}
            statusLine={statusLine}
            supabaseStatus={supabaseStatus}
            tool={activeTool}
          />
        ) : activeSection ? (
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
                <span className="meta-label">Operação</span>
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
              <span>Parâmetros</span>
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
              Notas de referência
              <textarea
                value={form.referenceNotes}
                onChange={(event) => updateForm("referenceNotes", event.target.value)}
                rows={3}
              />
            </label>

            <details className="advanced-settings">
              <summary>Controles avançados</summary>
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
                  Duração
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

              <div className="field-grid">
                <label className="field">
                  Câmera
                  <select
                    value={form.cameraPreset}
                    onChange={(event) => updateForm("cameraPreset", event.target.value)}
                  >
                    <option value="tracking-push">Tracking push</option>
                    <option value="slow-dolly">Slow dolly</option>
                    <option value="handheld-realism">Handheld realism</option>
                    <option value="locked-product">Locked product</option>
                  </select>
                </label>
                <label className="field">
                  Movimento
                  <select
                    value={form.motionIntensity}
                    onChange={(event) =>
                      updateForm("motionIntensity", event.target.value as GenerationForm["motionIntensity"])
                    }
                  >
                    <option value="subtle">Sutil</option>
                    <option value="balanced">Balanceado</option>
                    <option value="aggressive">Agressivo</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  Continuidade
                  <select
                    value={form.continuityMode}
                    onChange={(event) =>
                      updateForm("continuityMode", event.target.value as GenerationForm["continuityMode"])
                    }
                  >
                    <option value="none">Livre</option>
                    <option value="style">Estilo</option>
                    <option value="character">Personagem</option>
                    <option value="character+style">Personagem + estilo</option>
                  </select>
                </label>
                <label className="field">
                  Áudio
                  <select
                    value={form.audioMode}
                    onChange={(event) => updateForm("audioMode", event.target.value as GenerationForm["audioMode"])}
                  >
                    <option value="sync-from-upload">Sincronizar upload</option>
                    <option value="video-audio">Áudio do vídeo</option>
                    <option value="no-audio">Sem áudio</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  Resolução
                  <select
                    value={form.resolution}
                    onChange={(event) => updateForm("resolution", event.target.value as GenerationForm["resolution"])}
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4k">4K upscale</option>
                  </select>
                </label>
                <label className="field">
                  FPS
                  <select
                    value={form.fps}
                    onChange={(event) => updateForm("fps", Number(event.target.value) as GenerationForm["fps"])}
                  >
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  Variações
                  <select
                    value={form.variationCount}
                    onChange={(event) =>
                      updateForm("variationCount", Number(event.target.value) as GenerationForm["variationCount"])
                    }
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <label className="field">
                  Seed
                  <input
                    type="number"
                    min={0}
                    placeholder="auto"
                    value={form.seed}
                    onChange={(event) =>
                      updateForm("seed", event.target.value === "" ? "" : Number(event.target.value))
                    }
                  />
                </label>
              </div>

              <label className="field">
                Prompt negativo
                <textarea
                  value={form.negativePrompt}
                  onChange={(event) => updateForm("negativePrompt", event.target.value)}
                  rows={3}
                />
              </label>
            </details>

            <div className="quality-gate">
              <div className="panel-title compact">
                <ShieldCheck size={17} />
                <span>Checklist de geração</span>
              </div>
              {validationIssues.length ? (
                <ul className="issue-list">
                  {validationIssues.map((issue) => (
                    <li key={issue}>
                      <AlertTriangle size={14} />
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="quality-ready">
                  <CheckCircle2 size={16} />
                  Job pronto para envio seguro.
                </div>
              )}
              <div className="quality-items">
                {productionChecklist.map((item) => (
                  <span key={item}>
                    <ListChecks size={13} />
                    {item}
                  </span>
                ))}
              </div>
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

            <div className="storyboard-board" aria-label="Storyboard planejado">
              <div className="storyboard-head">
                <div>
                  <span className="meta-label">Storyboard</span>
                  <strong>{form.shotCount} cenas planejadas</strong>
                </div>
                <span>{form.durationSeconds}s · {form.resolution} · {form.variationCount} var.</span>
              </div>
              <div className="shot-list">
                {storyboardShots.map((shot) => (
                  <button
                    className="shot-card"
                    key={shot.index}
                    onClick={() => setStatusLine(`Cena ${shot.index}: ${shot.goal}`)}
                    type="button"
                  >
                    <small>{String(shot.index).padStart(2, "0")}</small>
                    <strong>{shot.goal}</strong>
                    <span>{shot.direction}</span>
                  </button>
                ))}
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
                    ? `${referenceFiles.length} referências`
                    : "Referências visuais"}
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
                    {provider.state === "ready" ? (
                      <CheckCircle2 size={14} />
                    ) : provider.state === "needs-key" ? (
                      <KeyRound size={14} />
                    ) : (
                      <Aperture size={14} />
                    )}
                    {providerStateLabels[provider.state]}
                  </span>
                </div>
              ))}
            </div>
            <div className="benchmark-list">
              <div className="panel-title compact">
                <Workflow size={17} />
                <span>Padrão competitivo</span>
              </div>
              {benchmarkCriteria.map((item) => (
                <div className="benchmark-row" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <em>{item.value}</em>
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
            aria-label="Ajuste de mídia"
            aria-modal="true"
            className="upload-modal"
            role="dialog"
          >
            <header className="modal-head">
              <div>
                <span className="meta-label">
                  {uploadReview.type === "reference" ? "Referência visual" : uploadReview.type}
                </span>
                <h2>Ajuste antes de editar</h2>
              </div>
              <button
                aria-label="Fechar ajuste de mídia"
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

type WorkspacePageProps = {
  tool: Exclude<NavLabel, "Studio">;
  statusLine: string;
  setStatusLine: (value: string) => void;
  supabaseStatus: "checking" | "online" | "invalid" | "missing";
  apiStatus: "checking" | "online" | "blocked";
};

type WorkspaceMeta = {
  title: string;
  subtitle: string;
  action: string;
};

const workspaceMeta: Record<Exclude<NavLabel, "Studio">, WorkspaceMeta> = {
  Legendas: {
    title: "Legendas",
    subtitle: "Crie legendas com IA de alta precisao e publique em qualquer plataforma.",
    action: "Gerar legendas agora"
  },
  Assets: {
    title: "Assets",
    subtitle: "Organize videos, imagens, logos e referencias antes de gerar.",
    action: "Enviar midia"
  },
  Audio: {
    title: "Audio",
    subtitle: "Crie, ajuste e mixe o audio do seu projeto.",
    action: "Gerar mix final"
  },
  Publicar: {
    title: "Publicar",
    subtitle: "Compartilhe seu video com o mundo.",
    action: "Agendar publicacao"
  },
  Ajustes: {
    title: "Ajustes",
    subtitle: "Personalize. Conecte. Crie sem limites.",
    action: "Logs do sistema"
  },
  Auth: {
    title: "Entrar",
    subtitle: "Acesse sua conta Helena Video",
    action: "Continuar"
  },
  Pagamentos: {
    title: "Faturamento",
    subtitle: "Gerencie seus pagamentos, planos e metodos.",
    action: "Historico de faturas"
  },
  Carteira: {
    title: "Carteira",
    subtitle: "Gerencie seus creditos, acompanhe transacoes e solicite saques.",
    action: "Adicionar creditos"
  },
  Planos: {
    title: "Planos",
    subtitle: "Escolha o plano ideal para criar videos incriveis com IA.",
    action: "Alterar plano"
  }
};

function WorkspacePage({
  tool,
  statusLine,
  setStatusLine,
  supabaseStatus,
  apiStatus
}: WorkspacePageProps) {
  if (tool === "Auth") {
    return <AuthPage setStatusLine={setStatusLine} />;
  }

  const meta = workspaceMeta[tool];

  return (
    <section className={`workspace-page ${tool.toLowerCase()}-page`} aria-label={meta.title}>
      <PageHeading
        action={meta.action}
        apiStatus={apiStatus}
        setStatusLine={setStatusLine}
        subtitle={meta.subtitle}
        supabaseStatus={supabaseStatus}
        title={meta.title}
      />

      {tool === "Legendas" ? (
        <CaptionsPage setStatusLine={setStatusLine} />
      ) : tool === "Assets" ? (
        <AssetsPage setStatusLine={setStatusLine} />
      ) : tool === "Audio" ? (
        <AudioPage setStatusLine={setStatusLine} />
      ) : tool === "Publicar" ? (
        <PublishPage setStatusLine={setStatusLine} />
      ) : tool === "Ajustes" ? (
        <SettingsPage
          apiStatus={apiStatus}
          setStatusLine={setStatusLine}
          supabaseStatus={supabaseStatus}
        />
      ) : tool === "Pagamentos" ? (
        <BillingPage setStatusLine={setStatusLine} />
      ) : tool === "Carteira" ? (
        <WalletPage setStatusLine={setStatusLine} />
      ) : (
        <PlansPage setStatusLine={setStatusLine} />
      )}

      <div className="workspace-save-line">
        <CheckCircle2 size={16} />
        <span>{statusLine}</span>
      </div>
    </section>
  );
}

function PageHeading({
  title,
  subtitle,
  action,
  setStatusLine,
  supabaseStatus,
  apiStatus
}: {
  title: string;
  subtitle: string;
  action: string;
  setStatusLine: (value: string) => void;
  supabaseStatus: "checking" | "online" | "invalid" | "missing";
  apiStatus: "checking" | "online" | "blocked";
}) {
  const apiLabel = apiStatus === "online" ? "online" : apiStatus === "blocked" ? "atencao" : "checando";

  return (
    <header className="workspace-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="workspace-heading-actions">
        <span className={supabaseStatus === "online" ? "status good" : "status warn"}>
          <Cloud size={15} />
          Dados {supabaseLabel(supabaseStatus)}
        </span>
        <span className={apiStatus === "online" ? "status good" : apiStatus === "blocked" ? "status warn" : "status"}>
          <Gauge size={15} />
          Motor IA {apiLabel}
        </span>
        <button className="ghost-button" onClick={() => setStatusLine(`${title}: acao secundaria aberta`)}>
          <Download size={16} />
          Exportar
        </button>
        <button className="primary-button" onClick={() => setStatusLine(`${title}: ${action}`)}>
          <Sparkles size={16} />
          {action}
        </button>
      </div>
    </header>
  );
}

function AuthPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [mode, setMode] = useState<"login" | "create">("login");

  return (
    <section className="auth-page-shell" aria-label="Entrar">
      <div className="auth-brand-panel">
        <img alt="Helena Video" src="/helena-video-logo.jpeg" />
        <h1>
          <span>Crie videos.</span>
          Comunique ideias.
          <strong>Com o poder da IA.</strong>
        </h1>
        <p>A plataforma definitiva para criacao de videos com inteligencia artificial.</p>
        <div className="auth-orbit">
          <div className="auth-device">
            <img alt="" src="/helena-video-logo-small.jpeg" />
          </div>
          <span className="auth-chip chip-a">AI</span>
          <span className="auth-chip chip-b">T</span>
          <span className="auth-chip chip-c">Audio</span>
        </div>
      </div>

      <form
        className="auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          setStatusLine(mode === "login" ? "Auth: tentativa de login preparada" : "Auth: criacao de conta preparada");
        }}
      >
        <div>
          <h2>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          <p>{mode === "login" ? "Acesse sua conta Helena Video" : "Prepare seu acesso Helena Video"}</p>
        </div>
        {mode === "create" ? (
          <label className="auth-field">
            Nome
            <span>
              <Sparkles size={18} />
              <input aria-label="Nome" placeholder="Seu nome" type="text" />
            </span>
          </label>
        ) : null}
        <label className="auth-field">
          E-mail
          <span>
            <KeyRound size={18} />
            <input aria-label="E-mail" placeholder="seu@email.com" type="email" />
          </span>
        </label>
        <label className="auth-field">
          Senha
          <span>
            <ShieldCheck size={18} />
            <input aria-label="Senha" placeholder="**********" type="password" />
          </span>
        </label>
        <div className="auth-row">
          <label>
            <input type="checkbox" />
            Lembrar de mim
          </label>
          <button type="button" onClick={() => setStatusLine("Auth: recuperacao de senha")}>
            Esqueci minha senha
          </button>
        </div>
        <button className="primary-button auth-submit" type="submit">
          {mode === "login" ? "Continuar" : "Criar conta"}
          <Rocket size={16} />
        </button>
        <div className="auth-divider">
          <span />
          ou continue com
          <span />
        </div>
        <div className="auth-socials">
          {["Google", "Microsoft", "Apple"].map((provider) => (
            <button key={provider} onClick={() => setStatusLine(`Auth: ${provider}`)} type="button">
              {provider}
            </button>
          ))}
        </div>
        <p className="auth-create">
          {mode === "login" ? "Nao tem uma conta?" : "Ja tem uma conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              const nextMode = mode === "login" ? "create" : "login";
              setMode(nextMode);
              setStatusLine(nextMode === "login" ? "Auth: login selecionado" : "Auth: criacao de conta selecionada");
            }}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </form>
    </section>
  );
}

function CaptionsPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [showAllPresets, setShowAllPresets] = useState(false);
  const steps = [
    ["01", "Transcricao", "Converta audio em texto com IA de alta precisao.", Captions],
    ["02", "Estilo de legenda", "Defina aparencia, ritmo e area segura.", Sparkles],
    ["03", "Exportacao SRT/VTT", "Exporte legendas otimizadas para plataformas externas.", Download]
  ] as const;

  return (
    <div className="captions-layout">
      <div className="process-strip">
        {steps.map(([number, title, copy, Icon]) => (
          <button
            className="process-step"
            key={title}
            onClick={() => setStatusLine(`Legendas: ${title}`)}
            type="button"
          >
            <small>{number}</small>
            <Icon size={24} />
            <strong>{title}</strong>
            <span>{copy}</span>
            <em>Pronto</em>
          </button>
        ))}
      </div>

      <section className="hv-card caption-preview">
        <div className="card-title-row">
          <h3>Previa da legenda</h3>
          <div className="mini-controls">
            <span>Safe area</span>
            <span>16:9</span>
          </div>
        </div>
        <div className="caption-media">
          <button aria-label="Reproduzir previa" onClick={() => setStatusLine("Legendas: previa reproduzida")}>
            <Play size={24} />
          </button>
          <p>
            A <strong>inovacao</strong> nasce da coragem
            <br />
            de transformar ideias em realidade.
          </p>
        </div>
        <div className="media-controls">
          <Play size={17} />
          <span>00:12 / 00:45</span>
          <i />
          <Captions size={17} />
        </div>
      </section>

      <section className="hv-card caption-settings">
        <h3>Configuracoes de legenda</h3>
        {[
          ["Idioma", "Portugues (PT)"],
          ["Estilo", "Moderno Destaque"],
          ["Area segura", "90% central"],
          ["Peso da fonte", "Semibold"],
          ["Formato de exportacao", "SRT, VTT"]
        ].map(([label, value]) => (
          <button key={label} onClick={() => setStatusLine(`Legendas: ${label}`)} type="button">
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </section>

      <aside className="side-stack">
        <QueueCard title="Fila Helena" />
        <section className="hv-card preset-card">
          <div className="card-title-row">
            <h3>Presets de estilo</h3>
            <button
              type="button"
              onClick={() => {
                setShowAllPresets((current) => !current);
                setStatusLine(showAllPresets ? "Legendas: presets principais" : "Legendas: todos os presets");
              }}
            >
              {showAllPresets ? "Ver menos" : "Ver todos"}
            </button>
          </div>
          <div className="preset-grid">
            {(showAllPresets
              ? ["Moderno Destaque", "Clean Neutro", "Cinema Enfase", "Karaoke Social", "Legenda Podcast", "Minimal Premium"]
              : ["Moderno Destaque", "Clean Neutro", "Cinema Enfase"]
            ).map((preset, index) => (
              <button
                className={index === 0 ? "preset-tile active" : "preset-tile"}
                key={preset}
                onClick={() => setStatusLine(`Legendas: ${preset}`)}
                type="button"
              >
                <strong>Aa</strong>
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function AssetsPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [showAllReferences, setShowAllReferences] = useState(false);
  const assets = ["Video base", "Produto", "Logo", "Referencia", "B-roll", "Capa"];

  return (
    <div className="assets-layout">
      <section className="hv-card upload-zone-large">
        <Upload size={34} />
        <h3>Uploads do projeto</h3>
        <p>Videos, imagens, audios e referencias visuais em um unico painel.</p>
        <button className="primary-button" onClick={() => setStatusLine("Assets: upload aberto")} type="button">
          Enviar arquivos
        </button>
      </section>
      <section className="asset-grid">
        {assets.map((asset, index) => (
          <button
            className="asset-tile"
            key={asset}
            onClick={() => setStatusLine(`Assets: ${asset}`)}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div />
            <strong>{asset}</strong>
            <small>{index % 2 === 0 ? "Pronto" : "Aguardando"}</small>
          </button>
        ))}
      </section>
      <aside className="side-stack">
        <section className="hv-card">
          <h3>Kits de marca</h3>
          {["Helena Launch", "Produto premium", "Social cuts"].map((kit) => (
            <button className="list-row" key={kit} onClick={() => setStatusLine(`Assets: kit ${kit}`)} type="button">
              <Layers3 size={17} />
              <span>{kit}</span>
              <strong>Ativo</strong>
            </button>
          ))}
        </section>
        <section className="hv-card">
          <h3>Referencias</h3>
          <div className="reference-strip">
            <div />
            <div />
            <div />
            {showAllReferences ? Array.from({ length: 12 }).map((_, index) => <div key={`extra-reference-${index}`} />) : null}
            <button
              type="button"
              onClick={() => {
                setShowAllReferences((current) => !current);
                setStatusLine(showAllReferences ? "Assets: referencias reduzidas" : "Assets: 12 referencias adicionais abertas");
              }}
            >
              {showAllReferences ? "Menos" : "+12"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function AudioPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const tracks = [
    ["Trilha principal", "Amanhecer Inspirador", "-12.0 LUFS", Music2],
    ["Voiceover", "Narracao Principal", "-16.5 LUFS", Bot],
    ["Efeitos e stems", "Ambiencia + Impactos", "-14.0 LUFS", Layers3]
  ] as const;

  return (
    <div className="audio-layout">
      <div className="audio-cards">
        {tracks.map(([label, title, loudness, Icon]) => (
          <section className="hv-card audio-card" key={label}>
            <div className="card-title-row">
              <div>
                <small>{label}</small>
                <h3>{title}</h3>
              </div>
              <button aria-label={`Ouvir ${title}`} onClick={() => setStatusLine(`Audio: play ${title}`)} type="button">
                <Play size={16} />
              </button>
            </div>
            <div className="waveform">
              <Icon size={24} />
              {Array.from({ length: 44 }).map((_, index) => (
                <i key={index} style={{ height: `${18 + ((index * 7) % 34)}px` }} />
              ))}
            </div>
            <div className="audio-meta">
              <span>2:18</span>
              <span>{loudness}</span>
            </div>
          </section>
        ))}
      </div>

      <section className="hv-card audio-timeline">
        <div className="timeline-toolbar">
          <button
            type="button"
            onClick={() => {
              const nextAspect = aspectRatio === "16:9" ? "9:16" : "16:9";
              setAspectRatio(nextAspect);
              setStatusLine(`Audio: formato ${nextAspect} selecionado`);
            }}
          >
            {aspectRatio}
          </button>
          <button aria-label="Reproduzir timeline de audio" onClick={() => setStatusLine("Audio: timeline reproduzida")} type="button">
            <Play size={17} />
          </button>
          <span>00:00:00</span>
        </div>
        {["Trilha principal", "Voiceover", "Efeitos", "Ambiencia", "Master"].map((track, index) => (
          <div className="audio-track-row" key={track}>
            <span>{track}</span>
            <div className={`audio-clip clip-${index + 1}`}>
              <i />
            </div>
          </div>
        ))}
      </section>

      <aside className="side-stack">
        <section className="hv-card mix-card">
          <span className="meta-label">Operacao</span>
          <h3>Mix final</h3>
          <p>Estereo - 48kHz - 24bit - -14.0 LUFS</p>
          <div className="mini-eq">
            {Array.from({ length: 24 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
          <button className="ghost-button" onClick={() => setStatusLine("Audio: mix final ouvido")} type="button">
            <Play size={15} />
            Ouvir mix final
          </button>
        </section>
        <section className="hv-card">
          <h3>Fontes e uploads</h3>
          {["Narracao_v1.wav", "Ambiencia_forest.wav"].map((file) => (
            <button className="list-row" key={file} onClick={() => setStatusLine(`Audio: ${file}`)} type="button">
              <Music2 size={17} />
              <span>{file}</span>
              <strong>WAV</strong>
            </button>
          ))}
        </section>
      </aside>
    </div>
  );
}

function PublishPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  return (
    <div className="publish-layout">
      <div className="publish-stepper">
        {[
          ["Criar", "Video pronto"],
          ["Configurar", "Detalhes e agenda"],
          ["Publicar", "Revisar e publicar"]
        ].map(([title, copy], index) => (
          <button
            className={index <= 1 ? "active" : ""}
            key={title}
            onClick={() => setStatusLine(`Publicar: etapa ${title}`)}
            type="button"
          >
            <strong>{index === 0 ? "✓" : index + 1}</strong>
            <span>{title}</span>
            <small>{copy}</small>
          </button>
        ))}
      </div>

      <section className="hv-card publish-video">
        <h3>Seu video</h3>
        <div className="publish-preview">
          <button aria-label="Reproduzir video" onClick={() => setStatusLine("Publicar: preview")} type="button">
            <Play size={24} />
          </button>
          <span>01:04</span>
        </div>
        <div className="publish-file">
          <Music2 size={20} />
          <div>
            <strong>Campanha Helena Launch</strong>
            <span>Cinematic Drive - 128 BPM - Beat cut</span>
          </div>
        </div>
      </section>

      <section className="hv-card publish-copy">
        <div className="card-title-row">
          <h3>Copie e hashtags</h3>
          <button onClick={() => setStatusLine("Publicar: sugestao IA")} type="button">Sugerir com IA</button>
        </div>
        <textarea
          aria-label="Copy de publicacao"
          defaultValue={"Helena Launch chegou.\n\nTecnologia, criatividade e performance em um so lugar.\nPronto para transformar ideias em resultados.\n\n#HelenaLaunch #VideoComIA #CinematicDrive #HelenaStudio"}
        />
        <div className="publish-destinations">
          {["Instagram", "TikTok", "YouTube"].map((destination) => (
            <button key={destination} onClick={() => setStatusLine(`Publicar: ${destination}`)} type="button">
              {destination}
              <span />
            </button>
          ))}
        </div>
      </section>

      <aside className="side-stack">
        <section className="hv-card checklist-card">
          <h3>Pronto para publicar</h3>
          {["Video processado", "Copy adicionada", "Destinos conectados", "Agenda definida"].map((item) => (
            <div key={item}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
            </div>
          ))}
        </section>
        <section className="hv-card queue-card-small">
          <h3>Fila de publicacoes</h3>
          {["Novo produto", "Bastidores", "Customer Story"].map((item) => (
            <button className="list-row" key={item} onClick={() => setStatusLine(`Publicar: ${item}`)} type="button">
              <span>{item}</span>
              <strong>Agendado</strong>
            </button>
          ))}
        </section>
      </aside>

      <div className="publish-footer">
        <span>Salvo automaticamente</span>
        <button className="ghost-button" onClick={() => setStatusLine("Publicar: rascunho salvo")} type="button">Salvar rascunho</button>
        <button className="primary-button" onClick={() => setStatusLine("Publicar: publicacao agendada")} type="button">
          Agendar publicacao
        </button>
      </div>
    </div>
  );
}

function SettingsPage({
  setStatusLine,
  supabaseStatus,
  apiStatus
}: {
  setStatusLine: (value: string) => void;
  supabaseStatus: "checking" | "online" | "invalid" | "missing";
  apiStatus: "checking" | "online" | "blocked";
}) {
  const cards = [
    ["Workspace", "Helena Studio", "Plano ativo", Settings2],
    ["Modelos & APIs", "OpenAI, Google, ElevenLabs", apiStatus === "online" ? "Ativo" : "Revisar", Bot],
    ["Editor", "1080p (16:9), 24 fps", "Padrao Helena", SlidersHorizontal],
    ["APIs", "Conexoes externas", supabaseLabel(supabaseStatus), KeyRound],
    ["Integracoes", "YouTube, TikTok, Drive", "Conectado", Workflow],
    ["Preferencias", "Seu ambiente", "25 GB upload", ShieldCheck]
  ] as const;

  return (
    <div className="settings-layout">
      <div className="settings-grid">
        {cards.map(([title, detail, state, Icon]) => (
          <section className="hv-card setting-tile" key={title}>
            <Icon size={28} />
            <h3>{title}</h3>
            <p>{detail}</p>
            <strong>{state}</strong>
            <button onClick={() => setStatusLine(`Ajustes: ${title}`)} type="button">Gerenciar</button>
          </section>
        ))}
      </div>
      <aside className="side-stack">
        <section className="hv-card health-card">
          <ShieldCheck size={30} />
          <h3>Saude do sistema</h3>
          <p>Tudo funcionando</p>
          {["Servidores IA", "Fila de render", "Armazenamento", "APIs externas"].map((item) => (
            <div key={item}>
              <span>{item}</span>
              <strong>Operacional</strong>
            </div>
          ))}
        </section>
        <section className="hv-card usage-card">
          <h3>Uso do workspace</h3>
          <div className="usage-ring">68%</div>
          <p>341 GB / 500 GB usados</p>
        </section>
        <button className="helena-tip" onClick={() => setStatusLine("Ajustes: dica Helena aberta")} type="button">
          <Sparkles size={24} />
          <span>Dica Helena</span>
          Configure padroes personalizados para agilizar seu fluxo.
        </button>
      </aside>
    </div>
  );
}

function BillingPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [selectedMethod, setSelectedMethod] = useState("Visa **** 4242");
  const stats = [
    ["Gasto atual", "R$ 249,00", "Este mes", CreditCard],
    ["Proximo vencimento", "15 Mai 2025", "Em 12 dias", ListChecks],
    ["Creditos de render", "120 min", "Disponiveis", Gauge],
    ["Metodo principal", "**** 4242", "Visa ** 4242", CreditCard]
  ] as const;

  return (
    <div className="billing-layout">
      <div className="billing-main">
        <div className="stat-grid">
          {stats.map(([label, value, copy, Icon]) => (
            <section className="hv-card stat-card" key={label}>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{copy}</small>
              </div>
              <Icon size={27} />
            </section>
          ))}
        </div>
        <section className="hv-card invoice-table">
          <h3>Faturas</h3>
          {["#INV-2025-0008", "#INV-2025-0007", "#INV-2025-0006", "#INV-2025-0005", "#INV-2024-0012"].map((invoice, index) => (
            <button key={invoice} onClick={() => setStatusLine(`Faturamento: ${invoice}`)} type="button">
              <span>{invoice}</span>
              <span>{["15 Abr 2025", "15 Mar 2025", "15 Fev 2025", "15 Jan 2025", "15 Dez 2024"][index]}</span>
              <strong>R$ 249,00</strong>
              <em>Pago</em>
              <Download size={15} />
            </button>
          ))}
        </section>
        <section className="hv-card saved-methods">
          <h3>Metodos salvos</h3>
          {["Visa **** 4242", "Mastercard **** 8888"].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => {
                setSelectedMethod(method);
                setStatusLine(`Faturamento: metodo ${method} selecionado`);
              }}
            >
              {method} {selectedMethod === method ? <strong>Principal</strong> : null}
            </button>
          ))}
          <button onClick={() => setStatusLine("Faturamento: adicionar metodo")} type="button">+ Adicionar metodo</button>
        </section>
      </div>
      <aside className="side-stack">
        <section className="hv-card">
          <h3>Endereco de cobranca</h3>
          <p>Fernando Souza<br />Rua das Flores, 123<br />Sao Paulo, SP</p>
        </section>
        <section className="hv-card">
          <h3>Acoes rapidas</h3>
          {["Atualizar plano", "Ver uso e limites", "Notas fiscais", "Gerenciar assinatura"].map((item) => (
            <button className="list-row" key={item} onClick={() => setStatusLine(`Faturamento: ${item}`)} type="button">
              <span>{item}</span>
              <strong>›</strong>
            </button>
          ))}
        </section>
      </aside>
    </div>
  );
}

function WalletPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  return (
    <div className="wallet-layout">
      <section className="wallet-balance hv-card">
        <span>Saldo disponivel</span>
        <strong>R$ 1.280,50</strong>
        <p>Disponivel para saque</p>
        <Wallet size={48} />
      </section>
      <section className="hv-card wallet-credits">
        <span>Creditos</span>
        <strong>8.450 <Sparkles size={34} /></strong>
        <p>1 credito = 1 render ate 1 min</p>
      </section>
      <section className="hv-card wallet-actions">
        <h3>Acoes rapidas</h3>
        <button onClick={() => setStatusLine("Carteira: adicionar creditos")} type="button">Adicionar creditos</button>
        <button onClick={() => setStatusLine("Carteira: solicitar saque")} type="button">Solicitar saque</button>
      </section>
      <section className="hv-card transactions-card">
        <h3>Transacoes recentes</h3>
        {["Renderizacao de video", "Compra de creditos", "Renderizacao de video", "Bonus de login diario"].map((item, index) => (
          <button key={`${item}-${index}`} onClick={() => setStatusLine(`Carteira: ${item}`)} type="button">
            <Play size={15} />
            <span>{item}</span>
            <strong>{index === 1 || index === 3 ? "+" : "-"} {index === 1 ? "10.000 creditos" : index === 3 ? "50 creditos" : `${60 + index * 30} creditos`}</strong>
          </button>
        ))}
      </section>
      <section className="hv-card withdrawals-card">
        <h3>Historico de saques</h3>
        {[850, 600, 450, 300].map((amount) => (
          <button key={amount} onClick={() => setStatusLine(`Carteira: saque R$ ${amount}`)} type="button">
            <Upload size={16} />
            <span>Saque via PIX</span>
            <strong>R$ {amount},00</strong>
            <em>Concluido</em>
          </button>
        ))}
      </section>
      <div className="wallet-security">
        <ShieldCheck size={18} />
        Seus dados financeiros sao protegidos com criptografia de ponta a ponta.
      </div>
    </div>
  );
}

function PlansPage({ setStatusLine }: { setStatusLine: (value: string) => void }) {
  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">("mensal");
  const plans = [
    ["Start", "R$ 39", "Para comecar a criar com IA.", ["5 videos por mes", "720p Export", "Recursos basicos de IA"]],
    ["Pro", "R$ 89", "Para criadores que querem ir alem.", ["20 videos por mes", "1080p Export", "Recursos avancados de IA"]],
    ["Studio", "R$ 169", "Para profissionais que exigem o melhor.", ["50 videos por mes", "4K Export", "Todos os recursos de IA"]],
    ["Enterprise", "Sob consulta", "Para equipes e operacoes em escala.", ["Videos ilimitados", "4K Export", "IA personalizada"]]
  ] as const;

  return (
    <div className="plans-layout">
      <div className="plans-hero">
        <Sparkles size={30} />
        <h2>Planos</h2>
        <p>Escolha o plano ideal para criar videos incriveis com IA.</p>
        <div className="billing-toggle">
          <button
            className={billingCycle === "mensal" ? "active" : ""}
            type="button"
            onClick={() => {
              setBillingCycle("mensal");
              setStatusLine("Planos: cobranca mensal selecionada");
            }}
          >
            Mensal
          </button>
          <button
            className={billingCycle === "anual" ? "active" : ""}
            type="button"
            onClick={() => {
              setBillingCycle("anual");
              setStatusLine("Planos: cobranca anual selecionada");
            }}
          >
            Anual <span>-20%</span>
          </button>
        </div>
      </div>
      <div className="plan-grid">
        {plans.map(([name, price, copy, features]) => (
          <section className={name === "Studio" ? "hv-card plan-card featured" : "hv-card plan-card"} key={name}>
            <Play size={24} />
            <h3>{name}</h3>
            <p>{copy}</p>
            <strong>{price}<small>{price.startsWith("R$") ? "/mes" : ""}</small></strong>
            {features.map((feature) => (
              <span key={feature}><CheckCircle2 size={15} />{feature}</span>
            ))}
            <button onClick={() => setStatusLine(`Planos: ${name}`)} type="button">
              {name === "Studio" ? "Plano atual" : name === "Enterprise" ? "Falar com vendas" : "Comecar agora"}
            </button>
          </section>
        ))}
      </div>
      <section className="hv-card plan-benefits">
        {["Seguranca e privacidade", "Exportacao ilimitada", "IA sempre evoluindo", "Suporte real"].map((benefit) => (
          <div key={benefit}>
            <ShieldCheck size={26} />
            <strong>{benefit}</strong>
            <span>Recursos profissionais prontos para producao.</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function QueueCard({ title }: { title: string }) {
  return (
    <section className="hv-card queue-card">
      <div className="card-title-row">
        <h3>{title}</h3>
        <span>3 tarefas</span>
      </div>
      {[
        ["Campanha Helena Launch", "Processando", "63%"],
        ["Produto em acao", "Aguardando", ""],
        ["Review do produto", "Aguardando", ""]
      ].map(([name, state, progress]) => (
        <div className="queue-item" key={name}>
          <span />
          <div>
            <strong>{name}</strong>
            <small>SRT - PT</small>
          </div>
          <em>{state}</em>
          {progress ? <i style={{ width: progress }} /> : null}
        </div>
      ))}
    </section>
  );
}

function supabaseLabel(status: "checking" | "online" | "invalid" | "missing") {
  if (status === "online") return "online";
  if (status === "invalid") return "atenção";
  if (status === "missing") return "pendentes";
  return "checando";
}

function buildStoryboardShots(form: GenerationForm) {
  const goals = [
    "Gancho visual",
    "Produto em ação",
    "Prova de textura",
    "Movimento de câmera",
    "Variação social",
    "Fechamento CTA",
    "Corte alternativo",
    "Detalhe macro",
    "Transição",
    "Loop final",
    "Reframe vertical",
    "Backup edit"
  ];
  const secondsPerShot = Math.max(1, Math.round(form.durationSeconds / form.shotCount));

  return Array.from({ length: form.shotCount }).map((_, index) => ({
    index: index + 1,
    goal: goals[index] ?? `Cena ${index + 1}`,
    direction: `${secondsPerShot}s · ${form.cameraPreset} · ${form.motionIntensity}`
  }));
}

function validateGeneration(
  form: GenerationForm,
  providerState: ProviderStatus["state"] | undefined,
  files: { hasVideo: boolean }
) {
  const issues: string[] = [];

  if (form.prompt.trim().length < 20) {
    issues.push("Prompt precisa ter pelo menos 20 caracteres.");
  }

  if (["module1", "autocut"].includes(form.module) && !files.hasVideo) {
    issues.push("Transformar e AutoCut precisam de um vídeo base.");
  }

  if (providerState && providerState !== "ready") {
    issues.push("Provider selecionado ainda precisa de chave ou ativação no backend.");
  }

  if (form.durationSeconds < 4 || form.durationSeconds > 60) {
    issues.push("Duração deve ficar entre 4 e 60 segundos.");
  }

  if (form.resolution === "4k" && form.qualityProfile === "fast") {
    issues.push("4K não deve usar perfil Fast.");
  }

  return issues;
}
