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
