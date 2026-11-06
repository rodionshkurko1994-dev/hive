export const POST_SELECT = '*, author:profiles!posts_author_id_fkey(id, full_name, district, neighborhood, building)';

export async function attachLikes(supabase, posts, myId) {
  if (!posts?.length) return [];
  const ids = posts.map((p) => p.id);
  const { data: likes } = await supabase.from('likes').select('post_id, user_id').in('post_id', ids);
  const count = {};
  const mine = new Set();
  (likes || []).forEach((l) => {
    count[l.post_id] = (count[l.post_id] || 0) + 1;
    if (l.user_id === myId) mine.add(l.post_id);
  });
  return posts.map((p) => ({ post: p, likes: count[p.id] || 0, liked: mine.has(p.id) }));
}
