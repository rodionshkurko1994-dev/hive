import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage, loadAllUsers } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/constants';
import Avatar from '@/components/Avatar';
import { adminSetBlocked, adminDeletePost, adminDeleteUser, adminResendConfirmation } from '@/app/actions';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function AdminUserPage({ params, searchParams }) {
  const { user: me, profile } = await requireAdminPage();
  const all = await loadAllUsers();
  const u = all.find((x) => x.id === params.id);
  if (!u) notFound();

  const admin = createAdminClient();
  const { data: posts } = await admin.from('posts').select('*').eq('author_id', u.id).order('created_at', { ascending: false }).limit(100);

  const rows = [
    ['ID', u.id],
    ['Пошта', u.email],
    ["Ім'я", u.full_name || '—'],
    ['Район', u.district || '—'],
    ['Місцевість', u.neighborhood || '—'],
    ['Будинок / ЖК', u.building || '—'],
    ['Про себе', u.bio || '—'],
    ['Зареєструвався', formatDate(u.created_at, true)],
    ['Пошту підтверджено', u.confirmed_at ? formatDate(u.confirmed_at, true) : 'Ні'],
    ['Останній вхід', u.last_sign_in_at ? formatDate(u.last_sign_in_at, true) : '—'],
    ['Анкету заповнено', u.onboarded ? 'Так' : 'Ні'],
    ['Дописів', u.posts],
    ['Рейтинг', u.rating],
    ['Підписники / підписки', `${u.followers} / ${u.following}`],
    ['Запросив людей', u.invites],
    ['Отримав вподобань / поширень', `${u.likes_received} / ${u.reposts_received}`],
    ['Переглядів дописів', u.views_received],
    ['Хто запросив', u.invited_by ? u.invited_by_name : '—'],
  ];

  return (
    <>
      <Header profile={profile} isAdmin active="admin" />
      <main className="container stack" style={{ gap: 20, maxWidth: 1000 }}>
        <Link href="/admin" className="small" style={{ fontWeight: 600 }}>← Усі користувачі</Link>
        {searchParams?.resent && <div className="alert alert-ok">Лист підтвердження надіслано повторно.</div>}
        {searchParams?.error && <div className="alert alert-error">Щоб видалити, введіть слово ВИДАЛИТИ великими літерами.</div>}

        <div className="card row-wrap" style={{ gap: 16 }}>
          <Avatar profile={{ full_name: u.full_name || u.email, avatar_url: u.avatar_url }} size={72} tone="honey" />
          <div className="stack" style={{ gap: 4, flex: '1 1 240px' }}>
            <h1 className="display" style={{ margin: 0, fontSize: 24 }}>{u.full_name || u.email}</h1>
            <span className="muted">{u.email}</span>
          </div>
          <div className="row-wrap">
            {u.is_blocked && <span className="tag red">Заблоковано</span>}
            <Link href={`/u/${u.id}`} className="btn btn-outline btn-sm">Публічна сторінка</Link>
          </div>
        </div>

        <section className="card stack" aria-labelledby="info">
          <h2 id="info" className="section-title">Інформація</h2>
          <dl className="kv" style={{ margin: 0 }}>
            {rows.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
          </dl>
        </section>

        <section className="card stack" aria-labelledby="actions">
          <h2 id="actions" className="section-title">Дії</h2>
          <div className="row-wrap" style={{ gap: 10 }}>
            {u.id !== me.id && (
              <form action={adminSetBlocked}>
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="blocked" value={u.is_blocked ? '0' : '1'} />
                <button type="submit" className={u.is_blocked ? 'btn btn-outline' : 'btn btn-danger'}>
                  {u.is_blocked ? 'Розблокувати' : 'Заблокувати публікації'}
                </button>
              </form>
            )}
            {!u.confirmed_at && (
              <form action={adminResendConfirmation}>
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="email" value={u.email} />
                <button type="submit" className="btn btn-outline">Надіслати лист підтвердження ще раз</button>
              </form>
            )}
          </div>
          {u.id !== me.id && (
            <form action={adminDeleteUser} className="row-wrap" style={{ gap: 10, borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
              <input type="hidden" name="user_id" value={u.id} />
              <label htmlFor="confirm" className="small muted">Видалити акаунт назавжди — введіть ВИДАЛИТИ:</label>
              <input id="confirm" name="confirm" className="input" style={{ width: 160 }} autoComplete="off" />
              <button type="submit" className="btn btn-danger">Видалити акаунт</button>
            </form>
          )}
        </section>

        <section className="card stack" aria-labelledby="posts">
          <h2 id="posts" className="section-title">Дописи ({(posts || []).length})</h2>
          {(posts || []).length === 0 && <p className="muted" style={{ margin: 0 }}>Дописів немає.</p>}
          {(posts || []).map((p) => (
            <div key={p.id} className="stack" style={{ gap: 6, borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
              <div className="row-wrap spread">
                <span className="small muted">{formatDate(p.created_at, true)}</span>
                <form action={adminDeletePost}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <button type="submit" className="btn btn-danger btn-sm">Видалити допис</button>
                </form>
              </div>
              {p.body && <p className="post-body" style={{ fontSize: 15 }}>{p.body}</p>}
              {p.images?.length > 0 && (
                <div className="photo-grid" style={{ maxWidth: 420 }}>
                  {p.images.map((src) => <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" /></a>)}
                </div>
              )}
              <span className="small muted">Переглядів {p.views_count} · вподобань {p.likes_count} · поширень {p.reposts_count}</span>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
