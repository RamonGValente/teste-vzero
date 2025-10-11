
# Patch UI: trocar botões (Config <-> Rede Social) e abrir o mesmo menu no hambúrguer

## O que há neste patch
- `src/components/layout/AppTopBar.tsx`: novo header com:
  - Ordem dos botões invertida (Configurações primeiro, Rede Social depois)
  - Botão hambúrguer que abre um Drawer com a mesma lista lateral (`<SidebarContacts/>`)
- Stubs opcionais para `shadcn/ui`: `src/components/ui/sheet.tsx` e `src/components/ui/button.tsx`
  - Se já tiver esses componentes no seu projeto, pode ignorar/excluir os stubs.

## Como usar
1. Copie os arquivos por cima do projeto.
2. Onde você renderiza a top bar atual, use:
   ```tsx
   import AppTopBar from '@/components/layout/AppTopBar';
   <AppTopBar />
   ```
3. Se sua sidebar tem outro nome, troque o import dentro de `AppTopBar.tsx`.
