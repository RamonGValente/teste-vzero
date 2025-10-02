alter table public.video_calls enable row level security;
alter table public.webrtc_tokens enable row level security;

drop policy if exists "insert_own_calls" on public.video_calls;
create policy "insert_own_calls"
on public.video_calls for insert
to authenticated
with check (auth.uid() = caller_id);

drop policy if exists "read_related_calls" on public.video_calls;
create policy "read_related_calls"
on public.video_calls for select
to authenticated
using (auth.uid() = caller_id or auth.uid() = receiver_id);

drop policy if exists "update_related_calls" on public.video_calls;
create policy "update_related_calls"
on public.video_calls for update
to authenticated
using (auth.uid() = caller_id or auth.uid() = receiver_id);

drop policy if exists "insert_own_token" on public.webrtc_tokens;
create policy "insert_own_token"
on public.webrtc_tokens for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "read_own_token" on public.webrtc_tokens;
create policy "read_own_token"
on public.webrtc_tokens for select
to authenticated
using (auth.uid() = user_id);
