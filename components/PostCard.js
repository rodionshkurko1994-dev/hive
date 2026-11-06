import Link from 'next/link';
import { timeAgo } from '@/lib/constants';
import { fmtCount } from '@/lib/posts';
import { toggleLike, toggleRepost, deleteOwnPost, reportPost } from '@/app/actions';
import HexIcon from './HexIcon';
import Avatar from './Avatar';

function RepostIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8.5 8.5 0 01-12.4 7.6L3 21l1.4-5.2A8.5 8.5 0 1121 12z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function PostCard({ post, myId, liked = false, reposted = false, repostedBy = null, detail = false }) {
  const a = post.author || {};
  const place = post.neighborhood || post.district || '';
  const mine = myId === post.author_id;
  const images = post.images || [];

  return (
    <article className="card post" data-post-id={post.id}>
      {repostedBy && (
        <div className="row small muted" style={{ gap: 6, fontWeight: 600 }}>
          <RepostIcon />
          <Link href={`/u/${repostedBy.id}`} style={{ color: 'inherit' }}>{repostedBy.id === myId ? 'Ви поширили' : `${repostedBy.full_name} поширює`}</Link>
        </div>
      )}
      <div className="row">
        <Link href={`/u/${a.id}`} aria-label={a.full_name} style={{ textDecoration: 'none' }}>
          <Avatar profile={a} size={46} />
        </Link>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href={`/u/${a.id}`} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>{a.full_name || 'Користувач'}</Link>
          <span className="small muted">{place ? `${place} · ` : ''}<Link href={`/p/${post.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{timeAgo(post.created_at)}</Link></span>
        </div>
      </div>
      {post.body && (detail
        ? <p className="post-body">{post.body}</p>
        : <Link href={`/p/${post.id}`} style={{ color: 'inherit', textDecoration: 'none' }}><p className="post-body">{post.body}</p></Link>)}
      {images.length > 0 && (
        <div className="img-grid" data-count={images.length}>
          {images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer">
              <img src={src} alt="Фото з допису" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <div className="post-actions">
        {mine ? (
          <span className="btn btn-ghost like-btn" style={{ cursor: 'default' }} title="Вподобання">
            <HexIcon /> {fmtCount(post.likes_count)}
          </span>
        ) : (
          <form action={toggleLike}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="liked" value={liked ? '1' : '0'} />
            <button type="submit" className={`btn btn-ghost like-btn ${liked ? 'on' : ''}`} aria-pressed={liked} aria-label="Вподобати">
              <HexIcon filled={liked} /> {fmtCount(post.likes_count)}
            </button>
          </form>
        )}
        <Link href={`/p/${post.id}#reply`} className="btn btn-ghost like-btn" aria-label="Коментарі">
          <CommentIcon /> {fmtCount(post.comments_count)}
        </Link>
        {mine ? (
          <span className="btn btn-ghost like-btn" style={{ cursor: 'default' }} title="Поширення">
            <RepostIcon /> {fmtCount(post.reposts_count)}
          </span>
        ) : (
          <form action={toggleRepost}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="reposted" value={reposted ? '1' : '0'} />
            <button type="submit" className={`btn btn-ghost like-btn ${reposted ? 'on' : ''}`} aria-pressed={reposted} aria-label="Поширити">
              <RepostIcon /> {fmtCount(post.reposts_count)}
            </button>
          </form>
        )}
        <span className="btn btn-ghost like-btn" style={{ cursor: 'default' }} title="Перегляди">
          <EyeIcon /> {fmtCount(post.views_count)}
          <span className="sr-only">переглядів</span>
        </span>
        {mine ? (
          <form action={deleteOwnPost} style={{ marginLeft: 'auto' }}>
            <input type="hidden" name="post_id" value={post.id} />
            <button type="submit" className="btn btn-ghost">Видалити</button>
          </form>
        ) : (
          <details className="post-menu" style={{ marginLeft: 'auto' }}>
            <summary className="btn btn-ghost" aria-label="Ще">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </summary>
            <div className="post-menu-pop card">
              <form action={reportPost} className="stack" style={{ gap: 8 }}>
                <input type="hidden" name="post_id" value={post.id} />
                <label htmlFor={`rp-${post.id}`} className="small" style={{ fontWeight: 600 }}>Поскаржитись на допис</label>
                <input id={`rp-${post.id}`} name="reason" className="input" placeholder="Причина (необовʼязково)" maxLength={500} />
                <button type="submit" className="btn btn-danger btn-sm">Надіслати скаргу</button>
              </form>
            </div>
          </details>
        )}
      </div>
    </article>
  );
}
