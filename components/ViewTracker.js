'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Рахує перегляд, коли допис щонайменше на половину видно на екрані ~1 секунду
export default function ViewTracker() {
  useEffect(() => {
    const supabase = createClient();
    const seen = new Set();
    const queue = new Set();
    const timers = new Map();

    const flush = () => {
      if (!queue.size) return;
      const ids = Array.from(queue);
      queue.clear();
      supabase.rpc('record_views', { ids }).then(() => {});
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const id = Number(en.target.dataset.postId);
        if (!id || seen.has(id)) return;
        if (en.isIntersecting) {
          timers.set(id, setTimeout(() => { seen.add(id); queue.add(id); }, 1000));
        } else if (timers.has(id)) {
          clearTimeout(timers.get(id));
          timers.delete(id);
        }
      });
    }, { threshold: 0.5 });

    const observeAll = () => document.querySelectorAll('[data-post-id]').forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(flush, 3000);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      flush();
      io.disconnect();
      mo.disconnect();
      clearInterval(interval);
      timers.forEach((t) => clearTimeout(t));
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);
  return null;
}
