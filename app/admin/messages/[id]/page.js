import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage, loadConversationAdmin } from '@/lib/admin';
import { formatDate } from '@/lib/constants';
import { clockTime, dayLabel } from '@/lib/messages';
import { adminReviewReport } from '@/app/actions';
import Header from '@/components/Header';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function AdminConversationPage({ params }) {
  const { profile } = await requireAdminPage();
  const data = await loadConversationAdmin(Number(params.id));
  if (!data) notFound();
  const { conv, profiles, messages, reports } = data;
  const a = profiles[conv.user_a] || {};
  const b = profiles[conv.user_b] || {};

  let lastDay = '';
  return (
    <>
      <Header profile={profile} isAdmin active="admin" />
      <main className="container stack" style={{ gap: 16, maxWidth: 760 }}>
        <Link href="/admin/messages" className="small" style={{ fontWeight: 600 }}>← До модерації чатів</Link>
        <div className="card row-wrap spread">
          <div className="row" style={{ gap: 10 }}>
            <Avatar profile={a} size={40} />
            <b>{a.full_name || '—'}</b>
            <span className="muted">↔</span>
            <Avatar profile={b} size={40} />
            <b>{b.full_name || '—'}</b>
          </div>
          <span className="small muted">{messages.length} повідомлень</span>
        </div>

        {reports.length > 0 && (
          <section className="card stack" aria-labelledby="rep">
            <h2 id="rep" className="section-title">Скарги</h2>
            {reports.map((r) => (
              <div key={r.id} className="row-wrap spread" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
                <div className="stack" style={{ gap: 2 }}>
                  <span><b>{r.reporter_name}</b> · {formatDate(r.created_at, true)}</span>
                  <span className="muted">{r.reason || 'без причини'}</span>
                </div>
                {r.status === 'open' ? (
                  <form action={adminReviewReport}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <button type="submit" className="btn btn-outline btn-sm">Позначити розглянутою</button>
                  </form>
                ) : <span className="tag green">Розглянуто</span>}
              </div>
            ))}
          </section>
        )}

        <section className="card" aria-label="Листування">
          <div className="dm-scroll" style={{ background: 'transparent', padding: 0, maxHeight: 'none' }}>
            {messages.length === 0 && <p className="muted">Повідомлень немає.</p>}
            {messages.map((m) => {
              const day = dayLabel(m.created_at);
              const showDay = day !== lastDay; lastDay = day;
              const fromA = m.sender_id === conv.user_a;
              const who = fromA ? a : b;
              return (
                <div key={m.id}>
                  {showDay && <div className="dm-day"><span>{day}</span></div>}
                  <div className="cmt" style={{ paddingTop: 10 }}>
                    <div className="cmt-side"><Avatar profile={who} size={34} /></div>
                    <div className="cmt-main">
                      <div className="row" style={{ gap: 8 }}>
                        <b style={{ fontSize: 14 }}>{who.full_name || '—'}</b>
                        <span className="small muted">{clockTime(m.created_at)}</span>
                      </div>
                      {m.body && <p className="cmt-body">{m.body}</p>}
                      {(m.images || []).length > 0 && (
                        <div className="dm-imgs" style={{ maxWidth: 320 }}>
                          {m.images.map((src) => <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" /></a>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
