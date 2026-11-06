import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { initials, formatDate } from '@/lib/constants';
import { POST_SELECT, attachLikes } from '@/lib/posts';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }) {
  const { supabase, user, profile: me, isAdmin } = await getSession();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

  const { data: posts } = await supabase.from('posts').select(POST_SELECT)
    .eq('author_id', p.id).order('created_at', { ascending: false }).limit(50);
  const items = await attachLikes(supabase, posts || [], user.id);
  const isMe = p.id === user.id;
  const sameDistrict = p.district && p.district === me.district;

  return (
    <>
      <Header profile={me} isAdmin={isAdmin} />
      <div className="container" style={{ paddingBottom: 0 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cover" aria-hidden="true">
            <div className="hex" style={{ position: 'absolute', right: '8%', top: 34, width: 86, height: 86, background: 'var(--honey)' }} />
            <div className="hex" style={{ position: 'absolute', right: 'calc(8% + 80px)', top: 84, width: 52, height: 52, background: 'var(--honey)', opacity: 0.45 }} />
          </div>
          <div className="profile-head">
            <div className="hex" style={{ width: 140, height: 140, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="avatar honey display" style={{ width: 128, height: 128, fontSize: 38 }}>{initials(p.full_name)}</div>
            </div>
            <div className="stack" style={{ flex: '1 1 280px', gap: 6, paddingBottom: 6 }}>
              <div className="row-wrap">
                <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{p.full_name || 'Сусід'}</h1>
                {sameDistrict && !isMe && <span className="tag honey">Ваш сусід</span>}
                {p.is_blocked && <span className="tag red">Обмежено</span>}
              </div>
              <span className="muted">
                {[p.neighborhood, p.district && `${p.district} район`].filter(Boolean).join(' · ')} · на HIVE з {formatDate(p.created_at)}
              </span>
            </div>
            <div className="row-wrap" style={{ paddingBottom: 6 }}>
              {isMe ? (
                <Link href="/onboarding" className="btn btn-outline">Редагувати профіль</Link>
              ) : (
                <span className="hint">Друзі та повідомлення — у наступній версії</span>
              )}
              {isAdmin && <Link href={`/admin/users/${p.id}`} className="btn btn-dark">В адмінці</Link>}
            </div>
          </div>
        </div>
      </div>

      <main className="container layout">
        <aside className="col-side" style={{ flexBasis: 320 }}>
          <section className="card stack" aria-labelledby="about">
            <h2 id="about" className="section-title">Про себе</h2>
            <p style={{ margin: 0 }}>{p.bio || <span className="muted">Ще нічого не розповів.</span>}</p>
            {p.building && sameDistrict && <span className="small muted">Будинок: {p.building}</span>}
          </section>
        </aside>
        <section className="col-main" aria-label="Дописи">
          {items.length === 0 && <div className="card muted">Дописів поки немає.</div>}
          {items.map(({ post, likes, liked }) => (
            <PostCard key={post.id} post={post} myId={user.id} likes={likes} liked={liked} />
          ))}
        </section>
      </main>
    </>
  );
}
