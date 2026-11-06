export const AUTHOR = 'author:profiles!posts_author_id_fkey(id, full_name, avatar_url, district, neighborhood, building)';
export const POST_SELECT = `*, ${AUTHOR}`;

// Позначає, які дописи я вже лайкнув / поширив
export async function withMine(supabase, items, myId) {
  const ids = [...new Set(items.map((it) => it.post.id))];
  if (!ids.length) return items;
  const [{ data: likes }, { data: reposts }] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', myId).in('post_id', ids),
    supabase.from('reposts').select('post_id').eq('user_id', myId).in('post_id', ids),
  ]);
  const L = new Set((likes || []).map((l) => l.post_id));
  const R = new Set((reposts || []).map((r) => r.post_id));
  return items.map((it) => ({ ...it, liked: L.has(it.post.id), reposted: R.has(it.post.id) }));
}

// Рекомендації: свіжість + залученість + підписки + свій район
export function rankPosts(posts, { followingIds, district, myId }) {
  const now = Date.now();
  const F = new Set(followingIds);
  return posts
    .map((p) => {
      const ageH = Math.max(0, (now - new Date(p.created_at).getTime()) / 3600000);
      const engagement = 1 + p.likes_count * 3 + p.reposts_count * 5 + p.views_count * 0.2;
      let boost = 1;
      if (F.has(p.author_id)) boost *= 3;
      if (district && p.district === district) boost *= 1.5;
      if (p.images?.length) boost *= 1.2;
      if (p.author_id === myId) boost *= 0.6;
      return { p, score: (engagement * boost) / Math.pow(ageH + 2, 1.4) };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

export function fmtCount(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' млн';
  if (n >= 1e4) return Math.round(n / 1e3) + ' тис.';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' тис.';
  return String(n);
}
