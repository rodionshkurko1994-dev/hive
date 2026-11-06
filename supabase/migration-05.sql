-- HIVE v5: скарги на дописи (модерація з адмінки).
-- Виконати у Supabase → SQL Editor після migration-04.sql. Безпечно запускати повторно.

create table if not exists public.post_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index if not exists post_reports_status_idx on public.post_reports (status, created_at desc);
alter table public.post_reports enable row level security;

-- Поскаржитись може будь-який авторизований користувач (один раз на допис)
drop policy if exists "file post reports" on public.post_reports;
create policy "file post reports" on public.post_reports
  for insert to authenticated with check (reporter_id = auth.uid());
-- читання скарг — лише адмін через серверний ключ (service_role); select-політики немає
