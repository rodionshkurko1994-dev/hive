import Link from 'next/link';
import { getSession } from '@/lib/session';
import { POST_SELECT, AUTHOR, withMine, rankPosts } from '@/lib/posts';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import ViewTracker from '@/components/ViewTracker';

export const dynamic = 'force-dynamic';

const TABS = [
  ['for-you', 'Рекомендації'],
  ['following', 'Підписки'],
  ['district', 'Мій район'],
];

export default async function FeedPage({ searchParams }) {
  const { supabase, user, profile, isAdmin } = await getSession();
  const tab = TABS.some(([k]) => k === searchParams?.tab) ? searchParams.tab : 'for-you';

  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
  const followingIds = (follows || []).map((f) => f.following_id);

  let items = [];
  if (tab === 'for-you') {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await supabase.from('posts').select(POST_SELECT)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(300);
    items = rankPosts(data || [], { followingIds, district: profile.district, myId: user.id })
      .slice(0, 60).map((post) => ({ post }));
  } else if (tab === 'following') {
    if (followingIds.length) {
      const [{ data: posts }, { data: reps }] = await Promise.all([
        supabase.from('posts').select(POST_SELECT).in('author_id', followingIds)
          .order('created_at', { ascending: false }).limit(60),
        supabase.from('reposts')
          .select(`created_at, user:profiles!reposts_user_id_fkey(id, full_name), post:posts(*, ${AUTHOR})`)
          .in('user_id', followingIds).order('created_at', { ascending: false }).limit(40),
      ]);
      const seen = new Set();
      items = [
        ...(posts || []).map((p) => ({ post: p, at: p.created_at })),
        ...(reps || []).filter((r) => r.post).map((r) => ({ post: r.post, at: r.created_at, repostedBy: r.user })),
      ]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .filter((it) => (seen.has(it.post.id) ? false : seen.add(it.post.id)));
    }
  } else {
    const { data } = await supabase.from('posts').select(POST_SELECT)
      .eq('district', profile.district).order('created_at', { ascending: false }).limit(60);
    items = (data || []).map((post) => ({ post }));
  }
  items = await withMine(supabase, items, user.id);

  const [{ data: newbies }, { data: top }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, neighborhood, district')
      .eq('district', profile.district).eq('onboarded', true).neq('id', user.id)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('user_stats').select('id, rating').order('rating', { ascending: false }).limit(5),
  ]);
  const topIds = (top || []).map((t) => t.id);
  const { data: topProfiles } = topIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', topIds)
    : { data: [] };
  const topList = (top || []).map((t) => ({ ...t, p: (topProfiles || []).find((x) => x.id === t.id) })).filter((t) => t.p);

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="feed" />
      <ViewTracker />
      <main className="container layout">
        <aside className="col-side">
          <Link href={`/u/${profile.id}`} className="card row" style={{ textDecoration: 'none', color: 'var(--black)' }}>
            <Avatar profile={profile} size={52} tone="honey" />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <b>{profile.full_name}</b>
              <span className="small muted">{profile.neighborhood || `${profile.district} район`}</span>
            </span>
          </Link>
          <Link href={`/u/${profile.id}#new`} className="btn btn-honey">Новий допис</Link>
        </aside>

        <section className="col-main" aria-label="Стрічка">
          <nav className="tabs" aria-label="Стрічки">
            {TABS.map(([k, label]) => (
              <Link key={k} href={`/feed?tab=${k}`} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>

          {items.length === 0 && (
            <div className="card muted" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              {tab === 'following'
                ? <>Ти ще ні на кого не підписаний. Знайди людей у розділі <Link href="/neighbors">Сусіди</Link> або <Link href="/rating">Рейтинг</Link>.</>
                : <>Тут поки тихо. <Link href={`/u/${profile.id}#new`}>Напиши перший допис</Link>.</>}
            </div>
          )}
          {items.map((it) => (
            <PostCard key={`${it.post.id}-${it.repostedBy?.id || ''}`} post={it.post} myId={user.id}
              liked={it.liked} reposted={it.reposted} repostedBy={it.repostedBy} />
          ))}
        </section>

        <aside className="col-side">
          {topList.length > 0 && (
            <section className="card stack" aria-labelledby="top">
              <h2 id="top" className="section-title">Топ рейтингу</h2>
              {topList.map((t, i) => (
                <Link key={t.id} href={`/u/${t.id}`} className="row" style={{ textDecoration: 'none', color: 'var(--black)' }}>
                  <span style={{ width: 18, fontWeight: 700, color: 'var(--gray-600)' }}>{i + 1}</span>
                  <Avatar profile={t.p} size={36} />
                  <b style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{t.p.full_name}</b>
                  <span className="small" style={{ fontWeight: 700, color: 'var(--honey-text)' }}>{t.rating}</span>
                </Link>
              ))}
              <Link href="/rating" className="small" style={{ fontWeight: 600 }}>Увесь рейтинг</Link>
            </section>
          )}
          <section className="card stack" aria-labelledby="newbies">
            <h2 id="newbies" className="section-title">Нові в районі</h2>
            {(newbies || []).length === 0 && <p className="small muted" style={{ margin: 0 }}>Запроси сусідів — поки ти тут перший.</p>}
            {(newbies || []).map((n) => (
              <Link key={n.id} href={`/u/${n.id}`} className="row" style={{ textDecoration: 'none', color: 'var(--black)' }}>
                <Avatar profile={n} size={40} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{n.full_name}</b>
                  <span className="small muted">{n.neighborhood || n.district}</span>
                </span>
              </Link>
            ))}
            <Link href="/neighbors" className="small" style={{ fontWeight: 600 }}>Усі сусіди</Link>
          </section>
        </aside>
      </main>
    </>
  );
}
