import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'TQQ Vault - 3D Card & Slab Showcase',
  description: 'AAA-style Gacha Card Collector & Idle Simulator based on The Quintessential Quintuplets',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TQQ Vault',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#08080a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#08080a" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#08080a] text-zinc-100 min-h-screen antialiased selection:bg-amber-500 selection:text-black overscroll-none">
        {children}
      </body>
    </html>
  );
}
