alter table public.video_calls enable row level security;

drop policy if exists caller_can_insert_call on public.video_calls;
create policy caller_can_insert_call
on public.video_calls
for insert
to authenticated
with check ( caller_id = auth.uid() );

drop policy if exists caller_or_receiver_can_select on public.video_calls;
create policy caller_or_receiver_can_select
on public.video_calls
for select
to authenticated
using ( caller_id = auth.uid() or receiver_id = auth.uid() );

drop policy if exists caller_or_receiver_can_update_status on public.video_calls;
create policy caller_or_receiver_can_update_status
on public.video_calls
for update
to authenticated
using ( caller_id = auth.uid() or receiver_id = auth.uid() )
with check ( caller_id = auth.uid() or receiver_id = auth.uid() );
