import { Inter, Unbounded } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['500', '700'], variable: '--font-unbounded', display: 'swap' });

export const metadata = {
  title: 'HIVE — соцмережа сусідів',
  description: 'Знайомтеся з сусідами, діліться новинами будинку і району, допомагайте одне одному.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk" className={`${inter.variable} ${unbounded.variable}`}>
      <body>{children}</body>
    </html>
  );
}
