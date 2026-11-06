import { redirect } from 'next/navigation';
import { createClient, isAdminEmail } from '@/lib/supabase/server';

export async function getSession({ requireOnboarded = true } = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (requireOnboarded && (!profile || !profile.onboarded)) redirect('/onboarding');

  return { supabase, user, profile, isAdmin: isAdminEmail(user.email) };
}
