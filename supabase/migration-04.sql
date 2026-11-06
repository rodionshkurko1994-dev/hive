-- HIVE v4: особисті повідомлення з фото + відкрита модерація (скарги, доступ адміна).
-- Виконати у Supabase → SQL Editor після migration-03.sql. Безпечно запускати повторно.
-- ВАЖЛИВО: звичайні користувачі бачать лише свої чати (Row Level Security).
-- Адмін читає чати тільки через серверний ключ (service_role) — за скаргою або підозрою.
-- Користувачам у чаті показано відкрите повідомлення, що модерація можлива. Прихованого стеження немає.

-- РОЗМОВИ (унікальна пара користувачів, user_a < user_b)
create table if not exists public.conversations (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists conv_a_idx on public.conversations (user_a, last_message_at desc);
create index if not exists conv_b_idx on public.conversations (user_b, last_message_at desc);
alter table public.conversations enable row level security;

drop policy if exists "conversations for participants" on public.conversations;
create policy "conversations for participants" on public.conversations
  for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
-- створення — лише через функцію get_or_create_conversation (без прямого insert)

-- ПОВІДОМЛЕННЯ
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint messages_body_len check (char_length(body) <= 3000),
  constraint messages_not_empty check (char_length(body) > 0 or cardinality(images) > 0),
  constraint messages_images_max check (cardinality(images) <= 4)
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

drop policy if exists "messages for participants" on public.messages;
create policy "messages for participants" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
  );

drop policy if exists "members send messages" on public.messages;
create policy "members send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
    and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_blocked)
  );

-- Знайти або створити розмову (канонічний порядок пари)
create or replace function public.get_or_create_conversation(other uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid bigint;
begin
  if other is null or other = auth.uid() then raise exception 'bad target'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'no such user'; end if;
  a := least(auth.uid(), other);
  b := greatest(auth.uid(), other);
  insert into public.conversations (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do update set user_a = excluded.user_a
    returning id into cid;
  return cid;
end;
$$;
revoke all on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- Оновлення розмови при новому повідомленні
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message_preview = left(coalesce(nullif(new.body, ''), '📷 Фото'), 120)
    where id = new.conversation_id;
  return null;
end;
$$;
drop trigger if exists bump_conversation_trg on public.messages;
create trigger bump_conversation_trg after insert on public.messages
  for each row execute function public.bump_conversation();

-- СКАРГИ (відкрита модерація). Користувач скаржиться на розмову/повідомлення.
create table if not exists public.message_reports (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  message_id bigint references public.messages(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.message_reports (status, created_at desc);
alter table public.message_reports enable row level security;

drop policy if exists "users file reports" on public.message_reports;
create policy "users file reports" on public.message_reports
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
  );
-- читання скарг — лише адмін через серверний ключ (окремої select-політики немає)
