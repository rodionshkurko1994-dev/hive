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
  const { data: posts } = await admin.from('posts').select('author_id');
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const postCount = {};
  (posts || []).forEach((p) => { postCount[p.author_id] = (postCount[p.author_id] || 0) + 1; });

  return authUsers.map((u) => {
    const p = byId[u.id] || {};
    return {
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
      posts: postCount[u.id] || 0,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
