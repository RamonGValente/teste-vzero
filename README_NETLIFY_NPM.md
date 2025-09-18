# Netlify (NPM) — Vite + React

1) Coloque `netlify.toml` e `_redirects` na **raiz** do projeto.
2) Remova lockfiles de outros gestores: `pnpm-lock.yaml`, `yarn.lock` (se existirem).
3) Faça commit do `package-lock.json` gerado pelo `npm install` local (recomendado).
4) Netlify:
   - Build command: `npm run build`
   - Publish directory: `dist`
