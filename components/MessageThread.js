'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dayLabel, clockTime } from '@/lib/messages';

export default function MessageThread({ conversationId, myId, initial }) {
  const [messages, setMessages] = useState(initial);
  const endRef = useRef(null);
  const lastIdRef = useRef(initial.length ? initial[initial.length - 1].id : 0);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function poll() {
      const { data } = await supabase.from('messages')
        .select('id, sender_id, body, images, created_at')
        .eq('conversation_id', conversationId)
        .gt('id', lastIdRef.current)
        .order('id', { ascending: true });
      if (alive && data && data.length) {
        lastIdRef.current = data[data.length - 1].id;
        setMessages((prev) => {
          const have = new Set(prev.map((m) => m.id));
          const add = data.filter((m) => !have.has(m.id));
          return add.length ? [...prev, ...add] : prev;
        });
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    const t = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [conversationId]);

  // Експонуємо додавання свого щойно надісланого повідомлення без очікування опитування
  useEffect(() => {
    function onSent(e) {
      const m = e.detail;
      if (!m) return;
      lastIdRef.current = Math.max(lastIdRef.current, m.id);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
    window.addEventListener('hive:message-sent', onSent);
    return () => window.removeEventListener('hive:message-sent', onSent);
  }, []);

  let lastDay = '';
  return (
    <div className="dm-scroll">
      {messages.map((m) => {
        const day = dayLabel(m.created_at);
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = m.sender_id === myId;
        return (
          <div key={m.id}>
            {showDay && <div className="dm-day"><span>{day}</span></div>}
            <div className={`dm-row ${mine ? 'mine' : ''}`}>
              <div className={`dm-bubble ${mine ? 'mine' : ''}`}>
                {m.body && <p className="dm-text">{m.body}</p>}
                {(m.images || []).length > 0 && (
                  <div className="dm-imgs">
                    {m.images.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="" loading="lazy" /></a>
                    ))}
                  </div>
                )}
                <span className="dm-time">{clockTime(m.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
