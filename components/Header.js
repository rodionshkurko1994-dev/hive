import Link from 'next/link';
import { initials } from '@/lib/constants';
import { signOut } from '@/app/actions';

export default function Header({ profile, isAdmin, active }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/feed" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          <span className="logo-text">HIVE</span>
        </Link>
        <nav className="nav" aria-label="Головна навігація">
          <Link href="/feed" className={active === 'feed' ? 'active' : ''}>Стрічка</Link>
          <Link href="/neighbors" className={active === 'neighbors' ? 'active' : ''}>Сусіди</Link>
          {isAdmin && <Link href="/admin" className={active === 'admin' ? 'active' : ''}>Адмінка</Link>}
          <form action={signOut}>
            <button type="submit">Вийти</button>
          </form>
        </nav>
        {profile && (
          <Link href={`/u/${profile.id}`} className="avatar-link" aria-label="Моя сторінка">
            {initials(profile.full_name)}
          </Link>
        )}
      </div>
    </header>
  );
}
