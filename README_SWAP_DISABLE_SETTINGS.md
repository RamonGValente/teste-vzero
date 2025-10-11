# Patch: trocar botões (Config <-> Rede Social) e desativar Configuração

## O que inclui
- `src/components/layout/AppTopBar.tsx` — top bar com posições trocadas e **Configurações desativado** (sem navegação).
- `src/components/layout/SidebarHeader.tsx` — cabeçalho de sidebar (como no seu print) também trocando as posições e desativando Config.

## Como aplicar
1. Extraia por cima do projeto.
2. Use **um** dos componentes (ou os dois, conforme sua UI):
   - Topo:
     ```tsx
     import AppTopBar from '@/components/layout/AppTopBar';
     <AppTopBar />
     ```
   - Sidebar:
     ```tsx
     import SidebarHeader from '@/components/layout/SidebarHeader';
     <SidebarHeader />
     ```

## Observações
- O botão de **Configurações** está com `pointer-events: none`, `aria-disabled="true"` e `cursor-default`, portanto **não faz nada** ao clicar.
- Se sua navegação para social estiver em outro caminho, troque `to="/social"` pelo path correto.
