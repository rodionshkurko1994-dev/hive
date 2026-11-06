'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient, isAdminEmail } from '@/lib/supabase/server';
import { CATEGORIES, DISTRICTS } from '@/lib/constants';

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

function clean(v, max = 200) {
  return (v || '').toString().trim().slice(0, max);
}

export async function saveProfile(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const full_name = clean(formData.get('full_name'), 80);
  const district = clean(formData.get('district'), 40);
  if (!full_name || !DISTRICTS.includes(district)) {
    redirect('/onboarding?error=1');
  }

  const { error } = await supabase.from('profiles').update({
    full_name,
    district,
    neighborhood: clean(formData.get('neighborhood'), 80) || null,
    building: clean(formData.get('building'), 120) || null,
    bio: clean(formData.get('bio'), 600) || null,
    onboarded: true,
  }).eq('id', user.id);

  if (error) redirect('/onboarding?error=2');
  revalidatePath('/', 'layout');
  redirect('/feed');
}

export async function createPost(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const body = clean(formData.get('body'), 3000);
  let category = clean(formData.get('category'), 20);
  if (!CATEGORIES[category]) category = 'general';
  if (!body) return;

  const { data: profile } = await supabase
    .from('profiles').select('district, neighborhood, building').eq('id', user.id).single();

  await supabase.from('posts').insert({
    author_id: user.id,
    body,
    category,
    district: profile?.district || null,
    neighborhood: profile?.neighborhood || null,
    building: profile?.building || null,
  });
  revalidatePath('/feed');
}

export async function toggleLike(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const postId = Number(formData.get('post_id'));
  const liked = formData.get('liked') === '1';
  if (liked) {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath('/feed');
  revalidatePath('/u/[id]', 'page');
}

export async function deleteOwnPost(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('posts').delete().eq('id', Number(formData.get('post_id'))).eq('author_id', user.id);
  revalidatePath('/feed');
  revalidatePath('/u/[id]', 'page');
}

// ---------- Адмінські дії ----------
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect('/feed');
  return user;
}

export async function adminSetBlocked(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = clean(formData.get('user_id'), 64);
  const blocked = formData.get('blocked') === '1';
  await admin.from('profiles').update({ is_blocked: blocked }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath(`/admin/users/${id}`);
}

export async function adminDeletePost(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from('posts').delete().eq('id', Number(formData.get('post_id')));
  revalidatePath('/admin', 'layout');
  revalidatePath('/feed');
}

export async function adminDeleteUser(formData) {
  const me = await requireAdmin();
  const id = clean(formData.get('user_id'), 64);
  if (formData.get('confirm') !== 'ВИДАЛИТИ' || id === me.id) {
    redirect(`/admin/users/${id}?error=confirm`);
  }
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath('/admin');
  redirect('/admin?deleted=1');
}

export async function adminResendConfirmation(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const email = clean(formData.get('email'), 200);
  const id = clean(formData.get('user_id'), 64);
  await admin.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding` },
  });
  redirect(`/admin/users/${id}?resent=1`);
}
