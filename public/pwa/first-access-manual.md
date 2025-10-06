# Manual — Primeiro Acesso (PWA)

**Visão geral**
Este manual explica como acessar e instalar o sistema como Progressive Web App (PWA). O PWA oferece:
- Funcionamento offline limitado;
- Instalação direta no dispositivo (ícone na tela inicial);
- Melhor controle de permissões e segurança.

**Abrir pelo navegador**
1. Acesse a URL do sistema no navegador móvel ou desktop.
2. Você verá uma página explicando que o sistema funciona como App (PWA) e um botão "Baixar App (PWA)".
3. Clique no botão e siga as instruções do navegador para instalar.

**Instalar no Android (Chrome)**
1. Abra o site.
2. Toque no menu (⋮) e escolha "Adicionar à tela inicial" ou use o prompt de instalação que aparece.
3. O app será instalado e abrirá em modo standalone.

**Instalar no iOS (Safari)**
1. Abra o site no Safari.
2. Toque no botão "Compartilhar" e escolha "Adicionar à Tela de Início".
3. Observe: iOS tem limitações (sem service worker completo em alguns casos) — funcionalidades offline podem variar.

**Ao abrir pelo PWA**
- O PWA carrega diretamente a aplicação principal (`/`) e não mostrará a página de navegador.
- Se desejar limpar dados e fazer autoexclusão: utilize as opções internas do app (configurações → privacidade). Recomenda-se suporte server-side para remoção completa.

**Segurança & Privacidade**
- Sempre utilize conexões HTTPS.
- Para autoexclusão permanente, execute a rotina do perfil dentro do app e, se aplicável, solicite remoção no backend.
- Revogue acessos e troque senhas após exclusões sensíveis.

**Observações técnicas para devs (não altera código existente)**
- Arquivos adicionados: `/browser-landing.html`, `/pwa/manifest.webmanifest`, `/pwa/sw.js`, `/pwa/first-access-manual.md`
- Esses arquivos são adicionais e não modificam outros recursos.
