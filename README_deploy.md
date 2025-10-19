# Deploy na Netlify (Vite + React + Supabase)

## Pré-requisitos
- Node 20.x (mesma versão configurada no `netlify.toml`)
- Conta Netlify
- Variáveis do Supabase:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Passos locais
```bash
npm ci
npm run build
npm run preview
```

Se abrir normalmente em `http://localhost:4173`, pode publicar.

## Deploy na Netlify
1. Faça login na Netlify e clique em **Add new site → Import an existing project**.
2. Conecte seu repositório **ou** faça **Deploy manual** subindo este zip.
3. Em **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Em **Environment variables** (Site settings → Build & deploy → Environment):
   - `VITE_SUPABASE_URL` = **(URL do seu projeto)**
   - `VITE_SUPABASE_ANON_KEY` = **(anon key)**

> Observação: as tabelas `media_urls` no seu schema de exemplo devem ser `text[]` no Postgres, não apenas `ARRAY`.
> O arquivo `netlify.toml` já adiciona o fallback SPA (redirect 200) para rotas do React Router.

## Troubleshooting
- Inputs “lentos” ou comportamento estranho ao digitar:
  - Evite manipular `textarea.value` diretamente. Use `onChange` controlado (este patch já corrige no `MentionTextarea`).
  - Não dispare `preventDefault()` em listeners globais de `keydown` (só quando realmente houver atalho).
