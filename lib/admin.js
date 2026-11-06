import { redirect } from 'next/navigation';
import { createClient, createAdminClient, isAdminEmail } from '@/lib/supabase/server';

export async function requireAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdminEmail(user.email)) redirect('/feed');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile };
}

// Усі користувачі: дані з auth (пошта, входи) + профіль + кількість дописів
export async function loadAllUsers() {
  const admin = createAdminClient();
  const authUsers = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const { data: profiles } = await admin.from('profiles').select('*');
  const { data: stats } = await admin.from('user_stats').select('*');
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const statsById = Object.fromEntries((stats || []).map((s) => [s.id, s]));

  return authUsers.map((u) => {
    const p = byId[u.id] || {};
    const s = statsById[u.id] || {};
    return {
      avatar_url: p.avatar_url || null,
      invited_by: p.invited_by || null,
      invited_by_name: p.invited_by ? (byId[p.invited_by]?.full_name || '—') : '',
      followers: s.followers || 0,
      following: s.following || 0,
      invites: s.invites || 0,
      likes_received: s.likes_received || 0,
      reposts_received: s.reposts_received || 0,
      views_received: s.views_received || 0,
      rating: s.rating || 0,
      id: u.id,
      email: u.email,
      full_name: p.full_name || u.user_metadata?.full_name || '',
      district: p.district || '',
      neighborhood: p.neighborhood || '',
      building: p.building || '',
      bio: p.bio || '',
      onboarded: !!p.onboarded,
      is_blocked: !!p.is_blocked,
      created_at: u.created_at,
      confirmed_at: u.email_confirmed_at || u.confirmed_at || null,
      last_sign_in_at: u.last_sign_in_at || null,
      posts: s.posts_count || 0,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Модерація чатів (адмін, через серверний ключ)
export async function loadConversationsAdmin({ reportsOnly = false } = {}) {
  const admin = createAdminClient();
  const { data: reports } = await admin.from('message_reports').select('*').order('created_at', { ascending: false });
  const openByConv = {};
  (reports || []).forEach((r) => {
    openByConv[r.conversation_id] ||= { open: 0, total: 0 };
    openByConv[r.conversation_id].total += 1;
    if (r.status === 'open') openByConv[r.conversation_id].open += 1;
  });

  let q = admin.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(500);
  const { data: convs } = await q;
  let rows = convs || [];
  if (reportsOnly) rows = rows.filter((c) => openByConv[c.id]);

  const ids = [...new Set(rows.flatMap((c) => [c.user_a, c.user_b]))];
  const { data: profiles } = ids.length ? await admin.from('profiles').select('id, full_name').in('id', ids) : { data: [] };
  const name = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name || '—']));

  const counts = {};
  const { data: msgs } = await admin.from('messages').select('conversation_id');
  (msgs || []).forEach((m) => { counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1; });

  return {
    conversations: rows.map((c) => ({
      ...c,
      a_name: name[c.user_a], b_name: name[c.user_b],
      messages: counts[c.id] || 0,
      reports: openByConv[c.id]?.total || 0,
      openReports: openByConv[c.id]?.open || 0,
    })),
    openReportsTotal: (reports || []).filter((r) => r.status === 'open').length,
  };
}

export async function loadConversationAdmin(id) {
  const admin = createAdminClient();
  const { data: conv } = await admin.from('conversations').select('*').eq('id', id).maybeSingle();
  if (!conv) return null;
  const { data: profiles } = await admin.from('profiles').select('id, full_name, avatar_url').in('id', [conv.user_a, conv.user_b]);
  const { data: messages } = await admin.from('messages').select('*').eq('conversation_id', id).order('id', { ascending: true });
  const { data: reports } = await admin.from('message_reports').select('*').eq('conversation_id', id).order('created_at', { ascending: false });
  const { data: reporters } = reports?.length
    ? await admin.from('profiles').select('id, full_name').in('id', reports.map((r) => r.reporter_id))
    : { data: [] };
  const rName = Object.fromEntries((reporters || []).map((p) => [p.id, p.full_name]));
  return {
    conv,
    profiles: Object.fromEntries((profiles || []).map((p) => [p.id, p])),
    messages: messages || [],
    reports: (reports || []).map((r) => ({ ...r, reporter_name: rName[r.reporter_id] || '—' })),
  };
}

export async function loadPostReports({ openOnly = true } = {}) {
  const admin = createAdminClient();
  let q = admin.from('post_reports').select('*').order('created_at', { ascending: false }).limit(300);
  if (openOnly) q = q.eq('status', 'open');
  const { data: reports } = await q;
  const rows = reports || [];
  const postIds = [...new Set(rows.map((r) => r.post_id))];
  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
  const { data: posts } = postIds.length
    ? await admin.from('posts').select('id, body, images, author_id, created_at, comments_count, likes_count').in('id', postIds)
    : { data: [] };
  const authorIds = [...new Set((posts || []).map((p) => p.author_id))];
  const { data: profiles } = (authorIds.length || reporterIds.length)
    ? await admin.from('profiles').select('id, full_name').in('id', [...new Set([...authorIds, ...reporterIds])])
    : { data: [] };
  const name = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name || '—']));
  const postById = Object.fromEntries((posts || []).map((p) => [p.id, p]));

  // групуємо скарги за дописом
  const byPost = {};
  rows.forEach((r) => {
    byPost[r.post_id] ||= { post: postById[r.post_id], reports: [], last: r.created_at };
    byPost[r.post_id].reports.push({ ...r, reporter_name: name[r.reporter_id] || '—' });
  });
  const groups = Object.values(byPost)
    .filter((g) => g.post)
    .map((g) => ({ ...g, author_name: name[g.post.author_id] || '—' }))
    .sort((a, b) => new Date(b.last) - new Date(a.last));
  return { groups, openTotal: rows.length };
}
