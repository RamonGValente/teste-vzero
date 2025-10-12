-- Garante eventos completos da tabela de alertas no Realtime.
-- Se já estiver adicionada, o Supabase pode retornar 42710 (já membro) — pode ignorar.

alter table public.attention_calls replica identity full;
alter publication supabase_realtime add table public.attention_calls;
