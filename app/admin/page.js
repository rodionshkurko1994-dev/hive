import Link from 'next/link';
import { requireAdminPage, loadAllUsers } from '@/lib/admin';
import { DISTRICTS, formatDate } from '@/lib/constants';
import Avatar from '@/components/Avatar';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

function statusOf(u) {
  if (u.is_blocked) return ['Заблоковано', 'red'];
  if (!u.confirmed_at) return ['Пошта не підтверджена', ''];
  if (!u.onboarded) return ['Без анкети', 'honey'];
  return ['Активний', 'green'];
}

export default async function AdminPage({ searchParams }) {
  const { profile } = await requireAdminPage();
  const all = await loadAllUsers();

  const q = (searchParams?.q || '').toString().trim().toLowerCase();
  const district = DISTRICTS.includes(searchParams?.district) ? searchParams.district : '';
  const status = (searchParams?.status || '').toString();

  const sort = searchParams?.sort === 'rating' ? 'rating' : 'date';
  const users = all.filter((u) => {
    if (q && !(`${u.full_name} ${u.email} ${u.building} ${u.neighborhood}`.toLowerCase().includes(q))) return false;
    if (district && u.district !== district) return false;
    if (status === 'blocked' && !u.is_blocked) return false;
    if (status === 'unconfirmed' && u.confirmed_at) return false;
    if (status === 'noprofile' && (u.onboarded || !u.confirmed_at)) return false;
    if (status === 'active' && (u.is_blocked || !u.confirmed_at || !u.onboarded)) return false;
    return true;
  });
  if (sort === 'rating') users.sort((a, b) => b.rating - a.rating);

  const now = Date.now();
  const day = 86400000;
  const stats = [
    ['Усього користувачів', all.length],
    ['Нових за 24 год', all.filter((u) => now - new Date(u.created_at) < day).length],
    ['Нових за 7 днів', all.filter((u) => now - new Date(u.created_at) < 7 * day).length],
    ['Не підтвердили пошту', all.filter((u) => !u.confirmed_at).length],
    ['Дописів усього', all.reduce((s, u) => s + u.posts, 0)],
    ['Переглядів усього', all.reduce((s, u) => s + u.views_received, 0)],
    ['Зареєстровано за запрошенням', all.filter((u) => u.invited_by).length],
  ];

  const byDistrict = DISTRICTS.map((d) => [d, all.filter((u) => u.district === d).length]).filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const exportQs = new URLSearchParams({ q, district, status }).toString();

  return (
    <>
      <Header profile={profile} isAdmin active="admin" />
      <main className="container stack" style={{ gap: 20 }}>
        <div className="row-wrap spread">
          <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Адмінка · Користувачі</h1>
          <div className="row">
            <Link href="/admin/reports" className="btn btn-outline">Скарги на дописи</Link>
            <Link href="/admin/messages" className="btn btn-outline">Модерація чатів</Link>
            <a href={`/admin/export?${exportQs}`} className="btn btn-outline">Завантажити CSV</a>
          </div>
        </div>
        {searchParams?.deleted && <div className="alert alert-ok">Користувача видалено.</div>}

        <div className="stats">
          {stats.map(([label, n]) => (
            <div key={label} className="card stack" style={{ gap: 4 }}>
              <span className="stat-num">{n}</span>
              <span className="small muted">{label}</span>
            </div>
          ))}
        </div>

        {byDistrict.length > 0 && (
          <div className="card stack">
            <h2 className="section-title">За районами</h2>
            <div className="row-wrap">
              {byDistrict.map(([d, n]) => (
                <Link key={d} href={`/admin?district=${encodeURIComponent(d)}`} className="tag" style={{ fontSize: 14, padding: '7px 12px', textDecoration: 'none' }}>
                  {d}: <b>{n}</b>
                </Link>
              ))}
            </div>
          </div>
        )}

        <form className="card row-wrap" role="search" style={{ gap: 12 }}>
          <div className="field" style={{ flex: '2 1 240px' }}>
            <label htmlFor="q">Пошук</label>
            <input id="q" name="q" className="input" placeholder="Ім'я, пошта, будинок" defaultValue={searchParams?.q || ''} />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="district">Район</label>
            <select id="district" name="district" className="select" defaultValue={district}>
              <option value="">Усі</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="status">Статус</label>
            <select id="status" name="status" className="select" defaultValue={status}>
              <option value="">Усі</option>
              <option value="active">Активні</option>
              <option value="noprofile">Без анкети</option>
              <option value="unconfirmed">Пошта не підтверджена</option>
              <option value="blocked">Заблоковані</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="sort">Сортування</label>
            <select id="sort" name="sort" className="select" defaultValue={sort}>
              <option value="date">Нові спочатку</option>
              <option value="rating">За рейтингом</option>
            </select>
          </div>
          <div className="row" style={{ alignSelf: 'flex-end' }}>
            <button type="submit" className="btn btn-dark">Фільтрувати</button>
            <Link href="/admin" className="btn btn-ghost">Скинути</Link>
          </div>
        </form>

        <p className="small muted" style={{ margin: 0 }}>Показано {users.length} з {all.length}</p>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Користувач</th>
                <th>Район і будинок</th>
                <th>Реєстрація</th>
                <th>Останній вхід</th>
                <th>Дописи</th>
                <th>Підписники</th>
                <th>Рейтинг</th>
                <th>Статус</th>
                <th><span className="sr-only">Дії</span></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 32 }}>Нікого не знайдено</td></tr>
              )}
              {users.map((u) => {
                const [label, cls] = statusOf(u);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar profile={{ full_name: u.full_name || u.email, avatar_url: u.avatar_url }} size={36} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <b>{u.full_name || '—'}</b>
                          <span className="small muted">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{u.district || '—'}</span>
                        <span className="small muted">{[u.neighborhood, u.building].filter(Boolean).join(' · ')}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(u.created_at, true)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{u.last_sign_in_at ? formatDate(u.last_sign_in_at, true) : '—'}</td>
                    <td>{u.posts}</td>
                    <td>{u.followers}</td>
                    <td><b>{u.rating}</b></td>
                    <td><span className={`tag ${cls}`}>{label}</span></td>
                    <td><Link href={`/admin/users/${u.id}`} className="btn btn-outline btn-sm">Деталі</Link></td>
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
