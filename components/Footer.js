import Link from 'next/link';

export default function Footer({ mini = false }) {
  if (mini) {
    return (
      <div className="footer-mini">
        <Link href="/terms">Правила</Link>
        <Link href="/privacy">Політика</Link>
      </div>
    );
  }
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} HIVE</span>
      <Link href="/terms">Правила користування</Link>
      <Link href="/privacy">Політика конфіденційності</Link>
    </footer>
  );
}
