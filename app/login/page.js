'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthLayout from '@/components/AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'link') {
      setError('Посилання з листа застаріло або вже використане. Спробуй увійти.');
    }
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get('email').toString().trim(),
      password: form.get('password').toString(),
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes('Email not confirmed')
          ? 'Пошту ще не підтверджено. Знайди лист від HIVE і натисни посилання.'
          : 'Неправильна пошта або пароль.'
      );
      return;
    }
    router.push('/feed');
    router.refresh();
  }

  return (
    <AuthLayout>
      <h2 className="display" style={{ margin: 0, fontSize: 26 }}>Вхід</h2>
      <form onSubmit={onSubmit} className="stack" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="email">Пошта</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-honey" disabled={loading}>
          {loading ? 'Входимо…' : 'Увійти'}
        </button>
      </form>
      <p className="muted" style={{ margin: 0 }}>Ще немає акаунта? <Link href="/signup">Зареєструватися</Link></p>
    </AuthLayout>
  );
}
