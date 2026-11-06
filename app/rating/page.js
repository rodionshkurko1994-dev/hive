import Link from 'next/link';
import { getSession } from '@/lib/session';
import { fmtCount } from '@/lib/posts';
import Header from '@/components/Header';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function RatingPage() {
  const { supabase, user, profile, isAdmin } = await getSession();

  const { data: top } = await supabase.from('user_stats').select('*').order('rating', { ascending: false }).limit(100);
  const ids = (top || []).map((t) => t.id);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url, neighborhood, district').in('id', ids)
    : { data: [] };
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const rows = (top || []).filter((t) => byId[t.id]);

  const { data: mine } = await supabase.from('user_stats').select('*').eq('id', user.id).maybeSingle();
  const myPlace = rows.findIndex((r) => r.id === user.id) + 1;

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="rating" />
      <main className="container stack" style={{ gap: 20, maxWidth: 960 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>Рейтинг</h1>

        <div className="layout">
          <section className="card-dark stack" style={{ flex: '1 1 300px' }} aria-labelledby="me">
            <h2 id="me" className="section-title" style={{ color: '#d4d4d4' }}>Твій рейтинг</h2>
            <span className="display" style={{ fontSize: 44, color: 'var(--honey)', lineHeight: 1 }}>{fmtCount(mine?.rating || 0)}</span>
            <span style={{ color: '#d4d4d4' }}>{myPlace ? `${myPlace}-е місце` : 'Поза топ-100'}</span>
            <div className="small" style={{ color: '#d4d4d4', display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
              <span>Підписники</span><b>{mine?.followers || 0}</b>
              <span>Запрошені</span><b>{mine?.invites || 0}</b>
              <span>Вподобання</span><b>{mine?.likes_received || 0}</b>
              <span>Поширення</span><b>{mine?.reposts_received || 0}</b>
            </div>
          </section>
          <section className="card stack" style={{ flex: '1 1 300px' }} aria-labelledby="how">
            <h2 id="how" className="section-title">Як нараховуються бали</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, fontSize: 15 }}>
              <span>Новий підписник</span><b>+10</b>
              <span>Запрошений друг, що зареєструвався</span><b>+20</b>
              <span>Вподобання твого допису</span><b>+1</b>
              <span>Поширення твого допису</span><b>+3</b>
            </div>
            <span className="small muted">Власні дописи не можна вподобати чи поширити.</span>
          </section>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>#</th><th>Користувач</th><th>Підписники</th><th>Запрошені</th><th>Вподобання</th><th>Поширення</th><th>Рейтинг</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const p = byId[r.id];
                return (
                  <tr key={r.id} style={r.id === user.id ? { background: 'var(--honey-soft)' } : undefined}>
                    <td style={{ fontWeight: 700 }}>{i + 1}</td>
                    <td>
                      <Link href={`/u/${p.id}`} className="row" style={{ gap: 10, textDecoration: 'none', color: 'var(--black)' }}>
                        <Avatar profile={p} size={36} />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <b>{p.full_name}</b>
                          <span className="small muted">{p.neighborhood || p.district}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{r.followers}</td>
                    <td>{r.invites}</td>
                    <td>{r.likes_received}</td>
                    <td>{r.reposts_received}</td>
                    <td><b style={{ color: 'var(--honey-text)' }}>{fmtCount(r.rating)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
