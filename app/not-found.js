import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
      <div className="hex" style={{ width: 80, height: 80, background: 'var(--honey)' }} aria-hidden="true" />
      <h1 className="display" style={{ margin: 0 }}>Сторінку не знайдено</h1>
      <Link href="/feed" className="btn btn-dark">До стрічки</Link>
    </main>
  );
}
