import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TQQ Vault - 3D Card & Slab Showcase',
  description: 'AAA-style Gacha Card Collector & Idle Simulator based on The Quintessential Quintuplets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
