import Link from 'next/link';
import { requireAdminPage, loadPostReports } from '@/lib/admin';
import { formatDate } from '@/lib/constants';
import { adminReviewPostReport, adminDeletePost } from '@/app/actions';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage({ searchParams }) {
  const { profile } = await requireAdminPage();
  const openOnly = searchParams?.all !== '1';
  const { groups, openTotal } = await loadPostReports({ openOnly });

  return (
    <>
      <Header profile={profile} isAdmin active="admin" />
      <main className="container stack" style={{ gap: 20, maxWidth: 860 }}>
        <div className="row-wrap spread">
          <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Скарги на дописи</h1>
          <Link href="/admin" className="btn btn-outline btn-sm">← Адмінка</Link>
        </div>

        <div className="row-wrap">
          <Link href="/admin/reports" className={`pill ${openOnly ? 'on' : ''}`}>Нові{openTotal > 0 ? ` · ${openTotal}` : ''}</Link>
          <Link href="/admin/reports?all=1" className={`pill ${!openOnly ? 'on' : ''}`}>Усі</Link>
        </div>

        {groups.length === 0 && <div className="card muted" style={{ textAlign: 'center' }}>Скарг немає.</div>}

        {groups.map(({ post, reports, author_name }) => (
          <section key={post.id} className="card stack" style={{ gap: 12 }}>
            <div className="row-wrap spread">
              <span className="small muted">Автор: <b>{author_name}</b> · {formatDate(post.created_at, true)}</span>
              <span className="tag red">{reports.length} скарг</span>
            </div>
            {post.body && <p className="post-body" style={{ fontSize: 15 }}>{post.body}</p>}
            {post.images?.length > 0 && (
              <div className="photo-grid" style={{ maxWidth: 420 }}>
                {post.images.map((src) => <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" /></a>)}
              </div>
            )}
            <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
              {reports.map((r) => (
                <div key={r.id} className="row-wrap spread">
                  <span className="small">
                    <b>{r.reporter_name}</b>: {r.reason || 'без причини'}
                    <span className="muted"> · {formatDate(r.created_at, true)}</span>
                    {r.status === 'reviewed' && <span className="tag green" style={{ marginLeft: 8 }}>розглянуто</span>}
                  </span>
                  {r.status === 'open' && (
                    <form action={adminReviewPostReport}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <button type="submit" className="btn btn-outline btn-sm">Розглянуто</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
            <div className="row-wrap" style={{ gap: 10 }}>
              <Link href={`/p/${post.id}`} className="btn btn-outline btn-sm">Відкрити допис</Link>
              <Link href={`/admin/users/${post.author_id}`} className="btn btn-outline btn-sm">Профіль автора</Link>
              <form action={adminDeletePost}>
                <input type="hidden" name="post_id" value={post.id} />
                <button type="submit" className="btn btn-danger btn-sm">Видалити допис</button>
              </form>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
