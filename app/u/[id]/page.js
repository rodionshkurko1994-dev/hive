import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { formatDate } from '@/lib/constants';
import { POST_SELECT, AUTHOR, withMine, fmtCount } from '@/lib/posts';
import { toggleFollow, startConversation } from '@/app/actions';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import Composer from '@/components/Composer';
import InviteCard from '@/components/InviteCard';
import ViewTracker from '@/components/ViewTracker';

export const dynamic = 'force-dynamic';

export default async function UserPage({ params, searchParams }) {
  const { supabase, user, profile: me, isAdmin } = await getSession();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

  const isMe = p.id === user.id;
  const tab = searchParams?.tab === 'photos' ? 'photos' : 'posts';

  const [{ data: stats }, { data: followRow }, { data: posts }, { data: reps }] = await Promise.all([
    supabase.from('user_stats').select('*').eq('id', p.id).maybeSingle(),
    supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', p.id).maybeSingle(),
    supabase.from('posts').select(POST_SELECT).eq('author_id', p.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('reposts').select(`created_at, post:posts(*, ${AUTHOR})`).eq('user_id', p.id)
      .order('created_at', { ascending: false }).limit(30),
  ]);
  const s = stats || { followers: 0, following: 0, rating: 0, views_received: 0, invites: 0 };
  const following = !!followRow;

  let items = [
    ...(posts || []).map((post) => ({ post, at: post.created_at })),
    ...(reps || []).filter((r) => r.post).map((r) => ({ post: r.post, at: r.created_at, repostedBy: { id: p.id, full_name: p.full_name } })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  items = await withMine(supabase, items, user.id);
  const photos = (posts || []).flatMap((x) => x.images || []);

  return (
    <>
      <Header profile={me} isAdmin={isAdmin} active={isMe ? 'me' : ''} />
      <ViewTracker />
      <div className="container" style={{ paddingBottom: 0 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cover" aria-hidden="true">
            <div className="hex" style={{ position: 'absolute', right: '8%', top: 34, width: 86, height: 86, background: 'var(--honey)' }} />
            <div className="hex" style={{ position: 'absolute', right: 'calc(8% + 80px)', top: 84, width: 52, height: 52, background: 'var(--honey)', opacity: 0.45 }} />
          </div>
          <div className="profile-head">
            <div className="hex profile-avatar" style={{ width: 140, height: 140, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Avatar profile={p} size={128} tone="honey" className="display" />
            </div>
            <div className="stack" style={{ flex: '1 1 280px', gap: 8 }}>
              <div className="row-wrap">
                <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{p.full_name || 'Користувач'}</h1>
                <span className="rating-badge" title="Рейтинг">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" /></svg>
                  {fmtCount(s.rating)}
                </span>
                {p.is_blocked && <span className="tag red">Обмежено</span>}
              </div>
              <div className="pstats">
                <span><b>{fmtCount(s.followers)}</b> <span className="muted">підписників</span></span>
                <span><b>{fmtCount(s.following)}</b> <span className="muted">підписок</span></span>
                <span><b>{fmtCount(s.views_received)}</b> <span className="muted">переглядів</span></span>
              </div>
              <span className="small muted">
                {[p.neighborhood, p.district && `${p.district} район`].filter(Boolean).join(' · ')} · на HIVE з {formatDate(p.created_at)}
              </span>
            </div>
            <div className="row-wrap">
              {isMe ? (
                <Link href="/onboarding" className="btn btn-outline">Редагувати профіль</Link>
              ) : (
                <>
                  <form action={toggleFollow}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <input type="hidden" name="following" value={following ? '1' : '0'} />
                    <button type="submit" className={following ? 'btn btn-outline' : 'btn btn-honey'}>
                      {following ? 'Ви підписані' : 'Підписатися'}
                    </button>
                  </form>
                  <form action={startConversation}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <button type="submit" className="btn btn-outline">Написати</button>
                  </form>
                </>
              )}
              {isAdmin && <Link href={`/admin/users/${p.id}`} className="btn btn-dark">В адмінці</Link>}
            </div>
          </div>
          <nav className="tabs" aria-label="Розділи профілю" style={{ padding: '0 20px', borderBottom: 0, borderTop: '1px solid var(--gray-200)' }}>
            <Link href={`/u/${p.id}`} className={tab === 'posts' ? 'on' : ''}>Дописи</Link>
            <Link href={`/u/${p.id}?tab=photos`} className={tab === 'photos' ? 'on' : ''}>Фото {photos.length > 0 && `(${photos.length})`}</Link>
          </nav>
        </div>
      </div>

      <main className="container layout">
        <aside className="col-side" style={{ flexBasis: 320 }}>
          <section className="card stack" aria-labelledby="about">
            <h2 id="about" className="section-title">Про себе</h2>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.bio || <span className="muted">Ще нічого не розповів.</span>}</p>
          </section>
          {isMe && <InviteCard userId={p.id} invites={s.invites} />}
        </aside>
        <section className="col-main" aria-label={tab === 'photos' ? 'Фото' : 'Дописи'}>
          {tab === 'posts' && (
            <>
              {isMe && !me.is_blocked && <Composer userId={user.id} />}
              {isMe && me.is_blocked && <div className="alert alert-error">Ваш акаунт обмежено адміністратором — публікувати дописи не можна.</div>}
              {items.length === 0 && <div className="card muted">Дописів поки немає.</div>}
              {items.map((it) => (
                <PostCard key={`${it.post.id}-${it.repostedBy ? 'r' : 'p'}`} post={it.post} myId={user.id}
                  liked={it.liked} reposted={it.reposted} repostedBy={it.repostedBy} />
              ))}
            </>
          )}
          {tab === 'photos' && (
            photos.length === 0
              ? <div className="card muted">{isMe ? 'Додай фото до допису на вкладці «Дописи».' : 'Фото поки немає.'}</div>
              : (
                <div className="card photo-grid">
                  {photos.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" loading="lazy" /></a>
                  ))}
                </div>
              )
          )}
        </section>
      </main>
    </>
  );
}
