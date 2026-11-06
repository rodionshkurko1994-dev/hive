import Link from 'next/link';
import { getSession } from '@/lib/session';
import { timeAgo } from '@/lib/constants';
import { MOD_NOTICE, otherParticipantId } from '@/lib/messages';
import Header from '@/components/Header';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const { supabase, user, profile, isAdmin } = await getSession();

  const { data: convs } = await supabase.from('conversations')
    .select('*')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false }).limit(100);

  const otherIds = [...new Set((convs || []).map((c) => otherParticipantId(c, user.id)))];
  const { data: people } = otherIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherIds)
    : { data: [] };
  const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="messages" />
      <main className="container stack" style={{ maxWidth: 720, gap: 16 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Повідомлення</h1>
        <p className="small muted" style={{ margin: 0 }}>{MOD_NOTICE}</p>

        {(convs || []).length === 0 ? (
          <div className="card muted" style={{ textAlign: 'center' }}>
            Немає листувань. Відкрий чиюсь сторінку і натисни «Написати».
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {(convs || []).map((c, i) => {
              const p = byId[otherParticipantId(c, user.id)] || {};
              return (
                <Link key={c.id} href={`/messages/${c.id}`} className="conv-row" style={i > 0 ? { borderTop: '1px solid var(--gray-200)' } : undefined}>
                  <Avatar profile={p} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row spread" style={{ gap: 8 }}>
                      <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name || 'Користувач'}</b>
                      <span className="small muted" style={{ flex: 'none' }}>{timeAgo(c.last_message_at)}</span>
                    </div>
                    <span className="small muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.last_message_preview || 'Почніть розмову'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
