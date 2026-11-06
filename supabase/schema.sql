-- HIVE: схема бази даних. Виконати один раз у Supabase → SQL Editor → New query → Run.

-- ПРОФІЛІ ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  district text,
  neighborhood text,
  building text,
  bio text,
  onboarded boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members" on public.profiles
  for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Користувач може змінювати лише ці поля (не is_blocked)
revoke update on public.profiles from authenticated;
grant update (full_name, district, neighborhood, building, bio, onboarded)
  on public.profiles to authenticated;

-- Профіль створюється автоматично при реєстрації
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ДОПИСИ -------------------------------------------------------------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'general'
    check (category in ('general','light','help','lost','house')),
  body text not null check (char_length(body) between 1 and 3000),
  district text,
  neighborhood text,
  building text,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_district_idx on public.posts (district);

alter table public.posts enable row level security;

drop policy if exists "posts readable by members" on public.posts;
create policy "posts readable by members" on public.posts
  for select to authenticated using (true);

drop policy if exists "members create own posts" on public.posts;
create policy "members create own posts" on public.posts
  for insert to authenticated with check (
    auth.uid() = author_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_blocked)
  );

drop policy if exists "authors delete own posts" on public.posts;
create policy "authors delete own posts" on public.posts
  for delete to authenticated using (auth.uid() = author_id);

-- ВПОДОБАННЯ ---------------------------------------------------------
create table if not exists public.likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes
  for select to authenticated using (true);

drop policy if exists "users like" on public.likes;
create policy "users like" on public.likes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users unlike" on public.likes;
create policy "users unlike" on public.likes
  for delete to authenticated using (auth.uid() = user_id);
