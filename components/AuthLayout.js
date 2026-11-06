import Footer from './Footer';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <div className="row">
          <span className="logo-mark" aria-hidden="true" />
          <span className="logo-text">HIVE</span>
        </div>
        <div className="stack" style={{ gap: 16, maxWidth: 460, position: 'relative', zIndex: 1 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 40, lineHeight: 1.15 }}>
            Соцмережа <span style={{ color: 'var(--honey)' }}>твого району</span>
          </h1>
          <p style={{ margin: 0, color: '#d4d4d4', fontSize: 17 }}>
            Знайомся з сусідами, ділися фото й думками, підписуйся на цікавих людей поруч.
          </p>
        </div>
        <p className="small" style={{ margin: 0, color: '#a3a3a3' }}>Зроблено в Україні</p>
        <div aria-hidden="true" className="hex" style={{ position: 'absolute', right: -40, bottom: 80, width: 220, height: 220, background: 'var(--honey)', opacity: 0.9 }} />
        <div aria-hidden="true" className="hex" style={{ position: 'absolute', right: 150, bottom: 30, width: 110, height: 110, background: 'var(--honey)', opacity: 0.35 }} />
      </section>
      <section className="auth-form">
        <div className="auth-card">{children}<Footer mini={false} /></div>
      </section>
    </div>
  );
}
