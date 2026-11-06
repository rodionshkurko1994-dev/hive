'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/image';
import { setAvatar } from '@/app/actions';
import Avatar from './Avatar';

export default function AvatarUpload({ profile }) {
  const router = useRouter();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await uploadImage(createClient(), profile.id, file, 600);
      const fd = new FormData();
      fd.set('url', url);
      const res = await setAvatar(fd);
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (err) {
      setError('Не вдалося завантажити фото');
    }
    setBusy(false);
  }

  return (
    <div className="row" style={{ gap: 16 }}>
      <Avatar profile={profile} size={84} tone="honey" />
      <div className="stack" style={{ gap: 6 }}>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        <button type="button" className="btn btn-outline" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? 'Завантажуємо…' : profile.avatar_url ? 'Змінити фото профілю' : 'Додати фото профілю'}
        </button>
        {error && <span className="small" style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
    </div>
  );
}
