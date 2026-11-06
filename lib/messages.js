// Повідомлення приватні. Доступ модерації — відкритий (за скаргою / безпека), не прихований.
export const MOD_NOTICE = 'Повідомлення приватні. За скаргою або з міркувань безпеки їх може переглянути модерація.';

export function otherParticipantId(conv, myId) {
  return conv.user_a === myId ? conv.user_b : conv.user_a;
}

export function dayLabel(date) {
  const d = new Date(date);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Сьогодні';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: 'long' });
}

export function clockTime(date) {
  return new Date(date).toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
}
