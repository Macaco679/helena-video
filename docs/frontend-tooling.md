# Helena Video Frontend Tooling

Ferramentas instaladas para evoluir e validar UI/UX do Helena Video.

## Storybook

Use para revisar o app e seus futuros componentes em isolamento.

```bash
npm run storybook
```

Build estatico:

```bash
npm run build-storybook
```

Story inicial:

- `src/App.stories.tsx`: renderiza o shell principal do Helena Video.

## Lighthouse

Use com o servidor Vite local rodando em `http://127.0.0.1:5177`.

```bash
npm run dev
npm run audit:lighthouse
```

O relatorio HTML sai em `reports/lighthouse.html`, ignorado pelo Git.

## Responsively

Responsively App foi instalado no Windows em:

```text
C:\Users\feema\AppData\Local\Programs\ResponsivelyApp\ResponsivelyApp.exe
```

Use para abrir `http://127.0.0.1:5177/studio` e revisar desktop, tablet e mobile em paralelo.

## Playwright

Continua sendo a validacao automatizada principal.

```bash
npm run qa
```
