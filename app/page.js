import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthLayout from '@/components/AuthLayout';

export default async function Home({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/feed');

  return (
    <AuthLayout>
      <h2 className="display" style={{ margin: 0, fontSize: 26 }}>Ласкаво просимо у вулик</h2>
      <p className="muted" style={{ margin: 0 }}>Створи акаунт за хвилину. Знадобиться лише пошта.</p>
      <Link href={searchParams?.ref ? `/signup?ref=${encodeURIComponent(searchParams.ref)}` : '/signup'} className="btn btn-honey">Зареєструватися</Link>
      <Link href="/login" className="btn btn-outline">У мене вже є акаунт</Link>
    </AuthLayout>
  );
}
