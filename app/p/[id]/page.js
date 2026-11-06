import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { timeAgo } from '@/lib/constants';
import { POST_SELECT, withMine, fmtCount } from '@/lib/posts';
import { addComment, deleteComment, toggleCommentLike } from '@/app/actions';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import HexIcon from '@/components/HexIcon';
import ViewTracker from '@/components/ViewTracker';

export const dynamic = 'force-dynamic';

function Comment({ c, post, myId, liked, hasReplies, highlight }) {
  const a = c.author || {};
  const canDelete = c.author_id === myId || post.author_id === myId;
  const mine = c.author_id === myId;
  return (
    <div className={`cmt ${highlight ? 'hl' : ''}`} id={`c-${c.id}`}>
      <div className="cmt-side">
        <Link href={`/u/${a.id}`} aria-label={a.full_name} style={{ textDecoration: 'none' }}>
          <Avatar profile={a} size={36} />
        </Link>
        {hasReplies && <span className="cmt-line" aria-hidden="true" />}
      </div>
      <div className="cmt-main">
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/u/${a.id}`} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>{a.full_name || 'Користувач'}</Link>
          {c.author_id === post.author_id && <span className="tag honey" style={{ fontSize: 11, padding: '2px 8px' }}>Автор</span>}
          <span className="small muted">{timeAgo(c.created_at)}</span>
        </div>
        <p className="cmt-body">{c.body}</p>
        <div className="cmt-actions">
          {mine ? (
            <span className="btn btn-ghost like-btn" style={{ cursor: 'default' }}><HexIcon size={16} /> {fmtCount(c.likes_count)}</span>
          ) : (
            <form action={toggleCommentLike}>
              <input type="hidden" name="comment_id" value={c.id} />
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="liked" value={liked ? '1' : '0'} />
              <button type="submit" className={`btn btn-ghost like-btn ${liked ? 'on' : ''}`} aria-pressed={liked} aria-label="Вподобати коментар">
                <HexIcon size={16} filled={liked} /> {fmtCount(c.likes_count)}
              </button>
            </form>
          )}
          <Link href={`/p/${post.id}?reply=${c.parent_id || c.id}#reply`} className="btn btn-ghost">Відповісти</Link>
          {canDelete && (
            <form action={deleteComment}>
              <input type="hidden" name="comment_id" value={c.id} />
              <input type="hidden" name="post_id" value={post.id} />
              <button type="submit" className="btn btn-ghost">Видалити</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function PostPage({ params, searchParams }) {
  const { supabase, user, profile, isAdmin } = await getSession();
  const id = Number(params.id);
  if (!id) notFound();

  const { data: post } = await supabase.from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
  if (!post) notFound();
  const [item] = await withMine(supabase, [{ post }], user.id);

  const { data: comments } = await supabase.from('comments')
    .select('*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)')
    .eq('post_id', id).order('created_at', { ascending: true }).limit(500);
  const all = comments || [];
  const ids = all.map((c) => c.id);
  const { data: myLikes } = ids.length
    ? await supabase.from('comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', ids)
    : { data: [] };
  const liked = new Set((myLikes || []).map((l) => l.comment_id));

  const top = all.filter((c) => !c.parent_id);
  const replies = {};
  all.filter((c) => c.parent_id).forEach((c) => { (replies[c.parent_id] ||= []).push(c); });

  const replyTo = Number(searchParams?.reply) || null;
  const replyTarget = replyTo ? top.find((c) => c.id === replyTo) : null;

  return (
    <>
      <Header profile={profile} isAdmin={isAdmin} />
      <ViewTracker />
      <main className="container stack" style={{ maxWidth: 720, gap: 16 }}>
        <Link href="/feed" className="small" style={{ fontWeight: 600 }}>← До стрічки</Link>

        {searchParams?.reported && <div className="alert alert-ok">Дякуємо, скаргу надіслано модерації.</div>}
        <PostCard post={post} myId={user.id} liked={item.liked} reposted={item.reposted} detail />

        <section className="card" aria-labelledby="replies">
          <h2 id="replies" className="section-title" style={{ marginBottom: 6 }}>
            Відповіді {post.comments_count > 0 && `· ${fmtCount(post.comments_count)}`}
          </h2>

          {profile.is_blocked ? (
            <div className="alert alert-error" style={{ marginTop: 10 }}>Ваш акаунт обмежено — коментувати не можна.</div>
          ) : (
            <form action={addComment} id="reply" className="stack" style={{ gap: 10, padding: '12px 0 14px', borderBottom: '1px solid #f0efee' }}>
              <input type="hidden" name="post_id" value={post.id} />
              {replyTarget && <input type="hidden" name="parent_id" value={replyTarget.id} />}
              {replyTarget && (
                <div className="reply-to">
                  <span>Відповідь для <b style={{ color: 'var(--black)' }}>{replyTarget.author?.full_name}</b></span>
                  <Link href={`/p/${post.id}#reply`} className="small">Скасувати</Link>
                </div>
              )}
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Avatar profile={profile} size={36} tone="honey" />
                <label htmlFor="cbody" className="sr-only">Ваша відповідь</label>
                <textarea id="cbody" name="body" className="textarea" required maxLength={1000} autoFocus={!!replyTarget}
                  placeholder={replyTarget ? `Відповісти ${replyTarget.author?.full_name || ''}…` : `Відповісти ${post.author?.full_name || ''}…`}
                  style={{ minHeight: 64, flex: 1 }} />
              </div>
              {searchParams?.error && <div className="alert alert-error">Не вдалося надіслати відповідь.</div>}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-honey">Опублікувати</button>
              </div>
            </form>
          )}

          {top.length === 0 && <p className="muted" style={{ margin: '16px 0 4px' }}>Поки немає відповідей. Будь першим!</p>}

          <div className="thread">
            {top.map((c, i) => {
              const rs = replies[c.id] || [];
              return (
                <Fragment key={c.id}>
                  {i > 0 && <div className="cmt-sep" />}
                  <Comment c={c} post={post} myId={user.id} liked={liked.has(c.id)} hasReplies={rs.length > 0} highlight={replyTo === c.id} />
                  {rs.length > 0 && (
                    <div className="cmt-replies">
                      {rs.map((r) => (
                        <Comment key={r.id} c={r} post={post} myId={user.id} liked={liked.has(r.id)} hasReplies={false} />
                      ))}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
