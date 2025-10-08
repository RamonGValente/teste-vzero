# Gateway de Navegador para PWA (Sem quebrar o sistema)

Este pacote fornece uma **página de gateway** que exibe mensagem quando o usuário abre no navegador e **redireciona automaticamente** para o sistema quando aberto **como PWA** (display-mode `standalone`).

## O que contém
- `index.html`: Página que deve ser servida quando o acesso for via navegador.
- `assets/style.css`: Estilos, com variáveis de cor fáceis de ajustar.
- `assets/app.js`: Lógica de detecção PWA + botão de instalação (via `beforeinstallprompt`).

## Como integrar sem danificar o sistema

> **Objetivo**: Quando o usuário abrir a raiz do domínio no navegador, mostrar esta página. Se abrir como PWA, entrar direto no app.

1. **Coloque os arquivos em um caminho público** do seu projeto (ex.: `public/pwa-gateway/`).  
2. **Defina a rota inicial do seu app PWA** (por exemplo `/app`, `/dashboard`, etc.). Abra o `index.html` e ajuste:
   ```html
   <script>
     window.__PWA_GATEWAY_CONFIG__ = { appEntryPath: "/app" };
   </script>
   ```
3. **Redirecionamento controlado**:
   - Se você **quer que a página seja a raiz (/**)**: aponte seu servidor/hosting para servir `pwa-gateway/index.html` quando o agente **não** estiver em PWA. Isso pode ser feito via:
     - _Middleware_ / _rewrite_ de produção; ou
     - Definir `index.html` do projeto como este gateway e o app principal em `/app`. **O gateway já detecta PWA e redireciona automaticamente para `/app`**, portanto **não quebra** o app.
   - Se preferir manter sua raiz atual, crie uma rota `/navegador` apontando para o gateway e faça uma **regra de rewrite** que envia usuários **não-PWA** para `/navegador`.
4. **Cores do sistema**: edite no `assets/style.css` o bloco `:root` para combinar com seu tema (ex.: Tailwind `--primary`, `--accent`, etc.).
5. **Manifest/Service Worker**: este gateway não altera seu SW/manifest existentes. O botão “Instalar App” depende do seu site já atender aos critérios PWA. Se ainda não tiver manifest/SW, mantenha seu setup atual ou peça ajuda para configurarmos.

## Teste de fumaça (para não quebrar nada)
- Acesse no navegador: deve aparecer a página de aviso com botão (se suportado).
- Instale como app (Android/Chrome, Desktop) **ou** adicione à tela de início (iOS/Safari).
- Abra pelo atalho do app: deve **redirecionar direto** para `/app` (ou a rota que você configurou).

## Dúvidas comuns
- **iOS não mostra botão “Instalar”**: é esperado; use “Compartilhar → Adicionar à Tela de Início”.
- **Quero que o gateway viva em `/` e meu app em `/app`**: é exatamente o fluxo recomendado acima.
