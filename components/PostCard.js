import Link from 'next/link';
import { CATEGORIES, initials, timeAgo } from '@/lib/constants';
import { toggleLike, deleteOwnPost } from '@/app/actions';
import HexIcon from './HexIcon';

const TAG_CLASS = { light: 'dark', help: 'honey' };

export default function PostCard({ post, myId, likes = 0, liked = false }) {
  const a = post.author || {};
  const place = post.building || post.neighborhood || post.district || '';
  return (
    <article className="card post">
      <div className="row">
        <Link href={`/u/${a.id}`} className="avatar" style={{ width: 46, height: 46, fontSize: 15, textDecoration: 'none' }} aria-label={a.full_name}>
          {initials(a.full_name)}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }} className="stack">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link href={`/u/${a.id}`} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>{a.full_name || 'Сусід'}</Link>
            <span className="small muted">{place ? `${place} · ` : ''}{timeAgo(post.created_at)}</span>
          </div>
        </div>
        {post.category !== 'general' && (
          <span className={`tag ${TAG_CLASS[post.category] || ''}`}>{CATEGORIES[post.category]}</span>
        )}
      </div>
      <p className="post-body">{post.body}</p>
      <div className="post-actions">
        <form action={toggleLike}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="liked" value={liked ? '1' : '0'} />
          <button type="submit" className={`btn btn-ghost like-btn ${liked ? 'on' : ''}`} aria-pressed={liked}>
            <HexIcon filled={liked} /> {likes}
          </button>
        </form>
        {myId === post.author_id && (
          <form action={deleteOwnPost} style={{ marginLeft: 'auto' }}>
            <input type="hidden" name="post_id" value={post.id} />
            <button type="submit" className="btn btn-ghost">Видалити</button>
          </form>
        )}
      </div>
    </article>
  );
}
