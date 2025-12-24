
# Correções UDG - Contatos (código UDG e convite)

Principais mudanças:
1) **Aceitar convite**: inserção de amizade agora cria **apenas um registro** (`user_id=quem aceitou`, `friend_id=quem enviou`).  
   - Motivo: a política RLS permite inserir somente quando `auth.uid() = user_id`. A tentativa anterior de inserir a linha inversa falhava, impedindo a conclusão do aceite.
   - A listagem de contatos busca amizades com `OR (user_id = me OR friend_id = me)`, portanto **um único registro é suficiente** para que **ambos** vejam o contato.

2) **Adicionar por código UDG**: antes de inserir uma nova `friend_requests`, fazemos checagens para evitar duplicidades:
   - Solicitação já enviada por você e pendente
   - Solicitação existente no sentido contrário aguardando sua resposta

Como verificar:
- Envie um convite com o código `UDG-XXXXXXX` (o input aceita somente os 7 dígitos e o prefixo é adicionado automaticamente).
- No usuário destinatário, abra **Solicitações** e aceite. Deverá aparecer na **Lista de Contatos** imediatamente (a tela refaz o fetch a cada 5s e as queries são invalidadas no sucesso).

Observação:
- Se houver usuários antigos sem `friend_code`, gere os códigos rodando no SQL:  
  ```sql
  UPDATE public.profiles SET friend_code = public.generate_friend_code() WHERE friend_code IS NULL;
  ```
