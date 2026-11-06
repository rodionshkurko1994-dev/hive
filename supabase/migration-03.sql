-- HIVE v3: коментарі (як у Threads): відповіді на допис, відповіді на коментар (1 рівень), вподобання коментарів.
-- Виконати у Supabase → SQL Editor після migration-02.sql. Безпечно запускати повторно.

alter table public.posts add column if not exists comments_count integer not null default 0;

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);
alter table public.comments enable row level security;

drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select to authenticated using (true);

drop policy if exists "members comment" on public.comments;
create policy "members comment" on public.comments for insert to authenticated with check (
  auth.uid() = author_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_blocked)
  and (
    parent_id is null
    or exists (select 1 from public.comments c where c.id = comments.parent_id and c.post_id = comments.post_id and c.parent_id is null)
  )
);

-- Видалити коментар може його автор або автор допису
drop policy if exists "delete own or on own post" on public.comments;
create policy "delete own or on own post" on public.comments for delete to authenticated using (
  auth.uid() = author_id
  or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);

drop trigger if exists comments_count_trg on public.comments;
create trigger comments_count_trg after insert or delete on public.comments
  for each row execute function public.bump_post_counter('comments_count');

-- Вподобання коментарів
create table if not exists public.comment_likes (
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;

drop policy if exists "comment likes readable" on public.comment_likes;
create policy "comment likes readable" on public.comment_likes for select to authenticated using (true);
drop policy if exists "users like comments" on public.comment_likes;
create policy "users like comments" on public.comment_likes for insert to authenticated with check (
  auth.uid() = user_id
  and not exists (select 1 from public.comments c where c.id = comment_id and c.author_id = auth.uid())
);
drop policy if exists "users unlike comments" on public.comment_likes;
create policy "users unlike comments" on public.comment_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_comment_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
  else
    update public.comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_trg on public.comment_likes;
create trigger comment_likes_trg after insert or delete on public.comment_likes
  for each row execute function public.bump_comment_likes();

update public.posts p set comments_count = (select count(*) from public.comments c where c.post_id = p.id);
