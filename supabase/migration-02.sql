-- HIVE v2: фото, підписки, репости, перегляди, запрошення, рейтинг.
-- Виконати один раз у Supabase → SQL Editor (після schema.sql). Безпечно запускати повторно.

-- ПРОФІЛІ: аватар і хто запросив
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists invited_by uuid references public.profiles(id) on delete set null;
create index if not exists profiles_invited_by_idx on public.profiles (invited_by);

revoke update on public.profiles from authenticated;
grant update (full_name, district, neighborhood, building, bio, onboarded, avatar_url)
  on public.profiles to authenticated;

-- Новий користувач: зберігаємо, хто його запросив (?ref= у посиланні)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  begin
    ref := nullif(new.raw_user_meta_data->>'ref', '')::uuid;
  exception when others then
    ref := null;
  end;
  if ref is not null and not exists (select 1 from public.profiles where id = ref) then
    ref := null;
  end if;
  insert into public.profiles (id, full_name, invited_by)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), ref)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ДОПИСИ: фото і лічильники
alter table public.posts add column if not exists images text[] not null default '{}';
alter table public.posts add column if not exists views_count integer not null default 0;
alter table public.posts add column if not exists likes_count integer not null default 0;
alter table public.posts add column if not exists reposts_count integer not null default 0;
alter table public.posts alter column body set default '';
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check (char_length(body) <= 3000);
alter table public.posts drop constraint if exists posts_not_empty;
alter table public.posts add constraint posts_not_empty check (char_length(body) > 0 or cardinality(images) > 0);
alter table public.posts drop constraint if exists posts_images_max;
alter table public.posts add constraint posts_images_max check (cardinality(images) <= 4);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

update public.posts p set likes_count = (select count(*) from public.likes l where l.post_id = p.id);

-- Свої дописи лайкати не можна (щоб не накручувати рейтинг)
drop policy if exists "users like" on public.likes;
create policy "users like" on public.likes
  for insert to authenticated with check (
    auth.uid() = user_id
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- ПІДПИСКИ
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
alter table public.follows enable row level security;

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using (true);
drop policy if exists "users follow" on public.follows;
create policy "users follow" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "users unfollow" on public.follows;
create policy "users unfollow" on public.follows for delete to authenticated using (auth.uid() = follower_id);

-- РЕПОСТИ
create table if not exists public.reposts (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists reposts_user_idx on public.reposts (user_id, created_at desc);
alter table public.reposts enable row level security;

drop policy if exists "reposts readable" on public.reposts;
create policy "reposts readable" on public.reposts for select to authenticated using (true);
drop policy if exists "users repost" on public.reposts;
create policy "users repost" on public.reposts for insert to authenticated with check (
  auth.uid() = user_id
  and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);
drop policy if exists "users unrepost" on public.reposts;
create policy "users unrepost" on public.reposts for delete to authenticated using (auth.uid() = user_id);

-- ПЕРЕГЛЯДИ (унікальні: одна людина = один перегляд)
create table if not exists public.post_views (
  post_id bigint not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);
alter table public.post_views enable row level security;
-- прямого доступу немає: лише через функцію record_views

create or replace function public.record_views(ids bigint[])
returns void language sql security definer set search_path = public as $$
  insert into public.post_views (post_id, viewer_id)
  select p.id, auth.uid()
  from public.posts p
  where p.id = any(ids[1:50]) and p.author_id <> auth.uid() and auth.uid() is not null
  on conflict do nothing;
$$;
revoke all on function public.record_views(bigint[]) from public, anon;
grant execute on function public.record_views(bigint[]) to authenticated;

-- ЛІЧИЛЬНИКИ (тригери)
create or replace function public.bump_post_counter()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col text := tg_argv[0];
  pid bigint;
  delta int;
begin
  if tg_op = 'INSERT' then pid := new.post_id; delta := 1; else pid := old.post_id; delta := -1; end if;
  execute format('update public.posts set %I = greatest(%I + $1, 0) where id = $2', col, col) using delta, pid;
  return null;
end;
$$;

drop trigger if exists likes_count_trg on public.likes;
create trigger likes_count_trg after insert or delete on public.likes
  for each row execute function public.bump_post_counter('likes_count');
drop trigger if exists reposts_count_trg on public.reposts;
create trigger reposts_count_trg after insert or delete on public.reposts
  for each row execute function public.bump_post_counter('reposts_count');
drop trigger if exists views_count_trg on public.post_views;
create trigger views_count_trg after insert on public.post_views
  for each row execute function public.bump_post_counter('views_count');

-- РЕЙТИНГ
-- Бали: підписник = 10, запрошений (заповнив анкету) = 20, лайк = 1, репост = 3
create or replace view public.user_stats as
select s.*,
  (s.followers * 10 + s.invites * 20 + s.likes_received + s.reposts_received * 3)::int as rating
from (
  select p.id,
    (select count(*) from public.follows f where f.following_id = p.id)::int as followers,
    (select count(*) from public.follows f where f.follower_id = p.id)::int as following,
    (select count(*) from public.profiles i where i.invited_by = p.id and i.onboarded)::int as invites,
    coalesce((select sum(x.likes_count) from public.posts x where x.author_id = p.id), 0)::int as likes_received,
    coalesce((select sum(x.reposts_count) from public.posts x where x.author_id = p.id), 0)::int as reposts_received,
    coalesce((select sum(x.views_count) from public.posts x where x.author_id = p.id), 0)::int as views_received,
    (select count(*) from public.posts x where x.author_id = p.id)::int as posts_count
  from public.profiles p
) s;
revoke all on public.user_stats from anon;
grant select on public.user_stats to authenticated;

-- СХОВИЩЕ ФОТО
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "media upload own folder" on storage.objects;
create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
