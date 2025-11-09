# UnDoInG – Chat com Tradução Inline + Exclusão por Usuário (Auditoria)

## Frontend (Netlify)
Defina:
- VITE_SUPABASE_URL = https://ipmldkprqdhybedhpgmt.supabase.co
- VITE_SUPABASE_ANON_KEY = <anon key>

## Supabase (Edge Functions)
- Secret: OPENAI_API_KEY = sk-... (em Edge Functions → Secrets)

## GitHub Actions
- Secret do repositório: SUPABASE_ACCESS_TOKEN (crie no Dashboard do Supabase → Account → Access Tokens)
- Workflow: `.github/workflows/supabase-functions-deploy.yml` (já incluso)

## Rota de Mensagens
- `src/pages/MessagesEnhanced.tsx` (traduzir + UnDoInG + auditoria)
- `src/App.tsx` já aponta `/messages` para `MessagesEnhanced`

## Auditoria (SQL – execute 1x no Supabase)
```sql
alter table public.message_deletions_user enable row level security;
create policy if not exists "insert own deletion" on public.message_deletions_user
  for insert with check ( user_id = auth.uid() );
create policy if not exists "select own deletion" on public.message_deletions_user
  for select using ( user_id = auth.uid() );
create or replace view public.v_messages_visible as
select m.* from public.messages m
where not exists (
  select 1 from public.message_deletions_user d
  where d.message_id = m.id and d.user_id = auth.uid()
);
```