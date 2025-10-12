# Correção: imagem de post não aparecia para usuários

## Problema
No componente `src/components/social/CreatePost.tsx` o upload da imagem estava sendo feito no bucket correto, porém a obtenção da URL pública usava `supabase.storage.from('posts')` em vez do bucket de mídia. Isso gerava `image_url` inválida gravada na tabela `posts`, então os outros usuários não viam a imagem.

## Mudança
- Troca de `supabase.storage.from('posts')` por `supabase.storage.from('message-files')` tanto no `.upload(...)` quanto no `.getPublicUrl(...)` dentro de `uploadMedia(...)`.
- Garantido `bucketName = 'message-files'` definido próximo ao cálculo do `filePath` para consistência.

## Pré‑requisitos no Supabase (conferir)
Para a imagem aparecer para todos, deixe o bucket **message-files** como público **ou** gere URL assinada na leitura. O código usa URL pública.

Políticas sugeridas (se utilizar RLS no Storage):
```sql
-- Leitura pública
create policy "Public read for message-files"
on storage.objects for select
to public
using (bucket_id = 'message-files');

-- Escrita somente para usuários autenticados
create policy "Auth write for message-files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'message-files');
```
