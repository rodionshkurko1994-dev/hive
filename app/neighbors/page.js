import Link from 'next/link';
import { getSession } from '@/lib/session';
import { initials } from '@/lib/constants';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function NeighborsPage({ searchParams }) {
  const { supabase, user, profile, isAdmin } = await getSession();
  const q = (searchParams?.q || '').toString().trim().slice(0, 60);

  let query = supabase.from('profiles')
    .select('id, full_name, district, neighborhood, building')
    .eq('district', profile.district).eq('onboarded', true).neq('id', user.id)
    .order('created_at', { ascending: false }).limit(100);
  if (q) query = query.ilike('full_name', `%${q}%`);
  const { data: people } = await query;

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="neighbors" />
      <main className="container stack" style={{ gap: 20 }}>
        <div className="row-wrap spread">
          <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Сусіди · {profile.district} район</h1>
          <form className="row" role="search">
            <label htmlFor="q" className="sr-only">Пошук за ім'ям</label>
            <input id="q" name="q" className="input" placeholder="Пошук за ім'ям" defaultValue={q} style={{ width: 240 }} />
            <button className="btn btn-dark" type="submit">Знайти</button>
          </form>
        </div>
        {(people || []).length === 0 && <div className="card muted">Поки нікого не знайдено.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {(people || []).map((p) => (
            <Link key={p.id} href={`/u/${p.id}`} className="card row" style={{ textDecoration: 'none', color: 'var(--black)', alignItems: 'flex-start' }}>
              <span className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{initials(p.full_name)}</span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                <b>{p.full_name}</b>
                <span className="small muted">{[p.neighborhood, p.building].filter(Boolean).join(' · ') || p.district}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
