import type { Metadata } from 'next';
import './globals.css';
import Favicon from '../../Ratenova Logo_ ohne icon.png';

export const metadata: Metadata = {
  title: 'Ratenova — Dein Weg zur finanziellen Freiheit',
  description: 'Verwalte Schulden, Raten und Vereinbarungen mit Gläubigern.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head>
        <link rel="icon" href={(Favicon as unknown as { src: string }).src || (Favicon as any)} type="image/png" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
