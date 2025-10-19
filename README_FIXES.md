
# Sistema de Chat — Build funcional (menções + contatos UDG)

Principais itens:
- `MentionText` para renderizar `@username` clicável (abre perfil).
- Inputs com `MentionTextarea` (autocomplete @) em Mensagens e Comunidades.
- `saveMentions` chamado ao criar posts/comentários/mensagens.
- Correções UDG: upsert em `friend_requests`, aceite cria 1 linha em `friendships`, validação 7–8 dígitos e botão não fica travado.
- Chamadas não-críticas (`last_viewed`, `process-votes`) agora têm `try/catch` para não quebrar a UI com falhas de rede.
- React Router com `future` flags v7.

## Como rodar
1. Garanta seu `.env.local` (já incluí a versão que você enviou).
2. `npm i`
3. `npm run dev`

Se usar Supabase Free: abra o dashboard para "acordar" o projeto e confira CORS com `http://localhost:8080`.
