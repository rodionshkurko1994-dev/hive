'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient, isAdminEmail } from '@/lib/supabase/server';
import { DISTRICTS } from '@/lib/constants';

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

function mediaPrefix(userId) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${userId}/`;
}

function revalidateAll() {
  revalidatePath('/feed');
  revalidatePath('/u/[id]', 'page');
  revalidatePath('/rating');
}

export async function createPost(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Потрібно увійти' };

  const body = clean(formData.get('body'), 3000);
  let images = [];
  try {
    images = JSON.parse(formData.get('images') || '[]');
  } catch {}
  const prefix = mediaPrefix(user.id);
  images = (Array.isArray(images) ? images : [])
    .filter((u) => typeof u === 'string' && u.startsWith(prefix))
    .slice(0, 4);
  if (!body && images.length === 0) return { error: 'Порожній допис' };

  const { data: profile } = await supabase
    .from('profiles').select('district, neighborhood, building').eq('id', user.id).single();

  const { error } = await supabase.from('posts').insert({
    author_id: user.id,
    body,
    images,
    district: profile?.district || null,
    neighborhood: profile?.neighborhood || null,
    building: profile?.building || null,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function setAvatar(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Потрібно увійти' };
  const url = clean(formData.get('url'), 500);
  if (!url.startsWith(mediaPrefix(user.id))) return { error: 'Невірне фото' };
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function toggleLike(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const postId = Number(formData.get('post_id'));
  if (formData.get('liked') === '1') {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  }
  revalidateAll();
}

export async function toggleRepost(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const postId = Number(formData.get('post_id'));
  if (formData.get('reposted') === '1') {
    await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', user.id);
  } else {
    await supabase.from('reposts').insert({ post_id: postId, user_id: user.id });
  }
  revalidateAll();
}

export async function toggleFollow(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const target = clean(formData.get('user_id'), 64);
  if (!target || target === user.id) return;
  if (formData.get('following') === '1') {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target);
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id: target });
  }
  revalidatePath(`/u/${target}`);
  revalidateAll();
}

export async function deleteOwnPost(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('posts').delete().eq('id', Number(formData.get('post_id'))).eq('author_id', user.id);
  revalidateAll();
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

// ---------- Коментарі ----------
export async function addComment(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const postId = Number(formData.get('post_id'));
  const parentRaw = Number(formData.get('parent_id'));
  const parent_id = Number.isFinite(parentRaw) && parentRaw > 0 ? parentRaw : null;
  const body = clean(formData.get('body'), 1000);
  if (!postId) redirect('/feed');
  if (!body) redirect(`/p/${postId}${parent_id ? `?reply=${parent_id}` : ''}#reply`);

  const { data, error } = await supabase.from('comments')
    .insert({ post_id: postId, author_id: user.id, parent_id, body })
    .select('id').single();
  revalidatePath(`/p/${postId}`);
  revalidateAll();
  if (error) redirect(`/p/${postId}?error=1#reply`);
  redirect(`/p/${postId}#c-${data.id}`);
}

export async function deleteComment(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const postId = Number(formData.get('post_id'));
  await supabase.from('comments').delete().eq('id', Number(formData.get('comment_id')));
  revalidatePath(`/p/${postId}`);
  revalidateAll();
}

export async function toggleCommentLike(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const commentId = Number(formData.get('comment_id'));
  if (formData.get('liked') === '1') {
    await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
  }
  revalidatePath(`/p/${Number(formData.get('post_id'))}`);
}
