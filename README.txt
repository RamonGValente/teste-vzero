# Fix: Netlify com npm não encontra @vitejs/plugin-react

O erro ocorre porque o build está rodando o Vite mas **@vitejs/plugin-react** (e o próprio **vite**) não estão instalados como devDependencies **ou** estão sendo omitidos no CI.

## O que este pacote faz
1) Altera o `netlify.toml` para instalar **devDependencies** no CI:
   - `npm ci --include=dev --no-audit --no-fund && npm run build`
2) Inclui `vite.config.ts` (se o seu projeto não tiver ou estiver diferente).
3) Fornece um patch para o seu `package.json` e um JSON de merge com as chaves mínimas.

## Como aplicar (2 opções)

### Opção A — Comandos (mais rápido)
No seu projeto local, rode:
```
npm i -D @vitejs/plugin-react vite typescript
```

### Opção B — Merge/patch manual
- Abra seu `package.json` e adicione/ajuste:
  - scripts: `dev`, `build`, `preview`
  - devDependencies: `@vitejs/plugin-react`, `vite`, `typescript`
- Use `package.json.merge.json` como referência do que precisa existir.

Depois:
```
git add package.json netlify.toml vite.config.ts
git commit -m "fix(netlify): instalar devDependencies e vite-react plugin"
git push
```

Se o Netlify ainda tentar usar pnpm, remova `pnpm-lock.yaml` do repo ou garanta que este `netlify.toml` esteja sendo usado (ele força npm via scripts).
