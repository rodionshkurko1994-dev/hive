'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthLayout from '@/components/AuthLayout';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [ref, setRef] = useState('');
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    if (/^[0-9a-f-]{36}$/i.test(r)) {
      setRef(r);
      try { localStorage.setItem('hive_ref', r); } catch {}
    } else {
      try { setRef(localStorage.getItem('hive_ref') || ''); } catch {}
    }
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const email = form.get('email').toString().trim();
    const password = form.get('password').toString();
    const full_name = form.get('full_name').toString().trim();
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: ref ? { full_name, ref } : { full_name },
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes('already registered')
          ? 'Цю пошту вже зареєстровано. Спробуй увійти.'
          : 'Не вдалося зареєструватися: ' + error.message
      );
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthLayout>
        <h2 className="display" style={{ margin: 0, fontSize: 26 }}>Перевір пошту</h2>
        <p style={{ margin: 0 }}>
          Ми надіслали лист на <b>{sentTo}</b>. Натисни посилання в листі, щоб підтвердити акаунт.
        </p>
        <p className="hint" style={{ margin: 0 }}>Не бачиш листа? Зазирни в «Спам» або «Промоакції».</p>
        <Link href="/login" className="btn btn-outline">До входу</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="display" style={{ margin: 0, fontSize: 26 }}>Реєстрація</h2>
      {ref && <div className="alert alert-ok">Тебе запросили до HIVE</div>}
      <form onSubmit={onSubmit} className="stack" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="full_name">Ім'я та прізвище</label>
          <input id="full_name" name="full_name" className="input" required maxLength={80} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="email">Пошта</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
          <span className="hint">Щонайменше 8 символів</span>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-honey" disabled={loading}>
          {loading ? 'Створюємо…' : 'Створити акаунт'}
        </button>
      </form>
      <p className="muted" style={{ margin: 0 }}>Вже є акаунт? <Link href="/login">Увійти</Link></p>
    </AuthLayout>
  );
}
