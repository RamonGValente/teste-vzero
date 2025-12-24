-- Extend push preferences to cover comments and arena posts

alter table public.notification_preferences
  add column if not exists comments boolean not null default true;

alter table public.notification_preferences
  add column if not exists posts boolean not null default true;
