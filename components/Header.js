'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/app/actions';
import Avatar from './Avatar';

export default function Header({ profile, isAdmin, active }) {
  const [open, setOpen] = useState(false);
  const links = [
    ['/feed', 'Стрічка', 'feed'],
    ['/neighbors', 'Сусіди', 'neighbors'],
    ['/rating', 'Рейтинг', 'rating'],
    ['/messages', 'Повідомлення', 'messages'],
  ];
  if (isAdmin) links.push(['/admin', 'Адмінка', 'admin']);

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/feed" className="logo" onClick={() => setOpen(false)}>
          <span className="logo-mark" aria-hidden="true" />
          <span className="logo-text">HIVE</span>
        </Link>

        <nav className="nav nav-desktop" aria-label="Головна навігація">
          {links.map(([href, label, key]) => (
            <Link key={key} href={href} className={active === key ? 'active' : ''}>{label}</Link>
          ))}
          <form action={signOut}><button type="submit">Вийти</button></form>
        </nav>

        {profile && (
          <Link href={`/u/${profile.id}`} className="header-avatar" aria-label="Моя сторінка" onClick={() => setOpen(false)}>
            <Avatar profile={profile} size={38} tone="honey" />
          </Link>
        )}

        <button type="button" className="hamburger" aria-label="Меню" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          )}
        </button>
      </div>

      {open && (
        <nav className="nav-mobile" aria-label="Головна навігація">
          {links.map(([href, label, key]) => (
            <Link key={key} href={href} className={active === key ? 'active' : ''} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <form action={signOut}><button type="submit">Вийти</button></form>
        </nav>
      )}
    </header>
  );
}
