import { initials } from '@/lib/constants';

export default function Avatar({ profile, size = 44, tone = '', className = '', style = {} }) {
  const name = profile?.full_name || '';
  const box = { width: size, height: size, fontSize: Math.round(size * 0.34), ...style };
  if (profile?.avatar_url) {
    return (
      <span className={`avatar ${className}`} style={{ ...box, padding: 0, overflow: 'hidden' }}>
        <img src={profile.avatar_url} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }
  return <span className={`avatar ${tone} ${className}`} style={box} aria-hidden="true">{initials(name)}</span>;
}
