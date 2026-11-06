import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Підтвердження пошти через token_hash (працює, навіть якщо лист відкрили на іншому пристрої)
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'email';
  let next = searchParams.get('next') || '/onboarding';
  if (!next.startsWith('/')) next = '/onboarding';

  if (token_hash) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
