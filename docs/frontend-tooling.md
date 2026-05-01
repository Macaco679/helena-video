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

Use contra o build de preview, para medir a versao mais proxima da producao.

```bash
npm run build
npm run preview:local
npm run audit:lighthouse
```

O relatorio HTML sai em `reports/lighthouse.html`, ignorado pelo Git.

## Responsively

Responsively App foi instalado no Windows em:

```text
C:\Users\feema\AppData\Local\Programs\ResponsivelyApp\ResponsivelyApp.exe
```

Use para abrir `http://127.0.0.1:4173/studio` e revisar desktop, tablet e mobile em paralelo.

## Playwright

Continua sendo a validacao automatizada principal. O Playwright sobe o Vite em `5177` automaticamente quando `PLAYWRIGHT_BASE_URL` nao estiver definido.

```bash
npm run qa
```

Para testar um preview ja aberto:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
npm run qa
Remove-Item Env:PLAYWRIGHT_BASE_URL
```
