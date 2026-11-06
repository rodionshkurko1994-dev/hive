import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { MOD_NOTICE, otherParticipantId } from '@/lib/messages';
import { reportConversation } from '@/app/actions';
import Header from '@/components/Header';
import Avatar from '@/components/Avatar';
import MessageThread from '@/components/MessageThread';
import DMComposer from '@/components/DMComposer';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params, searchParams }) {
  const { supabase, user, profile, isAdmin } = await getSession();
  const id = Number(params.id);
  if (!id) notFound();

  const { data: conv } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle();
  if (!conv) notFound();
  if (conv.user_a !== user.id && conv.user_b !== user.id) redirect('/messages');

  const otherId = otherParticipantId(conv, user.id);
  const { data: other } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherId).maybeSingle();
  const { data: messages } = await supabase.from('messages')
    .select('id, sender_id, body, images, created_at')
    .eq('conversation_id', id).order('id', { ascending: true }).limit(500);

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} active="messages" />
      <main className="dm-page">
        <div className="dm-head">
          <Link href="/messages" className="dm-back" aria-label="Назад">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <Link href={`/u/${otherId}`} className="row" style={{ gap: 10, textDecoration: 'none', color: 'var(--black)', flex: 1, minWidth: 0 }}>
            <Avatar profile={other} size={40} />
            <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other?.full_name || 'Користувач'}</b>
          </Link>
          <details className="dm-menu">
            <summary className="dm-icon-btn" aria-label="Дії">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </summary>
            <div className="dm-menu-pop card">
              <form action={reportConversation} className="stack" style={{ gap: 8 }}>
                <input type="hidden" name="conversation_id" value={id} />
                <label htmlFor="reason" className="small" style={{ fontWeight: 600 }}>Поскаржитись на розмову</label>
                <input id="reason" name="reason" className="input" placeholder="Причина (необовʼязково)" maxLength={500} />
                <button type="submit" className="btn btn-danger btn-sm">Надіслати скаргу</button>
              </form>
            </div>
          </details>
        </div>

        {searchParams?.reported && <div className="alert alert-ok" style={{ margin: '0 16px' }}>Скаргу надіслано модерації.</div>}

        <MessageThread conversationId={id} myId={user.id} initial={messages || []} />

        {profile.is_blocked ? (
          <div className="alert alert-error" style={{ margin: 16 }}>Ваш акаунт обмежено — писати не можна.</div>
        ) : (
          <DMComposer conversationId={id} userId={user.id} />
        )}
        <p className="dm-notice">{MOD_NOTICE}</p>
      </main>
    </>
  );
}
