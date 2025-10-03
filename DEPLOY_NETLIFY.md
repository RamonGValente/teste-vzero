# Deploy na Netlify (Vite + React)

## 1) Pré-requisitos
- Node 18+ (recomendado 20)
- Projeto com Vite (build em `dist`)
- Conta na Netlify

## 2) Arquivos para o **raiz do projeto**
- `netlify.toml` (config de build e redirect SPA)
- `_redirects` (fallback SPA — redundante com o toml, mas útil em algumas configs)
- `.env.example.netlify` (modelo das variáveis de ambiente)

## 3) Variáveis de ambiente (Netlify UI)
Netlify: **Site settings → Build & deploy → Environment → Edit variables**
Crie as chaves (exemplo Supabase):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> No Vite, apenas variáveis com prefixo **VITE_** ficam visíveis no frontend.

## 4) Build & Publish
- **Build command:** `npm run build`
- **Publish directory:** `dist`

## 5) Deploy via Git
1. Suba seu repositório para GitHub/GitLab/Bitbucket.
2. Na Netlify, **Add new site → Import from Git** e conecte o repo.
3. Defina o comando de build, pasta `dist` e variáveis de ambiente.
4. Cada `git push` gera um novo deploy.

## 6) Deploy via CLI
```bash
npm i -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://xxx.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "xxxxx"
npm run build
netlify deploy --prod --dir=dist
```

## 7) Rotas SPA
O `netlify.toml` (e `_redirects`) já configuram o fallback: `/* -> /index.html (200)`.
