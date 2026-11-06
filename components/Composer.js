'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/image';
import { createPost } from '@/app/actions';

const MAX_IMAGES = 4;

export default function Composer({ userId }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function onPick(e) {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    const next = [...files, ...picked].slice(0, MAX_IMAGES).map((f) => (f.preview ? f : Object.assign(f, { preview: URL.createObjectURL(f) })));
    setFiles(next);
    e.target.value = '';
  }

  function remove(i) {
    setFiles(files.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const urls = [];
      for (const f of files) urls.push(await uploadImage(supabase, userId, f));
      const fd = new FormData();
      fd.set('body', text);
      fd.set('images', JSON.stringify(urls));
      const res = await createPost(fd);
      if (res?.error) throw new Error(res.error);
      setText('');
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError('Не вдалося опублікувати: ' + (err.message || 'спробуй ще раз'));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="card stack" id="new">
      <label htmlFor="body" className="sr-only">Новий допис</label>
      <textarea id="body" className="textarea" maxLength={3000} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Що нового?" style={{ minHeight: 80 }} />
      {files.length > 0 && (
        <div className="img-grid" data-count={files.length}>
          {files.map((f, i) => (
            <div key={f.preview} style={{ position: 'relative' }}>
              <img src={f.preview} alt="" />
              <button type="button" className="img-remove" onClick={() => remove(i)} aria-label="Прибрати фото">×</button>
            </div>
          ))}
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="row-wrap spread">
        <div className="row">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPick} />
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_IMAGES}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
            Фото {files.length > 0 && `(${files.length}/${MAX_IMAGES})`}
          </button>
        </div>
        <button type="submit" className="btn btn-honey" disabled={busy || (!text.trim() && files.length === 0)}>
          {busy ? 'Публікуємо…' : 'Опублікувати'}
        </button>
      </div>
    </form>
  );
}
