# Helena Video Competitive Quality Bar

Este documento define o padrão mínimo para o Helena Video competir como studio/orquestrador de vídeo com IA, não como apenas uma tela de prompt.

## Referências de mercado

- Sora: storyboard, remix, stitching, duração/orientação, audio intent e fluxo de drafts.
- Runway Gen-4/Gen-4.5: controle profissional, text/image-to-video, video-to-video, durações curtas de alta qualidade e suíte de edição.
- Google Veo: text/image-to-video, prompt rewriting, frames inicial/final, 720p/1080p e controle de aspect ratio.
- Kling: text/image-to-video, modo standard/professional, duração/aspect ratio, negative prompt e processamento async.
- Luma/Pika: geração rápida, API, variações, cenas sociais e fluxo simples para creators.

Fontes oficiais usadas na análise:

- OpenAI Sora Video API: https://platform.openai.com/docs/guides/video-generation
- Sora Help Center: https://help.openai.com/en/articles/9957612-generating-videos-on-sora
- Runway API models: https://docs.dev.runwayml.com/guides/models
- Google Veo on Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
- Kling API docs: https://klingapi.com/docs
- Luma Dream Machine API: https://docs.lumalabs.ai/docs/video-generation

## Gaps que Helena deve cobrir

1. Storyboard operacional por cena, com duracao, camera, movimento e objetivo.
2. Parâmetros explícitos de geração: provider, qualidade, aspect ratio, FPS, resolução, seed, variações e prompt negativo.
3. Roteamento multi-provider sem expor chaves no browser.
4. Upload e asset review antes do job, com storage configurado fora do frontend.
5. Checklist de envio para bloquear jobs incompletos antes de bater em API paga.
6. Export JSON com payload rastreável para debug, QA e reprodução.
7. Rotas de proxy consistentes entre Vercel e Supabase Edge Function.
8. UI responsiva, sem cards quebrados, com foco em workflow real: Studio, Assets, Audio, Legendas, Publicar e Ajustes.

## Regra de produto

Toda nova feature deve responder a uma pergunta:

- Isso melhora controle criativo?
- Isso reduz falha operacional?
- Isso aumenta rastreabilidade do job?
- Isso aproxima o Helena de um workflow real de criação, revisão e publicação?

Se a resposta for "não" para todas, a feature provavelmente é decorativa.
