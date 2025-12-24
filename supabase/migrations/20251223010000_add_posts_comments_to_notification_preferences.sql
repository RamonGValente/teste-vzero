-- Add missing notification preference columns used by the app (comments + posts)

alter table if exists public.notification_preferences
  add column if not exists comments boolean not null default true;

alter table if exists public.notification_preferences
  add column if not exists posts boolean not null default true;
