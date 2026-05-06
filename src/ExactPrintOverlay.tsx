import { useEffect, useMemo, useState } from "react";

const routePrints: Record<string, string> = {
  "/": "/reference-assets/helena/exact-pages/studio.png",
  "/studio": "/reference-assets/helena/exact-pages/studio.png",
  "/legendas": "/reference-assets/helena/exact-pages/legendas.png",
  "/assets": "/reference-assets/helena/exact-pages/assets.png",
  "/audio": "/reference-assets/helena/exact-pages/audio.png",
  "/publicar": "/reference-assets/helena/exact-pages/publicar.png",
  "/ajustes": "/reference-assets/helena/exact-pages/ajustes.png",
  "/ajustes/conta": "/reference-assets/helena/exact-pages/ajustes-2.png",
  "/ajustes/preferencias": "/reference-assets/helena/exact-pages/ajustes-3.png",
  "/pagamentos": "/reference-assets/helena/exact-pages/pagamentos.png",
  "/faturamento": "/reference-assets/helena/exact-pages/pagamentos.png",
  "/billing": "/reference-assets/helena/exact-pages/pagamentos.png",
  "/carteira": "/reference-assets/helena/exact-pages/carteira.png",
  "/wallet": "/reference-assets/helena/exact-pages/carteira.png",
  "/planos": "/reference-assets/helena/exact-pages/planos.png",
  "/pricing": "/reference-assets/helena/exact-pages/planos.png",
  "/auth": "/reference-assets/helena/exact-pages/auth.png",
  "/login": "/reference-assets/helena/exact-pages/auth.png",
  "/minha-conta": "/reference-assets/helena/exact-pages/minha-conta.png",
  "/account": "/reference-assets/helena/exact-pages/minha-conta.png",
  "/workspace": "/reference-assets/helena/exact-pages/workspace.png",
  "/team": "/reference-assets/helena/exact-pages/workspace.png",
  "/integracoes": "/reference-assets/helena/exact-pages/integracoes.png",
  "/api": "/reference-assets/helena/exact-pages/integracoes.png",
  "/chat": "/reference-assets/helena/exact-pages/chat.png",
  "/ia": "/reference-assets/helena/exact-pages/chat.png",
  "/projetos": "/reference-assets/helena/exact-pages/projetos.png",
  "/projects": "/reference-assets/helena/exact-pages/projetos.png",
  "/templates": "/reference-assets/helena/exact-pages/templates.png"
};

function currentPath() {
  return window.location.pathname || "/";
}

export function ExactPrintOverlay() {
  const [pathname, setPathname] = useState(() => currentPath());

  useEffect(() => {
    const update = () => setPathname(currentPath());
    const originalPushState = window.history.pushState;

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(window.history, args);
      update();
    };

    window.addEventListener("popstate", update);
    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener("popstate", update);
    };
  }, []);

  const src = useMemo(() => routePrints[pathname] ?? null, [pathname]);

  if (!src) {
    return null;
  }

  return (
    <div className="exact-print-overlay" aria-hidden="true">
      <img src={src} alt="" draggable={false} />
    </div>
  );
}
