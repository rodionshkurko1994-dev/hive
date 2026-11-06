import Link from 'next/link';
import { getSession } from '@/lib/session';
import { createPost } from '@/app/actions';
import { CATEGORIES, initials } from '@/lib/constants';
import { POST_SELECT, attachLikes } from '@/lib/posts';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';

export const dynamic = 'force-dynamic';

export default async function FeedPage({ searchParams }) {
  const { supabase, user, profile, isAdmin } = await getSession();
  const scope = ['district', 'building', 'all'].includes(searchParams?.scope) ? searchParams.scope : 'district';
  const cat = CATEGORIES[searchParams?.cat] ? searchParams.cat : 'all';

  let q = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(50);
  if (scope === 'district' && profile.district) q = q.eq('district', profile.district);
  if (scope === 'building') {
    q = profile.building ? q.eq('building', profile.building) : q.eq('id', -1);
  }
  if (cat !== 'all') q = q.eq('category', cat);
  const { data: posts } = await q;
  const items = await attachLikes(supabase, posts || [], user.id);

  const { data: newbies } = await supabase
    .from('profiles').select('id, full_name, neighborhood, building, district')
    .eq('district', profile.district).eq('onboarded', true).neq('id', user.id)
    .order('created_at', { ascending: false }).limit(5);

  const link = (s, c) => `/feed?scope=${s}${c !== 'all' ? `&cat=${c}` : ''}`;
  const scopes = [
    ['building', 'Мій будинок'],
    ['district', `${profile.district} район`],
    ['all', 'Увесь Київ'],
  ];

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="feed" />
      <main className="container layout">
        <aside className="col-side">
          <Link href={`/u/${profile.id}`} className="card row" style={{ textDecoration: 'none', color: 'var(--black)' }}>
            <span className="avatar honey" style={{ width: 52, height: 52, fontSize: 17 }}>{initials(profile.full_name)}</span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <b>{profile.full_name}</b>
              <span className="small muted">{[profile.neighborhood, profile.building].filter(Boolean).join(' · ') || `${profile.district} район`}</span>
            </span>
          </Link>
          <nav className="card side-nav" aria-label="Стрічки">
            {scopes.map(([s, label]) => (
              <Link key={s} href={link(s, cat)} className={scope === s ? 'active' : ''}>{label}</Link>
            ))}
          </nav>
        </aside>

        <section className="col-main" aria-label="Стрічка">
          {profile.is_blocked ? (
            <div className="alert alert-error">Ваш акаунт обмежено адміністратором — публікувати дописи не можна.</div>
          ) : (
            <form action={createPost} className="card stack">
              <label htmlFor="body" className="sr-only">Новий допис</label>
              <textarea id="body" name="body" className="textarea" required maxLength={3000}
                placeholder="Що відбувається у вашому районі?" style={{ minHeight: 80 }} />
              <div className="row-wrap spread">
                <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="category" className="small muted" style={{ fontWeight: 500 }}>Тема</label>
                  <select id="category" name="category" className="select" style={{ width: 'auto', padding: '8px 12px' }} defaultValue="general">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-honey">Опублікувати</button>
              </div>
            </form>
          )}

          <div className="row-wrap" role="group" aria-label="Фільтр за темою">
            <Link href={link(scope, 'all')} className={`pill ${cat === 'all' ? 'on' : ''}`}>Усе</Link>
            {Object.entries(CATEGORIES).filter(([k]) => k !== 'general').map(([k, v]) => (
              <Link key={k} href={link(scope, k)} className={`pill ${cat === k ? 'on' : ''}`}>{v}</Link>
            ))}
          </div>

          {scope === 'building' && !profile.building && (
            <div className="card muted">Вкажи свій будинок або ЖК у <Link href="/onboarding">профілі</Link>, щоб бачити стрічку будинку.</div>
          )}
          {items.length === 0 && (scope !== 'building' || profile.building) && (
            <div className="card muted" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              Тут поки тихо. Напиши перший допис — сусіди побачать його першими.
            </div>
          )}
          {items.map(({ post, likes, liked }) => (
            <PostCard key={post.id} post={post} myId={user.id} likes={likes} liked={liked} />
          ))}
        </section>

        <aside className="col-side">
          <section className="card stack" aria-labelledby="newbies">
            <h2 id="newbies" className="section-title">Нові сусіди</h2>
            {(newbies || []).length === 0 && <p className="small muted" style={{ margin: 0 }}>Запроси сусідів — поки ти тут перший.</p>}
            {(newbies || []).map((n) => (
              <Link key={n.id} href={`/u/${n.id}`} className="row" style={{ textDecoration: 'none', color: 'var(--black)' }}>
                <span className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initials(n.full_name)}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{n.full_name}</b>
                  <span className="small muted">{n.building || n.neighborhood || n.district}</span>
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
