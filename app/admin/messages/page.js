import Link from 'next/link';
import { requireAdminPage, loadConversationsAdmin } from '@/lib/admin';
import { formatDate } from '@/lib/constants';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({ searchParams }) {
  const { profile } = await requireAdminPage();
  const reportsOnly = searchParams?.filter === 'reports';
  const { conversations, openReportsTotal } = await loadConversationsAdmin({ reportsOnly });

  return (
    <>
      <Header profile={profile} isAdmin active="admin" />
      <main className="container stack" style={{ gap: 20 }}>
        <div className="row-wrap spread">
          <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Модерація чатів</h1>
          <Link href="/admin" className="btn btn-outline btn-sm">← Адмінка</Link>
        </div>
        <div className="alert" style={{ background: 'var(--honey-soft)', color: 'var(--honey-deep)' }}>
          Доступ до листувань — для модерації за скаргою або з міркувань безпеки. Користувачів про це попереджено в чаті. Відкривай розмову лише за потреби.
        </div>

        <div className="row-wrap">
          <Link href="/admin/messages" className={`pill ${!reportsOnly ? 'on' : ''}`}>Усі розмови ({conversations.length}{reportsOnly ? '' : ''})</Link>
          <Link href="/admin/messages?filter=reports" className={`pill ${reportsOnly ? 'on' : ''}`}>Зі скаргами{openReportsTotal > 0 ? ` · ${openReportsTotal}` : ''}</Link>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Учасники</th><th>Повідомлень</th><th>Останнє</th><th>Скарги</th><th></th></tr>
            </thead>
            <tbody>
              {conversations.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 28 }}>Нічого немає</td></tr>}
              {conversations.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.a_name}</b> <span className="muted">↔</span> <b>{c.b_name}</b></td>
                  <td>{c.messages}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.last_message_at, true)}</td>
                  <td>{c.openReports > 0 ? <span className="tag red">{c.openReports} нових</span> : c.reports > 0 ? <span className="tag">{c.reports}</span> : '—'}</td>
                  <td><Link href={`/admin/messages/${c.id}`} className="btn btn-outline btn-sm">Відкрити</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
