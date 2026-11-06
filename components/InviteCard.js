'use client';

import { useEffect, useState } from 'react';

export default function InviteCard({ userId, invites }) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setLink(`${base}/signup?ref=${userId}`);
  }, [userId]);

  async function copy() {
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) {
        await navigator.share({ title: 'HIVE', text: 'Приєднуйся до мене в HIVE', url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  return (
    <section className="card-dark stack" aria-labelledby="invite">
      <h2 id="invite" className="section-title" style={{ color: '#d4d4d4' }}>Запроси друзів</h2>
      <p style={{ margin: 0, color: '#e5e5e5' }}>
        +20 до рейтингу за кожного, хто зареєструється за твоїм посиланням.
      </p>
      <label htmlFor="invite-link" className="sr-only">Посилання-запрошення</label>
      <input id="invite-link" className="input" readOnly value={link} onFocus={(e) => e.target.select()}
        style={{ background: '#262626', color: '#fff', borderColor: '#404040', fontSize: 13 }} />
      <button type="button" className="btn btn-honey" onClick={copy}>{copied ? 'Скопійовано' : 'Скопіювати посилання'}</button>
      <span className="small" style={{ color: '#a3a3a3' }}>Вже запрошено: {invites}</span>
    </section>
  );
}
