'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/image';
import { sendMessage } from '@/app/actions';

const MAX = 4;

export default function DMComposer({ conversationId, userId }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function onPick(e) {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...picked].slice(0, MAX).map((f) => (f.preview ? f : Object.assign(f, { preview: URL.createObjectURL(f) }))));
    e.target.value = '';
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
      fd.set('conversation_id', String(conversationId));
      fd.set('body', text);
      fd.set('images', JSON.stringify(urls));
      const res = await sendMessage(fd);
      if (res?.error) throw new Error(res.error);
      // миттєво показати власне повідомлення
      window.dispatchEvent(new CustomEvent('hive:message-sent', {
        detail: { id: Date.now(), sender_id: userId, body: text, images: urls, created_at: new Date().toISOString() },
      }));
      setText('');
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError('Не вдалося надіслати: ' + (err.message || 'спробуй ще раз'));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="dm-composer">
      {files.length > 0 && (
        <div className="dm-previews">
          {files.map((f, i) => (
            <div key={f.preview} style={{ position: 'relative' }}>
              <img src={f.preview} alt="" />
              <button type="button" className="img-remove" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} aria-label="Прибрати">×</button>
            </div>
          ))}
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="dm-input-row">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPick} />
        <button type="button" className="dm-icon-btn" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX} aria-label="Додати фото">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
        </button>
        <label htmlFor="dm" className="sr-only">Повідомлення</label>
        <textarea id="dm" className="dm-field" value={text} maxLength={3000} rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }}
          placeholder="Написати повідомлення…" />
        <button type="submit" className="btn btn-honey dm-send" disabled={busy || (!text.trim() && files.length === 0)} aria-label="Надіслати">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </div>
    </form>
  );
}
