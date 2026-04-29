# Helena Video

Standalone video platform shell for Helena Video. This project is intentionally separate from FelpaMusic and Vitrinno.

## Hard boundaries

- Do not edit, import, or deploy FelpaMusic or Vitrinno code from this project.
- The planned public host is `www.helenavideo.felpamusic.com.br` only as a subdomain reuse.
- Do not change DNS or Vercel project settings without explicit approval.
- Do not store Supabase, GitHub, Vercel, n8n, or provider passwords in this repository.

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill only project-safe values. Provider secrets must live in a backend proxy, Supabase Edge Function, or VPS environment.

## Product modules

- Studio: prompt, upload, model, quality, camera, motion, duration, shots, audio mode, and export controls.
- Timeline: video, audio, captions, effects, and generation tracks.
- AI chat: Helena/LunnaHelena video assistant surface for planning and production commands.
- Providers: UI contract for native Helena, Kling, Wan, Seedance, Hailuo, image generation, music/TTS, and publishing.
- Supabase: initial schema in `supabase/migrations` for projects, assets, generation jobs, chat, and publishing.

## Safe deployment checklist

1. Create a new Vercel project for Helena Video only.
2. Add only the `www.helenavideo.felpamusic.com.br` subdomain to that new project.
3. Confirm the existing FelpaMusic and Vitrinno Vercel projects/domains are unchanged.
4. Configure environment variables in the new project.
5. Deploy only after explicit approval.
