export const DISTRICTS = [
  'Голосіївський',
  'Дарницький',
  'Деснянський',
  'Дніпровський',
  'Оболонський',
  'Печерський',
  'Подільський',
  'Святошинський',
  "Солом'янський",
  'Шевченківський',
];

export const CATEGORIES = {
  general: 'Загальне',
  light: 'Світло і вода',
  help: 'Допомога',
  lost: 'Загублено',
  house: 'Будинок і ОСББ',
};

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'щойно';
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн тому`;
  return formatDate(date);
}

export function formatDate(date, withTime = false) {
  if (!date) return '—';
  return new Date(date).toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
